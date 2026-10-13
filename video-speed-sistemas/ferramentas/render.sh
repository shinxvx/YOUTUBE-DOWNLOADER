#!/bin/sh
# Renderiza o vídeo no servidor (imagem tikspeed-video:2 = Playwright + ffmpeg). Demora ~10-15 min: rode em segundo plano.
#   nohup sh ferramentas/render.sh [AUDIT=1|ONLY_T=3,12.5|VOZ=cadu] > .trabalho/render.log 2>&1 &
# Saída: saida/speed-sistemas-reels.mp4 (+ capa.jpg, audio-final.wav). Os quadros PNG ficam em .trabalho/quadros (apagáveis).
H=/home/umbrel/umbrel/home
P=$H/Documents/video-speed-sistemas
mkdir -p $P/saida $P/.trabalho
docker run --rm $( [ -n "$1" ] && echo "-e $1" ) -e WORKERS=${WORKERS:-4} -e RAIZ=/v -e SAIDA=/out \
  -v $P:/v:ro -v $P/.trabalho/render:/out -v $H/.backups-claude/pwt/node_modules:/r/node_modules:ro tikspeed-video:2 \
  sh -c "cp /v/render.mjs /r/render.mjs && node /r/render.mjs"
for f in speed-sistemas-reels.mp4 capa.jpg audio-final.wav; do [ -f $P/.trabalho/render/$f ] && cp $P/.trabalho/render/$f $P/saida/; done
ls -la $P/saida
