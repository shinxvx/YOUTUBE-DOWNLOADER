# Loja Online Speed (demo Dehleec)

Loja virtual com estoque escondido da cliente, frete dos Correios (PAC/SEDEX) e Pix/cartão (crédito e débito).
Hoje em MODO DEMONSTRAÇÃO (DEMO=1): pagamento e frete simulados, reset diário às 04:00.

- Loja: `/` · Painel: `/admin` (demo: admin@demo.com / demo1234)
- Node 22 + express 5 + node:sqlite. Dados em `data/` (loja.db + fotos/).
- No servidor: `/Home/Documents/umbrel-apps/loja-online` (atualizar.sh baixa esta pasta do GitHub e faz o build).
- Para produção: trocar o Pix/cartão simulado pelo Mercado Pago e a tabela de frete pela API dos Correios (contrato) ou Melhor Envio.
