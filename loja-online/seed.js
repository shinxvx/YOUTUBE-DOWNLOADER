// Produtos da demonstração (fictícios, só para mostrar a loja). arte = "tipo" do desenho em /arte/<id>.svg
'use strict';
const P = [
  ['Semijoias', 'Brinco Gota Cristal', 'Brinco banhado a ouro 18k com cristal lapidado em gota. Antialérgico, fecho tarraxa. Garantia de 1 ano no banho.', 89.9, 119.9, 6, 30, 'brinco', 1],
  ['Semijoias', 'Colar Ponto de Luz', 'Corrente veneziana de 45 cm banhada a ouro 18k com zircônia central. Delicado para usar todos os dias. Garantia de 1 ano.', 129.9, null, 4, 40, 'colar', 1],
  ['Semijoias', 'Anel Solitário Zircônia', 'Anel banhado a ouro 18k com zircônia solitária. Tamanhos 14 a 20: informe o seu nas observações. Garantia de 1 ano.', 99.9, null, 1, 25, 'anel', 1],
  ['Semijoias', 'Pulseira Elos Delicados', 'Pulseira de elos banhada a ouro 18k, 18 cm com extensor. Brilho suave e acabamento polido. Garantia de 1 ano.', 109.9, 139.9, 5, 35, 'pulseira', 1],
  ['Semijoias', 'Argola Média Cravejada', 'Argola de 2,5 cm cravejada com zircônias, banho de ouro 18k. Fecho click seguro. Garantia de 1 ano.', 119.9, null, 0, 30, 'argola', 0],
  ['Semijoias', 'Colar Folhas Douradas', 'Colar com pingente de folhas, inspirado na natureza. Banho de ouro 18k, 42 cm + extensor. Garantia de 1 ano.', 149.9, null, 3, 45, 'colar-folha', 1],
  ['Semijoias', 'Brinco Ear Cuff Folha', 'Ear cuff em formato de ramo, banhado a ouro 18k. Não precisa de furo. Garantia de 1 ano.', 79.9, null, 7, 20, 'earcuff', 0],
  ['Semijoias', 'Tornozeleira Coração', 'Tornozeleira fina com pingentes de coração, banho de ouro 18k. Garantia de 1 ano.', 69.9, 89.9, 2, 20, 'pulseira', 0],
  ['Perfumes', 'Perfume Floral Eau de Parfum 50 ml', 'Floral frutado com notas de rosa, pera e baunilha. Fixação de 8 a 10 horas.', 189.9, 229.9, 8, 380, 'perfume', 1],
  ['Perfumes', 'Perfume Âmbar Intense 100 ml', 'Oriental amadeirado com âmbar, café e fava tonka. Marcante para a noite.', 249.9, null, 3, 520, 'perfume2', 0],
  ['Perfumes', 'Body Splash Flor de Laranjeira 200 ml', 'Fragrância leve e refrescante para o dia a dia, com hidratação suave.', 59.9, null, 12, 260, 'splash', 0],
  ['Maquiagem', 'Batom Matte Vinho', 'Batom matte de longa duração, não resseca e tem alta cobertura em uma passada.', 39.9, 49.9, 15, 30, 'batom', 1],
  ['Maquiagem', 'Base Líquida Segunda Pele', 'Cobertura média construível, acabamento natural e FPS 15. 30 ml.', 79.9, null, 7, 90, 'base', 0],
  ['Maquiagem', 'Paleta de Sombras Nude', '12 tons entre matte e cintilantes para looks do dia à noite. Alta pigmentação.', 89.9, 109.9, 2, 150, 'paleta', 0],
  ['Skincare', 'Sérum Vitamina C 30 ml', 'Vitamina C 10% com ácido hialurônico: uniformiza o tom e dá viço à pele.', 99.9, 129.9, 10, 90, 'serum', 1],
  ['Skincare', 'Hidratante Facial Gel 50 g', 'Textura leve, toque seco e hidratação por 24 horas. Para todos os tipos de pele.', 69.9, null, 6, 110, 'creme', 0],
  ['Skincare', 'Protetor Solar FPS 50 com Cor', 'Proteção UVA/UVB, cor universal e acabamento matte. 40 g.', 79.9, null, 0, 80, 'bisnaga', 0],
  ['Skincare', 'Óleo Corporal Iluminador 100 ml', 'Óleo seco com partículas douradas: hidrata e ilumina a pele.', 89.9, null, 4, 140, 'oleo', 0]
];
function slug(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function semear({ run, tx }) {
  tx(() => {
    for (const [cat, nome, desc, preco, de, est, peso, arte, dest] of P)
      run('INSERT INTO produtos(slug,nome,categoria,descricao,preco,preco_de,estoque,peso_g,arte,destaque) VALUES(?,?,?,?,?,?,?,?,?,?)',
        slug(nome), nome, cat, desc, preco, de, est, peso, arte, dest);
  });
}
module.exports = { semear };
