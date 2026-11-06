'use strict';
// Os 3 sites da NINEFOX (06/11/2026, pedido do dono). Endereço -> site pelo .env (HOSTS_*), para trocar de domínio sem mexer no código:
// hoje em teste no speedco.com.br; depois ninefox.com.br / shop.ninefox.com.br / tcg.ninefox.com.br (conta Cloudflare PESSOAL do dono).
const lista = (v) => String(v || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

const SITES = {
  inst: {
    id: 'inst', tipo: 'institucional', nome: 'NINEFOX',
    hosts: lista(process.env.HOSTS_INST || 'nf.speedco.com.br'),
    titulo: 'NINEFOX — tecnologia e soluções',
    descricao: 'Sistemas sob medida, automação e lojas online. A NINEFOX transforma ideia em sistema funcionando.',
  },
  shop: {
    id: 'shop', tipo: 'vitrine', nome: 'NINEFOX SHOP', logo: 'ninefox-shop',
    hosts: lista(process.env.HOSTS_SHOP || 'nf-shop.speedco.com.br'),
    titulo: 'NINEFOX SHOP — achados para casa e decoração',
    descricao: 'Os achados mais bem avaliados da Shopee para casa e decoração, com preço conferido.',
    hero: ['sua casa mais bonita,', 'pagando menos.'],
    sub: 'Garimpamos todo dia os itens de casa e decoração mais bem avaliados da Shopee. Você só escolhe.',
    busca: 'buscar achado (ex.: luminária, organizador)',
    zap: process.env.ZAP_SHOP || '', insta: process.env.INSTA_SHOP || '',
    ofertas: {
      precoMin: 8, precoMax: 600, notaMin: 4.6, vendasMin: 100, max: 160,
      bloquear: /sexy|sensual|erotic|adulto|arma|simulacro|faca tatica|remedio|medicament|cigarro|vape|narguil/,
      // categorias = CÔMODOS (o site navega por cômodo, com ilustração própria de cada um)
      grupos: [
        { cat: 'sala', palavras: ['quadro decorativo sala', 'almofada decorativa', 'tapete sala', 'luminária de chão', 'vaso decorativo'] },
        { cat: 'cozinha', palavras: ['potes herméticos', 'utensílios de cozinha silicone', 'porta temperos', 'organizador de cozinha'] },
        { cat: 'quarto', palavras: ['jogo de cama', 'abajur', 'cortina blackout', 'organizador guarda roupa'] },
        { cat: 'banheiro', palavras: ['tapete banheiro', 'toalha de banho', 'organizador banheiro', 'kit banheiro'] },
        { cat: 'varanda', palavras: ['planta artificial', 'vaso para plantas', 'luminária solar jardim', 'jardim vertical'] },
      ],
    },
  },
  tcg: {
    id: 'tcg', tipo: 'vitrine', nome: 'NINEFOX TCG', logo: 'ninefox-tcg',
    hosts: lista(process.env.HOSTS_TCG || 'nf-tcg.speedco.com.br'),
    titulo: 'NINEFOX TCG — boosters e produtos de card games',
    descricao: 'Ofertas de boosters, boxes e acessórios de TCG na Shopee, com preço conferido.',
    hero: ['o booster certo,', 'no preço certo.'],
    sub: 'Ofertas de boosters, boxes e acessórios de TCG garimpadas na Shopee, das lojas mais bem avaliadas.',
    busca: 'buscar (ex.: booster, elite trainer box, sleeve)',
    zap: process.env.ZAP_TCG || '', insta: process.env.INSTA_TCG || '',
    ofertas: {
      precoMin: 5, precoMax: 2000, notaMin: 4.7, vendasMin: 30, max: 160,
      exigir: /pokemon|tcg|booster|carta|card|sleeve|deck|fichario|binder|playmat/,
      // fora: "cartas douradas/metal", proxies e personalizadas (quase sempre não oficiais)
      bloquear: /dourad|gold|metal|metalic|proxy|personaliz|replica|fake|nao oficial|adesivo|chaveiro|pelucia|camiseta|fantasia/,
      grupos: [
        { cat: 'booster', palavras: ['booster pokemon tcg', 'booster pokemon original copag', 'pacote cartas pokemon original'] },
        { cat: 'box', palavras: ['box pokemon tcg', 'elite trainer box pokemon', 'coleção pokemon tcg', 'blister pokemon tcg'] },
        { cat: 'deck', palavras: ['deck pokemon tcg', 'baralho batalha pokemon'] },
        { cat: 'acessórios', palavras: ['sleeve pokemon', 'fichário cartas pokemon', 'deck box tcg', 'playmat tcg'] },
      ],
    },
  },
};

function siteDoHost(host) {
  const h = String(host || '').toLowerCase().replace(/:\d+$/, '');
  return Object.values(SITES).find((s) => s.hosts.includes(h)) || null;
}

module.exports = { SITES, siteDoHost };
