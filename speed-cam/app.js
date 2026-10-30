// Tela do Speed Cam: junta as fontes num quadro só e manda para a câmera virtual; o som vai para a saída escolhida.
'use strict';
const { ipcRenderer, webUtils } = require('electron');
const path = require('node:path');
const { pathToFileURL, fileURLToPath } = require('node:url');
const vcam = require(path.join(path.dirname(fileURLToPath(location.href)), 'vcam.js'));

const FPS = 30;
const $ = (id) => document.getElementById(id);
const TIPOS = {
  screen: 'Tela inteira',
  window: 'Janela',
  arquivo: 'Arquivo',
  link: 'Link',
  webcam: 'Webcam',
  audio: 'Microfone / entrada de som',
};
const EXT_IMG = /\.(png|jpe?g|gif|webp|bmp|avif|svg)(\?|#|$)/i;
const EXT_AUDIO = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus)(\?|#|$)/i;
const EXT_VIDEO = /\.(mp4|webm|mkv|mov|m4v|ogv|m3u8)(\?|#|$)/i;

// ---------- configuração guardada ----------
let cfg = { res: '1920x1080', saida: '', ouvir: false, fontes: [] };
try { Object.assign(cfg, JSON.parse(localStorage.getItem('speedcam') || '{}')); } catch {}
const salvar = () => {
  cfg.fontes = fontes.map(({ id, tipo, nome, ref, visivel, volume, mudo, preencher, somSistema }) => ({ id, tipo, nome, ref, visivel, volume, mudo, preencher, somSistema }));
  try { localStorage.setItem('speedcam', JSON.stringify(cfg)); } catch {}
};

let [W, H] = cfg.res.split('x').map(Number);
const canvas = $('preview');
const g2d = canvas.getContext('2d', { alpha: false });
const fontes = []; // índice 0 = a de cima (aparece na frente)

// ---------- som ----------
const ac = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
const mestre = ac.createGain();
const analisador = ac.createAnalyser();
analisador.fftSize = 1024;
mestre.connect(analisador);
mestre.connect(ac.destination);
const monitorDest = ac.createMediaStreamDestination();
const monitorEl = new Audio();
monitorEl.srcObject = monitorDest.stream;
const amostras = new Float32Array(analisador.fftSize);

async function aplicarSaida() {
  const disp = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audiooutput');
  const alvo = disp.find((d) => d.label === cfg.saida);
  const id = alvo && alvo.deviceId !== 'default' ? alvo.deviceId : '';
  try { await ac.setSinkId(id); } catch (e) { mostrarAviso('Não consegui usar a saída de som escolhida: ' + e.message); }
  const ouvir = cfg.ouvir && id !== '';
  $('ouvirBox').hidden = id === '';
  try { mestre.disconnect(monitorDest); } catch {}
  if (ouvir) { mestre.connect(monitorDest); monitorEl.play().catch(() => {}); } else monitorEl.pause();
}

async function listarSaidas() {
  const disp = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audiooutput' && d.deviceId !== 'communications');
  const sel = $('saida');
  sel.innerHTML = '';
  const padrao = new Option('Alto-falante padrão do Windows', '');
  sel.add(padrao);
  for (const d of disp) if (d.deviceId !== 'default') sel.add(new Option(d.label || 'Saída de som', d.label));
  sel.value = disp.some((d) => d.label === cfg.saida && d.deviceId !== 'default') ? cfg.saida : '';
  $('ouvir').checked = cfg.ouvir;
  await aplicarSaida();
}
$('saida').onchange = () => { cfg.saida = $('saida').value; salvar(); aplicarSaida(); };
$('ouvir').onchange = () => { cfg.ouvir = $('ouvir').checked; salvar(); aplicarSaida(); };
$('vbcable').onclick = (e) => { e.preventDefault(); ipcRenderer.invoke('abrir-link', 'https://vb-audio.com/Cable/'); };

// ---------- fontes ----------
const novoId = () => Math.random().toString(36).slice(2, 10);

async function adicionar(f) {
  const fonte = { id: novoId(), visivel: true, volume: 1, mudo: false, preencher: false, ...f, estado: 'carregando', msg: '' };
  fontes.unshift(fonte);
  render();
  salvar();
  await iniciar(fonte);
}

function ligarSom(f, no) {
  f.ganho = ac.createGain();
  no.connect(f.ganho);
  f.ganho.connect(mestre);
  f.noSom = no;
  aplicarVolume(f);
}
function aplicarVolume(f) { if (f.ganho) f.ganho.gain.value = f.mudo ? 0 : f.volume; }

function elementoMidia(f, src) {
  if (EXT_IMG.test(src)) {
    const img = new Image();
    img.onload = () => ok(f);
    img.onerror = () => erro(f, 'Não consegui abrir a imagem.');
    img.src = src;
    f.el = img;
    return;
  }
  const el = document.createElement(EXT_AUDIO.test(src) ? 'audio' : 'video');
  el.loop = true;
  el.playsInline = true;
  el.preload = 'auto';
  el.onloadeddata = () => ok(f);
  el.onerror = () => erro(f, 'Não consegui tocar este arquivo/link.');
  el.src = src;
  f.el = el;
  ligarSom(f, ac.createMediaElementSource(el));
  el.play().catch(() => {});
}

function elementoStream(f, stream) {
  if (!fontes.includes(f)) { stream.getTracks().forEach((t) => t.stop()); return; } // removida enquanto abria
  f.stream = stream;
  if (stream.getVideoTracks().length) {
    const v = document.createElement('video');
    v.muted = true; // o som vai pelo mixer, não pelo vídeo
    v.playsInline = true;
    v.srcObject = stream;
    v.onloadeddata = () => ok(f);
    v.play().catch(() => {});
    f.el = v;
  } else ok(f);
  if (stream.getAudioTracks().length) ligarSom(f, ac.createMediaStreamSource(stream));
  for (const t of stream.getTracks()) t.onended = () => erro(f, 'A fonte parou (janela fechada ou aparelho desligado).');
}

async function iniciar(f) {
  f.estado = 'carregando'; f.msg = ''; render();
  try {
    if (f.tipo === 'screen' || f.tipo === 'window') {
      const lista = await ipcRenderer.invoke('telas');
      const s = lista.find((x) => x.id === f.ref) || lista.find((x) => x.tipo === f.tipo && x.nome === f.nome);
      if (!s) throw new Error(f.tipo === 'window' ? 'Janela não encontrada (abra o programa e clique em Tentar de novo).' : 'Tela não encontrada.');
      f.ref = s.id;
      const comSom = f.tipo === 'screen' && f.somSistema;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: comSom ? { mandatory: { chromeMediaSource: 'desktop' } } : false,
        video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: s.id, maxWidth: Math.max(W, H), maxHeight: Math.max(W, H), maxFrameRate: FPS } },
      });
      elementoStream(f, stream);
    } else if (f.tipo === 'webcam' || f.tipo === 'audio') {
      const disp = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === (f.tipo === 'webcam' ? 'videoinput' : 'audioinput'));
      const d = disp.find((x) => x.label === f.ref) || disp.find((x) => x.deviceId === f.ref);
      if (!d) throw new Error('Aparelho não encontrado (está ligado?).');
      const stream = await navigator.mediaDevices.getUserMedia(f.tipo === 'webcam'
        ? { video: { deviceId: { exact: d.deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: FPS } } }
        : { audio: { deviceId: { exact: d.deviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      elementoStream(f, stream);
    } else if (f.tipo === 'arquivo') {
      elementoMidia(f, pathToFileURL(f.ref).href);
    } else if (f.tipo === 'link') {
      if (EXT_IMG.test(f.ref) || EXT_AUDIO.test(f.ref) || EXT_VIDEO.test(f.ref)) elementoMidia(f, f.ref);
      else {
        // página da internet: abre escondida e captura imagem + som dela
        const id = await ipcRenderer.invoke('pagina-abrir', f.id, f.ref, W, H);
        f.pagina = true;
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: id } },
          video: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: id, maxWidth: W, maxHeight: H, minWidth: W, minHeight: H, maxFrameRate: FPS } },
        });
        elementoStream(f, stream);
      }
    }
  } catch (e) {
    erro(f, (e.message || String(e)).replace(/^Error invoking remote method '[^']+': (\w*Error: )?/, ''));
  }
}

function parar(f, fecharPagina = true) {
  if (f.stream) for (const t of f.stream.getTracks()) { t.onended = null; t.stop(); }
  if (f.el) { if (f.el.pause) f.el.pause(); f.el.onerror = null; f.el.removeAttribute('src'); f.el.srcObject = null; if (f.el.load) f.el.load(); }
  if (f.ganho) { try { f.noSom.disconnect(); f.ganho.disconnect(); } catch {} }
  if (fecharPagina && f.pagina) ipcRenderer.invoke('pagina-fechar', f.id);
  f.stream = f.el = f.ganho = f.noSom = null;
}

function ok(f) { if (fontes.includes(f)) { f.estado = 'ok'; f.msg = ''; render(); } }
function erro(f, msg) { if (fontes.includes(f)) { f.estado = 'erro'; f.msg = msg; render(); } }

function remover(f) { parar(f); fontes.splice(fontes.indexOf(f), 1); render(); salvar(); }
function mover(f, d) {
  const i = fontes.indexOf(f), j = i + d;
  if (j < 0 || j >= fontes.length) return;
  fontes.splice(i, 1); fontes.splice(j, 0, f); render(); salvar();
}

function temSom(f) { return !!f.ganho; }
function render() {
  const ul = $('lista');
  ul.innerHTML = '';
  $('vazio').hidden = fontes.length > 0;
  fontes.forEach((f, i) => {
    const li = document.createElement('li');
    if (!f.visivel) li.className = 'oculta';
    const linha = document.createElement('div');
    linha.className = 'linha';
    const est = document.createElement('span');
    est.className = 'est ' + (f.estado === 'ok' ? 'ok' : f.estado === 'erro' ? 'erro' : '');
    const nome = document.createElement('span');
    nome.className = 'nome';
    nome.textContent = f.nome;
    nome.title = f.ref;
    const tipo = document.createElement('span');
    tipo.className = 'tipo';
    tipo.textContent = TIPOS[f.tipo];
    linha.append(est, nome, tipo);
    li.append(linha);
    if (f.msg) { const m = document.createElement('div'); m.className = 'msg'; m.textContent = f.msg; li.append(m); }

    const bts = document.createElement('div');
    bts.className = 'botoes';
    const bt = (txt, fn, on, title) => { const b = document.createElement('button'); b.className = 'bt' + (on ? ' on' : ''); b.textContent = txt; if (title) b.title = title; b.onclick = fn; bts.append(b); return b; };
    if (f.tipo !== 'audio') {
      bt(f.visivel ? 'Visível' : 'Oculta', () => { f.visivel = !f.visivel; render(); salvar(); }, f.visivel);
      bt(f.preencher ? 'Preenchendo' : 'Ajustada', () => { f.preencher = !f.preencher; render(); salvar(); }, f.preencher, 'Ajustada: mostra inteira. Preenchendo: cobre a tela toda (corta as bordas).');
    }
    if (i > 0) bt('Subir', () => mover(f, -1), false, 'Passa para a frente');
    if (i < fontes.length - 1) bt('Descer', () => mover(f, 1), false, 'Passa para trás');
    if (f.pagina) { bt('Ver página', () => ipcRenderer.invoke('pagina-mostrar', f.id), false, 'Abre a página para clicar ou fazer login'); bt('Recarregar', () => ipcRenderer.invoke('pagina-recarregar', f.id)); }
    if (f.estado === 'erro') bt('Tentar de novo', () => { parar(f, false); iniciar(f); });
    bt('Remover', () => remover(f));
    if (temSom(f)) {
      const vol = document.createElement('label');
      vol.className = 'vol';
      const mudo = document.createElement('button');
      mudo.className = 'bt' + (f.mudo ? '' : ' on');
      mudo.textContent = f.mudo ? 'Sem som' : 'Som';
      mudo.onclick = () => { f.mudo = !f.mudo; aplicarVolume(f); render(); salvar(); };
      const r = document.createElement('input');
      r.type = 'range'; r.min = 0; r.max = 1.5; r.step = 0.01; r.value = f.volume;
      r.oninput = () => { f.volume = Number(r.value); aplicarVolume(f); };
      r.onchange = salvar;
      vol.append(mudo, r);
      bts.append(vol);
    }
    li.append(bts);
    ul.append(li);
  });
}

// ---------- quadro ----------
function tamanho(el) {
  if (el instanceof HTMLImageElement) return el.complete && el.naturalWidth ? [el.naturalWidth, el.naturalHeight] : null;
  if (el instanceof HTMLVideoElement) return el.readyState >= 2 && el.videoWidth ? [el.videoWidth, el.videoHeight] : null;
  return null;
}
function desenhar() {
  g2d.fillStyle = '#000';
  g2d.fillRect(0, 0, W, H);
  for (let i = fontes.length - 1; i >= 0; i--) {
    const f = fontes[i];
    if (!f.visivel || !f.el) continue;
    const t = tamanho(f.el);
    if (!t) continue;
    const esc = (f.preencher ? Math.max : Math.min)(W / t[0], H / t[1]);
    const w = t[0] * esc, h = t[1] * esc;
    try { g2d.drawImage(f.el, (W - w) / 2, (H - h) / 2, w, h); } catch {}
  }
}

// RGBA do quadro -> NV12 (o formato da câmera virtual), feito na placa de vídeo.
function criarConversor() {
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl2', { antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
  if (!gl) throw new Error('Sem WebGL2 nesta máquina.');
  const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`));
  // BT.601, faixa limitada (o padrão das webcams). Cada pixel de saída guarda 4 bytes do NV12.
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, `#version 300 es
precision highp float; precision highp int;
uniform sampler2D src; uniform int H;
out vec4 o;
vec3 px(int x, int y){ return texelFetch(src, ivec2(x, y), 0).rgb; }
float Y(vec3 c){ return (16.0 + 65.481*c.r + 128.553*c.g + 24.966*c.b) / 255.0; }
vec2 UV(int cx, int r){
  int x = cx*2, y = r*2;
  vec3 c = (px(x,y) + px(x+1,y) + px(x,y+1) + px(x+1,y+1)) * 0.25;
  return vec2(128.0 - 37.797*c.r - 74.203*c.g + 112.0*c.b, 128.0 + 112.0*c.r - 93.786*c.g - 18.214*c.b) / 255.0;
}
void main(){
  ivec2 f = ivec2(gl_FragCoord.xy);
  if (f.y < H) { int x = f.x*4; o = vec4(Y(px(x,f.y)), Y(px(x+1,f.y)), Y(px(x+2,f.y)), Y(px(x+3,f.y))); }
  else { int r = f.y - H; o = vec4(UV(f.x*2, r), UV(f.x*2+1, r)); }
}`));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  const saida = gl.createTexture();
  const fbo = gl.createFramebuffer();
  const uH = gl.getUniformLocation(prog, 'H');
  // leitura em segundo plano (2 buffers, um pedido por vez): devolve o quadro anterior sem travar a placa
  // esperando; se a placa ainda não terminou o anterior, pula este tique em vez de pedir outro
  const pbos = [gl.createBuffer(), gl.createBuffer()];
  let fence = null, lendo = 0, k = 0;
  let ow = 0, oh = 0, dados = null;
  return (fonte, w, h) => {
    if (w !== ow * 4 || h * 1.5 !== oh) {
      ow = w / 4; oh = h * 1.5;
      dados = new Uint8Array(ow * oh * 4);
      gl.bindTexture(gl.TEXTURE_2D, saida);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, ow, oh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, saida, 0);
      gl.uniform1i(uH, h);
      if (fence) { gl.deleteSync(fence); fence = null; }
      for (const p of pbos) {
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, p);
        gl.bufferData(gl.PIXEL_PACK_BUFFER, dados.byteLength, gl.STREAM_READ);
      }
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    }
    let pronto = null;
    if (fence) {
      const st = gl.clientWaitSync(fence, 0, 0);
      if (st !== gl.ALREADY_SIGNALED && st !== gl.CONDITION_SATISFIED) return null;
      gl.deleteSync(fence);
      fence = null;
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbos[lendo]);
      gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, dados);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      pronto = dados;
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fonte);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, ow, oh);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbos[k]);
    gl.readPixels(0, 0, ow, oh, gl.RGBA, gl.UNSIGNED_BYTE, 0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    lendo = k;
    k ^= 1;
    return pronto;
  };
}
const converter = criarConversor();
window.__speedcam = { converter, fontes, canvas }; // usado pelos testes

let cam = null;
function aplicarRes() {
  [W, H] = cfg.res.split('x').map(Number);
  canvas.width = W; canvas.height = H;
}
$('res').value = cfg.res;
$('res').onchange = () => {
  cfg.res = $('res').value; salvar(); aplicarRes();
  for (const f of fontes) if (f.pagina) { parar(f, false); iniciar(f); } // página no tamanho novo
};
aplicarRes();

function ligarCam() {
  if (cam) {
    cam.fechar(); cam = null;
  } else {
    try { cam = vcam.abrir(W, H, FPS); } catch (e) { mostrarAviso(e.message); return; }
    esconderAviso();
  }
  document.body.classList.toggle('ao-vivo', !!cam);
  $('cam').textContent = cam ? 'Parar câmera virtual' : 'Iniciar câmera virtual';
  $('res').disabled = !!cam;
}
$('cam').onclick = ligarCam;
window.addEventListener('beforeunload', () => { if (cam) cam.fechar(); });

let tique = 0;
setInterval(() => {
  desenhar();
  if (cam) {
    try { const q = converter(canvas, W, H); if (q) cam.escrever(q); } catch (e) { mostrarAviso('A câmera virtual parou: ' + e.message); ligarCam(); }
  }
  if (++tique % 2 === 0) {
    analisador.getFloatTimeDomainData(amostras);
    let pico = 0;
    for (const v of amostras) pico = Math.max(pico, Math.abs(v));
    $('nivel').style.width = Math.min(100, pico * 100) + '%';
  }
}, 1000 / FPS);

// ---------- avisos ----------
function mostrarAviso(t) { const a = $('aviso'); a.textContent = t; a.hidden = false; }
function esconderAviso() { $('aviso').hidden = true; }
async function conferirDriver() {
  if (process.platform !== 'win32') return;
  const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
  if (!cams.some((d) => /OBS Virtual Camera/i.test(d.label))) mostrarAviso('Não achei a câmera virtual ("OBS Virtual Camera") neste PC. Instale o Speed Cam de novo e, quando o Windows pedir, clique em Sim para ele registrar a câmera.');
}

// ---------- janela de adicionar ----------
const modal = $('modal');
const corpo = $('modalCorpo');
function abrirModal(titulo) { $('modalTitulo').textContent = titulo; modal.hidden = false; }
function fecharModal() { modal.hidden = true; corpo.innerHTML = ''; }
$('modalFechar').onclick = fecharModal;
modal.onclick = (e) => { if (e.target === modal) fecharModal(); };
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) fecharModal(); });

function voltar() { const b = document.createElement('button'); b.className = 'voltar'; b.textContent = 'Voltar'; b.onclick = escolherTipo; return b; }

function escolherTipo() {
  abrirModal('Adicionar fonte');
  corpo.innerHTML = '';
  const g = document.createElement('div');
  g.className = 'tipos';
  const op = [
    ['screen', 'Tela inteira', 'O monitor todo, com o som do PC se quiser'],
    ['window', 'Janela', 'Um programa aberto (ex.: o outro OBS, um jogo)'],
    ['arquivo', 'Arquivo', 'Vídeo, imagem ou música do computador'],
    ['link', 'Link (URL)', 'Página da internet ou link direto de vídeo'],
    ['webcam', 'Webcam', 'Câmera ligada no PC'],
    ['audio', 'Microfone / som', 'Microfone ou outra entrada de som'],
  ];
  for (const [t, b, s] of op) {
    const bt = document.createElement('button');
    bt.innerHTML = `<b>${b}</b><span>${s}</span>`;
    bt.onclick = () => passo(t);
    g.append(bt);
  }
  corpo.append(g);
}
$('add').onclick = escolherTipo;

async function passo(tipo) {
  corpo.innerHTML = '';
  if (tipo === 'arquivo') {
    fecharModal();
    const p = await ipcRenderer.invoke('arquivo');
    if (p) adicionarArquivo(p);
    return;
  }
  abrirModal(TIPOS[tipo]);
  corpo.append(voltar());
  if (tipo === 'link') {
    const form = document.createElement('form');
    form.className = 'form-link';
    form.innerHTML = '<input type="text" placeholder="Cole o link aqui (https://...)" autofocus><button type="submit">Adicionar</button>';
    form.onsubmit = (e) => { e.preventDefault(); const u = normalizarLink(form.querySelector('input').value); if (u) { fecharModal(); adicionarLink(u); } };
    corpo.append(form);
    const n = document.createElement('p');
    n.className = 'nota';
    n.textContent = 'Página da internet abre escondida, como a Fonte de Navegador do OBS. Para clicar nela ou fazer login, use "Ver página" na lista.';
    corpo.append(n);
    form.querySelector('input').focus();
  } else if (tipo === 'screen' || tipo === 'window') {
    let somBox = null;
    if (tipo === 'screen') {
      somBox = document.createElement('label');
      somBox.className = 'check';
      somBox.innerHTML = '<input type="checkbox"> Levar o som do computador junto';
      corpo.append(somBox);
    }
    const grade = document.createElement('div');
    grade.className = 'grade';
    grade.textContent = 'Carregando...';
    corpo.append(grade);
    const lista = (await ipcRenderer.invoke('telas')).filter((s) => s.tipo === tipo);
    grade.textContent = lista.length ? '' : 'Nada encontrado.';
    for (const s of lista) {
      const b = document.createElement('button');
      const img = document.createElement('img');
      if (s.foto) img.src = s.foto;
      const d = document.createElement('div');
      d.textContent = s.nome;
      b.append(img, d);
      b.onclick = () => { fecharModal(); adicionar({ tipo, nome: s.nome, ref: s.id, somSistema: !!(somBox && somBox.querySelector('input').checked) }); };
      grade.append(b);
    }
    if (somBox) {
      const n = document.createElement('p');
      n.className = 'nota';
      n.textContent = 'O som do computador inclui tudo que toca no alto-falante. Se o Speed Cam também mandar som para o alto-falante padrão, vai repetir (eco): nesse caso mande o som para o CABLE Input.';
      corpo.append(n);
    }
  } else {
    const box = document.createElement('div');
    box.className = 'lista-disp';
    corpo.append(box);
    try {
      // pede permissão uma vez para os nomes dos aparelhos aparecerem
      const s = await navigator.mediaDevices.getUserMedia(tipo === 'webcam' ? { video: true } : { audio: true });
      s.getTracks().forEach((t) => t.stop());
    } catch {}
    const disp = (await navigator.mediaDevices.enumerateDevices())
      .filter((d) => d.kind === (tipo === 'webcam' ? 'videoinput' : 'audioinput'))
      .filter((d) => d.deviceId !== 'default' && d.deviceId !== 'communications' && !/OBS Virtual Camera/i.test(d.label));
    if (!disp.length) box.textContent = 'Nenhum aparelho encontrado.';
    for (const d of disp) {
      const b = document.createElement('button');
      b.textContent = d.label || 'Aparelho';
      b.onclick = () => { fecharModal(); adicionar({ tipo, nome: d.label || TIPOS[tipo], ref: d.label || d.deviceId }); };
      box.append(b);
    }
  }
}

function normalizarLink(t) {
  t = (t || '').trim();
  if (!t) return '';
  if (!/^[a-z]+:\/\//i.test(t)) t = 'https://' + t;
  try { const u = new URL(t); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; }
}
function nomeArquivo(p) { return p.split(/[\\/]/).pop(); }
function adicionarArquivo(p) { adicionar({ tipo: 'arquivo', nome: nomeArquivo(p), ref: p }); }
function adicionarLink(u) { let n = u; try { const x = new URL(u); n = x.hostname + (x.pathname.length > 1 ? x.pathname : ''); } catch {} adicionar({ tipo: 'link', nome: n, ref: u }); }

// colar (Ctrl+V) e arrastar: link ou arquivo vira fonte na hora
document.addEventListener('paste', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  const arqs = [...(e.clipboardData.files || [])];
  if (arqs.length) { e.preventDefault(); for (const a of arqs) { const p = webUtils.getPathForFile(a); if (p) adicionarArquivo(p); } return; }
  const t = e.clipboardData.getData('text').trim();
  if (/^[a-z]:\\|^\\\\/i.test(t)) { e.preventDefault(); adicionarArquivo(t.replace(/^"|"$/g, '')); return; }
  const u = normalizarLink(t);
  if (u && /\./.test(new URL(u).hostname)) { e.preventDefault(); adicionarLink(u); }
});
document.addEventListener('dragover', (e) => { e.preventDefault(); document.body.classList.add('arrastando'); });
document.addEventListener('dragleave', (e) => { if (!e.relatedTarget) document.body.classList.remove('arrastando'); });
document.addEventListener('drop', (e) => {
  e.preventDefault();
  document.body.classList.remove('arrastando');
  const arqs = [...e.dataTransfer.files];
  if (arqs.length) { for (const a of arqs) { const p = webUtils.getPathForFile(a); if (p) adicionarArquivo(p); } return; }
  const u = normalizarLink(e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text'));
  if (u) adicionarLink(u);
});

// ---------- começo ----------
navigator.mediaDevices.addEventListener('devicechange', () => listarSaidas());
listarSaidas();
conferirDriver();
for (const f of cfg.fontes.slice().reverse()) adicionar(f);
