# Vampire Hunters (ヴァンパイアハンターズ) — contexto do projeto

Jogo JRPG original para DESKTOP (antes chamado Veil of Dawn): app Electron 38 (`electron/`) com o
motor em Phaser 3 + Vite por baixo. O dono NÃO quer o jogador rodando no navegador: o produto é o
app (instalador Windows). Tudo offline. Converse com o dono em português; todo texto do jogo fica
em inglês. Estética: anime japonês sombrio (haori, hakama, katanas), mundo fictício Asterra.

## Onde está cada coisa

- Repositório: `shinxvx/youtube-downloader`, branch `claude/laughing-mccarthy-ekayva` (nome herdado).
- Roteiro canônico: `docs/Vampire_Hunters_Claude_Prompt.md`, `docs/LEIA_PRIMEIRO_CLAUDE.md` e
  `docs/japanese_character_designs.json` (visual de cada personagem). Não mudar história/final/regras.
- Andamento: `docs/ROADMAP.md`. Histórico: `HISTORICO.md` (registrar cada mudança no topo).
- Arte: `public/assets/vh/` (o `manifest.json` manda). `public/assets/vh/gen/` é gerado por
  `tools/prepare_sprites.py` (caminhada realinhada, combate recortado sem cortes). Temporários: `ASSETS.md`.

## Decisões do dono (não desfazer)

- Mapas vistos de CIMA, feitos por nós com os tiles do pacote + objetos gerados (`src/gfx/props.js`,
  `src/systems/mapBuilder.js`, mapas em `src/data/maps`). Não usar os cenários pintados como mapa:
  eles servem de fundo de batalha e de tela de título.
- Resolução escolhível (Configurações → Resolution) com renderização real na resolução escolhida.
- Batalha inspirada em Inazuma Eleven: cut-ins de técnica, duelo Clash, cenário que muda na luta.
- Animações: sempre conferir alinhamento/cortes (rodar o prepare_sprites e olhar as folhas).

## Regras técnicas

- Conteúdo é dado: capítulos em `src/data/chapters`, mapas em `src/data/maps`; IDs estáveis (saves).
- Seal Stage é narrativo; Veil Strain é recurso de batalha recuperável.
- Depois de mudar algo: `npm run build` e `xvfb-run -a node tools/playthrough.mjs`. Não dizer que
  algo foi testado sem ter rodado.
- Publicar: no servidor Umbrel, projeto `/Home/Documents/umbrel-apps/vampire-hunters` (leia o
  CLAUDE.md de lá). Push aqui primeiro; o `ferramentas/publicar.mjs` de lá monta e publica em
  https://updates.brgirlslive.com/vampirehunters/VampireHunters-Setup.exe. Suba `version` no package.json.
