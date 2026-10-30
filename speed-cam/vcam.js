// Câmera virtual: escreve os quadros (NV12) direto na memória compartilhada que o driver
// "OBS Virtual Camera" lê (vem com o OBS Studio instalado; o OBS não precisa estar aberto).
// Mesmo formato do obs-studio/plugins/win-dshow/shared-memory-queue.c.
'use strict';

const NOME = 'OBSVirtualCamVideo';
const CABECALHO = 80; // sizeof(struct queue_header)
const QUADRO_CAB = 32; // FRAME_HEADER_SIZE (timestamp + folga)
const alinha = (n) => (n + 31) & ~31;

let k32 = null;
function kernel32() {
  if (k32) return k32;
  const koffi = require('koffi');
  const k = koffi.load('kernel32.dll');
  k32 = {
    OpenFileMappingW: k.func('uintptr_t __stdcall OpenFileMappingW(uint32_t, int, str16)'),
    CreateFileMappingW: k.func('uintptr_t __stdcall CreateFileMappingW(uintptr_t, uintptr_t, uint32_t, uint32_t, uint32_t, str16)'),
    MapViewOfFile: k.func('uintptr_t __stdcall MapViewOfFile(uintptr_t, uint32_t, uint32_t, uint32_t, size_t)'),
    UnmapViewOfFile: k.func('int __stdcall UnmapViewOfFile(uintptr_t)'),
    CloseHandle: k.func('int __stdcall CloseHandle(uintptr_t)'),
    copiar: k.func('void __stdcall RtlMoveMemory(uintptr_t, const void *, size_t)'),
  };
  return k32;
}

// Abre a câmera virtual. Devolve { escrever(nv12), fechar() } ou lança erro com mensagem para a tela.
function abrir(cx, cy, fps) {
  if (process.platform !== 'win32') {
    if (process.env.SPEEDCAM_TESTE) return abrirTeste(cx, cy);
    throw new Error('A câmera virtual só funciona no Windows.');
  }
  const k = kernel32();
  const tamQuadro = (cx * cy * 3) / 2;
  const off = [];
  let tam = alinha(CABECALHO);
  for (let i = 0; i < 3; i++) { off.push(tam); tam = alinha(tam + tamQuadro + QUADRO_CAB); }

  const ja = k.OpenFileMappingW(0x0004 /* FILE_MAP_READ */, 0, NOME);
  if (ja) { k.CloseHandle(ja); throw new Error('A câmera virtual já está sendo usada por outro programa (feche a câmera virtual do OBS).'); }
  const h = k.CreateFileMappingW(0xFFFFFFFFFFFFFFFFn /* INVALID_HANDLE_VALUE */, 0, 0x04 /* PAGE_READWRITE */, 0, tam, NOME);
  if (!h) throw new Error('Não consegui criar a câmera virtual.');
  const base = k.MapViewOfFile(h, 0xF001F /* FILE_MAP_ALL_ACCESS */, 0, 0, 0);
  if (!base) { k.CloseHandle(h); throw new Error('Não consegui abrir a memória da câmera virtual.'); }

  const cab = Buffer.alloc(CABECALHO);
  cab.writeUInt32LE(1, 8); // STARTING
  off.forEach((o, i) => cab.writeUInt32LE(o, 12 + i * 4));
  cab.writeUInt32LE(cx, 28);
  cab.writeUInt32LE(cy, 32);
  cab.writeBigUInt64LE(BigInt(Math.round(10000000 / fps)), 40); // intervalo em 100 ns
  k.copiar(base, cab, CABECALHO);

  const u32 = Buffer.alloc(4);
  const ts = Buffer.alloc(8);
  const poe32 = (pos, v) => { u32.writeUInt32LE(v >>> 0, 0); k.copiar(base + pos, u32, 4); };
  let inc = 0;
  let aberto = true;
  return {
    escrever(nv12) {
      if (!aberto) return;
      inc = (inc + 1) >>> 0;
      const i = inc % 3;
      poe32(0, inc); // write_idx
      ts.writeBigUInt64LE(process.hrtime.bigint(), 0);
      k.copiar(base + off[i], ts, 8);
      k.copiar(base + off[i] + QUADRO_CAB, nv12, tamQuadro);
      poe32(4, inc); // read_idx: o driver lê este quadro
      poe32(8, 2); // READY
    },
    fechar() {
      if (!aberto) return;
      aberto = false;
      poe32(8, 3); // STOPPING
      k.UnmapViewOfFile(base);
      k.CloseHandle(h);
    },
  };
}

// Só para teste no Linux: guarda o último quadro em vez de mandar para o driver.
function abrirTeste(cx, cy) {
  const est = { cx, cy, quadros: 0, ultimo: null, aberto: true };
  globalThis.__vcamTeste = est;
  return {
    escrever(nv12) { est.quadros++; est.ultimo = Buffer.from(nv12); },
    fechar() { est.aberto = false; },
  };
}

module.exports = { abrir };
