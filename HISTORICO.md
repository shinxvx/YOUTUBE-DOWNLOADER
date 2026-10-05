# Histórico — Veil of Dawn

## 2026-10-05 — Virou app de desktop + HDRI do amanhecer

- Pedido do dono: o jogo é para desktop, não para navegador. Criado o app Electron 38
  (`electron/main.cjs` + `preload.cjs`): janela própria, tela cheia (F11 / Alt+Enter / Configurações),
  "Quit" no título e "Quit to Desktop" no menu, saves e configurações em arquivos JSON na pasta do
  usuário (gravação atômica), protocolo app:// com CSP rígida, uma instância só.
- Instalador Windows (NSIS, por usuário, atalhos) e versão portátil: `npm run dist:win` → `release/`.
- HDRI `citrus_orchard_puresky_2k.exr` integrado via `tools/bake_hdri.py`: cinemática do nascer do sol
  no fim do capítulo, névoa do amanhecer nas montanhas de Emberfall e cores da luz do amanhecer.
- Teste completo (`tools/playthrough.mjs`) agora roda dentro do app Electron: passou sem erros, saves
  gravados como arquivos. O .exe do Windows foi gerado mas não foi testado num Windows real.
- Aviso do dono: os sprites vão ser trocados por outros em breve.

## 2026-10-05 — Milestone 1 (fatia vertical) criada

- Projeto montado do zero: Phaser 3.90 + Vite, sem backend.
- Pacote de arte (3 ZIPs) conferido por SHA-256 e integrado: 28 atlas originais de caminhada,
  28 folhas de combate, 38 retratos, 3 cenários, tiles e logos.
- Emberfall jogável: entardecer → festival → lanternas apagando → noite → amanhecer, com
  iluminação dinâmica, névoa, partículas, oclusão de primeiro plano e colisão desenhadas sobre o
  cenário pintado.
- Capítulo 1 até a partida para Firstlight Bastion: diálogos completos, tutorial, 4 lutas comuns,
  chefe Garran com âncoras de sangue, despertar da marca, Elara como aliada convidada, Lyra.
- Sistemas: batalha por turnos com fila de iniciativa, Resolve/Stagger, regeneração vampírica,
  Veil Strain, ataques anunciados; save em 3 slots + 2 autosaves; configurações e acessibilidade;
  menu de pausa (grupo, itens, diário); galeria de arte; música e efeitos procedurais.
- Teste automático (`tools/playthrough.mjs`) jogou a fatia inteira sem erros.
- Pendente: HDRI (.exr) que o usuário vai enviar; Milestone 2 (Bastion, Dawnbreak, Lyra no grupo).
