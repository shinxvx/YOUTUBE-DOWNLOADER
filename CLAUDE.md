# Eidra: Nexus Academy — contexto do projeto

RPG de coleção de criaturas com duelos de cartas para DESKTOP (Electron + Electron Forge, JavaScript,
Canvas). Referências: visual de Pokémon FireRed/LeafGreen (GBA) e estrutura de Yu-Gi-Oh! GX Duel Academy
(GBA): mapa com destinos selecionáveis, retratos, diálogos, rotina, duelos. **Sem movimentação livre.**
Tudo offline, sem pagamento real. Converse com o dono em português; todo texto do jogo fica em inglês.

## Onde está cada coisa

- Repositório: `shinxvx/YOUTUBE-DOWNLOADER`, branch `claude/trusting-keller-kgiotm` (só o Eidra; o
  Vampire Hunters fica no branch `claude/laughing-mccarthy-ekayva` do mesmo repositório).

- Regras do duelo: `src/engine/duel.js` (puro, determinístico). IA: `src/ai/ai.js`.
- Conteúdo é dado: `src/content/` (cartas, decks, história/eventos, personagens, lore, desafios).
  IDs estáveis (saves dependem deles).
- Campanha: `src/game/` (estado/save, eventos, roteiros). Telas: `src/scenes/`.
- Decisões de regra e modelo de dados: `docs/DESIGN.md`. Andamento: `docs/ROADMAP.md`.
  Histórico: `HISTORICO.md` (registrar cada mudança no topo). Arte provisória: `ASSETS.md`.

## Decisões do dono (não desfazer)

- Lendários só por missões da história, nunca em pacotes; sem limite de "1 lendário por deck".
- Prompt original: `docs/PROMPT.md` (história, regras e prioridades).

## Regras técnicas

- Depois de mudar algo: `npm test`, `npm run build` e `npm run playtest` (Chromium headless joga o Ato 1).
  Para o app real: `xvfb-run -a npm run check:electron`. Não dizer que algo foi testado sem ter rodado.
- O build é um script clássico (IIFE) porque o app abre `dist/index.html` via file://.
- O instalador Squirrel do Windows precisa de Windows (ou Wine+Mono); aqui só sai a pasta/zip.
