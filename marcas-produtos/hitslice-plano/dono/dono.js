/* HitSlice — painel do dono: liberar mensalidade depois do pagamento pelo WhatsApp. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const data = (s) => new Date(s * 1000).toLocaleDateString("pt-BR");
  let contas = [], agora = 0;

  async function post(url, corpo) {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { mostrarLogin(); throw new Error("login"); }
    if (!r.ok) throw new Error(j.erro || "falhou");
    return j;
  }
  function mostrarLogin() { $("#painel").hidden = true; $("#entrar").hidden = false; $("#senha").focus(); }

  $("#entrar").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#erro-login").hidden = true;
    try { await post("/api/dono/entrar", { senha: $("#senha").value }); $("#senha").value = ""; carregar(); }
    catch (err) {
      $("#erro-login").textContent = err.message === "senha_errada" ? "Senha errada." : err.message === "tentativas" ? "Muitas tentativas. Espere 15 minutos." : "Não deu certo. Tente de novo.";
      $("#erro-login").hidden = false;
    }
  });

  async function carregar() {
    const r = await fetch("/api/dono/contas");
    if (r.status === 401) { mostrarLogin(); return; }
    const j = await r.json();
    contas = j.contas; agora = j.agora;
    $("#preco").textContent = j.preco;
    $("#entrar").hidden = true; $("#painel").hidden = false;
    const ativos = contas.filter((c) => c.pago_ate > agora).length;
    $("#resumo").textContent = `${contas.length} conta${contas.length === 1 ? "" : "s"} · ${ativos} com mensalidade ativa`;
    desenhar();
  }

  function situacao(c) {
    if (c.pago_ate > agora) return ["ativo", "Ativo até " + data(c.pago_ate)];
    if (c.pago_ate) return ["venc", "Venceu em " + data(c.pago_ate)];
    return c.testes ? ["", "Teste usado"] : ["", "Teste disponível"];
  }

  function desenhar() {
    const q = $("#busca").value.trim().toLowerCase();
    const lista = $("#lista");
    lista.replaceChildren();
    const vis = contas.filter((c) => !q || c.email.includes(q) || (c.nome || "").toLowerCase().includes(q));
    if (!vis.length) { lista.append(el("li", "info", "Nenhuma conta encontrada.")); return; }
    for (const c of vis) {
      const [cls, txt] = situacao(c);
      const li = el("li");
      const l1 = el("div", "linha1");
      const quem = el("div");
      quem.append(el("div", "email", c.email), el("div", "nome", (c.nome || "sem nome") + " · conta criada em " + data(c.criado)));
      l1.append(quem, el("span", "selo " + cls, txt));
      const acoes = el("div", "acoes");
      const mais = el("button", "pri", "+30 dias");
      mais.addEventListener("click", () => acao(c, "/api/dono/liberar", { id: c.id, dias: 30 }, `Liberar +30 dias para ${c.email}?`));
      acoes.append(mais);
      if (c.pago_ate > agora) {
        const menos = el("button", "", "−30 dias (desfazer)");
        menos.addEventListener("click", () => acao(c, "/api/dono/liberar", { id: c.id, dias: -30 }, `Tirar 30 dias de ${c.email}?`));
        const canc = el("button", "", "Cancelar mensalidade");
        canc.addEventListener("click", () => acao(c, "/api/dono/cancelar", { id: c.id }, `Cancelar a mensalidade de ${c.email} agora?`));
        acoes.append(menos, canc);
      }
      li.append(l1, acoes);
      if (c.ultimo_pag) li.append(el("div", "info", "Última mudança na mensalidade: " + data(c.ultimo_pag)));
      lista.append(li);
    }
  }

  async function acao(c, url, corpo, pergunta) {
    if (!confirm(pergunta)) return;
    try { await post(url, corpo); await carregar(); } catch (e) { if (e.message !== "login") alert("Não deu certo: " + e.message); }
  }

  $("#busca").addEventListener("input", desenhar);
  carregar().catch(mostrarLogin);
})();
