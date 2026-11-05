# Reels animados do @ofertas.speedco (26/10/2026): narração com voz neural (edge-tts) + animação quadro a quadro (Pillow).
# uso: python render.py <n>   (n = índice em ROTEIROS)  -> out/<n>/f00001.jpg ... + out/<n>.mp3
# PREVIA="0.5,3,8" (opcional): só grava esses segundos como out/<nome>/previa_<t>.jpg (teste de arte; narração continua real).
# TEMA=claro|escuro (opcional): força o fundo; sem ele alterna pelo índice (par = claro, ímpar = escuro), como pede o guia.
import asyncio, json, math, os, sys, shutil, re
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import edge_tts

W, H, FPS = 1080, 1920, 30
D = os.environ.get('RENDER_DIR', '/w/')
# 05/11/2026 v6 — identidade "ofertas Speed" (guia OFERTAS_SPEED v1, pedido do dono): lima #E9FF55, preto #151714, fundo #F7F8F2,
# Inter 400/600/800, texto preto sobre lima, sem confete/brilho, logo de verdade (marca/*.png). Arte anterior (v5 creme/dourado): render.py.bak-20261105-ofertas-speed
LIMA = (233, 255, 85); INK = (21, 23, 20); FUNDO = (247, 248, 242); SUP = (255, 255, 255); MUTED = (107, 112, 103); BORDA = (223, 226, 216)
def FR(t): return ImageFont.truetype(D + 'Inter-Regular.otf', t)     # 400
def FSB(t): return ImageFont.truetype(D + 'Inter-SemiBold.otf', t)   # 600
def FX(t): return ImageFont.truetype(D + 'Inter-ExtraBold.otf', t)   # 800

ROTEIROS = json.load(open(D + 'roteiros.json', encoding='utf-8'))
# STORY=1 (27/10/2026, dono: "não adianta pôr story e a pessoa não achar o produto"): versão do story = out/s<n>, a chamada vira
# "Responde EU QUERO aqui no story" (o Speed Posts responde no direct com o link do produto daquele story)
STORY = os.environ.get('STORY') == '1'
CTA_REEL = 'Comenta EU QUERO que eu te mando o link!'
CTA_STORY = 'Responde EU QUERO aqui no story que eu te mando o link!'

def num(s): return float(re.sub(r'[^0-9,]', '', s).replace(',', '.'))
def brl(v): return 'R$ ' + ('%.2f' % v).replace('.', ',')
def ease_out(t): t = max(0, min(1, t)); return 1 - (1 - t) ** 3
def ease_back(t):
    t = max(0, min(1, t)); c1 = 1.70158; c3 = c1 + 1
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2

async def narrar(texto, voz, arq):
    # 04/11/2026: o edge-tts (serviço não oficial) às vezes devolve NoAudioReceived; tenta de novo (até 6x, com pausa)
    ultimo = None
    for tent in range(6):
        try:
            c = edge_tts.Communicate(texto, voz, rate='+10%', boundary='WordBoundary')
            palavras = []
            with open(arq, 'wb') as f:
                async for ch in c.stream():
                    if ch['type'] == 'audio': f.write(ch['data'])
                    elif ch['type'] == 'WordBoundary':
                        palavras.append((ch['offset'] / 1e7, (ch['offset'] + ch['duration']) / 1e7, ch['text']))
            if palavras: return palavras
            ultimo = RuntimeError('sem palavras')
        except Exception as e:
            ultimo = e
        print('narrar: tentativa %d falhou (%s), repetindo' % (tent + 1, type(ultimo).__name__), flush=True)
        await asyncio.sleep(3 + tent * 4)
    raise ultimo

def fundo(escuro):
    # fundo liso + uma diagonal pontual inspirada na etiqueta (lima no claro, preto mais claro no escuro)
    g = Image.new('RGB', (W, H), INK if escuro else FUNDO); d = ImageDraw.Draw(g)
    d.polygon([(W * 0.74, 0), (W, 0), (W, H * 0.62), (W * 0.30, H * 0.62)], fill=(36, 39, 34) if escuro else LIMA)
    return g

def texto_img(linhas, fonte, cor, espaco=8, alinhar='centro'):
    d0 = ImageDraw.Draw(Image.new('RGB', (1, 1)))
    medidas = [d0.textbbox((0, 0), l, font=fonte) for l in linhas]
    lw = max(m[2] - m[0] for m in medidas); lh = [m[3] - m[1] for m in medidas]
    im = Image.new('RGBA', (lw + 20, sum(lh) + espaco * (len(linhas) - 1) + 20), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    y = 10
    for l, m, h in zip(linhas, medidas, lh):
        w = m[2] - m[0]
        x = (im.width - w) / 2 if alinhar == 'centro' else 10
        d.text((x - m[0], y - m[1]), l, font=fonte, fill=cor)
        y += h + espaco
    return im

def bloco(txt, fonte, fundo_, cor, px=40, py=18, raio=24, borda=None):
    d0 = ImageDraw.Draw(Image.new('RGB', (1, 1))); b = d0.textbbox((0, 0), txt, font=fonte)
    w, h = b[2] - b[0], b[3] - b[1]
    im = Image.new('RGBA', (w + px * 2, h + py * 2), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, im.width - 1, im.height - 1), radius=raio, fill=fundo_, outline=borda, width=3 if borda else 0)
    d.text((px - b[0], py - b[1]), txt, font=fonte, fill=cor)
    return im

def colar_escala(fundo_, im, cx, cy, esc, rot=0):
    if esc <= 0.01: return
    if abs(esc - 1) > 0.001: im = im.resize((max(1, int(im.width * esc)), max(1, int(im.height * esc))), Image.BICUBIC)
    if rot: im = im.rotate(rot, resample=Image.BICUBIC, expand=True)
    fundo_.paste(im, (int(cx - im.width / 2), int(cy - im.height / 2)), im)

def logo(escuro, alt):
    l = Image.open(D + 'marca/logo-h-%s.png' % ('lima' if escuro else 'preto')).convert('RGBA')
    return l.resize((round(l.width * alt / l.height), alt), Image.LANCZOS)

def frases(palavras, dur):
    # junta as palavras em blocos de até 4 (quebra também em pontuação)
    blocos, atual = [], []
    for p in palavras:
        atual.append(p)
        if len(atual) >= 4 or re.search(r'[.!?,:]$', p[2]):
            blocos.append(atual); atual = []
    if atual: blocos.append(atual)
    return blocos

def main(n):
    r = ROTEIROS[n]
    nome = ('s%d' if STORY else '%d') % n
    pasta = D + 'out/%s/' % nome
    if STORY: r = dict(r, narracao=r['narracao'].replace(CTA_REEL, CTA_STORY))
    escuro = {'claro': False, 'escuro': True}.get(os.environ.get('TEMA', ''), n % 2 == 1)
    TXT = SUP if escuro else INK; SUB = (196, 200, 191) if escuro else MUTED
    previa = [float(x) for x in os.environ.get('PREVIA', '').split(',') if x.strip()]
    shutil.rmtree(pasta, ignore_errors=True); os.makedirs(pasta)
    palavras = asyncio.run(narrar(r['narracao'], r.get('voz', 'pt-BR-ThalitaMultilingualNeural'), D + 'out/%s.mp3' % nome))
    fim_audio = palavras[-1][1] if palavras else 12
    dur = fim_audio + 1.2
    total = int(dur * FPS)
    blocos = frases(palavras, dur)
    # momento do preço e da chamada (palavras-chave na narração)
    def quando(rx, padrao):
        for a, b, t in palavras:
            if re.search(rx, t, re.I): return a
        return padrao
    t_preco = quando(r.get('gatilho_preco', r'reais|R\$'), dur * 0.45) - 0.15
    t_cta = quando(r'^(Comenta|Responde)', dur - 3.2) - 0.1

    BG = fundo(escuro)
    # cartão da foto (branco, raio 32 = 16 px do guia em 2x, borda fina)
    CX0, CY0, CX1, CY1 = 80, 590, 1000, 1300
    CW, CH = CX1 - CX0, CY1 - CY0
    RAIO = 32
    mascara = Image.new('L', (CW, CH), 0); ImageDraw.Draw(mascara).rounded_rectangle((0, 0, CW - 1, CH - 1), radius=RAIO, fill=255)
    fotos = []
    for arq in r['fotos']:
        cut = D + 'fotos/cut_' + os.path.splitext(arq)[0] + '.png'
        if os.path.exists(cut):  # produto recortado (recortar.py), sombra discreta
            c0 = Image.open(cut).convert('RGBA'); s = min((CW - 140) / c0.width, (CH - 160) / c0.height)
            c0 = c0.resize((int(c0.width * s), int(c0.height * s)), Image.LANCZOS)
            sh = Image.new('RGBA', (c0.width + 100, c0.height + 100), (0, 0, 0, 0))
            al = c0.getchannel('A').point(lambda v: int(v * 0.22)); sm = Image.new('RGBA', c0.size, INK + (255,)); sm.putalpha(al)
            sh.paste(sm, (50, 66), sm); sh = sh.filter(ImageFilter.GaussianBlur(14)); sh.paste(c0, (50, 50), c0)
            fotos.append(sh); continue
        f = Image.open(D + 'fotos/' + arq).convert('RGB')
        s = min((CW - 60) / f.width, (CH - 60) / f.height)
        fotos.append(f.resize((int(f.width * s), int(f.height * s)), Image.LANCZOS))
    from PIL import ImageOps
    bgs = []
    for i_f, arq in enumerate(r['fotos']):
        if fotos[i_f].mode == 'RGBA':  # recorte: fundo branco -> #F7F8F2 (limpo, como o guia pede)
            g = Image.new('RGB', (CW, CH)); gd = ImageDraw.Draw(g)
            for yy in range(CH):
                tt = yy / CH; gd.line((0, yy, CW, yy), fill=tuple(int(SUP[k] * (1 - tt) + FUNDO[k] * tt) for k in range(3)))
            bgs.append(g); continue
        f0 = Image.open(D + 'fotos/' + arq).convert('RGB')
        b0 = ImageOps.fit(f0, (CW, CH), Image.BILINEAR).filter(ImageFilter.GaussianBlur(30))
        bgs.append(Image.blend(b0, Image.new('RGB', (CW, CH), SUP), 0.7))
    SC = 2.4

    selo = bloco(r['selo'], FSB(36), LIMA if escuro else INK, INK if escuro else LIMA, 32, 16, 20)
    sub = texto_img([r['subselo']], FR(32), SUB, 6)
    gancho = texto_img(r['gancho'], FX(104), TXT, 2)
    if gancho.width > 940: gancho = gancho.resize((940, int(gancho.height * 940 / gancho.width)), Image.LANCZOS)  # gancho largo não encosta na borda
    preco = bloco(r['preco'], FX(100), LIMA, INK, 44, 20, 24)
    # promoção: "de R$ X" riscado + "-NN%" (só com preço antigo REAL da oferta; nunca inventar)
    de_img = desc_img = None
    if r.get('preco_de'):
        de_img = bloco('de ' + r['preco_de'], FSB(40), SUP, MUTED, 26, 14, 18, BORDA)
        dd = ImageDraw.Draw(de_img); yl = de_img.height // 2 + 2; dd.line((20, yl, de_img.width - 20, yl), fill=MUTED, width=4)
    if r.get('desconto'):
        desc_img = bloco('-%d%%' % int(r['desconto']), FX(50), INK, LIMA, 26, 14, 18)
    v_por = num(r['preco']); v_de = num(r['preco_de']) if r.get('preco_de') else v_por
    cta = bloco('responde EU QUERO' if STORY else 'comenta EU QUERO', FX(56), LIMA, INK, 52, 26, 24)
    cta2 = texto_img(['aqui no story que te mando o link' if STORY else 'que eu te mando o link no direct'], FSB(44), TXT, 0)
    marca = logo(escuro, 84)
    arroba = texto_img(['@ofertas.speedco'], FSB(30), SUB, 6)
    fl = FX(56)

    for i in range(total):
        t = i / FPS
        if previa and not any(abs(t - p) < 0.5 / FPS for p in previa): continue
        q = BG.copy()
        colar_escala(q, selo, W / 2, 290, 1)  # 1º quadro já montado (o Instagram mostra o começo do vídeo)
        colar_escala(q, sub, W / 2, 360, 1)
        colar_escala(q, gancho, W / 2, 480, 1 + 0.02 * math.sin(t * 5))
        # cartão com as fotos
        if t < t_cta:
            idx = int(t / SC); k = idx % len(fotos); tl = t - idx * SC
        else:
            idx = -1; k = 0; tl = t - t_cta
        par = 1 if k % 2 == 0 else -1
        pr = min(1, tl / SC)
        tr = ease_out(tl / 0.3)  # troca de foto: entra deslizando da direita
        trans = (idx > 0 or t >= t_cta) and tr < 1
        if trans and t < t_cta:
            card = Image.blend(bgs[(idx - 1) % len(fotos)], bgs[k], tr)
        else:
            card = bgs[k].copy()
        foto = fotos[k]
        z = (1.0 + 0.10 * pr) if par == 1 else (1.10 - 0.10 * pr)
        fz = foto.resize((int(foto.width * z), int(foto.height * z)), Image.BILINEAR)
        ox = int((1 - tr) * CW * 0.9) if (idx > 0 or t >= t_cta) else 0
        pan = int((pr - 0.5) * 36 * par)
        card.paste(fz, ((CW - fz.width) // 2 + ox + pan, (CH - fz.height) // 2), fz if fz.mode == 'RGBA' else None)
        if ox and t < t_cta and idx > 0:
            ant = fotos[(idx - 1) % len(fotos)]; card.paste(ant, ((CW - ant.width) // 2 + ox - CW, (CH - ant.height) // 2), ant if ant.mode == 'RGBA' else None)
        q.paste(card, (CX0, CY0), mascara)
        if not escuro: ImageDraw.Draw(q).rounded_rectangle((CX0, CY0, CX1, CY1), radius=RAIO, outline=BORDA, width=3)
        # preço já no 1º segundo, "caindo" do preço antigo para o novo, e pula quando a voz fala o preço
        PX, PY = CX1 - 24, CY1 - 6  # canto de baixo à direita do cartão (sem girar: limpo, como o guia)
        if de_img:
            T0, T1 = 0.25, 1.25
            if t < T1:
                k2 = ease_out((t - T0) / (T1 - T0)) if t > T0 else 0
                v = v_de + (v_por - v_de) * k2
                cor_f = SUP if t < T1 - 0.05 else LIMA
                pv = bloco(brl(v), FX(100), cor_f, INK, 44, 20, 24, BORDA if cor_f == SUP else None)
                colar_escala(q, pv, PX - pv.width / 2, PY, 1 + 0.03 * math.sin(t * 30) * (1 - k2))
            else:
                pulo = 1 + 0.10 * max(0, 1 - abs(t - t_preco - 0.2) / 0.25) + 0.12 * max(0, 1 - (t - T1) / 0.3)
                colar_escala(q, preco, PX - preco.width / 2, PY, pulo)
                colar_escala(q, de_img, PX - de_img.width / 2, PY - preco.height / 2 - de_img.height / 2 - 14, ease_back((t - T1) / 0.35))
        elif t >= t_preco:
            colar_escala(q, preco, PX - preco.width / 2, PY, ease_back((t - t_preco) / 0.4))
        # barra de progresso no topo
        ImageDraw.Draw(q).rectangle((0, 0, int(W * t / dur), 12), fill=LIMA if escuro else INK)
        if desc_img:
            colar_escala(q, desc_img, CX0 + desc_img.width / 2 + 24, CY0 + desc_img.height / 2 + 24, 1)
        # legenda (bloco atual; a palavra falada ganha um marca-texto lima)
        if t < t_cta:
            for bl in blocos:
                if bl[0][0] - 0.05 <= t <= bl[-1][1] + 0.25:
                    d = ImageDraw.Draw(q)
                    txts = [p[2] for p in bl]; larg = [d.textlength(x + ' ', font=fl) for x in txts]
                    x = (W - sum(larg)) / 2; y = 1392
                    for (a, b2, pal), lw in zip(bl, larg):
                        if a <= t <= b2 + 0.1:
                            bb = d.textbbox((x, y), pal, font=fl); d.rounded_rectangle((bb[0] - 12, bb[1] - 10, bb[2] + 12, bb[3] + 12), radius=12, fill=LIMA)
                            d.text((x, y), pal, font=fl, fill=INK)
                        else:
                            d.text((x, y), pal, font=fl, fill=TXT)
                        x += lw
                    break
        # chamada final (pulsa de leve)
        if t >= t_cta:
            e = ease_back((t - t_cta) / 0.45) * (1 + 0.025 * math.sin((t - t_cta) * 7))
            colar_escala(q, cta, W / 2, 1440, e)
            if t > t_cta + 0.3: colar_escala(q, cta2, W / 2, 1540, 1)
        colar_escala(q, marca, W / 2, 1668, 1)
        colar_escala(q, arroba, W / 2, 1748, 1)
        if previa: q.save(pasta + 'previa_%05.2f.jpg' % t, quality=88); continue
        q.save(pasta + 'f%05d.jpg' % (i + 1), quality=90)
    json.dump({'dur': dur, 'frames': total}, open(D + 'out/%s.json' % nome, 'w'))
    print('ok', nome, round(dur, 2), total)

if __name__ == '__main__':
    for a in sys.argv[1:]: main(int(a))
