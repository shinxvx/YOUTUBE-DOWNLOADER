# Veil of Dawn — contexto do projeto

Jogo JRPG original (em inglês para o jogador) feito em Phaser 3 + Vite, roda 100% no navegador e
offline. O dono do projeto é brasileiro: converse com ele em português; todo texto do jogo
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
- Depois de mudar algo: `npm run build`, subir o preview e rodar `node tools/playthrough.mjs`
  (joga a fatia inteira no Chromium headless). Não dizer que algo foi testado sem ter rodado.
- Registrar cada alteração no topo do `HISTORICO.md`.
