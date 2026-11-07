"""Teste do plano do HitSlice (roda DENTRO do contêiner de teste, banco vazio)."""
import json, time, urllib.request, urllib.error
B = "http://127.0.0.1:4110"
def req(m, path, corpo=None, ck="", ip="1.1.1.1"):
    h = {"content-type": "application/json", "cf-connecting-ip": ip}
    if ck: h["cookie"] = ck
    r = urllib.request.Request(B + path, data=json.dumps(corpo).encode() if corpo is not None else None, method=m, headers=h)
    try:
        with urllib.request.urlopen(r) as x: return x.status, json.loads(x.read() or b"{}"), x.headers.get_all("set-cookie") or []
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or b"{}"), []
def conta(email, ip="1.1.1.1"):
    s, j, c = req("POST", "/api/conta/criar", {"email": email, "senha": "123456", "nome": "T"}, ip=ip)
    assert s == 200, (s, j); return c[0].split(";")[0]
ok = lambda n, c: print(("OK   " if c else "FALHA"), n)
URL = "https://www.youtube.com/watch?v=jNQXAC9IVRw"
a = conta("a@t.com")
s, j, _ = req("GET", "/api/conta", ck=a); ok("conta nova tem teste", j["plano"]["teste"] and not j["plano"]["ativo"] and j["plano"]["whatsapp"] == "5511919081171" and j["plano"]["preco"] == "59,90")
s, j, _ = req("POST", "/api/tarefas", {"url": URL}, ck=a); ok("1º vídeo (teste) aceito", s == 200); tid = j.get("id")
s, j, _ = req("GET", "/api/conta", ck=a); ok("teste marcado como usado", not j["plano"]["teste"] and j["plano"]["teste_usado"])
s, j, _ = req("POST", "/api/tarefas", {"url": URL}, ck=a); ok("2º vídeo bloqueado (402 assinar)", s == 402 and j.get("erro") == "assinar")
s, j, _ = req("POST", "/api/envio", {"nome": "v.mp4", "tamanho": 1000}, ck=a); ok("envio de arquivo bloqueado antes de subir", s == 402)
s, j, _ = req("POST", "/api/dono/entrar", {"senha": "errada"}); ok("painel: senha errada recusada", s == 400)
s, j, _ = req("GET", "/api/dono/contas"); ok("painel: sem login = 401", s == 401)
s, j, c = req("POST", "/api/dono/entrar", {"senha": "senha-de-teste"}); d = c[0].split(";")[0]; ok("painel: entrar", s == 200)
s, j, _ = req("GET", "/api/dono/contas", ck=d); uid = j["contas"][0]["id"]; ok("painel: lista contas", s == 200 and j["contas"][0]["email"] == "a@t.com" and j["contas"][0]["testes"] == 1)
s, j, _ = req("POST", "/api/dono/liberar", {"id": uid, "dias": 30}, ck=d); ok("painel: +30 dias", s == 200 and 29.9 < (j["pago_ate"] - time.time()) / 86400 < 30.1)
s, j, _ = req("GET", "/api/conta", ck=a); ok("conta ativa depois de liberar", j["plano"]["ativo"])
s, j, _ = req("POST", "/api/dono/liberar", {"id": uid, "dias": 30}, ck=d); ok("painel: +30 soma (60 dias)", 59.9 < (j["pago_ate"] - time.time()) / 86400 < 60.1)
s, j, _ = req("POST", "/api/envio", {"nome": "v.mp4", "tamanho": 1000}, ck=a); ok("ativa: envio liberado", s == 200)
s, j, _ = req("POST", "/api/dono/cancelar", {"id": uid}, ck=d)
s, j, _ = req("GET", "/api/conta", ck=a); ok("cancelada: volta a bloquear", not j["plano"]["ativo"] and not j["plano"]["teste"])
# mesmo IP: no máximo 2 testes de outras contas em 30 dias
b, c2, e = conta("b@t.com", "9.9.9.9"), conta("c@t.com", "9.9.9.9"), conta("e@t.com", "9.9.9.9")
for ck in (b, c2): req("POST", "/api/tarefas", {"url": URL}, ck=ck, ip="9.9.9.9")
s, j, _ = req("GET", "/api/conta", ck=e, ip="9.9.9.9"); ok("3ª conta do mesmo IP sem teste", not j["plano"]["teste"])
s, j, _ = req("GET", "/api/conta", ck=e, ip="8.8.8.8"); ok("mesma conta em outro IP ganha o teste", j["plano"]["teste"])
# vídeo do teste que dá erro devolve o teste
for _ in range(90):
    st = json.load(open(f"/data/tarefas/{tid}/tarefa.json"))["estado"]
    if st in ("erro", "pronto"): break
    time.sleep(2)
s, j, _ = req("GET", "/api/conta", ck=a)
print("estado do vídeo de teste:", st, "| teste de volta:", j["plano"]["teste"])
if st == "erro": ok("erro no vídeo do teste devolve o teste (sem mensalidade, cancelada antes)", j["plano"]["teste"])
