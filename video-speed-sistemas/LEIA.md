# Vídeo "A Speed desenvolve" — Reels / TikTok

Vídeo publicitário do serviço de desenvolvimento de sistemas da SPEED. Vertical 1080×1920, 30 fps, 56 s,
MP4 H.264 + AAC, português do Brasil. Feito em código: uma página HTML desenhada quadro a quadro (Playwright)
e montada com o ffmpeg.

## Onde fica cada coisa

| Arquivo | O que é |
|---|---|
| `roteiro.js` | **tudo que se ajusta**: tempos das cenas, textos, os 6 projetos (nome, benefício, celular/computador) e os passos de cada demonstração (troca de tela, toque, zoom) |
| `narracao/frases.json` | texto da narração: o que aparece na legenda, a grafia que a voz pronuncia certo e o segundo em que cada frase começa |
| `film.html` | a composição (cenas, mockups, cursor, zoom, legendas, transições com as três setas) |
| `audio.js` | trilha instrumental original gerada em código, efeitos, narração e mixagem (a trilha abaixa sob a voz) |
| `render.mjs` | tira os 1680 quadros, gera o áudio, normaliza o volume (-14 LUFS) e monta o MP4 |
| `fonts/` | Unbounded (títulos) e Manrope (textos), SIL OFL |
| `ferramentas/capturar.sh` + `capturar.mjs` | captura as telas reais dos sistemas com dados fictícios (cópias de teste isoladas) |
| `ferramentas/seed_rh.py` | funcionários fictícios do Painel de RH de teste |
| `ferramentas/narracao.sh` | gera a voz com o Piper (offline) |
| `ferramentas/ouvir.py` | confere a voz transcrevendo com o Whisper |
| `ferramentas/render.sh` | renderiza no servidor |
| `ferramentas/atualizar-do-github.sh` | traz a versão nova do código para o servidor |

Ficam **só no servidor** (fora do Git): `assets/capturas/` (telas), `assets/speed-logo.png` (logo oficial, tirada do
site speedco.com.br), `narracao/<voz>/*.wav`, `ferramentas/piper/` e `saida/`.

## Como renderizar (servidor, pasta /Home/Documents/video-speed-sistemas)

```sh
sh ferramentas/atualizar-do-github.sh                       # código novo do GitHub
nohup sh ferramentas/capturar.sh > .trabalho/capturar.log 2>&1 &   # só se as telas mudarem (~3 min)
sh ferramentas/narracao.sh faber 0.92                        # só se a narração mudar
sh ferramentas/render.sh AUDIT=1                             # confere textos na área segura
nohup sh ferramentas/render.sh > .trabalho/render.log 2>&1 &       # vídeo final em saida/ (~10-15 min)
```

Prévia de um quadro: `sh ferramentas/render.sh ONLY_T=12.5,30` (sai em `.trabalho/render/t12.5.jpg`).
No navegador (servindo a pasta): `film.html?t=12.5` mostra o quadro parado; `film.html?play=1` toca sem áudio.

Trocar a voz: `sh ferramentas/narracao.sh cadu` e `voz: 'cadu'` no `roteiro.js` (ou `render.sh VOZ=cadu`).
Usar uma locução gravada: salve uma frase por arquivo em `narracao/<pasta>/<id>.wav` (ids do `frases.json`), crie o
`duracoes.json` (o `narracao.sh` mostra o formato) e ponha `voz: '<pasta>'` no roteiro.

## Roteiro com marcação de tempo

| Tempo | Cena | Na tela | Narração |
|---|---|---|---|
| 0,0–4,0 | 1 Gancho | setas entram; "SEU NEGÓCIO / PRECISA DE / UM SISTEMA?" palavra a palavra | 0,55 "Seu negócio precisa de um sistema?" |
| 4,0–10,0 | 2 Solução | "A SPEED DESENVOLVE."; cartões das 6 interfaces se organizam; "Criar do zero" (tela nascendo) e "Melhorar o que já existe" (erro → resolvido); "Sistemas sob medida. / Soluções para o seu negócio." | 4,25 "A Speed desenvolve." · 5,75 "Criamos soluções sob medida e resolvemos problemas nos sistemas que você já usa." |
| 10,0–11,8 | 3 Portfólio | "CONHEÇA ALGUNS DOS NOSSOS PROJETOS." | 10,15 "Conheça alguns dos nossos projetos:" |
| 11,8–16,5 | 01 TikSpeed (computador) | app no meio de uma dinâmica + efeito de presente ao vivo | 12,1 "TikSpeed," |
| 16,5–21,2 | 02 Creator X (celular) | visão geral; toque em "7 dias"; números do período | 16,8 "Creator X," |
| 21,2–25,9 | 03 ZapBot (computador) | simulador: cliente manda "Oi", o bot responde com o menu; "2" → horário | 21,5 "ZapBot," |
| 25,9–30,6 | 04 Painel de RH (computador) | funcionários; financeiro do mês; pagamentos marcados como pagos | 26,2 "Painel de RH," |
| 30,6–35,3 | 05 Loja Speed (computador) | caixa: busca "vestido", põe na venda, Pix, venda concluída | 30,9 "Loja Speed" |
| 35,3–40,0 | 06 Aurora Store (celular) | loja online: peça, sacola, Pix, pagamento confirmado | 35,6 "e Aurora Store." |
| 40,0–45,4 | 4 Proposta | mockups se recolhem; "FEITO PARA / A SUA NECESSIDADE." | 40,35 "Cada negócio tem uma necessidade." · 42,65 "A sua empresa também pode ter um sistema feito para ela," |
| 45,4–48,0 | 4 Proposta | fundo branco: "COM UM PREÇO / QUE CABE NO BOLSO." | 45,55 "com um preço que cabe no bolso." |
| 48,0–56,0 | 5 Chamada | logo; "CONTE SUA IDEIA. / A SPEED DESENVOLVE."; Fale com a Speed · WhatsApp: (11) 97083-9724 · www.speedco.com.br (8 s na tela) | 48,4 "Conte sua ideia." · 49,75 "A Speed desenvolve." · 51,15 "Fale com a gente pelo WhatsApp." |

## De onde vêm as telas (todas reais, com dados fictícios)

- **TikSpeed**: prints do app de verdade rodando num servidor de teste com nomes inventados (os mesmos do site
  tikspeed.speedco.com.br; ver `speedco-conta/ferramentas/LEIA.md`).
- **Creator X**: Central de Lojas em modo demonstração (`DEMO=1`, dados fictícios do próprio app). A faixa
  "Demonstração · senha…" do topo fica escondida na captura.
- **ZapBot**: imagem `zapbot:v6` com dados vazios, sem WhatsApp conectado; a conversa é o simulador da aba
  **Testar** do app, com um menu de exemplo ("Loja Exemplo").
- **Painel de RH**: imagem do painel_web com banco SQLite temporário e 8 funcionários fictícios (`seed_rh.py`).
- **Loja Speed** e **Aurora Store**: demonstrações oficiais do LojaSpeed (`updates.speedco.com.br/lojaspeed/demo.html` e
  `demo-loja-online.html`, loja fictícia "Boutique Aurora", Pix de exemplo).

Nenhuma cópia de teste tem porta aberta (rede Docker `vss-net`) e todas são apagadas no fim da captura.

## Áudio

- Trilha: composta em código no `audio.js` (120 BPM, Lá menor), sem samples nem músicas de terceiros.
- Voz: Piper TTS (offline), voz pt_BR "faber" (dataset CC0). Escolhida por ter a melhor nota na conferência com o
  Whisper (`ferramentas/ouvir.py`) entre faber, cadu e jeff.
- Volume final normalizado a -14 LUFS (padrão de Reels/TikTok), pico -1,5 dB.
