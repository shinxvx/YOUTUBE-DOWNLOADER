#!/bin/sh
# Sobe cópias de TESTE (dados fictícios, rede Docker isolada "vss-net", sem porta aberta) do Painel de RH, ZapBot e
# Creator X, captura as telas com o Playwright e derruba tudo no fim. Nada encosta nos apps de verdade nem nos dados deles.
# Uso (pelo executar do conector; demora ~3 min, rode em segundo plano):
#   nohup sh ferramentas/capturar.sh [ONLY=lojaspeed,aurora] > .trabalho/capturar.log 2>&1 &
H=/home/umbrel/umbrel/home
P=$H/Documents/video-speed-sistemas
O=$P/assets/capturas
mkdir -p $O
docker network create vss-net >/dev/null 2>&1 || true

# Painel de RH: imagem do painel_web com banco SQLite temporário dentro do contêiner + funcionários fictícios
docker rm -f vss-rh >/dev/null 2>&1 || true
docker run -d --name vss-rh --network vss-net -e DATABASE_URL=/tmp/rh-demo.db -e SECRET_KEY=video-$(date +%s) painel_web-painel:latest \
  sh -c "python -c 'import app' && exec gunicorn -w 1 -b 0.0.0.0:5000 app:app" >/dev/null
# ZapBot: imagem do Dockge (zapbot:v6) com dados vazios; WhatsApp NÃO conectado (só o simulador da aba Testar)
docker image inspect zapbot:v6 >/dev/null 2>&1 || docker exec dockge_dockge_1 docker save zapbot:v6 | docker load
docker rm -f vss-zap >/dev/null 2>&1 || true
docker run -d --name vss-zap --network vss-net -e HOST=0.0.0.0 -e PANEL_PASSWORD=demo-video -e ZB_NO_PRESET=1 -e DATA_DIR=/tmp/zbdata -e TZ=America/Sao_Paulo zapbot:v6 >/dev/null
# Creator X: Central de Lojas em modo demonstração (DEMO=1 cria os dados fictícios)
docker rm -f vss-cx >/dev/null 2>&1 || true
docker run -d --name vss-cx --network vss-net -e DEMO=1 -e ADMIN_LOGIN=admin -e ADMIN_PASSWORD=demo-video-123 -e DATA_DIR=/tmp/cxdata -e TZ=America/Sao_Paulo central-lojas:v1 >/dev/null
sleep 10
docker cp $P/ferramentas/seed_rh.py vss-rh:/app/seed_rh.py && docker exec vss-rh python seed_rh.py
RHPW=$(docker exec vss-rh python -c "import database;print(database.SENHA_ADMIN_PADRAO)")
RHLOGIN=$(docker exec vss-rh python -c "import database;print(database.LOGIN_ADMIN_PADRAO)")

docker run --rm --network vss-net $( [ -n "$1" ] && echo "-e $1" ) -e RHPW="$RHPW" -e RHLOGIN="$RHLOGIN" \
  -v $P/ferramentas:/f:ro -v $O:/out -v $H/Documents/umbrel-apps/atualizacoes/publico/lojaspeed:/ls:ro \
  -v $H/.backups-claude/pwt/node_modules:/r/node_modules:ro mcr.microsoft.com/playwright:v1.56.0-noble \
  sh -c "cp /f/capturar.mjs /r/capturar.mjs && node /r/capturar.mjs" || echo "CAPTURA COM ERRO"

docker rm -f vss-rh vss-zap vss-cx >/dev/null 2>&1 || true

# TikSpeed: prints reais do site (app de verdade em servidor de teste, nomes inventados; ver speedco-conta/ferramentas/LEIA.md)
mkdir -p $O/tikspeed
for f in app-home-sticker.jpg app-overlays.jpg gfx-lion.jpg gfx-galaxy.jpg ov-sticker.jpg ov-general.jpg ov-goal.jpg; do
  cp $H/Documents/umbrel-apps/speedco-conta/app/public/img/$f $O/tikspeed/
done
echo '{"tela":[1440,900],"caixas":{}}' > $O/tikspeed/caixas.json
ls -R $O | head -120
