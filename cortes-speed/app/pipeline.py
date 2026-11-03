"""SPEED Cortes — motor dos cortes.

Etapas de uma tarefa:
  1. baixar (yt-dlp, até 1080p) ou usar o arquivo enviado
  2. transcrever com tempo de CADA palavra (Groq whisper-large-v3-turbo; se falhar, faster-whisper local)
  3. separar em frases e pedir para a IA escolher cortes COMPLETOS (começo de ideia -> conclusão) que abrem com GANCHO
  4. conferir/ajustar a duração pelas frases (nunca corta no meio da fala)
  5. para cada corte: seguir o rosto (YuNet/OpenCV) ou fundo desfocado, legenda palavra por palavra (ASS),
     título do gancho no topo, frase de gancho no começo (opcional), marca d'água (texto ou imagem) -> MP4 1080x1920
"""
import json, math, os, re, subprocess, sys, time, shutil
from pathlib import Path

import requests

GROQ_KEY = os.environ.get("GROQ_API_KEY", "").strip()
GROQ_STT = os.environ.get("GROQ_MODELO", "whisper-large-v3-turbo")
GROQ_LLM = os.environ.get("GROQ_LLM", "openai/gpt-oss-120b")
IA_URL = os.environ.get("IA_URL", "http://central-ia-servidor:3970/v1/chat/completions")
IA_KEY = os.environ.get("IA_KEY", "").strip()
FONTES = os.environ.get("FONTES", "/app/fontes")
MODELOS = os.environ.get("MODELOS", "/modelos")
YUNET = os.environ.get("YUNET", "/app/modelos/face_detection_yunet_2023mar.onnx")
THREADS = os.environ.get("FFMPEG_THREADS", "4")
LIB = os.path.join(os.environ.get("DADOS", "/data"), "ytdlp")

# duração escolhida -> (mínimo, máximo) aceitos. O corte acaba numa frase, então nunca é exato.
ALVOS = {30: (20, 45), 60: (45, 80), 120: (90, 150), 300: (230, 330)}
W_OUT, H_OUT = 1080, 1920


class Erro(Exception):
    """Erro com mensagem para mostrar ao cliente."""


# ----------------------------------------------------------------------------------------------- utilidades
def rodar(cmd, timeout=None, cwd=None):
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=cwd)
    if r.returncode != 0:
        raise RuntimeError(f"{cmd[0]} falhou: {(r.stderr or '')[-800:]}")
    return r.stdout


def sondar(arq):
    """Largura/altura JÁ girada (vídeo de celular), duração e fps."""
    j = json.loads(rodar(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", str(arq)], 120))
    v = next((s for s in j.get("streams", []) if s.get("codec_type") == "video"), None)
    a = next((s for s in j.get("streams", []) if s.get("codec_type") == "audio"), None)
    if not v:
        raise Erro("video")
    w, h = int(v.get("width") or 0), int(v.get("height") or 0)
    rot = 0
    try:
        rot = int((v.get("tags") or {}).get("rotate") or 0)
    except ValueError:
        pass
    for sd in v.get("side_data_list") or []:
        if "rotation" in sd:
            try:
                rot = int(float(sd["rotation"]))
            except ValueError:
                pass
    if abs(rot) % 180 == 90:
        w, h = h, w
    dur = float((j.get("format") or {}).get("duration") or v.get("duration") or 0)
    fr = v.get("avg_frame_rate") or v.get("r_frame_rate") or "30/1"
    try:
        n, d = fr.split("/")
        fps = float(n) / float(d) if float(d) else 30.0
    except Exception:
        fps = 30.0
    return {"w": w, "h": h, "dur": dur, "fps": fps or 30.0, "audio": bool(a)}


def mmss(t):
    t = max(0, t)
    return f"{int(t // 60):02d}:{t % 60:04.1f}"


# ----------------------------------------------------------------------------------------------- download
def env_ytdlp():
    e = dict(os.environ)
    if os.path.isdir(os.path.join(LIB, "yt_dlp")):
        e["PYTHONPATH"] = LIB
    return e


YT_EXTRAS = ["--extractor-args", "youtube:player_client=" + os.environ.get("YT_CLIENTE", "mweb"),
             "--extractor-args", "youtubepot-bgutilhttp:base_url=" + os.environ.get("POT_URL", "http://baixador-pot:4416")]


def ytdlp_cmd(args):
    return [sys.executable, "-m", "yt_dlp", "--no-playlist", "--no-warnings", *YT_EXTRAS, *args]


def erro_ytdlp(t):
    t = t or ""
    if "Private video" in t:
        return "privado"
    if "confirm your age" in t or "age-restricted" in t:
        return "idade"
    if "not a bot" in t:
        return "robo"
    if "members-only" in t or "Join this channel" in t:
        return "membros"
    if "live event" in t or "is live" in t:
        return "aovivo"
    if "unavailable" in t.lower() or "not available" in t.lower():
        return "indisponivel"
    return "baixar"


def info_link(url):
    r = subprocess.run(ytdlp_cmd(["-J", "--", url]), capture_output=True, text=True, timeout=90, env=env_ytdlp())
    if r.returncode != 0:
        raise Erro(erro_ytdlp(r.stderr))
    j = json.loads(r.stdout)
    if j.get("is_live"):
        raise Erro("aovivo")
    return {"titulo": j.get("title") or "", "duracao": float(j.get("duration") or 0),
            "miniatura": j.get("thumbnail") or "", "canal": j.get("uploader") or j.get("channel") or ""}


def baixar(url, pasta, progresso):
    saida = Path(pasta) / "original.%(ext)s"
    cmd = ytdlp_cmd(["-f", "bv*[height<=1080]+ba/b[height<=1080]/bv*+ba/b",
                     "-S", "res:1080,vcodec:h264,acodec:m4a", "--merge-output-format", "mp4",
                     "--newline", "--progress-template", "download:PCT %(progress._percent_str)s",
                     "-o", str(saida), "--", url])
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=env_ytdlp())
    log, parte = [], 0
    for linha in p.stdout:
        log.append(linha)
        log = log[-60:]
        m = re.search(r"PCT\s*([\d.]+)%", linha)
        if m:
            pct = float(m.group(1))
            if pct < 1 and parte == 0:
                pass
            progresso(min(99.0, pct))
        if "[download] Destination" in linha:
            parte += 1
    p.wait()
    if p.returncode != 0:
        raise Erro(erro_ytdlp("".join(log)))
    arqs = [a for a in Path(pasta).glob("original.*") if a.suffix not in (".part", ".ytdl") and ".f" not in a.stem]
    if not arqs:
        raise Erro("baixar")
    return arqs[0]


# ----------------------------------------------------------------------------------------------- transcrição
NOME_LINGUA = {"portuguese": "pt", "english": "en", "spanish": "es", "french": "fr", "italian": "it", "german": "de",
               "japanese": "ja", "korean": "ko", "chinese": "zh"}


def transcrever(video, pasta, lingua, progresso):
    """Devolve {"lingua", "palavras": [{w,s,e}], "segmentos": [{s,e,t}], "por"}."""
    if GROQ_KEY:
        try:
            return transcrever_groq(video, pasta, lingua, progresso)
        except Exception as e:  # cota acabou, rede... cai no local
            print("groq falhou, indo para o whisper local:", e, flush=True)
    return transcrever_local(video, pasta, lingua, progresso)


def transcrever_groq(video, pasta, lingua, progresso):
    tmp = Path(pasta) / "audio"
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir()
    BLOCO = 1200  # 20 min por envio (~3,6 MB em 24 kbps; limite grátis 25 MB)
    rodar(["ffmpeg", "-y", "-v", "error", "-i", str(video), "-vn", "-ac", "1", "-ar", "16000", "-c:a", "libopus",
           "-b:a", "24k", "-f", "segment", "-segment_time", str(BLOCO), "-reset_timestamps", "1",
           str(tmp / "p%03d.ogg")], 3600)
    partes = sorted(tmp.glob("p*.ogg"))
    if not partes:
        raise RuntimeError("sem áudio")
    lang = lingua if lingua and lingua != "auto" else None
    palavras, segs = [], []
    for i, arq in enumerate(partes):
        progresso(100 * i / len(partes))
        dados = [("model", GROQ_STT), ("response_format", "verbose_json"), ("temperature", "0"),
                 ("timestamp_granularities[]", "word"), ("timestamp_granularities[]", "segment")]
        if lang:
            dados.append(("language", lang))
        resp = None
        for tent in range(5):
            with open(arq, "rb") as fh:
                resp = requests.post("https://api.groq.com/openai/v1/audio/transcriptions",
                                     headers={"Authorization": f"Bearer {GROQ_KEY}"}, data=dados,
                                     files={"file": (arq.name, fh, "audio/ogg")}, timeout=600)
            if resp.status_code in (429, 500, 502, 503) and tent < 4:
                espera = float(resp.headers.get("retry-after") or 20)
                if espera > 180:
                    break  # cota do dia/hora acabou: vai para o local
                time.sleep(espera + 1)
                continue
            break
        if resp is None or resp.status_code != 200:
            raise RuntimeError(f"groq {resp.status_code if resp is not None else '?'}: {resp.text[:200] if resp is not None else ''}")
        j = resp.json()
        if lang is None:
            l = str(j.get("language") or "").lower()
            lang = NOME_LINGUA.get(l, l[:2] if l else "pt")
        off = i * BLOCO
        for w in j.get("words") or []:
            txt = (w.get("word") or "").strip()
            if txt:
                palavras.append({"w": txt, "s": round(off + float(w["start"]), 3), "e": round(off + float(w["end"]), 3)})
        for sg in j.get("segments") or []:
            txt = (sg.get("text") or "").strip()
            if sg.get("no_speech_prob", 0) > 0.6 and sg.get("avg_logprob", 0) < -1:
                continue  # Whisper "inventando" no silêncio
            if txt:
                segs.append({"s": round(off + float(sg["start"]), 3), "e": round(off + float(sg["end"]), 3), "t": txt})
    shutil.rmtree(tmp, ignore_errors=True)
    if not palavras and not segs:
        raise Erro("semfala")
    if not palavras:  # sem tempo por palavra: reparte o tempo de cada segmento
        palavras = palavras_de_segmentos(segs)
    return {"lingua": lang or "pt", "palavras": palavras, "segmentos": segs, "por": "groq"}


_WH = {"m": None}


def transcrever_local(video, pasta, lingua, progresso):
    from faster_whisper import WhisperModel
    if _WH["m"] is None:
        local = os.path.join(MODELOS, "faster-whisper-small")
        _WH["m"] = WhisperModel(local if os.path.isdir(local) else "small", device="cpu", compute_type="int8",
                                cpu_threads=int(os.environ.get("WHISPER_THREADS", "4")))
    wav = Path(pasta) / "audio16k.wav"
    rodar(["ffmpeg", "-y", "-v", "error", "-i", str(video), "-vn", "-ac", "1", "-ar", "16000", str(wav)], 3600)
    dur = max(1.0, sondar_audio(wav))
    segs_it, info = _WH["m"].transcribe(str(wav), language=None if lingua in (None, "", "auto") else lingua,
                                        word_timestamps=True, vad_filter=True, beam_size=1)
    palavras, segs = [], []
    for sg in segs_it:
        t = (sg.text or "").strip()
        if t:
            segs.append({"s": round(sg.start, 3), "e": round(sg.end, 3), "t": t})
        for w in sg.words or []:
            txt = (w.word or "").strip()
            if txt:
                palavras.append({"w": txt, "s": round(w.start, 3), "e": round(w.end, 3)})
        progresso(min(99.0, 100 * sg.end / dur))
    wav.unlink(missing_ok=True)
    if not palavras:
        raise Erro("semfala")
    return {"lingua": info.language or "pt", "palavras": palavras, "segmentos": segs, "por": "local"}


def sondar_audio(arq):
    try:
        return float(rodar(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(arq)], 60).strip())
    except Exception:
        return 0.0


def palavras_de_segmentos(segs):
    out = []
    for sg in segs:
        toks = sg["t"].split()
        if not toks:
            continue
        passo = (sg["e"] - sg["s"]) / len(toks)
        for i, tk in enumerate(toks):
            out.append({"w": tk, "s": sg["s"] + i * passo, "e": sg["s"] + (i + 1) * passo})
    return out


# ----------------------------------------------------------------------------------------------- frases
FIM = re.compile(r"[.!?…]+[\"')\]]*$")


def montar_frases(tr):
    """Frases com início/fim pelo tempo das palavras. A pontuação vem do texto dos segmentos (as palavras da Groq vêm sem)."""
    palavras, segs = tr["palavras"], tr["segmentos"]
    # Pontuação: alinha as palavras de cada segmento com os tokens do texto do segmento (quando a contagem bate).
    pont = [p["w"] for p in palavras]
    j = 0
    for sg in segs:
        idx = []
        while j < len(palavras) and palavras[j]["s"] < sg["e"] - 0.02:
            if palavras[j]["e"] > sg["s"] - 0.3:
                idx.append(j)
            j += 1
        toks = sg["t"].split()
        if idx and len(toks) == len(idx):
            for k, i in enumerate(idx):
                pont[i] = toks[k]
        elif idx:  # contagem diferente: pelo menos marca o fim do segmento com a pontuação final dele
            m = FIM.search(sg["t"].strip())
            if m and not re.search(r"[.!?…,;:]$", pont[idx[-1]]):
                pont[idx[-1]] = pont[idx[-1]] + m.group(0)[0]
    frases, atual = [], []

    def fecha():
        if atual:
            frases.append({"s": palavras[atual[0]]["s"], "e": palavras[atual[-1]]["e"],
                           "t": " ".join(pont[i] for i in atual), "i0": atual[0], "i1": atual[-1]})
            atual.clear()

    for i, p in enumerate(palavras):
        if atual and p["s"] - palavras[atual[-1]]["e"] > 1.2:
            fecha()
        atual.append(i)
        n = len(atual)
        if FIM.search(pont[i]) and n >= 3:
            fecha()
        elif n >= 28 and pont[i].endswith((",", ";", ":")):
            fecha()
        elif n >= 40:
            fecha()
    fecha()
    for p, w in zip(palavras, pont):
        p["p"] = w  # palavra com pontuação (usada nas legendas)
    return frases


# ----------------------------------------------------------------------------------------------- IA (escolha dos cortes)
def ia(mensagens, max_tokens=6000):
    """Central IA do servidor (troca sozinha entre as IAs grátis) e, se falhar, Groq direto."""
    erros = []
    if IA_KEY:
        try:
            r = requests.post(IA_URL, timeout=300, headers={"Authorization": f"Bearer {IA_KEY}"},
                              json={"model": "central-ia", "messages": mensagens, "temperature": 0.4, "max_tokens": max_tokens})
            if r.status_code == 200:
                txt = r.json()["choices"][0]["message"]["content"]
                if txt and "{" in txt:
                    return txt
            erros.append(f"central {r.status_code} {r.text[:150]}")
        except Exception as e:
            erros.append(f"central {e}")
    if GROQ_KEY:
        for tent in range(3):
            try:
                r = requests.post("https://api.groq.com/openai/v1/chat/completions", timeout=300,
                                  headers={"Authorization": f"Bearer {GROQ_KEY}"},
                                  json={"model": GROQ_LLM, "messages": mensagens, "temperature": 0.4, "max_tokens": max_tokens,
                                        "reasoning_effort": "low", "response_format": {"type": "json_object"}})
                if r.status_code == 200:
                    return r.json()["choices"][0]["message"]["content"]
                erros.append(f"groq {r.status_code} {r.text[:150]}")
                if r.status_code == 429:
                    time.sleep(min(60, float(r.headers.get("retry-after") or 20)) + 1)
                    continue
            except Exception as e:
                erros.append(f"groq {e}")
            break
    raise RuntimeError("IA indisponível: " + " | ".join(erros))


def ler_json(txt):
    txt = re.sub(r"^```(?:json)?|```$", "", txt.strip(), flags=re.M).strip()
    a, b = txt.find("{"), txt.rfind("}")
    if a < 0 or b < a:
        raise ValueError("sem json")
    return json.loads(txt[a:b + 1])


SISTEMA = """You are a senior short-form video editor (TikTok, Instagram Reels, YouTube Shorts), as good as Opus Clip.
You read a timestamped transcript and pick the clips with the highest chance of going viral.
Hard rules for EVERY clip:
1. SELF-CONTAINED: someone who never saw the video understands it. It starts at the beginning of a thought (never mid-sentence,
   never starting with a reference to something said before like "and then he", "that's why", "as I said") and it ends
   on a payoff: conclusion, answer, punchline, lesson or strong reaction. Never end in the middle of an explanation.
2. HOOK: the first line must grab attention in the first 3 seconds: a question, a bold or controversial claim, a surprising
   number/fact, a strong emotion, a promise ("the mistake that...", "nobody tells you..."), a conflict or a story opening.
   If the strongest hook sentence is in the middle of the clip, give its line number in hook_line (it will be shown first as a teaser).
3. LENGTH: respect the requested duration range, computed from the timestamps (start of first line to end of last line).
4. No overlapping clips. Prefer variety (different topics/moments).
Write title, hook and caption in the SAME LANGUAGE as the transcript. Answer with JSON only."""


# Tipo de vídeo escolhido pelo cliente: muda o que a IA procura (cada um com a sua ideia de "bom corte" e de gancho).
GENEROS = {
    "auto": "First figure out what kind of video this is (podcast, comedy, class, speech, story, news, sales, react...) and apply the best strategy for that kind.",
    "podcast": ("PODCAST / INTERVIEW / TALK SHOW. Map the conversation into its separate STORIES, topics and arguments first. "
                "Each clip = ONE complete story or topic (setup -> development -> payoff: punchline, lesson, revelation or opinion). "
                "For long clips (2-5 min) keep the whole story arc; for short clips (30 s - 1 min) take the sharpest moment of a story "
                "(confession, strong opinion, revelation, funny line, disagreement) but still with its context. "
                "Prefer personal stories, controversial opinions, secrets/revelations, advice and moments where the guests react. "
                "Hook: the most intriguing sentence of that story (a question, a confession, a bold claim)."),
    "comedia": ("COMEDY (stand-up, sketch, funny podcast, pranks, roasts). Pick the FUNNIEST moments. Each clip needs the full setup AND "
                "the punchline, and must end AFTER the laugh/reaction lands (never cut the laugh). Prefer absurd situations, comebacks, "
                "roasts, awkward moments and running jokes that pay off inside the clip. Hook: the funniest/most absurd line or the premise "
                "(use hook_line to show the punchline first as a teaser when it makes people want to see how it happened)."),
    "educativo": ("EDUCATIONAL / CLASS / TUTORIAL. Each clip teaches ONE complete idea, tip, step or concept with its explanation and "
                  "conclusion (the viewer must learn something whole). Prefer practical tips, myths debunked, numbers, mistakes to avoid, "
                  "before/after. Hook: the problem, a surprising fact or a promise (\"the mistake that...\", \"nobody tells you...\")."),
    "motivacional": ("MOTIVATIONAL / SPEECH / PREACHING. Pick the most emotional, quotable passages with one clear message and a strong "
                     "ending line. Prefer personal struggle, turning points and calls to action. Hook: the most quotable sentence."),
    "historia": ("STORYTIME / VLOG. Each clip = a complete mini story with beginning, twist/conflict and ending. Prefer surprising, "
                 "emotional or embarrassing stories. Hook: the most intriguing moment of the story (what happened), as a teaser if needed."),
    "noticias": ("NEWS / COMMENTARY / DEBATE. Each clip = one complete topic or argument. Prefer controversial takes, clashes between "
                 "people, shocking facts and clear conclusions. Hook: the controversy or the most shocking fact."),
    "vendas": ("SALES / PRODUCT / REVIEW / BUSINESS. Pick moments with a clear pain point, benefit, demonstration, result/before-after, "
               "objection answered or offer. Hook: the pain or the result."),
    "react": ("REACT / GAMEPLAY / LIVE STREAM. Pick the emotional peaks: big reactions, plays, fails, rage, surprises, with the build-up "
              "right before the peak. Hook: the peak itself (use hook_line to tease it first)."),
}


def pedir_cortes(frases, ini, fim, qtd, lo, hi, alvo, titulo, genero="auto", extra=""):
    linhas = [f"[{i}] {mmss(f['s'])}-{mmss(f['e'])} | {f['t']}" for i, f in enumerate(frases) if f["s"] >= ini and f["e"] <= fim]
    pedido = f"""Video title: {titulo or "(unknown)"}
Type of video and strategy: {GENEROS.get(genero, GENEROS["auto"])}
""" + (f"Extra wishes from the client (follow them if possible, but never break the hard rules): {extra}\n" if extra else "") + f"""Pick up to {qtd} clips. Each clip must last between {lo} and {hi} seconds (ideal ~{alvo} s).
Return: {{"clips":[{{"start": first line number, "end": last line number, "hook_line": line number of the strongest hook inside the clip,
"title": "catchy title, max 60 chars", "hook": "on-screen hook text, max 45 chars, makes people keep watching",
"caption": "post caption with 3-5 hashtags", "score": 0-100 virality, "why": "one short sentence"}}]}}

Transcript (line number, start-end, text):
""" + "\n".join(linhas)
    txt = ia([{"role": "system", "content": SISTEMA}, {"role": "user", "content": pedido}])
    return ler_json(txt).get("clips") or []


def duracao(frases, a, b):
    return frases[b]["e"] - frases[a]["s"]


def ajustar(frases, a, b, lo, hi):
    """Mantém o corte em frases inteiras e dentro da faixa de duração."""
    n = len(frases)
    a, b = max(0, min(a, n - 1)), max(0, min(b, n - 1))
    if b < a:
        a, b = b, a
    while duracao(frases, a, b) < lo and b + 1 < n and duracao(frases, a, b + 1) <= hi:
        b += 1
    while duracao(frases, a, b) < lo and a > 0 and duracao(frases, a - 1, b) <= hi:
        a -= 1
    while duracao(frases, a, b) > hi and b > a:
        b -= 1
    # prefere terminar numa frase com pontuação final (fecha a ideia)
    if not FIM.search(frases[b]["t"]):
        for nb in (b + 1, b - 1, b + 2):
            if a <= nb < n and FIM.search(frases[nb]["t"]) and lo <= duracao(frases, a, nb) <= hi:
                b = nb
                break
    return a, b


def heuristica(frases, qtd, lo, hi, alvo):
    """Sem IA: janelas que começam com pergunta/exclamação e têm mais pontuação forte."""
    cands = []
    for a in range(len(frases)):
        b = a
        while b + 1 < len(frases) and duracao(frases, a, b + 1) <= alvo:
            b += 1
        a2, b2 = ajustar(frases, a, b, lo, hi)
        if not (lo <= duracao(frases, a2, b2) <= hi):
            continue
        txt = " ".join(f["t"] for f in frases[a2:b2 + 1])
        nota = 50 + 15 * ("?" in frases[a2]["t"]) + 5 * txt.count("!") + 3 * txt.count("?")
        cands.append({"start": a2, "end": b2, "hook_line": a2, "title": frases[a2]["t"][:60], "hook": frases[a2]["t"][:45],
                      "caption": "", "score": min(95, nota), "why": ""})
    return escolher_sem_sobrepor(frases, cands, qtd)


def escolher_sem_sobrepor(frases, cands, qtd):
    cands.sort(key=lambda c: -float(c.get("score") or 0))
    out = []
    for c in cands:
        s, e = frases[c["start"]]["s"], frases[c["end"]]["e"]
        if all(e <= frases[o["start"]]["s"] + 1 or s >= frases[o["end"]]["e"] - 1 for o in out):
            out.append(c)
        if len(out) >= qtd:
            break
    return out


def escolher_cortes(frases, dur_video, alvo, qtd, titulo, aviso, genero="auto", extra=""):
    lo, hi = ALVOS[alvo]
    if not frases:
        raise Erro("semfala")
    total = frases[-1]["e"] - frases[0]["s"]
    if total < lo:  # vídeo curto demais: um corte só com tudo
        return [{"start": 0, "end": len(frases) - 1, "hook_line": 0, "title": titulo[:60], "hook": "", "caption": "",
                 "score": 60, "why": ""}]
    if not qtd:
        qtd = max(1, min(10, int(total / (alvo * 2.5)) or 1))
        if genero == "podcast":  # podcast: um corte por história; mais cortes no automático
            qtd = max(1, min(15, int(total / (alvo * 1.6)) or 1))
    # janelas de ~25 min (texto cabe folgado em qualquer IA) com sobreposição de um corte
    JAN = 1500
    janelas, t = [], frases[0]["s"]
    while t < frases[-1]["e"]:
        janelas.append((t, t + JAN + hi))
        t += JAN
    cands = []
    for (ini, fim) in janelas:
        q = max(2, math.ceil(qtd * min(1.0, (fim - ini) / max(total, 1)) * 1.6))
        try:
            brutos = pedir_cortes(frases, ini, fim, q, lo, hi, alvo, titulo, genero, extra)
        except Exception as e:
            print("IA falhou na janela", ini, e, flush=True)
            aviso("ia")
            continue
        for c in brutos:
            try:
                a, b = int(c.get("start")), int(c.get("end"))
            except (TypeError, ValueError):
                continue
            if not (0 <= a < len(frases)) or not (0 <= b < len(frases)):
                continue
            a, b = ajustar(frases, a, b, lo, hi)
            d = duracao(frases, a, b)
            if d < lo * 0.8 or d > hi * 1.1:
                continue
            try:
                h = int(c.get("hook_line", a))
            except (TypeError, ValueError):
                h = a
            cands.append({"start": a, "end": b, "hook_line": h if a <= h <= b else a,
                          "title": str(c.get("title") or "")[:80], "hook": str(c.get("hook") or "")[:60],
                          "caption": str(c.get("caption") or "")[:600], "score": float(c.get("score") or 50),
                          "why": str(c.get("why") or "")[:200]})
    out = escolher_sem_sobrepor(frases, cands, qtd)
    if len(out) < qtd:  # completa com a heurística se a IA trouxe pouco
        extra = heuristica(frases, qtd * 3, lo, hi, alvo)
        for c in extra:
            if len(out) >= qtd:
                break
            s, e = frases[c["start"]]["s"], frases[c["end"]]["e"]
            if all(e <= frases[o["start"]]["s"] + 1 or s >= frases[o["end"]]["e"] - 1 for o in out):
                c["score"] = min(c["score"], 55)
                out.append(c)
    out.sort(key=lambda c: -c["score"])
    return out


# ----------------------------------------------------------------------------------------------- trechos e tempo
def trechos_do_corte(frases, c, gancho_inicio, dur_video):
    """Lista de (ini, fim) do vídeo original que formam o corte. Com gancho: a frase mais forte vem antes (teaser)."""
    a, b = c["start"], c["end"]
    ini = max(0.0, frases[a]["s"] - 0.15)
    if a > 0:
        ini = max(ini, frases[a - 1]["e"] + 0.02)
    fim = frases[b]["e"] + 0.4
    if b + 1 < len(frases):
        fim = min(fim, frases[b + 1]["s"] - 0.03)
    fim = min(fim, dur_video)
    trechos = [(ini, fim)]
    h = c.get("hook_line", a)
    if gancho_inicio and a < h <= b:
        fh = frases[h]
        if 1.2 <= fh["e"] - fh["s"] <= 7 and fh["s"] - frases[a]["s"] > 4:
            trechos.insert(0, (max(0.0, fh["s"] - 0.08), min(dur_video, fh["e"] + 0.25)))
    return trechos


def mapear(t, trechos):
    """Tempo do original -> lista de tempos no corte final (a frase do gancho aparece 2 vezes)."""
    out, base = [], 0.0
    for (s, e) in trechos:
        if s <= t < e:
            out.append(base + t - s)
        base += e - s
    return out


# ----------------------------------------------------------------------------------------------- rosto
_DET = {}


def detector(w, h):
    """Devolve achar(img) -> [(x, y, w, h, score, (mx0, my0, mx1, my1) = região da boca)]."""
    import cv2
    if os.path.exists(YUNET):
        d = _DET.get("yunet")
        if d is None:
            d = cv2.FaceDetectorYN.create(YUNET, "", (w, h), 0.6, 0.3, 50)
            _DET["yunet"] = d
        d.setInputSize((w, h))

        def achar(img):
            _, f = d.detect(img)
            if f is None:
                return []
            out = []
            for x in f:
                fx, fy, fw, fh = (float(v) for v in x[:4])
                rx, ry, lx, ly = float(x[10]), float(x[11]), float(x[12]), float(x[13])  # cantos da boca
                dist = max(4.0, abs(lx - rx))
                cx, cy = (rx + lx) / 2, (ry + ly) / 2
                boca = (cx - dist * 0.8, cy - dist * 0.45, cx + dist * 0.8, cy + dist * 0.6)
                out.append((fx, fy, fw, fh, float(x[-1]), boca))
            return out
        return achar
    casc = _DET.get("haar")
    if casc is None:
        casc = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        _DET["haar"] = casc

    def achar2(img):
        g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        f = casc.detectMultiScale(g, 1.15, 5, minSize=(24, 24))
        return [(float(x), float(y), float(a), float(b), 0.8, (x + a * 0.25, y + b * 0.68, x + a * 0.75, y + b * 0.95))
                for (x, y, a, b) in f]
    return achar2


def trilha_rosto(video, trechos, W, H, fps_am=6.0):
    """Amostra o vídeo (6 por segundo) e devolve os rostos de cada amostra com a "atividade da boca"
    (quanto a região da boca mudou desde a amostra anterior = quem está falando) e os cortes de cena."""
    import numpy as np, cv2
    LW = 640
    LH = int(round(H * LW / W / 2) * 2)
    achar = detector(LW, LH)
    pontos, com_rosto, com_dois, total, base = [], 0, 0, 0, 0.0
    for (s, e) in trechos:
        cmd = ["ffmpeg", "-v", "error", "-ss", f"{s:.3f}", "-t", f"{e - s:.3f}", "-i", str(video),
               "-vf", f"fps={fps_am},scale={LW}:{LH}", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"]
        p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        tam = LW * LH * 3
        k, ant, ant_g = 0, None, None
        while True:
            buf = p.stdout.read(tam)
            if len(buf) < tam:
                break
            img = np.frombuffer(buf, np.uint8).reshape(LH, LW, 3)
            g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            t = base + k / fps_am
            k += 1
            total += 1
            peq = cv2.resize(g, (64, 36)).astype(np.float32)
            dif_geral = float(np.mean(np.abs(peq - ant))) if ant is not None else 0.0
            corte = ant is not None and dif_geral > 28
            ant = peq
            faces = []
            for (fx, fy, fw, fh, sc, boca) in achar(img):
                if fw * fh < (LW * LH) * 0.003:
                    continue
                act = 0.0
                if ant_g is not None and not corte:
                    x0, y0 = max(0, int(boca[0])), max(0, int(boca[1]))
                    x1, y1 = min(LW, int(boca[2]) + 1), min(LH, int(boca[3]) + 1)
                    if x1 - x0 >= 3 and y1 - y0 >= 3:
                        a1 = cv2.resize(g[y0:y1, x0:x1], (24, 16)).astype(np.float32)
                        a0 = cv2.resize(ant_g[y0:y1, x0:x1], (24, 16)).astype(np.float32)
                        act = max(0.0, float(np.mean(np.abs(a1 - a0))) - dif_geral * 0.8)
                faces.append({"x": (fx + fw / 2) / LW, "y": (fy + fh / 2) / LH, "a": fw * fh / (LW * LH), "h": fh / LH, "act": act})
            ant_g = g
            if faces:
                com_rosto += 1
                grandes = [f for f in faces if f["a"] >= max(x["a"] for x in faces) * 0.3]
                if len(grandes) >= 2:
                    com_dois += 1
            pontos.append({"t": t, "faces": faces, "corte": corte})
        p.wait()
        if pontos:
            pontos[-1]["fim_trecho"] = True
        base += e - s
    return pontos, (com_rosto / total if total else 0.0), (com_dois / total if total else 0.0)


def suavizar(saida):
    """Média móvel curta que não atravessa pulos (corte de cena / troca de quem fala)."""
    lisa = []
    for i, (t, x, pulo) in enumerate(saida):
        viz = [x]
        for d in (1, 2, 3):
            for j in (i - d, i + d):
                if 0 <= j < len(saida):
                    entre = range(min(i, j) + 1, max(i, j) + 1)
                    if not any(saida[k][2] for k in entre):
                        viz.append(saida[j][1])
        lisa.append((t, sum(viz) / len(viz), pulo))
    return lisa


def caminho_camera(pontos, W, H):
    """Câmera que segue QUEM ESTÁ FALANDO: cada rosto vira uma "trilha"; com 2+ pessoas na tela, vence a trilha com mais
    movimento de boca (média), com folga para não ficar pulando; troca de pessoa = corte seco (como editor faz).
    Mesma pessoa: anda suave e só quando o rosto sai da zona central."""
    cw = H * 9 / 16
    meio = cw / 2 / W
    trilhas, falante, cam, alvo, saida = [], None, None, None, []
    for i, p in enumerate(pontos):
        pulo = p["corte"] or (i > 0 and pontos[i - 1].get("fim_trecho"))
        if pulo:
            trilhas, falante = [], None
        faces = p["faces"]
        if faces:
            maior = max(f["a"] for f in faces)
            faces = [f for f in faces if f["a"] >= maior * 0.3]  # ignora plateia/rosto pequeno no fundo
        usadas = set()
        for f in sorted(faces, key=lambda f: -f["a"]):
            livres = [tr for tr in trilhas if id(tr) not in usadas and abs(tr["x"] - f["x"]) < 0.09]
            tr = min(livres, key=lambda tr: abs(tr["x"] - f["x"])) if livres else None
            if tr is None:
                tr = {"x": f["x"], "ema": f["act"], "seq": 0}
                trilhas.append(tr)
            else:
                tr["x"] = tr["x"] * 0.5 + f["x"] * 0.5
                tr["ema"] = tr["ema"] * 0.75 + f["act"] * 0.25
            tr["ult"] = i
            usadas.add(id(tr))
        trilhas = [tr for tr in trilhas if i - tr.get("ult", i) <= 12]
        vis = [tr for tr in trilhas if tr.get("ult") == i]
        troca = False
        if len(vis) == 1:
            if falante is not None and falante is not vis[0] and falante in trilhas:
                pass  # o falante sumiu só neste quadro (virou o rosto): segura
            else:
                troca = falante is not None and falante is not vis[0]
                falante = vis[0]
        elif len(vis) >= 2:
            if falante not in vis:
                falante = max(vis, key=lambda tr: tr["ema"])
            else:
                cand = max(vis, key=lambda tr: tr["ema"])
                if cand is not falante and cand["ema"] > falante["ema"] * 1.4 + 0.8:
                    cand["seq"] += 1
                    if cand["seq"] >= 5:  # ~0,8 s falando mais que o atual
                        falante, troca = cand, True
                        for tr in vis:
                            tr["seq"] = 0
                else:
                    for tr in vis:
                        tr["seq"] = 0
        if falante is not None:
            alvo = falante["x"]
        elif alvo is None:
            alvo = 0.5
        if cam is None or pulo or (troca and abs(alvo - cam) > meio * 0.6):
            cam, pulo = alvo, True if cam is not None else pulo
        else:
            dif = alvo - cam
            if abs(dif) > meio * 0.35:
                cam += dif * 0.3
        cam = min(max(cam, meio), 1 - meio)
        saida.append((p["t"], cam, bool(pulo)))
    return suavizar(saida)


def caminho_dividido(pontos):
    """Tela dividida: as duas pessoas maiores, a da esquerda em cima e a da direita embaixo (cada uma com a sua trilha)."""
    esq, dir_, ys_e, ys_d, hs, sa_e, sa_d = None, None, [], [], [], [], []
    for i, p in enumerate(pontos):
        pulo = p["corte"] or (i > 0 and pontos[i - 1].get("fim_trecho"))
        fs = sorted(p["faces"], key=lambda f: -f["a"])[:2]
        if len(fs) == 2 and fs[1]["a"] >= fs[0]["a"] * 0.3:
            l, r = sorted(fs, key=lambda f: f["x"])
            esq = l["x"] if (esq is None or pulo) else esq * 0.6 + l["x"] * 0.4
            dir_ = r["x"] if (dir_ is None or pulo) else dir_ * 0.6 + r["x"] * 0.4
            ys_e.append(l["y"]); ys_d.append(r["y"]); hs += [l["h"], r["h"]]
        sa_e.append((p["t"], esq if esq is not None else 0.3, bool(pulo)))
        sa_d.append((p["t"], dir_ if dir_ is not None else 0.7, bool(pulo)))
    # o começo (antes de achar as duas) herda a primeira posição boa
    pe = next((x for _, x, _ in sa_e if x != 0.3), 0.3)
    pd = next((x for _, x, _ in sa_d if x != 0.7), 0.7)
    sa_e = [(t, x if x != 0.3 else pe, pu) for t, x, pu in sa_e]
    sa_d = [(t, x if x != 0.7 else pd, pu) for t, x, pu in sa_d]
    med = lambda v, d: sorted(v)[len(v) // 2] if v else d
    return suavizar(sa_e), suavizar(sa_d), med(ys_e, 0.4), med(ys_d, 0.4), med(hs, 0.2)


def comandos_crop(lisa, W, H, cw, alvo="crop", eixo="x"):
    """Linhas do sendcmd com a posição do crop ao longo do tempo (interpolado ~18 vezes por segundo)."""
    linhas, ult = [], None
    maxx = W - cw
    for i, (t, x, pulo) in enumerate(lisa):
        prox = lisa[i + 1] if i + 1 < len(lisa) else None
        passos = 1 if (prox is None or prox[2]) else 3
        for k in range(passos):
            if prox is None or prox[2]:
                xx, tt = x, t
            else:
                f = k / passos
                xx, tt = x + (prox[1] - x) * f, t + (prox[0] - t) * f
            px = int(round(min(max(xx * W - cw / 2, 0), maxx) / 2) * 2)
            if px != ult:
                linhas.append((tt, f"{alvo} {eixo} {px}"))
                ult = px
    return linhas


def juntar_cmds(*listas):
    tudo = sorted((t, c) for l in listas for (t, c) in l)
    return "\n".join(f"{t:.3f} {c};" for t, c in tudo) + "\n"


# ----------------------------------------------------------------------------------------------- legenda (ASS)
ESTILOS = {
    # nome: (fonte, tamanho, cor do texto, cor do destaque, maiúsculas, palavras por linha, contorno, caixa)
    "amarelo": ("Anton", 122, "FFFFFF", "FFE135", True, 3, 7, False),
    "verde": ("Montserrat ExtraBold", 92, "FFFFFF", "2EE6B0", True, 3, 7, False),
    "branco": ("Montserrat ExtraBold", 80, "FFFFFF", "FFFFFF", False, 5, 6, False),
    "caixa": ("Montserrat ExtraBold", 76, "111111", "FF5C28", False, 4, 0, True),
}


def cor_ass(hexrgb, alfa=0):
    r, g, b = hexrgb[0:2], hexrgb[2:4], hexrgb[4:6]
    return f"&H{alfa:02X}{b}{g}{r}".upper()


def tempo_ass(t):
    t = max(0.0, t)
    h = int(t // 3600)
    m = int(t % 3600 // 60)
    s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def limpa_ass(t):
    return t.replace("\\", "").replace("{", "(").replace("}", ")").replace("\n", " ")


def gerar_ass(palavras, trechos, opc, gancho_txt, total):
    est = opc.get("estilo_legenda", "amarelo")
    fonte, tam, cor, dest, maius, por_linha, contorno, caixa = ESTILOS.get(est, ESTILOS["amarelo"])
    pos = opc.get("posicao_legenda", "baixo")
    margem_v = {"baixo": 430, "meio": 820, "alto": 1250}.get(pos, 430)
    borda = 3 if caixa else 1
    leg_out = cor_ass("FFFFFF") if caixa else cor_ass("000000")
    leg_back = cor_ass("000000", 0x80)
    estilos = [
        f"Style: Leg,{fonte},{tam},{cor_ass(cor)},{cor_ass(dest)},{leg_out},{leg_back},-1,0,0,0,100,100,0,0,{borda},{contorno if not caixa else 14},{0 if caixa else 3},2,80,80,{margem_v},1",
        f"Style: Gancho,Montserrat ExtraBold,78,{cor_ass('111111')},{cor_ass('111111')},{cor_ass('FFFFFF')},{cor_ass('000000', 0x60)},-1,0,0,0,100,100,0,0,3,22,0,8,80,80,240,1",
        f"Style: Marca,Montserrat ExtraBold,46,{cor_ass('FFFFFF', 0x00)},{cor_ass('FFFFFF')},{cor_ass('000000', 0x40)},{cor_ass('000000', 0x80)},-1,0,0,0,100,100,0,0,1,2,1,7,60,60,60,1",
    ]
    ev = []
    # palavras no tempo do corte
    lista = []
    for p in palavras:
        for t in mapear(p["s"], trechos):
            lista.append({"w": p.get("p") or p["w"], "s": t, "e": t + (p["e"] - p["s"])})
    lista.sort(key=lambda x: x["s"])
    if opc.get("legenda", True) and lista:
        grupos, g = [], []
        for i, p in enumerate(lista):
            if g and (p["s"] - g[-1]["e"] > 0.6 or len(g) >= por_linha or
                      sum(len(x["w"]) for x in g) + len(p["w"]) > (16 if maius else 26)):
                grupos.append(g)
                g = []
            g.append(p)
            if re.search(r"[.!?…,;:]$", p["w"]) and len(g) >= 2:
                grupos.append(g)
                g = []
        if g:
            grupos.append(g)
        for gi, g in enumerate(grupos):
            fim_g = g[-1]["e"] + 0.25
            if gi + 1 < len(grupos):
                fim_g = min(fim_g, grupos[gi + 1][0]["s"])
            fim_g = min(fim_g, total)
            txts = []
            for p in g:
                w = re.sub(r"[.,;:]+$", "", p["w"]) if not caixa else p["w"]
                w = limpa_ass(w.upper() if maius else w)
                txts.append(w)
            for k, p in enumerate(g):
                ini = p["s"]
                fim = g[k + 1]["s"] if k + 1 < len(g) else fim_g
                if fim <= ini:
                    continue
                partes = []
                for j, w in enumerate(txts):
                    if j == k:
                        if caixa:
                            partes.append(r"{\c" + cor_ass(dest) + "}" + w + r"{\c" + cor_ass(cor) + "}")
                        else:
                            partes.append(r"{\c" + cor_ass(dest) + r"\fscx108\fscy108}" + w + r"{\c" + cor_ass(cor) + r"\fscx100\fscy100}")
                    else:
                        partes.append(w)
                ev.append(f"Dialogue: 0,{tempo_ass(ini)},{tempo_ass(fim)},Leg,,0,0,0,,{' '.join(partes)}")
    if gancho_txt and opc.get("titulo_gancho", True):
        fim = min(total, 4.0 if len(trechos) == 1 else trechos[0][1] - trechos[0][0] + 1.5)
        ev.append(f"Dialogue: 1,{tempo_ass(0)},{tempo_ass(fim)},Gancho,,0,0,0,,{{\\fad(120,200)}}{limpa_ass(gancho_txt)}")
    marca = opc.get("marca_tipo") == "texto" and (opc.get("marca_texto") or "").strip()
    if marca:
        alin = {"se": 7, "sd": 9, "ie": 1, "id": 3, "centro": 5}.get(opc.get("marca_pos", "sd"), 9)
        alfa = int(255 * (1 - max(0.1, min(1.0, float(opc.get("marca_opacidade", 0.7))))))
        mv = 180 if alin in (7, 9) else (300 if alin in (1, 3) else 0)
        ev.append(f"Dialogue: 2,{tempo_ass(0)},{tempo_ass(total + 1)},Marca,,0,0,{mv},,{{\\an{alin}\\alpha&H{alfa:02X}&}}{limpa_ass(marca[:40])}")
    return ("[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n"
            "[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, "
            "Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
            + "\n".join(estilos) + "\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
            + "\n".join(ev) + "\n")


def gerar_srt(palavras, trechos):
    lista = []
    for p in palavras:
        for t in mapear(p["s"], trechos):
            lista.append({"w": p.get("p") or p["w"], "s": t, "e": t + (p["e"] - p["s"])})
    lista.sort(key=lambda x: x["s"])
    blocos, g = [], []
    for p in lista:
        if g and (p["s"] - g[-1]["e"] > 0.8 or len(g) >= 8):
            blocos.append(g)
            g = []
        g.append(p)
    if g:
        blocos.append(g)

    def ts(t):
        ms = int(round(max(0, t) * 1000))
        return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
    return "\n".join(f"{i + 1}\n{ts(b[0]['s'])} --> {ts(b[-1]['e'])}\n{' '.join(x['w'] for x in b)}\n" for i, b in enumerate(blocos))


# ----------------------------------------------------------------------------------------------- render
def renderizar(video, info, trechos, opc, pasta, nome, palavras, gancho_txt, logo):
    pasta = Path(pasta).resolve()
    video = Path(video).resolve()
    W, H = info["w"], info["h"]
    total = sum(e - s for s, e in trechos)
    modo = opc.get("enquadramento", "auto")
    vertical_ja = W / H <= 9 / 16 + 0.02
    cw = int(H * 9 / 16) // 2 * 2
    usar_crop, dividir = False, None
    cmdfile = pasta / f"{nome}.cmd"
    if not vertical_ja and modo in ("auto", "rosto", "dividida"):
        try:
            pontos, frac, frac2 = trilha_rosto(video, trechos, W, H)
        except Exception as e:
            print("rosto falhou:", e, flush=True)
            pontos, frac, frac2 = [], 0.0, 0.0
        if modo == "dividida" and frac2 >= 0.4:
            # duas pessoas: cada painel 1080x960 (proporção 9:8), recorte do tamanho que deixa o rosto grande
            le, ld, ye, yd, hf = caminho_dividido(pontos)
            ch = int(min(H, max(H * 0.42, hf * H * 3.6)) // 2 * 2)
            pw = int(min(W, ch * 9 / 8) // 2 * 2)
            ch = int(min(ch, pw * 8 / 9) // 2 * 2)
            y_e = int(min(max(ye * H - ch * 0.42, 0), H - ch) // 2 * 2)
            y_d = int(min(max(yd * H - ch * 0.42, 0), H - ch) // 2 * 2)
            cmdfile.write_text(juntar_cmds(comandos_crop(le, W, H, pw, "crop@a"), comandos_crop(ld, W, H, pw, "crop@b")), encoding="utf-8")
            dividir = (pw, ch, y_e, y_d)
        elif modo in ("rosto", "dividida") or frac >= 0.35:
            lisa = caminho_camera(pontos, W, H) if pontos else [(0.0, 0.5, True)]
            cmdfile.write_text(juntar_cmds(comandos_crop(lisa, W, H, cw)), encoding="utf-8")
            usar_crop = True
    if not vertical_ja and modo == "centro":
        cmdfile.write_text(f"0.000 crop x {int((W - cw) / 2) // 2 * 2};\n", encoding="utf-8")
        usar_crop = True
    ass = pasta / f"{nome}.ass"
    ass.write_text(gerar_ass(palavras, trechos, opc, gancho_txt, total), encoding="utf-8")
    (pasta / f"{nome}.srt").write_text(gerar_srt(palavras, trechos), encoding="utf-8")

    cmd = ["ffmpeg", "-y", "-v", "error", "-threads", THREADS]
    for (s, e) in trechos:
        cmd += ["-ss", f"{s:.3f}", "-t", f"{e - s:.3f}", "-i", str(video)]
    n = len(trechos)
    if logo:
        cmd += ["-i", str(logo)]
    f = []
    for i in range(n):
        f.append(f"[{i}:v]fps=30,setpts=PTS-STARTPTS,format=yuv420p[v{i}]")
        if info["audio"]:
            f.append(f"[{i}:a]aresample=44100,asetpts=PTS-STARTPTS[a{i}]")
    if n > 1:
        if info["audio"]:
            f.append("".join(f"[v{i}][a{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=1[vc][ac]")
        else:
            f.append("".join(f"[v{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0[vc]")
    else:
        f.append("[v0]null[vc]")
        if info["audio"]:
            f.append("[a0]anull[ac]")
    if vertical_ja:
        f.append(f"[vc]scale={W_OUT}:{H_OUT}:force_original_aspect_ratio=increase,crop={W_OUT}:{H_OUT},setsar=1[vr]")
    elif dividir:
        pw, ch, y_e, y_d = dividir
        f.append(f"[vc]sendcmd=f={cmdfile.name},split[da][db];"
                 f"[da]crop@a=w={pw}:h={ch}:x=0:y={y_e},scale={W_OUT}:{H_OUT // 2}:flags=lanczos,setsar=1[pa];"
                 f"[db]crop@b=w={pw}:h={ch}:x={W - pw}:y={y_d},scale={W_OUT}:{H_OUT // 2}:flags=lanczos,setsar=1[pb];"
                 f"[pa][pb]vstack=inputs=2,drawbox=x=0:y={H_OUT // 2 - 3}:w={W_OUT}:h=6:color=black@0.9:t=fill[vr]")
    elif usar_crop:
        x0 = int((W - cw) / 2) // 2 * 2
        f.append(f"[vc]sendcmd=f={cmdfile.name},crop=w={cw}:h={H}:x={x0}:y=0,scale={W_OUT}:{H_OUT}:flags=lanczos,setsar=1[vr]")
    else:  # fundo desfocado: o vídeo inteiro no meio, cópia ampliada e borrada atrás
        f.append(f"[vc]split[b1][b2];[b1]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=10:3,"
                 f"eq=brightness=-0.10:saturation=1.15,scale={W_OUT}:{H_OUT}[bg];"
                 f"[b2]scale={W_OUT}:-2:flags=lanczos[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[vr]")
    f.append(f"[vr]ass={ass.name}:fontsdir={FONTES}[vs]")
    ult = "vs"
    if logo:
        larg = int(W_OUT * 0.24)
        alfa = max(0.1, min(1.0, float(opc.get("marca_opacidade", 0.7))))
        pos = {"se": "60:180", "sd": "W-w-60:180", "ie": "60:H-h-300", "id": "W-w-60:H-h-300",
               "centro": "(W-w)/2:(H-h)/2"}.get(opc.get("marca_pos", "sd"), "W-w-60:180")
        f.append(f"[{n}:v]format=rgba,scale={larg}:-1,colorchannelmixer=aa={alfa:.2f}[lg];[vs][lg]overlay={pos}:format=auto[vo]")
        ult = "vo"
    if info["audio"]:
        f.append("[ac]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100[ao]")
    cmd += ["-filter_complex", ";".join(f), "-map", f"[{ult}]"]
    if info["audio"]:
        cmd += ["-map", "[ao]", "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-ac", "2"]
    cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", "30",
            "-movflags", "+faststart", f"{nome}.mp4"]
    rodar(cmd, 3600, cwd=str(pasta))
    rodar(["ffmpeg", "-y", "-v", "error", "-ss", str(min(1.5, total / 3)), "-i", f"{nome}.mp4", "-frames:v", "1",
           "-vf", "scale=360:640", "-q:v", "4", f"{nome}.jpg"], 120, cwd=str(pasta))
    for tmpf in (cmdfile, ass):
        tmpf.unlink(missing_ok=True)
    return total
