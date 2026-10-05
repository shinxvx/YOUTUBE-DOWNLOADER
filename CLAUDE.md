# Veil of Dawn — contexto do projeto

Jogo JRPG original (em inglês para o jogador) para DESKTOP: app Electron 38 (pasta `electron/`)
com o motor em Phaser 3 + Vite por baixo. O dono NÃO quer o jogador rodando no navegador: o
produto é o app (instalador Windows em `release/` via `npm run dist:win`). Tudo offline. O dono do projeto é brasileiro: converse com ele em português; todo texto do jogo
(diálogos, menus, itens, tutoriais) fica em inglês.

## Onde está cada coisa

- Repositório: `shinxvx/youtube-downloader`, branch `claude/laughing-mccarthy-ekayva` (o nome do repo
  é herdado; o conteúdo é o jogo).
- Roteiro canônico: `docs/Veil_of_Dawn_Claude_Prompt.md` e `docs/LEIA_PRIMEIRO_CLAUDE.md`. Não mudar
  revelações, final ou regras do mundo.
- Andamento por milestone: `docs/ROADMAP.md`. Histórico de mudanças: `HISTORICO.md`.
- Arte: `public/assets/vod/` (o `manifest.json` manda). O que é temporário está em `ASSETS.md`.

## Regras técnicas

- Caminhada: atlas originais em `originals/` com o JSON de recorte; nunca cortar em grade de 48 px.
  Tamanho lógico 48×48; zoom do mundo 2×. Combate: folhas prontas de `sprites/`.
- Conteúdo é dado: capítulos em `src/data/chapters`, mapas em `src/data/maps`, encontros, inimigos,
  habilidades e itens em `src/data`. IDs estáveis (os saves dependem deles).
- Seal Stage é narrativo (só avança em cenas); Veil Strain é recurso de batalha recuperável.
- Os sprites de personagem vão ser trocados por outro conjunto (o dono vai explicar). Tudo é
  carregado pelo manifest; não acoplar código a detalhes da arte atual.
- HDRI: `assets-src/hdri/*.exr` → `python3 tools/bake_hdri.py` gera `public/assets/sky/`.
- Depois de mudar algo: `npm run build` e `xvfb-run -a node tools/playthrough.mjs`
  (joga a fatia inteira dentro do app Electron). Não dizer que algo foi testado sem ter rodado.
- Publicar uma versão para os jogadores: no servidor Umbrel, projeto
  `/Home/Documents/umbrel-apps/veil-of-dawn` (leia o CLAUDE.md de lá). Faça push aqui primeiro; o
  `ferramentas/publicar.mjs` de lá baixa este branch, monta o instalador e publica em
  https://updates.brgirlslive.com/veilofdawn/VeilOfDawn-Setup.exe. Suba `version` no package.json.
- Registrar cada alteração no topo do `HISTORICO.md`.
