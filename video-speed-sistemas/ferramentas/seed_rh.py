# Dados FICTÍCIOS para a demonstração do RH no vídeo (banco SQLite temporário dentro do contêiner vss-rh).
import os, datetime
os.environ.setdefault("DATABASE_URL", "/tmp/rh-demo.db")
from database import Database
db = Database(os.environ["DATABASE_URL"])
mes = datetime.date.today().strftime("%Y-%m")
emp = db.criar_rh_empresa("Empresa Exemplo", "", "")
for n, s, d in [("Atendimento", 2200, 0), ("Vendas", 2600, 0), ("Estoque", 2100, 0), ("Gerência", 4200, 0), ("Diarista", 0, 150)]:
    db.salvar_rh_cargo(n, s, d)
pessoas = [("Ana Ribeiro", "Atendimento", "CLT", 2200, 0, "Pix"), ("Bruno Costa", "Vendas", "CLT", 2600, 0, "Pix"),
           ("Carla Nunes", "Gerência", "PJ", 4200, 0, "Transferência"), ("Diego Alves", "Estoque", "CLT", 2100, 0, "Pix"),
           ("Elisa Martins", "Vendas", "CLT", 2600, 0, "Pix"), ("Fábio Rocha", "Diarista", "Diarista", 0, 150, "Dinheiro"),
           ("Gabi Torres", "Atendimento", "CLT", 2200, 0, "Pix"), ("Hugo Lima", "Vendas", "PJ", 2600, 0, "Pix")]
ids = []
for nome, cargo, vinc, sal, dia, forma in pessoas:
    fid = db.criar_rh_funcionario(emp, nome, cargo, vinc, sal, dia, "2026-03-02", forma_pagamento_padrao=forma, dia_pagamento=5)
    ids.append(fid)
hoje = datetime.date.today()
for i, fid in enumerate(ids):
    for d in range(1, hoje.day):
        dt = datetime.date(hoje.year, hoje.month, d)
        if dt.weekday() == 6: continue
        tipo = "falta" if (i in (1, 5) and d == 7) else "presenca"
        db.salvar_rh_ponto(fid, dt.isoformat(), tipo)
db.criar_rh_extra(ids[1], mes, "bonificacao", 300, "Meta de vendas")
db.criar_rh_extra(ids[4], mes, "bonificacao", 180, "Meta de vendas")
prev = [5, 5, 10, 5, 5, 15, 20, 10]
for i, (fid, p) in enumerate(zip(ids, pessoas)):
    base = p[3] if p[3] else p[4] * 20
    t, f, _, _ = db.resumo_rh_pontos(fid, mes)
    b, ds = db.resumo_rh_extras(fid, mes)
    db.salvar_rh_pagamento(fid, mes, t, f, base, 0, 0, 0, base + b - ds, forma_pagamento=p[5],
                           data_prevista_pagamento=f"{mes}-{prev[i]:02d}", extras_bonificacao=b, extras_desconto=ds)
for x in db.listar_rh_pagamentos(mes_referencia=mes)[:3]:
    db.marcar_rh_pagamento_pago(x["id"], 1)
db.criar_rh_despesa(emp, f"{mes}-03", "Aluguel da loja", 3500, "Fixas")
db.criar_rh_despesa(emp, f"{mes}-08", "Internet e telefone", 289.9, "Fixas")
print("ok", len(ids), "funcionários fictícios; mês", mes)
