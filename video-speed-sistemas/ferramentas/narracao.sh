#!/bin/sh
# Gera a narração com o Piper (TTS offline; vozes pt_BR faber/cadu/jeff, dataset CC0 — ver ferramentas/piper/*.card).
# Uso: sh ferramentas/narracao.sh [voz] [ritmo]   (padrão: faber 0.92; ritmo < 1 = mais rápido)
# Saída: narracao/<voz>/<id>.wav (22050 Hz mono) + narracao/<voz>/duracoes.json
# O Piper (binário Linux + vozes .onnx) fica em ferramentas/piper/ no servidor; não vai para o Git (~250 MB):
#   github.com/rhasspy/piper/releases (2023.11.14-2, piper_linux_x86_64.tar.gz) e huggingface.co/rhasspy/piper-voices (pt/pt_BR/<voz>/medium).
H=/home/umbrel/umbrel/home
P=$H/Documents/video-speed-sistemas
VOZ=${1:-faber}; RITMO=${2:-0.92}
mkdir -p $P/narracao/$VOZ
docker run --rm -v $P:/p -w /p node:22-bookworm-slim sh -c "
node -e '
const fs=require(\"fs\"),{execFileSync}=require(\"child_process\");
const F=JSON.parse(fs.readFileSync(\"narracao/frases.json\",\"utf8\")).frases, d={};
for (const f of F) {
  const out=\"narracao/$VOZ/\"+f.id+\".wav\";
  execFileSync(\"ferramentas/piper/bin/piper\",[\"--model\",\"ferramentas/piper/$VOZ.onnx\",\"--length_scale\",\"$RITMO\",\"--sentence_silence\",\"0\",\"--output_file\",out],{input:f.voz,env:{...process.env,LD_LIBRARY_PATH:\"ferramentas/piper/bin\"},stdio:[\"pipe\",\"ignore\",\"ignore\"]});
  const b=fs.readFileSync(out); const sr=b.readUInt32LE(24), n=b.readUInt32LE(40)/2;
  // mede a fala de verdade (tira o silêncio do começo e do fim)
  let a=0,z=n-1; const s=i=>Math.abs(b.readInt16LE(44+i*2)); while(a<n&&s(a)<500)a++; while(z>a&&s(z)<500)z--;
  d[f.id]={dur:+(n/sr).toFixed(3),fala_ini:+(a/sr).toFixed(3),fala_fim:+(z/sr).toFixed(3)};
}
fs.writeFileSync(\"narracao/$VOZ/duracoes.json\",JSON.stringify(d,null,1)); console.log(JSON.stringify(d));
'"
