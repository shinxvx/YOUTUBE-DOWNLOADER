# Loja Modelo

Modelo de loja virtual em **JavaScript puro**: sem framework, sem build e sem dependências.
Para usar, abra o `index.html` no navegador (com duplo clique mesmo) ou sirva a pasta em qualquer hospedagem estática.

## O que tem

**Vitrine**
- Banner com produtos em destaque, faixa de vantagens, catálogo com busca, filtro por categoria e ordenação
- Página do produto com preço "de/por", parcelamento, aviso de estoque e produtos relacionados
- Carrinho em gaveta lateral com barra de "falta X para frete grátis"
- Checkout em 3 passos (dados, entrega e pagamento por Pix, cartão ou boleto), com cupom de desconto, 5% de desconto no Pix e validação dos campos
- Tela de pedido confirmado (com bloco de Pix)
- Tema claro e escuro, layout responsivo e animações suaves

**Painel admin** (`#/admin`, senha padrão `admin123`)
- Visão geral: receita, ticket médio, pedidos a processar, gráfico dos últimos 14 dias, mais vendidos e estoque baixo
- Produtos: cadastrar, editar (com prévia), ativar ou ocultar e excluir. A imagem pode ser uma URL ou um emoji com cor de fundo
- Pedidos: filtro por status, detalhes, mudança de status (cancelar devolve o estoque), botão de WhatsApp e exportação em CSV
- Cupons: percentual, valor fixo ou frete grátis
- Configurações: nome da loja, cor de destaque, textos do banner, frete, senha, categorias, backup/importação em JSON e restauração dos dados de exemplo

## Estrutura

```
index.html        casca da página (header, gaveta, rodapé)
css/styles.css    design (tokens de cor no :root; a cor de destaque vem das Configurações)
js/store.js       dados: produtos, pedidos, cupons, carrinho (localStorage)
js/ui.js          utilidades: moeda, modal, toast, tema
js/shop.js        vitrine, carrinho e checkout
js/admin.js       painel administrativo
js/app.js         rotas por hash (#/, #/produto/ID, #/checkout, #/pedido/ID, #/admin/ABA)
```

## Antes de usar de verdade

Este é um **modelo**: os dados ficam no navegador de quem acessa, e o login do painel só protege a interface.
Para colocar uma loja no ar, faça o seguinte:

1. **Backend/API**: troque as funções `load`/`save` e os métodos de `js/store.js` por chamadas à sua API (Node/Express, Supabase, Firebase…). O resto do código só usa `Store.*`.
2. **Login real** no servidor (a senha não pode ficar no front-end).
3. **Pagamento**: integre um gateway (Mercado Pago, Stripe, PagSeguro, Asaas…) em `Store.checkout` e gere o Pix ou o link de cartão por ele. O modelo não coleta dados de cartão.
4. **Frete**: troque o frete fixo por um cálculo por CEP (Correios ou Melhor Envio).
