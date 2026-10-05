# Histórico

## 2026-10-05 — v0.1.0: primeira versão jogável

- Projeto criado do zero: Electron 44 + Electron Forge 8, JavaScript, Canvas 480×320 com escala inteira.
- Motor de regras completo conforme o prompt (30 cartas, Essência 1→6, 3 criaturas, evolução, fadiga,
  limite de mão, empate, vantagem Ember→Grove→Tide→Ember), com ordem determinística de efeitos
  e motivo exibido para toda ação ilegal.
- Decisões para fechar regras: mulligan grátis, mão inicial sempre com criatura básica, evolução só
  estágio a estágio, relíquia vai ao descarte com a criatura, Burn/Shield/Stun/Hex/Guard/Sturdy/Quick.
  Lendários: só por missão, sem limite de "1 por deck" (pedido do dono).
- Catálogo de 80 cartas, 3 decks iniciais balanceados (40–60% entre si), 11 decks de NPC.
- IA com 5 perfis; olha só informação pública + a própria mão.
- Ato 1 completo (chegada → parceiro → aula → admissão contra Ren → cerimônia de Vael → demonstração
  contra Soren → pulso do farol → licença Initiate), missões secundárias de Mira, Pip e Juno.
- Mapa da ilha, locais com retratos e ações, calendário manhã/tarde/noite, editor de decks,
  coleção, enciclopédia com linhagens, loja com probabilidades, diário, mensagens, 3 desafios táticos.
- Saves em arquivo (autosave + 3 slots, gravação atômica, .bak, versão + migração), configurações,
  pausa ao perder o foco, Alt+Enter, música e efeitos sintetizados (chiptune original).
- Arte provisória gerada por código (ver ASSETS.md).
- Testado: `npm test` (21 testes de regra, 3 desafios resolvidos por solver, 120 duelos IA×IA),
  `tools/playtest.mjs` (Chromium headless joga o Ato 1 inteiro sem erros), `tools/electron-check.mjs`
  (app Electron real e build Linux empacotado: saves, .bak, recuperação). Pasta e zip do Windows
  gerados, mas não executados (sem Windows/Wine aqui).
