# SPEED Cortes

Site de cortes verticais automáticos com IA (estilo Opus Clip) — https://cortes.speedco.com.br

- Link do YouTube/TikTok/Instagram ou vídeo enviado → cortes de 30 s, 1, 2 ou 5 min em 1080x1920.
- Cada corte é uma ideia completa (começa no início de uma ideia, termina na conclusão) e abre com gancho.
- Segue o rosto (YuNet/OpenCV), legenda palavra por palavra (ASS), título do gancho, marca d'água texto/imagem.
- Motor: `app/pipeline.py`; API e fila: `app/server.py`; página: `app/public/`.

Roda no servidor Umbrel do dono em `/Home/Documents/umbrel-apps/cortes-speed` (contêiner `cortes-speed`, porta interna 4110).
Lá ficam o `.env` (chaves), o `CLAUDE.md` com o funcionamento completo e o `HISTORICO.md`. Deploy: `docker compose up -d --build`.
