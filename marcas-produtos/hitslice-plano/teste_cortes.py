"""Teste: quantidade automática pela duração, opção 150 s, gancho no meio/embaixo por até 2,8 s (renderizado de verdade)."""
import subprocess, sys, os, re
sys.path.insert(0, "/app")
import pipeline as P
import cv2, numpy as np
ok = lambda n, c: print(("OK   " if c else "FALHA"), n)
os.environ.pop("IA_KEY", None)
P.ia = lambda *a, **k: (_ for _ in ()).throw(RuntimeError("sem IA no teste"))  # força a heurística
def frases_falsas(minutos):
    fr, t = [], 0.0
    while t < minutos * 60:
        fr.append({"s": t, "e": t + 4.5, "t": "isso aqui é uma frase de teste que termina bem."}); t += 5
    return fr
for alvo, mins, esperado_min in [(60, 30, 15), (150, 60, 12), (30, 120, 20)]:
    out = P.escolher_cortes(frases_falsas(mins), mins * 60, alvo, 0, "t", lambda c: None)
    lo, hi = P.ALVOS[alvo]
    durs = [P.duracao(frases_falsas(mins), c["start"], c["end"]) for c in out]
    ok(f"automático {alvo}s em vídeo de {mins} min: {len(out)} cortes (antes no máx. 10), todos entre {lo}-{hi}s", len(out) >= esperado_min and len(out) <= 20 and all(lo * 0.8 <= d <= hi * 1.1 for d in durs))
ok("150 s = 2 a 3 min", P.ALVOS[150] == (120, 185))
# gancho renderizado
for pg, pl, faixa in [("meio", "baixo", (760, 1040)), ("meio", "meio", (600, 860)), ("baixo", "alto", (1330, 1500)), ("baixo", "baixo", (1150, 1310))]:
    opc = {"legenda": False, "titulo_gancho": True, "posicao_gancho": pg, "posicao_legenda": pl}
    ass = P.gerar_ass([], [(0, 10)], opc, "GANCHO DE TESTE FORTE", 10)
    open("/tmp/g.ass", "w").write(ass)
    linha = [l for l in ass.splitlines() if ",Gancho," in l and l.startswith("Dialogue")][0]
    fim = linha.split(",")[2]
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=black:s=1080x1920:d=4:r=10", "-vf", "ass=/tmp/g.ass:fontsdir=/app/fontes",
                    "-frames:v", "1", "-ss", "1.0", "/tmp/f1.png"], check=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=black:s=1080x1920:d=4:r=10", "-vf", "ass=/tmp/g.ass:fontsdir=/app/fontes,trim=start=3.2",
                    "-frames:v", "1", "/tmp/f3.png"], check=True)
    im = cv2.imread("/tmp/f1.png", cv2.IMREAD_GRAYSCALE); ys = np.where(im.max(axis=1) > 60)[0]
    im3 = cv2.imread("/tmp/f3.png", cv2.IMREAD_GRAYSCALE)
    y0, y1 = (int(ys.min()), int(ys.max())) if len(ys) else (-1, -1)
    ok(f"gancho {pg} (legenda {pl}): texto entre y={y0}-{y1}, some aos {fim} (some aos 3,2 s: {im3.max() < 60})",
       len(ys) and faixa[0] <= y0 and y1 <= faixa[1] + 120 and fim <= "0:00:02.80" and im3.max() < 60)
