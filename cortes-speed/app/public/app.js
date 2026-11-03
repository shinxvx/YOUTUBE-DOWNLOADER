/* SPEED Cortes — página. Sem dependências. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // ------------------------------------------------------------------ textos PT / EN
  const TXT = {
    pt: {},
    en: {
      selo: "AI · A hook in every clip · Auto captions",
      h1: 'Long videos become <span class="grad">viral vertical clips</span>',
      sub: "Paste a YouTube link or upload your video. AI finds the best moments, cuts them with a beginning, middle and end, opens each clip with a hook and adds captions. Ready for TikTok, Reels and Shorts.",
      aba_link: "YouTube link", aba_arquivo: "Upload video", ph: "Paste the YouTube link here", colar: "Paste",
      soltar: "Tap to choose or drop the video here", soltar_lim: "MP4, MOV, MKV or WEBM · up to 3 GB · up to 2 hours",
      g_dur: "Clip length", g_qtd: "How many clips", auto: "Automatic", g_enq: "Vertical framing",
      enq_auto: "Follow the face", enq_desf: "Blurred background", enq_centro: "Fixed center",
      enq_dica: '"Follow the face" keeps the speaker centered; with no face on screen it switches to blurred background.',
      g_leg: "Captions", posicao: "Position", p_baixo: "Bottom", p_meio: "Middle", p_alto: "Top",
      g_gancho: "Hook", gt_tit: "Hook title on top", gt_sub: "Short line that grabs attention in the first seconds",
      gi_tit: "Open with the strongest line", gi_sub: "If the best moment is in the middle, it plays first as a teaser",
      g_marca: "Watermark", m_nenhuma: "None", m_texto: "Text", m_imagem: "Image / logo",
      logo: "Choose image (transparent PNG works best)", opac: "Opacity", g_lingua: "Spoken language",
      l_auto: "Detect automatically", gerar: "Create clips",
      ps_baixar: "Getting the video", ps_trans: "Transcribing every word", ps_ia: "AI picking the best moments and hooks",
      ps_render: "Building vertical clips with captions",
      pode_sair: "You can keep this page open or come back later with this same link: clips are kept for 48 hours.",
      seus: "Your clips", zip: "Download all (.zip)", novo: "Make another",
      como: "How the clips are made", c1t: "Every word timed", c1: "Audio is transcribed word by word, so no clip starts or ends mid-speech.",
      c2t: "Complete idea + hook", c2: "AI reads the whole video and picks parts that make sense on their own, grab attention at the start and end with a payoff.",
      c3t: "Vertical, captions, watermark", c3: "The video becomes 9:16 following the face, gets animated word-by-word captions and your watermark.",
    },
  };
  const DIN = {
    pt: {
      fila: (n) => `Na fila: ${n}º lugar`, fila_sub: "Começa sozinho quando chegar a sua vez.",
      lendo: "Lendo o link…", baixando: "Baixando o vídeo…", preparando: "Preparando o vídeo…",
      transcrevendo: "Transcrevendo…", escolhendo: "A IA está escolhendo os cortes…",
      renderizando: (a, b) => `Montando o corte ${a} de ${b}…`, pronto: "Prontinho!", erro: "Não deu certo",
      enviando: (p) => `Enviando o vídeo… ${p}%`, nota: "Nota viral", porque: "Por que funciona",
      baixar: "Baixar MP4", srt: "Legenda .srt", copiar: "Copiar legenda do post", copiado: "Copiado!",
      gancho: "Gancho", duracao: (s) => `${Math.round(s)} s`, de_ate: (a, b) => `trecho ${a} – ${b} do vídeo`,
      escolha_arq: "Escolha um vídeo.", cole: "Cole um link do YouTube, TikTok ou Instagram.", min: "min",
      aviso_ia: "A IA ficou fora do ar em parte do vídeo; alguns cortes foram escolhidos pelo plano B (sem IA).",
      aviso_render: "Algum corte falhou ao montar e foi pulado.", sem_logo: "Escolha a imagem da marca d'água.",
    },
    en: {
      fila: (n) => `In queue: #${n}`, fila_sub: "It starts automatically when it's your turn.",
      lendo: "Reading the link…", baixando: "Downloading the video…", preparando: "Preparing the video…",
      transcrevendo: "Transcribing…", escolhendo: "AI is picking the clips…",
      renderizando: (a, b) => `Building clip ${a} of ${b}…`, pronto: "All done!", erro: "Something went wrong",
      enviando: (p) => `Uploading the video… ${p}%`, nota: "Viral score", porque: "Why it works",
      baixar: "Download MP4", srt: "Captions .srt", copiar: "Copy post caption", copiado: "Copied!",
      gancho: "Hook", duracao: (s) => `${Math.round(s)} s`, de_ate: (a, b) => `from ${a} – ${b} of the video`,
      escolha_arq: "Choose a video.", cole: "Paste a YouTube, TikTok or Instagram link.", min: "min",
      aviso_ia: "The AI was down for part of the video; some clips were picked by the fallback (no AI).",
      aviso_render: "A clip failed to build and was skipped.", sem_logo: "Choose the watermark image.",
    },
  };
  const ERROS = {
    pt: {
      link: "Cole um link do YouTube, TikTok ou Instagram.", privado: "Esse vídeo é privado.",
      idade: "Vídeo com restrição de idade (precisa de login).", robo: "O YouTube pediu verificação de robô. Tente de novo em alguns minutos.",
      membros: "Vídeo só para membros do canal.", indisponivel: "Vídeo indisponível.", aovivo: "Live ao vivo não dá: espere terminar.",
      baixar: "Não consegui baixar esse vídeo.", demorou: "Demorou demais para ler o link.", longo: "Vídeo longo demais (máximo 2 horas).",
      grande: "Arquivo grande demais (máximo 3 GB).", envio: "O envio não terminou. Tente de novo.", fonte: "Cole um link ou envie um vídeo.",
      fila: "Muita gente usando agora. Tente de novo em alguns minutos.", porip: "Você já tem 2 vídeos sendo cortados. Espere um terminar.",
      video: "Não consegui ler esse arquivo de vídeo.", semfala: "Não encontrei fala nesse vídeo para cortar.",
      semcortes: "Não achei trechos bons para cortar nesse vídeo.", render: "Falhou ao montar os cortes.",
      logo: "Imagem da marca d'água inválida (use PNG, JPG ou WEBP até 4 MB).", reinicio: "O servidor reiniciou durante o envio. Envie de novo.",
      falhou: "Falhou. Tente de novo.", rede: "Sem conexão com o servidor. Confira a internet.",
    },
    en: {
      link: "Paste a YouTube, TikTok or Instagram link.", privado: "This video is private.",
      idade: "Age-restricted video (login required).", robo: "YouTube asked for a bot check. Try again in a few minutes.",
      membros: "Members-only video.", indisponivel: "Video unavailable.", aovivo: "Live streams can't be clipped until they end.",
      baixar: "Couldn't download this video.", demorou: "Reading the link took too long.", longo: "Video too long (2 hours max).",
      grande: "File too big (3 GB max).", envio: "Upload didn't finish. Please try again.", fonte: "Paste a link or upload a video.",
      fila: "Too many people right now. Try again in a few minutes.", porip: "You already have 2 videos being clipped. Wait for one to finish.",
      video: "Couldn't read this video file.", semfala: "No speech found in this video.",
      semcortes: "Couldn't find good moments to clip.", render: "Failed to build the clips.",
      logo: "Invalid watermark image (PNG, JPG or WEBP up to 4 MB).", reinicio: "The server restarted during upload. Please upload again.",
      falhou: "Failed. Please try again.", rede: "No connection to the server. Check your internet.",
    },
  };

  let lang = "pt";
  try { lang = localStorage.getItem("lang") || ((navigator.language || "pt").toLowerCase().startsWith("pt") ? "pt" : "en"); } catch (e) { /* sem storage */ }
  const ORIG = new Map();
  function aplicarLingua() {
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
    $$("[data-i18n]").forEach((el) => {
      if (!ORIG.has(el)) ORIG.set(el, el.textContent);
      el.textContent = lang === "pt" ? ORIG.get(el) : (TXT.en[el.dataset.i18n] || ORIG.get(el));
    });
    $$("[data-i18n-html]").forEach((el) => {
      if (!ORIG.has(el)) ORIG.set(el, el.innerHTML);
      el.innerHTML = lang === "pt" ? ORIG.get(el) : (TXT.en[el.dataset.i18nHtml] || ORIG.get(el));
    });
    $$("[data-i18n-ph]").forEach((el) => {
      if (!ORIG.has(el)) ORIG.set(el, el.placeholder);
      el.placeholder = lang === "pt" ? ORIG.get(el) : (TXT.en[el.dataset.i18nPh] || ORIG.get(el));
    });
    $$(".idioma button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    if (ultimo) mostrar(ultimo);
  }
  $$(".idioma button").forEach((b) => b.addEventListener("click", () => {
    lang = b.dataset.lang;
    try { localStorage.setItem("lang", lang); } catch (e) { /* ok */ }
    aplicarLingua();
  }));
  const d = () => DIN[lang];
  const erroTxt = (c) => ERROS[lang][c] || ERROS[lang].falhou;

  // ------------------------------------------------------------------ formulário
  const opc = { duracao: 60, qtd: 0, enquadramento: "auto", estilo_legenda: "amarelo", posicao_legenda: "baixo", marca_tipo: "nenhuma", marca_pos: "sd" };
  $$("[data-campo]").forEach((g) => {
    g.addEventListener("click", (ev) => {
      const b = ev.target.closest("button[data-v]");
      if (!b) return;
      g.querySelectorAll("button[data-v]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      const v = b.dataset.v;
      opc[g.dataset.campo] = /^\d+$/.test(v) ? Number(v) : v;
      if (g.dataset.campo === "marca_tipo") marcaUI();
    });
  });
  function marcaUI() {
    $("#marca-opcoes").hidden = opc.marca_tipo === "nenhuma";
    $("#marca_texto").hidden = opc.marca_tipo !== "texto";
    $("#logo-rot").hidden = opc.marca_tipo !== "imagem";
  }
  marcaUI();
  $("#legenda").addEventListener("change", () => { $("#leg-opcoes").classList.toggle("off", !$("#legenda").checked); });

  let aba = "link";
  $$(".aba").forEach((b) => b.addEventListener("click", () => {
    aba = b.dataset.aba;
    $$(".aba").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
    $("#fonte-link").hidden = aba !== "link";
    $("#fonte-arquivo").hidden = aba !== "arquivo";
    esconderErro();
  }));

  // prévia do link
  let infoTimer = 0, infoUrl = "";
  $("#url").addEventListener("input", () => { clearTimeout(infoTimer); infoTimer = setTimeout(previa, 500); });
  $("#colar").addEventListener("click", async () => {
    try { $("#url").value = (await navigator.clipboard.readText()).trim(); previa(); } catch (e) { $("#url").focus(); }
  });
  async function previa() {
    const url = $("#url").value.trim();
    if (!url || url === infoUrl) return;
    infoUrl = url;
    $("#previa").hidden = true;
    esconderErro();
    if (!/^https?:\/\//i.test(url)) return;
    try {
      const r = await fetch("/api/info", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      const j = await r.json();
      if (url !== $("#url").value.trim()) return;
      if (!r.ok) { mostrarErro(erroTxt(j.erro)); return; }
      $("#previa-img").src = j.miniatura || "icone.svg";
      $("#previa-tit").textContent = j.titulo || url;
      $("#previa-sub").textContent = [j.canal, j.duracao ? fmt(j.duracao) : ""].filter(Boolean).join(" · ");
      $("#previa").hidden = false;
    } catch (e) { /* só prévia */ }
  }
  const fmt = (s) => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0"); };

  // arquivo
  let arquivo = null;
  const soltar = $("#soltar");
  $("#arquivo").addEventListener("change", (e) => escolherArquivo(e.target.files[0]));
  ["dragenter", "dragover"].forEach((t) => soltar.addEventListener(t, (e) => { e.preventDefault(); soltar.classList.add("sobre"); }));
  ["dragleave", "drop"].forEach((t) => soltar.addEventListener(t, (e) => { e.preventDefault(); soltar.classList.remove("sobre"); }));
  soltar.addEventListener("drop", (e) => escolherArquivo(e.dataTransfer.files[0]));
  function escolherArquivo(f) {
    if (!f) return;
    arquivo = f;
    $("#soltar-txt").textContent = `${f.name} · ${(f.size / 1048576).toFixed(0)} MB`;
    soltar.classList.add("ok");
  }
  let logoArq = null;
  $("#logo").addEventListener("change", (e) => { logoArq = e.target.files[0] || null; if (logoArq) $("#logo-txt").textContent = logoArq.name; });

  function mostrarErro(t) { const e = $("#erro"); e.textContent = t; e.hidden = false; }
  function esconderErro() { $("#erro").hidden = true; }

  async function api(url, corpo, extra) {
    const r = await fetch(url, { method: "POST", ...(extra || { headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) }) });
    let j = {};
    try { j = await r.json(); } catch (e) { /* vazio */ }
    if (!r.ok) throw new Error(j.erro || "falhou");
    return j;
  }

  async function enviarArquivo(f) {
    const ini = await api("/api/envio", { nome: f.name, tamanho: f.size });
    const passo = ini.pedaco;
    const partes = Math.ceil(f.size / passo);
    for (let n = 0; n < partes; n++) {
      let ok = false;
      for (let tent = 0; tent < 4 && !ok; tent++) {
        try {
          const r = await fetch(`/api/envio/${ini.id}/pedaco?n=${n}`, { method: "POST", body: f.slice(n * passo, Math.min(f.size, (n + 1) * passo)) });
          ok = r.ok;
          if (!ok && r.status === 400) throw new Error((await r.json()).erro || "envio");
        } catch (e) {
          if (e.message && e.message !== "Failed to fetch" && tent === 3) throw e;
          await new Promise((res) => setTimeout(res, 1500 * (tent + 1)));
        }
      }
      if (!ok) throw new Error("envio");
      estadoEnvio(Math.round(100 * (n + 1) / partes));
    }
    return ini.id;
  }
  function estadoEnvio(p) {
    $("#status").hidden = false;
    $("#st-tit").textContent = d().enviando(p);
    $("#st-sub").textContent = arquivo ? arquivo.name : "";
    $("#st-pct").textContent = p + "%";
    $("#st-barra").style.width = p + "%";
  }

  $("#form").addEventListener("submit", async (e) => {
    e.preventDefault();
    esconderErro();
    const corpo = { ...opc, legenda: $("#legenda").checked, titulo_gancho: $("#titulo_gancho").checked,
      gancho_inicio: $("#gancho_inicio").checked, marca_texto: $("#marca_texto").value.trim(),
      marca_opacidade: Number($("#marca_opacidade").value) / 100, lingua: $("#lingua").value };
    if (aba === "link") {
      corpo.url = $("#url").value.trim();
      if (!/^https?:\/\//i.test(corpo.url)) { mostrarErro(d().cole); return; }
    } else if (!arquivo) { mostrarErro(d().escolha_arq); return; }
    if (opc.marca_tipo === "imagem" && !logoArq) { mostrarErro(d().sem_logo); return; }
    const btn = $("#gerar");
    btn.disabled = true;
    try {
      if (opc.marca_tipo === "imagem") {
        corpo.logo_id = (await api("/api/logo", null, { body: logoArq, headers: { "content-type": "application/octet-stream" } })).id;
      }
      if (aba === "arquivo") corpo.envio_id = await enviarArquivo(arquivo);
      const j = await api("/api/tarefas", corpo);
      abrirTarefa(j.id, true);
    } catch (err) {
      mostrarErro(err.message === "Failed to fetch" ? erroTxt("rede") : erroTxt(err.message));
      $("#status").hidden = true;
    } finally { btn.disabled = false; }
  });

  // ------------------------------------------------------------------ acompanhar a tarefa
  let tarefa = null, ultimo = null, timer = 0, renderizados = "";
  function abrirTarefa(id, novo) {
    tarefa = id;
    if (novo) history.pushState(null, "", "#t=" + id);
    $("#form").hidden = true;
    $("#hero").classList.add("compacto");
    $("#status").hidden = false;
    $("#como").hidden = true;
    renderizados = "";
    $("#cortes").replaceChildren();
    window.scrollTo({ top: 0, behavior: "smooth" });
    olhar();
  }
  async function olhar() {
    clearTimeout(timer);
    if (!tarefa) return;
    try {
      const r = await fetch("/api/tarefas/" + tarefa);
      if (r.status === 404) { voltar(); return; }
      ultimo = await r.json();
      mostrar(ultimo);
      if (ultimo.estado === "pronto" || ultimo.estado === "erro") return;
    } catch (e) { /* tenta de novo */ }
    timer = setTimeout(olhar, 2500);
  }

  function mostrar(t) {
    const st = $("#status");
    const pronto = t.estado === "pronto";
    st.hidden = pronto && t.cortes.length > 0;
    let tit = "", sub = t.titulo || "";
    if (t.estado === "fila") { tit = d().fila(t.posicao || 1); sub = d().fila_sub; }
    else if (t.estado === "erro") { tit = d().erro; sub = erroTxt(t.erro); }
    else if (t.etapa === "renderizando") tit = d().renderizando(Math.min(t.cortes.length + 1, t.total_cortes), t.total_cortes);
    else tit = typeof d()[t.etapa] === "string" ? d()[t.etapa] : d().pronto;
    $("#st-tit").textContent = tit;
    $("#st-sub").textContent = sub;
    $("#st-pct").textContent = Math.round(t.progresso) + "%";
    $("#st-barra").style.width = t.progresso + "%";
    st.classList.toggle("com-erro", t.estado === "erro");
    const ordem = ["baixando", "transcrevendo", "escolhendo", "renderizando"];
    const atual = { lendo: 0, preparando: 0, baixando: 0, transcrevendo: 1, escolhendo: 2, renderizando: 3, pronto: 4 }[t.etapa];
    $$("#passos li").forEach((li) => {
      const i = ordem.indexOf(li.dataset.p);
      li.className = atual === undefined ? "" : i < atual ? "feito" : i === atual ? "agora" : "";
    });
    if (t.estado === "erro") {
      const b = document.createElement("button");
      b.type = "button"; b.className = "btn-sec"; b.textContent = lang === "pt" ? "Tentar outro vídeo" : "Try another video";
      b.addEventListener("click", voltar);
      $("#st-sub").append(document.createElement("br"), b);
    }
    // avisos
    const avisos = (t.avisos || []).map((a) => d()["aviso_" + a]).filter(Boolean);
    let av = $("#avisos");
    if (!av) { av = document.createElement("p"); av.id = "avisos"; av.className = "dica aviso"; $("#resultados").prepend(av); }
    av.textContent = avisos.join(" ");
    av.hidden = !avisos.length;
    // cortes prontos
    $("#resultados").hidden = !t.cortes.length;
    $("#zip").href = `/api/tarefas/${t.id}/zip`;
    $("#zip").hidden = !pronto || t.cortes.length < 2;
    const chave = lang + "|" + t.cortes.map((c) => c.n).join(",");
    if (chave !== renderizados) {
      renderizados = chave;
      $("#cortes").replaceChildren(...t.cortes.map(cartao));
    }
  }

  function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  function cartao(c) {
    const card = el("article", "corte");
    const tela = el("div", "tela");
    const v = document.createElement("video");
    v.src = c.video; v.poster = c.capa; v.controls = true; v.preload = "none"; v.playsInline = true;
    tela.append(v, el("span", "nota", `${c.nota}`));
    tela.querySelector(".nota").title = d().nota;
    const corpo = el("div", "corte-corpo");
    corpo.append(el("p", "corte-meta", `#${c.n} · ${d().duracao(c.dur)} · ${d().de_ate(fmt(c.ini), fmt(c.fim))}`));
    corpo.append(el("h3", "corte-tit", c.titulo || "—"));
    if (c.gancho) { const g = el("p", "corte-gancho"); g.append(el("b", null, d().gancho + ": "), document.createTextNode(c.gancho)); corpo.append(g); }
    if (c.motivo) { const m = el("p", "corte-motivo"); m.append(el("b", null, d().porque + ": "), document.createTextNode(c.motivo)); corpo.append(m); }
    if (c.post) {
      const ta = el("textarea", "post"); ta.value = c.post; ta.rows = 3; ta.readOnly = true;
      const cp = el("button", "btn-mini", d().copiar); cp.type = "button";
      cp.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(c.post); } catch (e) { ta.select(); document.execCommand("copy"); }
        cp.textContent = d().copiado; setTimeout(() => (cp.textContent = d().copiar), 1500);
      });
      corpo.append(ta, cp);
    }
    const acoes = el("div", "corte-acoes");
    const a1 = el("a", "btn btn-peq", d().baixar); a1.href = c.video.replace(/$/, "?baixar=1");
    const a2 = el("a", "btn-sec btn-peq", d().srt); a2.href = c.srt + "?baixar=1";
    acoes.append(a1, a2);
    corpo.append(acoes);
    card.append(tela, corpo);
    return card;
  }

  function voltar() {
    clearTimeout(timer);
    tarefa = null; ultimo = null;
    history.pushState(null, "", location.pathname);
    $("#form").hidden = false; $("#status").hidden = true; $("#resultados").hidden = true; $("#como").hidden = false;
    $("#hero").classList.remove("compacto");
  }
  $("#novo").addEventListener("click", voltar);

  function lerHash() {
    const m = location.hash.match(/t=([0-9a-f]{32})/);
    if (m) abrirTarefa(m[1], false); else if (tarefa) voltar();
  }
  window.addEventListener("popstate", lerHash);
  aplicarLingua();
  lerHash();
})();
