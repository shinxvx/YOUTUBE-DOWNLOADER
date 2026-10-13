# Confere a narração: transcreve cada frase com o Whisper (faster-whisper, modelo small) e compara com a legenda.
# Uso (servidor): docker run --rm -v <projeto>:/p python:3.12-slim sh -c "pip install -q faster-whisper && python /p/ferramentas/ouvir.py faber"
import json, sys, os, re, unicodedata, wave
import numpy as np
def ler(f):
    w = wave.open(f); sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    n = int(len(x) * 16000 / sr); return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)
from faster_whisper import WhisperModel
m = WhisperModel("small", device="cpu", compute_type="int8", download_root="/p/.trabalho/whisper")
F = json.load(open("/p/narracao/frases.json"))["frases"]
norm = lambda s: re.sub(r"[^a-z0-9 ]", "", unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode()).split()
for voz in sys.argv[1:]:
    erros = tot = 0
    for f in F:
        segs, _ = m.transcribe(ler(f"/p/narracao/{voz}/{f['id']}.wav"), language="pt", beam_size=5)
        t = " ".join(s.text for s in segs).strip()
        a, b = norm(f["legenda"]), norm(t)
        e = sum(1 for w in a if w not in b); erros += e; tot += len(a)
        print(f"{voz} {f['id']}: {t!r}" + (f"  <-- {e} palavra(s)" if e else ""), flush=True)
    print(f"== {voz}: {erros}/{tot} palavras não reconhecidas", flush=True)
