// Roteiro do vídeo "A Speed desenvolve" (Reels/TikTok, 1080x1920, 30 fps).
// Tudo que se ajusta fica aqui: tempos das cenas, textos, sistemas e os passos de cada demonstração.
// Os tempos da narração ficam em narracao/frases.json (campo "em"); as legendas saem de lá + narracao/<voz>/duracoes.json.
window.ROTEIRO = {
  fps: 30,
  duracao: 56,            // segundos
  voz: 'faber',           // pasta em narracao/ (faber, cadu ou jeff)

  // cenas: [início, fim) em segundos
  cenas: {
    gancho:    [0, 4],
    solucao:   [4, 10],
    intro:     [10, 11.8],
    portfolio: [11.8, 40],  // 6 projetos de 4,7 s
    proposta:  [40, 48],
    cta:       [48, 56],
  },

  gancho: { linhas: ['SEU NEGÓCIO', 'PRECISA DE', 'UM SISTEMA?'], frase: 'n01' },
  solucao: {
    titulo: 'A SPEED DESENVOLVE.',
    complemento: ['Sistemas sob medida.', 'Soluções para o seu negócio.'],
    criar: 'Criar do zero',
    melhorar: 'Melhorar o que já existe',
  },
  intro: { linhas: ['CONHEÇA ALGUNS', 'DOS NOSSOS', 'PROJETOS.'] },
  proposta: {
    a: ['FEITO PARA', 'A SUA NECESSIDADE.'], aEm: 40.35,
    b: ['COM UM PREÇO', 'QUE CABE NO BOLSO.'], bEm: 45.45,
  },
  cta: {
    titulo: ['CONTE SUA IDEIA.', 'A SPEED DESENVOLVE.'],
    fale: 'Fale com a Speed',
    whatsapp: 'WhatsApp: (11) 97083-9724',
    site: 'www.speedco.com.br',
  },

  // Os seis projetos. 'tela': 'pc' (mockup de computador) ou 'cel' (celular), conforme o formato real do sistema.
  // 'passos': o que acontece na tela, em segundos a partir do início da cena do projeto:
  //   { t, img }               troca a imagem da tela (captura real em assets/capturas/<pasta>/)
  //   { t, toque: 'caixa' }    cursor/toque na caixa registrada em caixas.json (ou {x,y,w,h})
  //   { t, zoom: [cx, cy, s] } câmera da tela: centro (px da captura) e escala; 1 = tela inteira
  //   { t, extra: 'presente' } peça extra (ex.: efeito de presente do TikSpeed)
  projetos: [
    {
      nome: 'TikSpeed', pasta: 'tikspeed', tela: 'pc', frase: 'p1',
      beneficio: 'Dinâmicas de dança e efeitos de presentes ao vivo para lives do TikTok.',
      tamanho: [1440, 900],
      passos: [
        { t: 0, img: 'app-home-sticker.jpg', zoom: [720, 450, 1] },
        { t: 1.0, zoom: [760, 430, 1.22] },
        { t: 2.15, extra: 'presente', img2: 'gfx-lion.jpg' },
        { t: 3.6, zoom: [720, 450, 1] },
      ],
    },
    {
      nome: 'Creator X', pasta: 'creatorx-cel', tela: 'cel', frase: 'p2',
      beneficio: 'Lojas, creators e lives do TikTok Shop num painel só.',
      tamanho: [390, 844],
      passos: [
        { t: 0, img: 'c00.jpg', zoom: [195, 422, 1] },
        { t: 1.05, img: 'c01.jpg', rolar: 1 },
        { t: 1.75, toque: 'periodo' },
        { t: 2.05, img: 'c02.jpg' },
        { t: 2.35, zoom: [195, 497, 1.42] },
        { t: 3.9, zoom: [195, 422, 1] },
      ],
    },
    {
      nome: 'ZapBot', pasta: 'zapbot', tela: 'pc', frase: 'p3',
      beneficio: 'Atendimento automático e disparos no WhatsApp.',
      tamanho: [1440, 900],
      passos: [
        { t: 0, img: 'z00.jpg', zoom: [720, 450, 1] },
        { t: 0.55, zoom: [470, 470, 1.75] },
        { t: 0.95, img: 'z01.jpg' }, { t: 1.08, img: 'z02.jpg' },
        { t: 1.3, toque: 'enviar' },
        { t: 1.5, img: 'z10.jpg' },
        { t: 2.55, img: 'z11.jpg' },
        { t: 2.85, toque: 'enviar' },
        { t: 3.05, img: 'z20.jpg' },
      ],
    },
    {
      nome: 'Painel de RH', pasta: 'rh', tela: 'pc', frase: 'p4',
      beneficio: 'Funcionários, ponto e pagamentos do mês sob controle.',
      tamanho: [1440, 900],
      passos: [
        { t: 0, img: 'r00.jpg', zoom: [720, 450, 1] },
        { t: 0.95, img: 'r01.jpg' },
        { t: 1.25, zoom: [800, 380, 1.5] },
        { t: 1.85, toque: 'pendente' },
        { t: 2.05, img: 'r02.jpg' },
        { t: 2.7, toque: 'pendente2' },
        { t: 2.9, img: 'r03.jpg' },
        { t: 3.3, zoom: [700, 260, 1.55] },
      ],
    },
    {
      nome: 'Loja Speed', pasta: 'lojaspeed', tela: 'pc', frase: 'p5',
      beneficio: 'Caixa, estoque e fiado da loja num programa só.',
      tamanho: [1440, 900],
      passos: [
        { t: 0, img: 'l00.jpg', zoom: [720, 450, 1] },
        { t: 0.45, zoom: [640, 330, 1.45], toque: 'busca' },
        { t: 0.7, img: 'l01.jpg' }, { t: 0.78, img: 'l02.jpg' }, { t: 0.86, img: 'l03.jpg' }, { t: 0.94, img: 'l04.jpg' },
        { t: 1.02, img: 'l05.jpg' }, { t: 1.1, img: 'l06.jpg' }, { t: 1.18, img: 'l07.jpg' },
        { t: 1.45, toque: 'resultado' },
        { t: 1.65, img: 'l10.jpg', zoom: [720, 300, 1.35] },
        { t: 1.95, toque: 'colocar' },
        { t: 2.15, img: 'l11.jpg', zoom: [960, 420, 1.3] },
        { t: 2.45, toque: 'pix' },
        { t: 2.6, img: 'l12.jpg' },
        { t: 2.9, toque: 'finalizar' },
        { t: 3.1, img: 'l13.jpg', zoom: [720, 200, 1.5] },
      ],
    },
    {
      nome: 'Aurora Store', pasta: 'aurora', tela: 'cel', frase: 'p6',
      beneficio: 'Loja online com sacola e Pix, ligada ao estoque da loja.',
      tamanho: [390, 844],
      passos: [
        { t: 0, img: 'a01.jpg', zoom: [195, 422, 1] },
        { t: 0.75, toque: 'item' },
        { t: 0.95, img: 'a03.jpg' },
        { t: 1.35, img: 'a04.jpg' },
        { t: 1.55, toque: 'add' },
        { t: 1.75, img: 'a05.jpg' },
        { t: 2.0, toque: 'sacola' },
        { t: 2.2, img: 'a06.jpg' },
        { t: 2.5, toque: 'finalizar' },
        { t: 2.7, img: 'a08.jpg' },
        { t: 3.25, img: 'a09.jpg', zoom: [195, 240, 1.45] },
      ],
    },
  ],

  // safe area para Reels/TikTok (px no quadro 1080x1920): nada de texto fora disso
  seguro: { x0: 64, x1: 940, y0: 220, y1: 1530 },
};
