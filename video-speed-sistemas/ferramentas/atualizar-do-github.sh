#!/bin/sh
# Traz a versão mais nova do projeto (código do vídeo) do GitHub para esta pasta, sem mexer em assets/, narracao/*/ e saida/.
# Fonte: github.com/shinxvx/YOUTUBE-DOWNLOADER, pasta video-speed-sistemas/ (branch abaixo).
BR=${1:-claude/adoring-tesla-6u3i68}
H=/home/umbrel/umbrel/home
P=$H/Documents/video-speed-sistemas
T=$P/.trabalho/git; rm -rf $T
docker run --rm -v $P/.trabalho:/t alpine/git clone -q --depth 1 --branch "$BR" --filter=blob:none --sparse https://github.com/shinxvx/YOUTUBE-DOWNLOADER.git /t/git
docker run --rm -v $P/.trabalho:/t -w /t/git alpine/git sparse-checkout set video-speed-sistemas
cp -r $T/video-speed-sistemas/. $P/
docker run --rm -v $P/.trabalho:/t -w /t/git alpine/git log -1 --format='%h %s'
