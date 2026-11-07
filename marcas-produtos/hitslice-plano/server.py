"""SPEED Cortes — site que transforma um vídeo longo (link do YouTube ou arquivo enviado) em cortes verticais
para TikTok, Reels e Shorts, com gancho, legenda e marca d'água. Uma tarefa por vez (fila); tudo fica em /data/tarefas/<id>."""
import hashlib, hmac, json, os, re, secrets, shutil, sqlite3, subprocess, sys, threading, time, traceback, urllib.parse, uuid, zipfile
from pathlib import Path

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

import pipeline as P

DADOS = Path(os.environ.get("DADOS", "/data"))
TAREFAS = DADOS / "tarefas"
ENVIOS = DADOS / "envios"
LOGOS = DADOS / "logos"
for d in (TAREFAS, ENVIOS, LOGOS):
    d.mkdir(parents=True, exist_ok=True)
PUBLIC = Path(__file__).parent / "public"

MAX_FILA = int(os.environ.get("MAX_FILA", "10"))           # tarefas esperando + rodando no site todo
MAX_POR_IP = int(os.environ.get("MAX_POR_IP", "2"))        # tarefas ativas por pessoa
MAX_MIN = int(os.environ.get("MAX_MIN", "120"))            # vídeo de até 2 h
MAX_ENVIO = int(os.environ.get("MAX_ENVIO_MB", "3072")) * 1024 * 1024
PEDACO = 40 * 1024 * 1024                                  # o túnel da Cloudflare aceita até 100 MB por envio
GUARDA_H = float(os.environ.get("GUARDA_HORAS", "6"))  # pedido do dono (03/11/2026): cortes ficam 6 h depois de prontos

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

# ----------------------------------------------------------------------------------------------- contas
# Cada pessoa tem a sua conta (e-mail + senha) e só vê os próprios cortes. Banco: data/contas.db (nunca apagar).
BANCO = DADOS / "contas.db"
_db_trava = threading.Lock()


def db():
    c = sqlite3.connect(BANCO, timeout=10)
    c.row_factory = sqlite3.Row
    return c


with db() as _c:
    _c.executescript("""
    CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, nome TEXT, sal TEXT NOT NULL,
        hash TEXT NOT NULL, criado REAL NOT NULL, ip TEXT);
    CREATE TABLE IF NOT EXISTS sessoes (token TEXT PRIMARY KEY, usuario INTEGER NOT NULL, criado REAL NOT NULL, visto REAL);
    CREATE TABLE IF NOT EXISTS testes (usuario INTEGER NOT NULL, ip TEXT, quando REAL NOT NULL, tarefa TEXT);
    CREATE TABLE IF NOT EXISTS pagamentos (usuario INTEGER NOT NULL, dias INTEGER NOT NULL, quando REAL NOT NULL, obs TEXT);
    """)
    # plano (07/11/2026, pedido do dono): conta nova corta 1 vídeo grátis; depois mensalidade (pago_ate) liberada pelo dono
    _cols = {r[1] for r in _c.execute("PRAGMA table_info(usuarios)")}
    if "pago_ate" not in _cols:
        _c.execute("ALTER TABLE usuarios ADD COLUMN pago_ate REAL NOT NULL DEFAULT 0")

# ----------------------------------------------------------------------------------------------- plano
PRECO = os.environ.get("PRECO", "59,90")                       # mensalidade em R$ (texto mostrado na página)
WHATSAPP = re.sub(r"\D", "", os.environ.get("WHATSAPP", "5511919081171"))  # pagamento combinado pelo WhatsApp do dono
TESTES_POR_IP = int(os.environ.get("TESTES_POR_IP", "2"))     # contas novas no mesmo IP em 30 dias que ganham o teste
DONO_SENHA = os.environ.get("DONO_SENHA", "")                  # painel /dono (liberar mensalidade); vazio = painel desligado


def plano(uid, ip=None):
    """{ativo, pago_ate, teste (ainda pode usar o vídeo grátis), preco, whatsapp}"""
    with _db_trava, db() as c:
        pago = c.execute("SELECT pago_ate FROM usuarios WHERE id = ?", (uid,)).fetchone()
        usou = c.execute("SELECT COUNT(*) FROM testes WHERE usuario = ?", (uid,)).fetchone()[0]
        no_ip = c.execute("SELECT COUNT(DISTINCT usuario) FROM testes WHERE ip = ? AND quando > ? AND usuario != ?",
                          (ip, time.time() - 30 * 86400, uid)).fetchone()[0] if ip else 0
    pago_ate = float(pago["pago_ate"]) if pago else 0.0
    ativo = pago_ate > time.time()
    return {"ativo": ativo, "pago_ate": pago_ate, "teste": not ativo and usou == 0 and no_ip < TESTES_POR_IP,
            "teste_usado": usou > 0, "preco": PRECO, "whatsapp": WHATSAPP}


def pode_cortar(uid, ip):
    p = plano(uid, ip)
    return p["ativo"] or p["teste"]


def devolver_teste(tid):
    """Vídeo do teste grátis que deu erro (link quebrado, falha): a pessoa ganha o teste de volta."""
    with _db_trava, db() as c:
        c.execute("DELETE FROM testes WHERE tarefa = ?", (tid,))


def hash_senha(senha, sal):
    return hashlib.scrypt(senha.encode(), salt=bytes.fromhex(sal), n=2 ** 14, r=8, p=1, dklen=32).hex()


SESSAO_DIAS = 60
falhas = {}  # ip -> [tempos] (trava tentativa de senha em massa)


def usuario_de(req: Request):
    tok = req.cookies.get("sessao") or ""
    if not re.fullmatch(r"[A-Za-z0-9_\-]{30,80}", tok):
        return None
    with _db_trava, db() as c:
        r = c.execute("SELECT u.id, u.email, u.nome, s.criado FROM sessoes s JOIN usuarios u ON u.id = s.usuario WHERE s.token = ?",
                      (hashlib.sha256(tok.encode()).hexdigest(),)).fetchone()
    if not r or time.time() - r["criado"] > SESSAO_DIAS * 86400:
        return None
    return {"id": r["id"], "email": r["email"], "nome": r["nome"] or ""}


def exigir(req: Request):
    u = usuario_de(req)
    if not u:
        raise HTTPException(401, "login")
    return u


def abrir_sessao(uid):
    tok = secrets.token_urlsafe(36)
    with _db_trava, db() as c:
        c.execute("INSERT INTO sessoes (token, usuario, criado, visto) VALUES (?, ?, ?, ?)",
                  (hashlib.sha256(tok.encode()).hexdigest(), uid, time.time(), time.time()))
    r = JSONResponse({"ok": True})
    r.set_cookie("sessao", tok, max_age=SESSAO_DIAS * 86400, httponly=True, secure=True, samesite="lax", path="/")
    return r


def muitas_falhas(ip):
    agora = time.time()
    falhas[ip] = [t for t in falhas.get(ip, []) if agora - t < 900]
    return len(falhas[ip]) >= 10


@app.post("/api/conta/criar")
async def conta_criar(req: Request):
    b = await req.json()
    email = str(b.get("email") or "").strip().lower()[:120]
    senha = str(b.get("senha") or "")
    nome = re.sub(r"\s+", " ", str(b.get("nome") or "")).strip()[:60]
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return JSONResponse({"erro": "email"}, 400)
    if len(senha) < 6 or len(senha) > 200:
        return JSONResponse({"erro": "senha_curta"}, 400)
    ip = ip_de(req)
    if muitas_falhas(ip):
        return JSONResponse({"erro": "tentativas"}, 429)
    sal = secrets.token_hex(16)
    try:
        with _db_trava, db() as c:
            if c.execute("SELECT COUNT(*) FROM usuarios WHERE ip = ? AND criado > ?", (ip, time.time() - 86400)).fetchone()[0] >= 5:
                return JSONResponse({"erro": "tentativas"}, 429)
            cur = c.execute("INSERT INTO usuarios (email, nome, sal, hash, criado, ip) VALUES (?, ?, ?, ?, ?, ?)",
                            (email, nome, sal, hash_senha(senha, sal), time.time(), ip))
            uid = cur.lastrowid
    except sqlite3.IntegrityError:
        return JSONResponse({"erro": "email_existe"}, 400)
    return abrir_sessao(uid)


@app.post("/api/conta/entrar")
async def conta_entrar(req: Request):
    b = await req.json()
    email = str(b.get("email") or "").strip().lower()[:120]
    senha = str(b.get("senha") or "")
    ip = ip_de(req)
    if muitas_falhas(ip):
        return JSONResponse({"erro": "tentativas"}, 429)
    with _db_trava, db() as c:
        r = c.execute("SELECT id, sal, hash FROM usuarios WHERE email = ?", (email,)).fetchone()
    if not r or not hmac.compare_digest(r["hash"], hash_senha(senha, r["sal"])):
        falhas.setdefault(ip, []).append(time.time())
        return JSONResponse({"erro": "senha_errada"}, 400)
    return abrir_sessao(r["id"])


@app.post("/api/conta/sair")
async def conta_sair(req: Request):
    tok = req.cookies.get("sessao") or ""
    with _db_trava, db() as c:
        c.execute("DELETE FROM sessoes WHERE token = ?", (hashlib.sha256(tok.encode()).hexdigest(),))
    r = JSONResponse({"ok": True})
    r.delete_cookie("sessao", path="/")
    return r


@app.get("/api/conta")
def conta(req: Request):
    u = usuario_de(req)
    if not u:
        return JSONResponse({"erro": "login"}, 401)
    return {**u, "guarda_horas": GUARDA_H, "plano": plano(u["id"], ip_de(req))}


def da_pessoa(tid, req):
    """Lê a tarefa e confere que é da pessoa logada (404 para não dizer que existe)."""
    u = exigir(req)
    t = ler(tid)
    if t.get("dono") != u["id"]:
        raise HTTPException(404)
    return t, u


def expira_em(t):
    if t.get("estado") in ("pronto", "erro"):
        return (t.get("terminado") or t.get("atualizado") or t["criado"]) + GUARDA_H * 3600
    return None
trava = threading.Lock()
fila = []          # ids esperando
fila_ed = []       # (tid, n) cortes editados para refazer: passam na frente (são rápidos)
rodando = {"id": None}
sinal = threading.Event()


# ----------------------------------------------------------------------------------------------- estado
def caminho(tid):
    if not re.fullmatch(r"[0-9a-f]{32}", tid or ""):
        raise HTTPException(404)
    return TAREFAS / tid


def ler(tid):
    try:
        return json.loads((caminho(tid) / "tarefa.json").read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise HTTPException(404)


def gravar(tid, t):
    p = caminho(tid) / "tarefa.json"
    tmp = p.with_suffix(".tmp")
    tmp.write_text(json.dumps(t, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, p)


def mudar(tid, **kw):
    with trava:
        t = ler(tid)
        t.update(kw)
        t["atualizado"] = time.time()
        gravar(tid, t)
        return t


def ip_de(req: Request):
    return (req.headers.get("cf-connecting-ip") or (req.headers.get("x-forwarded-for") or "").split(",")[0].strip()
            or (req.client.host if req.client else "?"))


# ----------------------------------------------------------------------------------------------- links aceitos
SITES = {"youtube": ("youtube.com", "youtu.be", "youtube-nocookie.com"), "tiktok": ("tiktok.com",),
         "instagram": ("instagram.com", "instagr.am")}


def plataforma(url):
    """Só YouTube/TikTok/Instagram: o extrator genérico do yt-dlp abriria endereços internos do servidor (SSRF)."""
    try:
        u = urllib.parse.urlparse((url or "").strip())
        host = (u.hostname or "").lower()
        if u.scheme in ("http", "https"):
            for nome, doms in SITES.items():
                if any(host == d or host.endswith("." + d) for d in doms):
                    return nome
    except Exception:
        pass
    return None


# ----------------------------------------------------------------------------------------------- API
@app.post("/api/info")
async def api_info(req: Request):
    b = await req.json()
    url = (b.get("url") or "").strip()
    if not plataforma(url):
        return JSONResponse({"erro": "link"}, 400)
    try:
        i = await run_thread(P.info_link, url)
    except P.Erro as e:
        return JSONResponse({"erro": str(e)}, 400)
    except subprocess.TimeoutExpired:
        return JSONResponse({"erro": "demorou"}, 400)
    if i["duracao"] and i["duracao"] > MAX_MIN * 60:
        return JSONResponse({"erro": "longo", "max": MAX_MIN, **i}, 400)
    return i


async def run_thread(fn, *a):
    import asyncio
    return await asyncio.get_running_loop().run_in_executor(None, fn, *a)


@app.post("/api/envio")
async def envio_iniciar(req: Request):
    u = exigir(req)
    if not pode_cortar(u["id"], ip_de(req)):
        return JSONResponse({"erro": "assinar"}, 402)
    b = await req.json()
    tam = int(b.get("tamanho") or 0)
    nome = re.sub(r"[^\w.\- ]", "", str(b.get("nome") or "video"))[:80] or "video"
    if tam <= 0 or tam > MAX_ENVIO:
        return JSONResponse({"erro": "grande", "max_mb": MAX_ENVIO // 1048576}, 400)
    eid = uuid.uuid4().hex
    (ENVIOS / eid).mkdir()
    (ENVIOS / eid / "meta.json").write_text(json.dumps({"nome": nome, "tamanho": tam, "recebido": 0, "criado": time.time(),
                                                         "ip": ip_de(req)}), encoding="utf-8")
    return {"id": eid, "pedaco": PEDACO}


@app.post("/api/envio/{eid}/pedaco")
async def envio_pedaco(eid: str, n: int, req: Request):
    exigir(req)
    if not re.fullmatch(r"[0-9a-f]{32}", eid) or not (ENVIOS / eid).is_dir():
        raise HTTPException(404)
    meta = json.loads((ENVIOS / eid / "meta.json").read_text())
    arq = ENVIOS / eid / "arquivo.bin"
    pos = n * PEDACO
    atual = arq.stat().st_size if arq.exists() else 0
    if pos != atual:  # pedaço repetido (reenvio) ou fora de ordem
        if pos < atual:
            return {"recebido": atual}
        return JSONResponse({"erro": "ordem", "recebido": atual}, 409)
    escrito = 0
    with open(arq, "ab") as fh:
        async for parte in req.stream():
            escrito += len(parte)
            if escrito > PEDACO or atual + escrito > meta["tamanho"]:
                fh.truncate(atual)
                return JSONResponse({"erro": "grande"}, 400)
            fh.write(parte)
    meta["recebido"] = atual + escrito
    (ENVIOS / eid / "meta.json").write_text(json.dumps(meta), encoding="utf-8")
    return {"recebido": meta["recebido"]}


@app.post("/api/logo")
async def logo(req: Request):
    exigir(req)
    dados = await req.body()
    if len(dados) > 4 * 1024 * 1024:
        return JSONResponse({"erro": "logo"}, 400)
    if not (dados[:8] == b"\x89PNG\r\n\x1a\n" or dados[:3] == b"\xff\xd8\xff" or dados[8:12] == b"WEBP"):
        return JSONResponse({"erro": "logo"}, 400)
    lid = uuid.uuid4().hex
    (LOGOS / lid).write_bytes(dados)
    return {"id": lid}


OPCOES = {
    "duracao": (int, (30, 60, 120, 150, 300), 60),  # 150 = 2–3 min
    "qtd": (int, (0, 3, 5, 10), 0),
    "enquadramento": (str, ("auto", "rosto", "dividida", "desfocado", "centro"), "auto"),
    "genero": (str, tuple(P.GENEROS), "auto"),
    "legenda": (bool, None, True),
    "estilo_legenda": (str, tuple(P.ESTILOS), "amarelo"),
    "posicao_legenda": (str, ("baixo", "meio", "alto"), "baixo"),
    "posicao_gancho": (str, ("meio", "baixo"), "meio"),  # 07/11/2026: gancho no meio ou embaixo, máx. 2,8 s
    "titulo_gancho": (bool, None, True),
    "gancho_inicio": (bool, None, True),
    "marca_tipo": (str, ("nenhuma", "texto", "imagem"), "nenhuma"),
    "marca_pos": (str, ("se", "sd", "ie", "id", "centro"), "sd"),
    "lingua": (str, ("auto", "pt", "en", "es", "fr", "it", "de"), "auto"),
}


@app.post("/api/tarefas")
async def criar(req: Request):
    u = exigir(req)
    b = await req.json()
    ip = ip_de(req)
    opc = {}
    for k, (tipo, validos, padrao) in OPCOES.items():
        v = b.get(k, padrao)
        try:
            v = (v in (True, "1", "true", 1)) if tipo is bool else tipo(v)
        except (TypeError, ValueError):
            v = padrao
        opc[k] = v if (validos is None or v in validos) else padrao
    opc["marca_texto"] = str(b.get("marca_texto") or "")[:40]
    opc["instrucoes"] = re.sub(r"\s+", " ", str(b.get("instrucoes") or "")).strip()[:300]
    try:
        opc["marca_opacidade"] = max(0.1, min(1.0, float(b.get("marca_opacidade", 0.7))))
    except (TypeError, ValueError):
        opc["marca_opacidade"] = 0.7
    logo_id = str(b.get("logo_id") or "")
    if opc["marca_tipo"] == "imagem":
        if not re.fullmatch(r"[0-9a-f]{32}", logo_id) or not (LOGOS / logo_id).exists():
            return JSONResponse({"erro": "logo"}, 400)
    if opc["marca_tipo"] == "texto" and not opc["marca_texto"].strip():
        opc["marca_tipo"] = "nenhuma"

    p = plano(u["id"], ip)
    if not (p["ativo"] or p["teste"]):
        return JSONResponse({"erro": "assinar"}, 402)

    url = (b.get("url") or "").strip()
    eid = str(b.get("envio_id") or "")
    if url:
        if not plataforma(url):
            return JSONResponse({"erro": "link"}, 400)
        fonte = {"tipo": "link", "url": url}
    elif re.fullmatch(r"[0-9a-f]{32}", eid) and (ENVIOS / eid).is_dir():
        meta = json.loads((ENVIOS / eid / "meta.json").read_text())
        if meta["recebido"] != meta["tamanho"]:
            return JSONResponse({"erro": "envio"}, 400)
        fonte = {"tipo": "arquivo", "envio": eid, "nome": meta["nome"]}
    else:
        return JSONResponse({"erro": "fonte"}, 400)

    with trava:
        ativos = [tid for tid in fila + ([rodando["id"]] if rodando["id"] else [])]
        if len(ativos) >= MAX_FILA:
            return JSONResponse({"erro": "fila"}, 429)
        do_ip = 0
        for tid in ativos:
            try:
                tt = ler(tid)
                if tt.get("ip") == ip or tt.get("dono") == u["id"]:
                    do_ip += 1
            except HTTPException:
                pass
        if do_ip >= MAX_POR_IP:
            return JSONResponse({"erro": "porip"}, 429)
        tid = uuid.uuid4().hex
        (TAREFAS / tid).mkdir()
        t = {"id": tid, "criado": time.time(), "atualizado": time.time(), "ip": ip, "dono": u["id"], "fonte": fonte, "opc": opc,
             "logo": logo_id if opc["marca_tipo"] == "imagem" else "", "estado": "fila", "etapa": "fila", "progresso": 0,
             "titulo": fonte.get("nome", ""), "cortes": [], "total_cortes": 0, "avisos": [], "teste": not p["ativo"]}
        gravar(tid, t)
        fila.append(tid)
    if not p["ativo"]:
        with _db_trava, db() as c:
            c.execute("INSERT INTO testes (usuario, ip, quando, tarefa) VALUES (?, ?, ?, ?)", (u["id"], ip, time.time(), tid))
    sinal.set()
    return {"id": tid}


def publico(t):
    tid = t["id"]
    pos = 0
    with trava:
        if tid in fila:
            pos = fila.index(tid) + 1 + (1 if rodando["id"] else 0)
    cortes = []
    for c in t.get("cortes", []):
        base = f"/api/tarefas/{tid}/arquivo/{c['nome']}"
        v = f"?v={c.get('versao', 1)}"
        cortes.append({**{k: c.get(k) for k in ("n", "titulo", "gancho", "post", "nota", "motivo", "dur", "ini", "fim", "a", "b", "h", "versao", "partes")},
                       "edicoes": c.get("edicoes", {}), "estado": c.get("estado", "pronto"),
                       "video": base + ".mp4" + v, "capa": base + ".jpg" + v, "srt": base + ".srt" + v})
    return {"id": tid, "estado": t["estado"], "etapa": t["etapa"], "progresso": round(t.get("progresso", 0), 1),
            "posicao": pos, "titulo": t.get("titulo", ""), "duracao_video": t.get("duracao_video"),
            "total_cortes": t.get("total_cortes", 0), "cortes": cortes, "erro": t.get("erro"), "opc": t["opc"],
            "criado": t["criado"], "avisos": t.get("avisos", []), "expira": expira_em(t), "agora": time.time()}


@app.get("/api/tarefas/{tid}")
def ver(tid: str, req: Request):
    t, _ = da_pessoa(tid, req)
    return publico(t)


@app.get("/api/minhas")
def minhas(req: Request):
    """Lista dos cortes da pessoa (os que ainda não foram apagados)."""
    u = exigir(req)
    out = []
    for p in TAREFAS.iterdir():
        try:
            t = json.loads((p / "tarefa.json").read_text(encoding="utf-8"))
        except Exception:
            continue
        if t.get("dono") != u["id"]:
            continue
        cap = next((f"/api/tarefas/{t['id']}/arquivo/{c['nome']}.jpg?v={c.get('versao', 1)}" for c in t.get("cortes", [])
                    if c.get("estado", "pronto") == "pronto"), "")
        out.append({"id": t["id"], "titulo": t.get("titulo") or t["fonte"].get("nome") or t["fonte"].get("url", ""),
                    "estado": t["estado"], "criado": t["criado"], "expira": expira_em(t), "cortes": len(t.get("cortes", [])),
                    "capa": cap, "duracao": t["opc"].get("duracao")})
    out.sort(key=lambda x: -x["criado"])
    return {"tarefas": out, "agora": time.time(), "guarda_horas": GUARDA_H}


@app.get("/api/tarefas/{tid}/frases")
def frases_da_tarefa(tid: str, req: Request):
    da_pessoa(tid, req)
    try:
        fr = json.loads((caminho(tid) / "transcricao.json").read_text(encoding="utf-8"))["frases"]
    except FileNotFoundError:
        raise HTTPException(404)
    return {"frases": [{"i": i, "s": round(f["s"], 2), "e": round(f["e"], 2), "t": f["t"]} for i, f in enumerate(fr)]}


def post_limpo(v):
    """Legenda do post: {"tiktok","instagram","youtube"} (aceita texto único das tarefas antigas)."""
    if isinstance(v, dict):
        return {k: str(v.get(k) or "").strip()[:900 if k == "instagram" else 400] for k in ("tiktok", "instagram", "youtube")}
    t = str(v or "").strip()[:800]
    return {"tiktok": t, "instagram": t, "youtube": t[:90]}


@app.post("/api/tarefas/{tid}/cortes")
async def novo_corte(tid: str, req: Request):
    return await editar(tid, 0, req)


@app.post("/api/tarefas/{tid}/cortes/{n}")
async def editar(tid: str, n: int, req: Request):
    """Editor: trecho (frase inicial/final/prévia), título, gancho, legenda do post e texto da legenda por frase. n=0 = corte novo."""
    da_pessoa(tid, req)
    b = await req.json()
    pasta = caminho(tid)
    try:
        fr = json.loads((pasta / "transcricao.json").read_text(encoding="utf-8"))["frases"]
    except FileNotFoundError:
        raise HTTPException(404)
    try:
        a, z = int(b["a"]), int(b["b"])
        h = b.get("h")
        h = int(h) if h not in (None, "", -1, "-1") else None
    except (KeyError, TypeError, ValueError):
        return JSONResponse({"erro": "trecho"}, 400)
    if not (0 <= a <= z < len(fr)) or (h is not None and not a <= h <= z):
        return JSONResponse({"erro": "trecho"}, 400)
    dur = fr[z]["e"] - fr[a]["s"]
    if dur < 3 or dur > 400:
        return JSONResponse({"erro": "duracao_trecho"}, 400)
    edicoes = {}
    for k, v in (b.get("edicoes") or {}).items():
        try:
            i = int(k)
        except ValueError:
            continue
        txt = re.sub(r"\s+", " ", str(v)).strip()[:600]
        if a <= i <= z and txt != fr[i]["t"]:
            edicoes[str(i)] = txt
    with trava:
        t = ler(tid)
        if t["estado"] != "pronto":
            return JSONResponse({"erro": "naopronto"}, 409)
        if not t.get("video") or not (pasta / t["video"]).exists():
            return JSONResponse({"erro": "semoriginal"}, 409)
        if any(tt == tid for tt, _ in fila_ed) and sum(1 for tt, _ in fila_ed if tt == tid) >= 5:
            return JSONResponse({"erro": "fila"}, 429)
        if n == 0:
            if len(t["cortes"]) >= 300:  # sem limite prático (pedido do dono 07/11/2026; antes 30)
                return JSONResponse({"erro": "muitos"}, 400)
            n = max([c["n"] for c in t["cortes"]] + [0]) + 1
            reg = {"n": n, "nome": f"corte{n:02d}", "nota": 0, "motivo": "", "versao": 0, "dur": round(dur, 1),
                   "ini": round(fr[a]["s"], 1), "fim": round(fr[z]["e"], 1)}
            t["cortes"].append(reg)
        else:
            reg = next((c for c in t["cortes"] if c["n"] == n), None)
            if reg is None:
                raise HTTPException(404)
            if reg.get("estado") == "fila":
                return JSONResponse({"erro": "refazendo"}, 409)
        reg.update(a=a, b=z, h=h if h != a else None, edicoes=edicoes, estado="fila",
                   titulo=str(b.get("titulo", reg.get("titulo", "")))[:100], gancho=str(b.get("gancho", reg.get("gancho", "")))[:60],
                   post=post_limpo(b.get("post", reg.get("post", ""))))
        t["atualizado"] = time.time()
        gravar(tid, t)
        fila_ed.append((tid, n))
    sinal.set()
    return {"n": n}


@app.api_route("/api/tarefas/{tid}/arquivo/{nome}", methods=["GET", "HEAD"])
def arquivo(tid: str, nome: str, req: Request, baixar: int = 0):
    da_pessoa(tid, req)
    if not re.fullmatch(r"corte\d{2}\.(mp4|jpg|srt)", nome):
        raise HTTPException(404)
    p = caminho(tid) / nome
    if not p.exists():
        raise HTTPException(404)
    tipo = {"mp4": "video/mp4", "jpg": "image/jpeg", "srt": "application/x-subrip"}[nome.rsplit(".", 1)[1]]
    hdr = {"Cache-Control": "private, max-age=86400"}
    if baixar:
        t = ler(tid)
        c = next((c for c in t["cortes"] if nome.startswith(c["nome"])), None)
        bonito = nome_arquivo(c["titulo"] if c else "", nome)
        hdr["Content-Disposition"] = f"attachment; filename=\"{nome}\"; filename*=UTF-8''{urllib.parse.quote(bonito)}"
    return FileResponse(p, media_type=tipo, headers=hdr)


def nome_arquivo(titulo, nome):
    base = re.sub(r"[\\/:*?\"<>|\n\r]+", "", titulo or "").strip()[:70]
    return f"{nome[:7]} - {base}.{nome.rsplit('.', 1)[1]}" if base else nome


@app.get("/api/tarefas/{tid}/zip")
def baixar_zip(tid: str, req: Request):
    t, _ = da_pessoa(tid, req)
    pasta = caminho(tid)
    arqs = [(pasta / f"{c['nome']}.mp4", nome_arquivo(c["titulo"], c["nome"] + ".mp4")) for c in t["cortes"]
            if (pasta / f"{c['nome']}.mp4").exists()]
    if not arqs:
        raise HTTPException(404)

    class Saida:
        def __init__(self):
            self.buf = bytearray()
            self.pos = 0

        def write(self, b):
            self.buf += b
            self.pos += len(b)
            return len(b)

        def tell(self):
            return self.pos

        def flush(self):
            pass

    def gerar():
        s = Saida()
        with zipfile.ZipFile(s, "w", zipfile.ZIP_STORED) as z:
            for p, nome in arqs:
                with z.open(zipfile.ZipInfo(nome, time.localtime(p.stat().st_mtime)[:6]), "w", force_zip64=True) as dst:
                    with open(p, "rb") as src:
                        while True:
                            bloco = src.read(1 << 20)
                            if not bloco:
                                break
                            dst.write(bloco)
                            if s.buf:
                                yield bytes(s.buf)
                                s.buf.clear()
        if s.buf:
            yield bytes(s.buf)
    return StreamingResponse(gerar(), media_type="application/zip",
                             headers={"Content-Disposition": f"attachment; filename=\"cortes-{tid[:6]}.zip\""})


# ----------------------------------------------------------------------------------------------- painel do dono (/dono)
# Senha DONO_SENHA no .env. Dono recebe o Pix pelo WhatsApp e libera a mensalidade aqui (+30 dias).
sessoes_dono = {}  # token -> validade


def eh_dono(req: Request):
    tok = req.cookies.get("dono") or ""
    v = sessoes_dono.get(hashlib.sha256(tok.encode()).hexdigest()) if tok else None
    return bool(v and v > time.time())


@app.post("/api/dono/entrar")
async def dono_entrar(req: Request):
    ip = ip_de(req)
    if not DONO_SENHA or muitas_falhas(ip):
        return JSONResponse({"erro": "tentativas"}, 429)
    b = await req.json()
    if not hmac.compare_digest(str(b.get("senha") or "").encode(), DONO_SENHA.encode()):
        falhas.setdefault(ip, []).append(time.time())
        return JSONResponse({"erro": "senha_errada"}, 400)
    tok = secrets.token_urlsafe(36)
    sessoes_dono[hashlib.sha256(tok.encode()).hexdigest()] = time.time() + 12 * 3600
    r = JSONResponse({"ok": True})
    r.set_cookie("dono", tok, max_age=12 * 3600, httponly=True, secure=True, samesite="strict", path="/api/dono")
    return r


@app.get("/api/dono/contas")
def dono_contas(req: Request):
    if not eh_dono(req):
        return JSONResponse({"erro": "login"}, 401)
    with _db_trava, db() as c:
        rs = c.execute("""SELECT u.id, u.email, u.nome, u.criado, u.pago_ate,
                          (SELECT COUNT(*) FROM testes t WHERE t.usuario = u.id) AS testes,
                          (SELECT MAX(quando) FROM pagamentos p WHERE p.usuario = u.id) AS ultimo_pag
                          FROM usuarios u ORDER BY u.criado DESC""").fetchall()
    return {"agora": time.time(), "preco": PRECO, "contas": [dict(r) for r in rs]}


@app.post("/api/dono/liberar")
async def dono_liberar(req: Request):
    if not eh_dono(req):
        return JSONResponse({"erro": "login"}, 401)
    b = await req.json()
    try:
        uid, dias = int(b.get("id")), int(b.get("dias", 30))
    except (TypeError, ValueError):
        return JSONResponse({"erro": "dados"}, 400)
    if dias < -366 or dias > 366 or dias == 0:
        return JSONResponse({"erro": "dados"}, 400)
    agora = time.time()
    with _db_trava, db() as c:
        r = c.execute("SELECT pago_ate FROM usuarios WHERE id = ?", (uid,)).fetchone()
        if not r:
            return JSONResponse({"erro": "conta"}, 404)
        base = max(agora, r["pago_ate"]) if dias > 0 else r["pago_ate"]
        novo = max(0, base + dias * 86400)
        c.execute("UPDATE usuarios SET pago_ate = ? WHERE id = ?", (novo, uid))
        c.execute("INSERT INTO pagamentos (usuario, dias, quando, obs) VALUES (?, ?, ?, ?)",
                  (uid, dias, agora, str(b.get("obs") or "")[:120]))
    return {"ok": True, "pago_ate": novo}


@app.post("/api/dono/cancelar")
async def dono_cancelar(req: Request):
    if not eh_dono(req):
        return JSONResponse({"erro": "login"}, 401)
    b = await req.json()
    with _db_trava, db() as c:
        c.execute("UPDATE usuarios SET pago_ate = 0 WHERE id = ?", (int(b.get("id") or 0),))
        c.execute("INSERT INTO pagamentos (usuario, dias, quando, obs) VALUES (?, 0, ?, 'cancelado')", (int(b.get("id") or 0), time.time()))
    return {"ok": True}


@app.get("/saude")
def saude():
    return {"ok": True, "fila": len(fila), "rodando": bool(rodando["id"])}


# ----------------------------------------------------------------------------------------------- trabalhador
def processar(tid):
    t = ler(tid)
    pasta = caminho(tid)
    opc = t["opc"]

    def etapa(nome, pct, **kw):
        mudar(tid, estado="rodando", etapa=nome, progresso=pct, **kw)

    def aviso(cod):
        with trava:
            tt = ler(tid)
            if cod not in tt["avisos"]:
                tt["avisos"].append(cod)
                gravar(tid, tt)

    # 1) vídeo
    if t["fonte"]["tipo"] == "link":
        etapa("lendo", 1)
        i = P.info_link(t["fonte"]["url"])
        if i["duracao"] and i["duracao"] > MAX_MIN * 60:
            raise P.Erro("longo")
        mudar(tid, titulo=i["titulo"], miniatura=i["miniatura"])
        video = P.baixar(t["fonte"]["url"], pasta, lambda p: etapa("baixando", 2 + p * 0.18))
    else:
        etapa("preparando", 2)
        origem = ENVIOS / t["fonte"]["envio"] / "arquivo.bin"
        video = pasta / "original.bin"
        shutil.move(str(origem), video)
        shutil.rmtree(ENVIOS / t["fonte"]["envio"], ignore_errors=True)
    try:
        info = P.sondar(video)
    except P.Erro:
        raise
    except Exception:
        raise P.Erro("video")
    if info["dur"] > MAX_MIN * 60 + 30:
        raise P.Erro("longo")
    if not info["audio"]:
        raise P.Erro("semfala")
    mudar(tid, duracao_video=round(info["dur"]))

    # 2) transcrição
    etapa("transcrevendo", 20)
    tr = P.transcrever(video, pasta, opc["lingua"], lambda p: etapa("transcrevendo", 20 + p * 0.25))
    frases = P.montar_frases(tr)
    (pasta / "transcricao.json").write_text(json.dumps({"lingua": tr["lingua"], "por": tr["por"], "frases": frases},
                                                       ensure_ascii=False), encoding="utf-8")

    # 3) IA escolhe os cortes
    etapa("escolhendo", 46)
    cortes = P.escolher_cortes(frases, info["dur"], opc["duracao"], opc["qtd"], t.get("titulo", ""), aviso,
                               opc.get("genero", "auto"), opc.get("instrucoes", ""))
    if not cortes:
        raise P.Erro("semcortes")
    mudar(tid, total_cortes=len(cortes))

    # 4) render
    (pasta / "palavras.json").write_text(json.dumps(tr["palavras"], ensure_ascii=False), encoding="utf-8")
    mudar(tid, video=video.name)
    feitos = []
    for k, c in enumerate(cortes):
        etapa("renderizando", 50 + 50 * k / len(cortes), corte_atual=k + 1)
        reg = {"n": k + 1, "nome": f"corte{k + 1:02d}", "a": c["start"], "b": c["end"],
               "h": c.get("hook_line") if opc["gancho_inicio"] else None, "titulo": c.get("title") or "",
               "gancho": (c.get("hook") or "").strip(), "post": post_limpo(c.get("caption") or ""), "partes": c.get("parts") or {},
               "nota": int(round(float(c.get("score") or 0))),
               "motivo": c.get("why") or "", "edicoes": {}, "versao": 1}
        try:
            render_corte(t, pasta, video, info, frases, tr["palavras"], reg)
        except Exception as e:
            print("render falhou", tid, reg["nome"], e, flush=True)
            aviso("render")
            continue
        feitos.append(reg)
        mudar(tid, cortes=feitos)
    if not feitos:
        raise P.Erro("render")
    mudar(tid, estado="pronto", etapa="pronto", progresso=100, terminado=time.time())


def palavras_editadas(frases, palavras, a, b, edicoes):
    """Palavras do trecho a..b com o texto que o cliente corrigiu. Mesma quantidade de palavras = mantém o tempo de cada uma;
    quantidade diferente = espalha o tempo da frase entre as palavras novas."""
    out = []
    for i in range(a, b + 1):
        f = frases[i]
        orig = palavras[f["i0"]:f["i1"] + 1]
        txt = (edicoes or {}).get(str(i))
        if txt is None:
            out += orig
            continue
        toks = txt.split()
        if not toks:
            continue  # frase apagada da legenda (o áudio continua)
        if len(toks) == len(orig):
            out += [{**w, "w": tk, "p": tk} for w, tk in zip(orig, toks)]
        else:
            passo = (f["e"] - f["s"]) / len(toks)
            out += [{"w": tk, "p": tk, "s": f["s"] + j * passo, "e": f["s"] + (j + 1) * passo - 0.02} for j, tk in enumerate(toks)]
    return out


def render_corte(t, pasta, video, info, frases, palavras, reg):
    c = {"start": reg["a"], "end": reg["b"], "hook_line": reg["h"] if reg.get("h") is not None else reg["a"]}
    trechos = P.trechos_do_corte(frases, c, reg.get("h") is not None, info["dur"])
    pal = palavras_editadas(frases, palavras, reg["a"], reg["b"], reg.get("edicoes"))
    logo = (LOGOS / t["logo"]) if t.get("logo") and (LOGOS / t["logo"]).exists() else None
    dur = P.renderizar(video, info, trechos, t["opc"], pasta, reg["nome"], pal, reg.get("gancho", ""), logo)
    reg.update(dur=round(dur, 1), ini=round(frases[reg["a"]]["s"], 1), fim=round(frases[reg["b"]]["e"], 1), estado="pronto")


def refazer(tid, n):
    t = ler(tid)
    pasta = caminho(tid)
    reg = next(c for c in t["cortes"] if c["n"] == n)
    video = pasta / (t.get("video") or "")
    if not t.get("video") or not video.exists():
        raise P.Erro("semoriginal")
    frases = json.loads((pasta / "transcricao.json").read_text(encoding="utf-8"))["frases"]
    palavras = json.loads((pasta / "palavras.json").read_text(encoding="utf-8"))
    info = P.sondar(video)
    render_corte(t, pasta, video, info, frases, palavras, reg)
    with trava:
        t2 = ler(tid)
        for i, c in enumerate(t2["cortes"]):
            if c["n"] == n:
                reg["versao"] = c.get("versao", 1) + 1
                reg["edicoes"], reg["titulo"], reg["post"] = c.get("edicoes", {}), c.get("titulo", ""), c.get("post", "")
                t2["cortes"][i] = reg
        t2["atualizado"] = time.time()
        gravar(tid, t2)


def trabalhador():
    while True:
        sinal.wait(30)
        sinal.clear()
        while True:
            with trava:
                if fila_ed:
                    tid, n = fila_ed.pop(0)
                    rodando["id"] = tid
                    tipo = "editar"
                elif fila:
                    tid = fila.pop(0)
                    rodando["id"] = tid
                    tipo = "tarefa"
                else:
                    break
            ini = time.time()
            if tipo == "editar":
                try:
                    refazer(tid, n)
                except Exception as e:
                    traceback.print_exc()
                    with trava:
                        try:
                            t2 = ler(tid)
                            for c in t2["cortes"]:
                                if c["n"] == n:
                                    c["estado"] = "erro"
                            gravar(tid, t2)
                        except HTTPException:
                            pass
                finally:
                    with trava:
                        rodando["id"] = None
                continue
            try:
                processar(tid)
            except P.Erro as e:
                mudar(tid, estado="erro", etapa="erro", erro=str(e))
            except Exception as e:
                traceback.print_exc()
                mudar(tid, estado="erro", etapa="erro", erro="falhou", detalhe=str(e)[-500:])
            finally:
                # o original FICA (para o editor refazer cortes) e some junto com a tarefa em GUARDA_HORAS
                (caminho(tid) / "audio16k.wav").unlink(missing_ok=True)
                shutil.rmtree(caminho(tid) / "audio", ignore_errors=True)
                try:
                    if ler(tid)["estado"] == "erro":
                        for lixo in caminho(tid).glob("original.*"):
                            lixo.unlink(missing_ok=True)
                        if ler(tid).get("teste"):
                            devolver_teste(tid)
                except HTTPException:
                    pass
                print(f"tarefa {tid[:8]} terminou em {time.time() - ini:.0f}s", flush=True)
                with trava:
                    rodando["id"] = None


def retomar():
    """Depois de reiniciar: o que estava na fila ou rodando volta para a fila (do começo)."""
    pend = []
    for p in TAREFAS.iterdir():
        try:
            t = json.loads((p / "tarefa.json").read_text(encoding="utf-8"))
        except Exception:
            continue
        for c in t.get("cortes", []):
            if c.get("estado") == "fila":
                fila_ed.append((t["id"], c["n"]))
        if t.get("estado") in ("fila", "rodando"):
            if t["fonte"]["tipo"] == "arquivo" and not (ENVIOS / t["fonte"]["envio"]).exists():
                t.update(estado="erro", etapa="erro", erro="reinicio")
                gravar(t["id"], t)
                if t.get("teste"):
                    devolver_teste(t["id"])
                continue
            t.update(estado="fila", etapa="fila", progresso=0, cortes=[])
            gravar(t["id"], t)
            pend.append((t["criado"], t["id"]))
    with trava:
        fila.extend(tid for _, tid in sorted(pend))


def limpar():
    while True:
        agora = time.time()
        for p in TAREFAS.iterdir():
            try:
                t = json.loads((p / "tarefa.json").read_text(encoding="utf-8"))
                exp = expira_em(t)
                ocupado = rodando["id"] == t["id"] or any(x == t["id"] for x, _ in fila_ed)
                velho = exp is not None and agora > exp and not ocupado
            except Exception:
                velho = agora - p.stat().st_mtime > GUARDA_H * 3600
            if velho:
                shutil.rmtree(p, ignore_errors=True)
        with _db_trava, db() as c:
            c.execute("DELETE FROM sessoes WHERE criado < ?", (agora - SESSAO_DIAS * 86400,))
        for pasta, horas in ((ENVIOS, 6), (LOGOS, GUARDA_H + 2)):
            for p in pasta.iterdir():
                if agora - p.stat().st_mtime > horas * 3600:
                    shutil.rmtree(p, ignore_errors=True) if p.is_dir() else p.unlink(missing_ok=True)
        time.sleep(600)


def atualizar_ytdlp():
    lib = P.LIB
    while True:
        novo = lib + ".novo"
        shutil.rmtree(novo, ignore_errors=True)
        r = subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-U", "--no-cache-dir", "--target", novo,
                            "yt-dlp[default]", "bgutil-ytdlp-pot-provider"], capture_output=True, text=True)
        if r.returncode == 0 and os.path.isdir(os.path.join(novo, "yt_dlp")):
            shutil.rmtree(lib + ".velho", ignore_errors=True)
            if os.path.isdir(lib):
                os.rename(lib, lib + ".velho")
            os.rename(novo, lib)
            shutil.rmtree(lib + ".velho", ignore_errors=True)
        else:
            shutil.rmtree(novo, ignore_errors=True)
            print("atualizar yt-dlp falhou:", r.stderr[-300:], flush=True)
        time.sleep(12 * 3600)


@app.on_event("startup")
def ligar():
    retomar()
    for fn in (trabalhador, limpar, atualizar_ytdlp):
        threading.Thread(target=fn, daemon=True).start()
    sinal.set()


@app.middleware("http")
async def seguranca(req: Request, call_next):
    r = await call_next(req)
    r.headers["X-Content-Type-Options"] = "nosniff"
    r.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if r.headers.get("content-type", "").startswith("text/html"):
        r.headers["Content-Security-Policy"] = ("default-src 'self'; img-src 'self' data: blob: https://i.ytimg.com https://*.tiktokcdn.com "
                                                "https://*.cdninstagram.com; media-src 'self' blob:; style-src 'self'; script-src 'self'; "
                                                "connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'")
        r.headers["Cache-Control"] = "no-cache"
    return r


app.mount("/", StaticFiles(directory=str(PUBLIC), html=True), name="public")
