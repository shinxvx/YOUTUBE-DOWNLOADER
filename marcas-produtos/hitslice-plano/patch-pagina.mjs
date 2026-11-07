// Aplica o plano (teste grátis de 1 vídeo + mensalidade pelo WhatsApp) na página do HitSlice (app/public-nova).
// Uso: node patch-pagina.mjs <pasta public-nova>
import fs from 'fs';
import path from 'path';
const dir = process.argv[2];
const F = (n) => path.join(dir, n);
function troca(n, pares) {
  let s = fs.readFileSync(F(n), 'utf8');
  for (const [a, b] of pares) {
    const q = typeof a === 'string' ? s.split(a).length - 1 : (s.match(new RegExp(a.source, a.flags + 'g')) || []).length;
    if (q !== 1) throw new Error(`${n}: achei ${q}x ${String(a).slice(0, 70)}`);
    s = typeof a === 'string' ? s.replace(a, () => b) : s.replace(a, b);
  }
  if (/�/.test(s)) throw new Error(n + ' corrompido');
  fs.writeFileSync(F(n), s); console.log('ok', n);
}

troca('app.js', [
  ['muitos: "Limite de 30 cortes por vídeo.",', 'muitos: "Limite de 30 cortes por vídeo.", assinar: "Seu vídeo grátis já foi usado. Ative a mensalidade para continuar.",'],
  ['muitos: "Limit of 30 clips per video.",', 'muitos: "Limit of 30 clips per video.", assinar: "Your free video was already used. Activate the monthly plan to continue.",'],
  [/conta_dica: '[^']*'/, 'conta_dica: "Create your account and clip 1 video for free to try it. After that, the monthly plan is R$ 59.90."'],
  ['      abrirTarefa(j.id, true);\n    } catch (err) {\n', '      abrirTarefa(j.id, true);\n      atualizarPlano();\n    } catch (err) {\n      if (err.message === "assinar") atualizarPlano();\n'],
  ['    $("#hero").classList.remove("compacto");\n  }\n  $("#novo")', '    $("#hero").classList.remove("compacto");\n    desenharPlano();\n  }\n  $("#novo")'],
  ['    $("#conta").hidden = true; $("#conta-topo").hidden = false;\n    lerHash();\n  }\n  aplicarLingua();',
   '    $("#conta").hidden = true; $("#conta-topo").hidden = false;\n    lerHash();\n    desenharPlano();\n  }\n  aplicarLingua();'],
  ['  async function iniciar() {', `  // ------------------------------------------------------------------ plano (07/11/2026): 1 vídeo grátis para testar; depois mensalidade pelo WhatsApp
  const PL = {
    pt: { ativo: (dt) => \`Mensalidade ativa até \${dt}.\`, teste: (p) => \`Teste grátis: você pode cortar 1 vídeo. Depois, a mensalidade é R$ \${p}.\`,
      fim_t: "Seu vídeo grátis já foi usado", vencido_t: "Sua mensalidade venceu", sem_teste_t: "Ative a mensalidade para cortar",
      fim: (p) => \`Para continuar cortando vídeos, ative a mensalidade de R$ \${p} por mês. O pagamento é feito pelo WhatsApp e a gente libera na sua conta.\`,
      zap: "Assinar pelo WhatsApp", msg: (p, e) => \`Olá! Quero assinar o HitSlice (R$ \${p}/mês). E-mail da minha conta: \${e}\` },
    en: { ativo: (dt) => \`Monthly plan active until \${dt}.\`, teste: (p) => \`Free trial: you can clip 1 video. After that, the monthly plan is R$ \${p.replace(",", ".")}.\`,
      fim_t: "Your free video was already used", vencido_t: "Your monthly plan expired", sem_teste_t: "Activate the monthly plan to clip",
      fim: (p) => \`To keep clipping videos, activate the monthly plan (R$ \${p.replace(",", ".")} per month). Payment is arranged on WhatsApp and we unlock your account.\`,
      zap: "Subscribe on WhatsApp", msg: (p, e) => \`Hi! I want to subscribe to HitSlice (R$ \${p}/month). My account e-mail: \${e}\` },
  };
  function desenharPlano() {
    const box = $("#plano");
    const p = eu && eu.plano;
    if (!box) return;
    box.replaceChildren(); box.className = "plano";
    if (!p) { box.hidden = true; return; }
    const t = PL[lang] || PL.pt;
    if (p.ativo) box.append(el("p", "plano-linha", t.ativo(new Date(p.pago_ate * 1000).toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US"))));
    else if (p.teste) box.append(el("p", "plano-linha", t.teste(p.preco)));
    else {
      box.classList.add("bloqueado");
      const a = el("a", "btn plano-zap", t.zap);
      a.href = "https://wa.me/" + p.whatsapp + "?text=" + encodeURIComponent(t.msg(p.preco, eu.email));
      a.target = "_blank"; a.rel = "noopener";
      box.append(el("h3", "plano-tit", p.pago_ate ? t.vencido_t : (p.teste_usado ? t.fim_t : t.sem_teste_t)), el("p", "plano-txt", t.fim(p.preco)), a);
    }
    box.hidden = false;
    const bloq = box.classList.contains("bloqueado");
    $$("#form > :not(#plano)").forEach((x) => x.classList.toggle("plano-oculto", bloq));
  }
  async function atualizarPlano() {
    try { const r = await fetch("/api/conta"); if (r.ok) eu = await r.json(); } catch (e) { /* sem rede */ }
    desenharPlano();
  }
  $$(".idioma button").forEach((b) => b.addEventListener("click", () => setTimeout(desenharPlano, 0)));

  async function iniciar() {`],
]);

troca('index.html', [
  ['<form id="form" class="painel" autocomplete="off" novalidate hidden>\n', '<form id="form" class="painel" autocomplete="off" novalidate hidden>\n    <div class="plano" id="plano" hidden aria-live="polite"></div>\n'],
  [/estilo\.css\?v=(\d+)/, (m, n) => 'estilo.css?v=' + (+n + 1)],
  [/app\.js\?v=(\d+)/, (m, n) => 'app.js?v=' + (+n + 1)],
  [/(<p class="dica" data-i18n="conta_dica">)[^<]*(<\/p>)/, '$1Crie a conta e corte 1 vídeo grátis para testar. Depois, a mensalidade é R$ 59,90.$2'],
]);

fs.appendFileSync(F('estilo.css'), `
/* plano (07/11/2026): teste grátis de 1 vídeo; depois mensalidade pelo WhatsApp */
.plano { margin: 0 0 16px; padding: 12px 16px; border-radius: 16px; background: var(--vidro-2); border: 1px solid var(--borda); }
.plano-linha { margin: 0; color: var(--sub); font-size: 14px; }
.plano.bloqueado { margin: 0; padding: 26px 20px; border-color: var(--m); text-align: center; }
.plano-tit { margin: 0 0 8px; font-family: var(--font-heading); font-size: 22px; color: var(--txt); }
.plano-txt { margin: 0 auto 20px; max-width: 460px; color: var(--sub); }
.plano-zap { background: var(--m); color: var(--m-txt); text-decoration: none; }
.plano-oculto { display: none !important; }
`); console.log('ok estilo.css');
