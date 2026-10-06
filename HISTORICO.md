# Histórico — Vampire Hunters (antes Veil of Dawn)

## 2026-10-06 — Loja Modelo (projeto à parte, pasta `loja-modelo/`)

- Modelo de loja virtual em JavaScript puro (sem build): catálogo, carrinho, checkout com cupom e Pix,
  e painel admin (dashboard, produtos, pedidos, cupons e configurações). Dados no localStorage.
  O jogo não foi alterado. Veja `loja-modelo/README.md`.
- Faixa "Loja de demonstração" no topo; demonstração publicada em https://claude.ai/artifact/JyTmDYBXvyXDcibdzW7rq6.

## 2026-10-05 — Vampire Hunters: arte nova e jogo refeito (mapas de cima, resolução, batalha nova)

- Pacote novo "Vampire Hunters Anime Pack" (3 ZIPs, 800 arquivos conferidos por SHA-256) substituiu toda
  a arte. Nome do jogo, logo, app, instalador e saves passaram a Vampire Hunters.
- Animações: `tools/prepare_sprites.py` realinha a caminhada (pés numa linha, cabeça centrada, mesma
  escala) e recorta de novo as folhas de combate juntando pedaços que vazavam para o quadro vizinho.
- Resolução: opção "Resolution" (Match screen, 720p … 4K) com renderização real; janela do app segue.
- Mapas: agora vistos de cima, feitos por nós com os tiles do pacote + objetos gerados (casas, torii,
  lanternas, árvores, ponte, barracas, torre do festival). Emberfall refeita; conteúdo do Cap. 1 reposicionado.
- Batalha estilo Inazuma Eleven: cut-ins das técnicas, duelo Clash (Evade/Parry/Counter) nos ataques
  anunciados, palco com fundo pintado + chão em perspectiva que muda durante a luta (lanternas,
  dentro do selo, chamas brancas, lua vermelha), câmera do palco separada da interface.
- HDRI: segue na cinemática do nascer do sol e nas cores da luz; a névoa presa ao cenário antigo saiu.
- Teste completo no app Electron passou sem erros (inclui 2 Clashes e o chefe).
- Versão 0.2.0 publicada: https://updates.brgirlslive.com/vampirehunters/VampireHunters-Setup.exe (projeto do
  servidor renomeado para umbrel-apps/vampire-hunters; o link antigo do veilofdawn foi removido).

## 2026-10-05 — Instalador publicado no servidor de atualizações

- Versão 0.1.0 (commit 4a0b782) publicada pelo projeto do servidor `umbrel-apps/veil-of-dawn`:
  https://updates.brgirlslive.com/veilofdawn/VeilOfDawn-Setup.exe (e VeilOfDawn-Portable.exe).
- O instalador é montado no próprio servidor (Docker electronuserland/builder:22-wine), com hash e
  assinatura ed25519 no latest.json. Download público conferido (sha256 igual).

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
