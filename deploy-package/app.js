const TOKEN_KEY = "simplecoluna.auth.token.v2";
const MEDICO_PROFILE_KEY = "simplecoluna.medico.profile.v2";

const state = {
  token: localStorage.getItem(TOKEN_KEY) || "",
  user: null,
  navItems: [],
  activeScreen: "",
  bootstrap: null,
  pedidos: [],
  farolPreview: null,
  medicoDraft: {
    carater: "Eletiva",
    procedimento: "",
    niveis: 1,
    codigosTuss: [],
    itensOPME: [],
    perguntasImportantes: [],
    urgenciaFlags: {
      deficitProgressivo: false,
      caudaEquinaOuCompressao: false,
      fraturaInstavel: false,
      infeccaoOuTumor: false
    }
  }
};

const roleScreens = {
  medico: [
    { id: "novo-pedido", title: "Novo pedido", subtitle: "Fluxo em 4 passos com farol de autorizacao." },
    { id: "meus-pedidos", title: "Meus pedidos", subtitle: "Historico e exportacao dos seus pedidos." },
    { id: "meu-desempenho", title: "Meu desempenho", subtitle: "Percentis privados com trava minima de casos." },
    { id: "protocolos-duvidas", title: "Protocolos e duvidas", subtitle: "Consulta read-only das regras clinicas." }
  ],
  operadora: [
    { id: "visao-geral", title: "Visao geral", subtitle: "KPIs reais e governanca de comunicacao." },
    { id: "fila-autorizacao", title: "Fila de autorizacao", subtitle: "Custos e racional do farol por pedido." },
    { id: "regras-range", title: "Regras e range", subtitle: "Tetos por pacote e comportamento do motor." }
  ],
  hospital: [
    { id: "fila-pedidos", title: "Fila de pedidos", subtitle: "Acoes por farol para o centro cirurgico." },
    { id: "urgencias", title: "Urgencias (PS)", subtitle: "Conduta imediata e revisao retrospectiva." }
  ],
  admin: [
    { id: "admin-protocolos", title: "Protocolos e referencias", subtitle: "CRUD completo de protocolos." },
    { id: "admin-opme", title: "OPME (itens e pacotes)", subtitle: "CRUD de itens, blacklist e tetos por pacote." },
    { id: "admin-tuss", title: "Codigos TUSS", subtitle: "CRUD de codigos vinculados a procedimentos." }
  ]
};

const loginView = document.querySelector("#loginView");
const appView = document.querySelector("#appView");
const loginForm = document.querySelector("#loginForm");
const loginEmail = document.querySelector("#loginEmail");
const loginPassword = document.querySelector("#loginPassword");
const loginFeedback = document.querySelector("#loginFeedback");
const sidebarNav = document.querySelector("#sidebarNav");
const content = document.querySelector("#content");
const screenTitle = document.querySelector("#screenTitle");
const screenSubtitle = document.querySelector("#screenSubtitle");
const userRoleTitle = document.querySelector("#userRoleTitle");
const userName = document.querySelector("#userName");
const logoutBtn = document.querySelector("#logoutBtn");

function showToast(text) {
  const tpl = document.querySelector("#toastTemplate");
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.textContent = text;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 3400);
}

function brCurrency(number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(number || 0));
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Falha de comunicacao");
  }
  return data;
}

function getMedicoProfile() {
  try {
    return JSON.parse(localStorage.getItem(MEDICO_PROFILE_KEY) || "{}");
  } catch {
    return {};
  }
}

function setMedicoProfile(profile) {
  localStorage.setItem(MEDICO_PROFILE_KEY, JSON.stringify(profile));
}

function renderLayout() {
  if (!state.user) {
    loginView.classList.remove("hidden");
    appView.classList.add("hidden");
    return;
  }

  loginView.classList.add("hidden");
  appView.classList.remove("hidden");

  userRoleTitle.textContent = state.user.role.toUpperCase();
  userName.textContent = `${state.user.nome} | ${state.user.email}`;

  const screens = roleScreens[state.user.role] || [];
  state.navItems = screens;
  if (!state.activeScreen || !screens.some((item) => item.id === state.activeScreen)) {
    state.activeScreen = screens[0]?.id || "";
  }

  sidebarNav.innerHTML = screens
    .map(
      (item) =>
        `<button class="nav-link ${state.activeScreen === item.id ? "active" : ""}" data-screen="${item.id}" type="button">${item.title}</button>`
    )
    .join("");

  sidebarNav.querySelectorAll(".nav-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeScreen = btn.dataset.screen;
      renderLayout();
      renderScreen();
    });
  });

  const active = screens.find((item) => item.id === state.activeScreen);
  screenTitle.textContent = active?.title || "Painel";
  screenSubtitle.textContent = active?.subtitle || "";
  renderScreen();
}

function parseRelato() {
  const relato = document.querySelector("#relatoInput")?.value || "";
  const txt = relato.toLowerCase();

  const has = (regex) => regex.test(txt);
  const detections = {
    escala: has(/eva|odi|ndi|mjoa|oswestry/),
    imagem: has(/ressonancia|\brm\b|tomografia|\btc\b/),
    conservador: has(/fisioterapia|conservador|bloqueio|infiltra|falha do tratamento/),
    correlacao: has(/compativel com a clinica|correlacao|concordan/),
    urgencia: {
      deficitProgressivo: has(/deficit progressivo/),
      caudaEquinaOuCompressao: has(/cauda equina|compressao medular/),
      fraturaInstavel: has(/fratura instavel|luxacao/),
      infeccaoOuTumor: has(/abscesso|espondilodiscite|tumor com compress/)
    }
  };

  const idByName = (name) => state.bootstrap.protocolos.find((p) => p.nome.toLowerCase().includes(name))?.id || "";
  let suggestedProtocolId = "";
  if (has(/hernia/) && has(/radiculopatia|lombociatalgia/)) {
    suggestedProtocolId = idByName("hernia");
  } else if (has(/claudicacao|estenose/)) {
    suggestedProtocolId = idByName("estenose");
  } else if (has(/espondilolistese|instabilidade/)) {
    suggestedProtocolId = idByName("artrodese");
  } else if (has(/mielopatia|mjoa/)) {
    suggestedProtocolId = idByName("mielopatia");
  } else if (has(/fratura|tlics/)) {
    suggestedProtocolId = idByName("fratura");
  }

  return { detections, suggestedProtocolId };
}

async function parseFileToText(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt")) {
    return await file.text();
  }

  if (name.endsWith(".pdf")) {
    const ab = await file.arrayBuffer();
    const pdfjs = globalThis.pdfjsLib;
    if (!pdfjs) {
      throw new Error("Leitor PDF indisponivel");
    }

    const pdf = await pdfjs.getDocument({ data: ab }).promise;
    let full = "";
    for (let p = 1; p <= pdf.numPages; p += 1) {
      const page = await pdf.getPage(p);
      const text = await page.getTextContent();
      full += `${text.items.map((it) => it.str).join(" ")}\n`;
    }
    return full;
  }

  throw new Error("Use arquivo PDF ou TXT");
}

function renderFarolCard(preview, protocolo) {
  const refs = (protocolo?.referencias || [])
    .map((ref) => `<a class="pill" href="${ref.link || "#"}" target="_blank" rel="noreferrer">${ref.titulo}</a>`)
    .join("");

  return `
    <div class="card">
      <div class="semaforo">
        <div class="bulb-wrap">
          <div class="bulb ${preview.farol === "g" ? "on-g" : ""}"></div>
          <div class="bulb ${preview.farol === "a" ? "on-a" : ""}"></div>
          <div class="bulb ${preview.farol === "r" ? "on-r" : ""}"></div>
        </div>
        <div>
          <h3>${preview.titulo}</h3>
          <p class="muted">${preview.subtitulo}</p>
        </div>
      </div>
      <div class="grid-2">
        <div>
          <h4>Checklist</h4>
          <p>Clinica completa: ${preview.checklist.clinicaCompleta ? "✓" : "!"}</p>
          <p>Fornecedor: ${preview.checklist.fornecedor === "ok" ? "✓" : "!"}</p>
          <p>Material: ${preview.checklist.material === "ok" ? "✓" : "!"}</p>
          <p>Pacote OPME: ${preview.checklist.opmePacote === "ok" ? "✓" : "!"}</p>
        </div>
        <div>
          <h4>Proximos passos</h4>
          ${preview.nextSteps.map((step) => `<p>• ${step}</p>`).join("")}
        </div>
      </div>
      ${preview.pendencias?.length ? `<div class="info-band"><strong>Pendencias:</strong>${preview.pendencias.map((p) => `<p>• ${p}</p>`).join("")}</div>` : ""}
      <h4>Lastro tecnico</h4>
      <div class="row">${refs || "<span class='pill'>Sem referencias cadastradas</span>"}</div>
    </div>
  `;
}

function kitRowsFromPacote(pacote) {
  if (!pacote) {
    return [];
  }
  return (pacote.itens || []).map((entry) => ({ itemId: entry.itemId, qtd: entry.qtd }));
}

function sanitizeMedicoCurrency(text) {
  return String(text).replace(/R\$/g, "");
}

function collectNovoPedidoPayload() {
  const protocoloId = document.querySelector("#patologiaSelect")?.value || "";
  const protocolo = state.bootstrap.protocolos.find((p) => p.id === protocoloId);
  const perguntasImportantes = (protocolo?.perguntasImportantes || []).map((q, idx) => ({
    q,
    r: document.querySelector(`#protoQ-${idx}`)?.value || ""
  }));

  const payload = {
    medico: {
      crm: document.querySelector("#crmInput")?.value || "",
      uf: document.querySelector("#ufInput")?.value || "",
      nome: document.querySelector("#medicoNomeInput")?.value || ""
    },
    pacientePseudonimizado: document.querySelector("#pacienteInput")?.value || "",
    operadora: document.querySelector("#operadoraSelect")?.value || "",
    carteirinha: document.querySelector("#carteirinhaInput")?.value || "",
    hospital: document.querySelector("#hospitalSelect")?.value || "",
    carater: document.querySelector("input[name='carater']:checked")?.value || "Eletiva",
    preenchidoPorPS: document.querySelector("#preenchidoPSInput")?.value || "",
    temMedicoAssistente: document.querySelector("#temAssistenteSelect")?.value || "",
    relato: document.querySelector("#relatoInput")?.value || "",
    cid: document.querySelector("#cidInput")?.value || "",
    protocoloId,
    perguntasImportantes,
    procedimento: document.querySelector("#procedimentoSelect")?.value || "",
    niveis: Number(document.querySelector("#niveisInput")?.value || 1),
    codigosTuss: Array.from(document.querySelectorAll("input[name='tussPick']:checked")).map((el) => el.value),
    itensOPME: Array.from(document.querySelectorAll(".opme-row")).map((row) => ({
      itemId: row.querySelector("select")?.value,
      qtd: Number(row.querySelector("input")?.value || 1)
    })),
    dossieFlags: {
      imagemCompatavel: document.querySelector("#dossieImagem")?.checked || false,
      escalaFuncional: document.querySelector("#dossieEscala")?.checked || false,
      falhaConservador: document.querySelector("#dossieConservador")?.checked || false,
      correlacaoClinicaImagem: document.querySelector("#dossieCorrelacao")?.checked || false
    },
    urgenciaFlags: {
      deficitProgressivo: document.querySelector("#urgDeficit")?.checked || false,
      caudaEquinaOuCompressao: document.querySelector("#urgCauda")?.checked || false,
      fraturaInstavel: document.querySelector("#urgFratura")?.checked || false,
      infeccaoOuTumor: document.querySelector("#urgInfeccao")?.checked || false
    }
  };

  return payload;
}

function bindNovoPedidoEvents() {
  const operadoraSelect = document.querySelector("#operadoraSelect");
  const hospitalSelect = document.querySelector("#hospitalSelect");
  const faturamentoInfo = document.querySelector("#faturamentoInfo");
  const patologiaSelect = document.querySelector("#patologiaSelect");
  const perguntasWrap = document.querySelector("#perguntasProtocolo");
  const procedimentoSelect = document.querySelector("#procedimentoSelect");
  const niveisInput = document.querySelector("#niveisInput");
  const tussWrap = document.querySelector("#tussWrap");
  const opmeWrap = document.querySelector("#opmeWrap");
  const opmeStatus = document.querySelector("#opmeStatus");
  const addOpmeBtn = document.querySelector("#addOpmeRowBtn");
  const previewBtn = document.querySelector("#previewFarolBtn");
  const submitBtn = document.querySelector("#submitPedidoBtn");
  const farolWrap = document.querySelector("#farolPreview");
  const importBtn = document.querySelector("#importRelatoBtn");
  const fileInput = document.querySelector("#relatoFileInput");
  const analyzeBtn = document.querySelector("#analisarRelatoBtn");

  const medicoProfile = getMedicoProfile();
  if (medicoProfile.crm) document.querySelector("#crmInput").value = medicoProfile.crm;
  if (medicoProfile.uf) document.querySelector("#ufInput").value = medicoProfile.uf;
  if (medicoProfile.nome) document.querySelector("#medicoNomeInput").value = medicoProfile.nome;

  ["#crmInput", "#ufInput", "#medicoNomeInput"].forEach((selector) => {
    document.querySelector(selector)?.addEventListener("input", () => {
      setMedicoProfile({
        crm: document.querySelector("#crmInput").value,
        uf: document.querySelector("#ufInput").value,
        nome: document.querySelector("#medicoNomeInput").value
      });
    });
  });

  operadoraSelect.addEventListener("change", () => {
    const op = state.bootstrap.operadoras.find((item) => item.nome === operadoraSelect.value);
    hospitalSelect.innerHTML = `<option value="">Selecione</option>${(op?.hospitais || []).map((h) => `<option value="${h}">${h}</option>`).join("")}`;
    if (!op) {
      faturamentoInfo.textContent = "";
      return;
    }
    faturamentoInfo.textContent =
      op.faturamentoOPME === "operadora"
        ? "Faturamento do OPME: direto a operadora - fornecedor parceiro e range de autorizacao instantanea se aplicam."
        : "Faturamento do OPME: via hospital - verde clinico + validacao de cotacao para o OPME.";
  });

  patologiaSelect.addEventListener("change", () => {
    const proto = state.bootstrap.protocolos.find((p) => p.id === patologiaSelect.value);
    perguntasWrap.innerHTML = (proto?.perguntasImportantes || [])
      .map((q, idx) => `<label>${q}<input id="protoQ-${idx}" type="text" required /></label>`)
      .join("");
  });

  const refreshProcedureBundles = () => {
    const procedimento = procedimentoSelect.value;
    const niveis = Number(niveisInput.value || 1);
    const pacote = state.bootstrap.pacotesOpme.find((p) => p.procedimento === procedimento && Number(p.niveis) === niveis);
    const tuss = state.bootstrap.codigoTuss.filter(
      (item) => item.procedimentoVinculado === "Todos" || item.procedimentoVinculado.includes(procedimento) || procedimento.includes(item.procedimentoVinculado)
    );
    tussWrap.innerHTML = tuss
      .map(
        (item) =>
          `<label class="pill ${item.tipo.includes("Principal") ? "pill-primary" : ""}"><input name="tussPick" type="checkbox" value="${item.codigo}" /> ${item.tipo.includes("Principal") ? "★ " : ""}${item.codigo}</label>`
      )
      .join("");

    state.medicoDraft.itensOPME = kitRowsFromPacote(pacote);
    renderOpmeRows();
  };

  function renderOpmeRows() {
    const itemOptions = state.bootstrap.opmeItens
      .map((item) => {
        const suffix = item.blacklist ? " · em revisao tecnica" : item.parceira ? "" : " · nao parceira";
        return `<option value="${item.id}">${item.nome} - ${item.empresa}${suffix}</option>`;
      })
      .join("");

    opmeWrap.innerHTML = state.medicoDraft.itensOPME
      .map(
        (row, idx) => `
      <div class="row opme-row">
        <select>${itemOptions}</select>
        <input type="number" min="1" value="${row.qtd}" />
        <button class="btn btn-ghost" type="button" data-remove="${idx}">Remover</button>
      </div>
    `
      )
      .join("");

    Array.from(opmeWrap.querySelectorAll(".opme-row")).forEach((row, idx) => {
      const pick = row.querySelector("select");
      pick.value = state.medicoDraft.itensOPME[idx].itemId;
      pick.addEventListener("change", () => {
        state.medicoDraft.itensOPME[idx].itemId = pick.value;
        renderOpmeStatus();
      });
      row.querySelector("input").addEventListener("input", (ev) => {
        state.medicoDraft.itensOPME[idx].qtd = Number(ev.target.value || 1);
      });
      row.querySelector("[data-remove]").addEventListener("click", () => {
        state.medicoDraft.itensOPME.splice(idx, 1);
        renderOpmeRows();
      });
    });

    renderOpmeStatus();
  }

  function renderOpmeStatus() {
    const itens = state.medicoDraft.itensOPME
      .map((entry) => state.bootstrap.opmeItens.find((i) => i.id === entry.itemId))
      .filter(Boolean);

    const hasBlacklist = itens.some((i) => i.blacklist);
    const nonPartners = itens.filter((i) => !i.parceira);

    const lines = ["✓ Kit padrao/parceiras"];
    if (nonPartners.length) {
      lines.push(`! Item de empresa nao parceira: ${nonPartners.map((i) => i.nome).join(", ")}`);
    }
    if (hasBlacklist) {
      const black = itens.filter((i) => i.blacklist);
      lines.push(`✕ Item em blacklist: ${black.map((i) => `${i.nome} (${i.blacklistMotivo})`).join(", ")}`);
    }

    opmeStatus.innerHTML = lines.map((line) => `<p>${line}</p>`).join("");
  }

  addOpmeBtn.addEventListener("click", () => {
    const first = state.bootstrap.opmeItens.find((i) => !i.blacklist);
    state.medicoDraft.itensOPME.push({ itemId: first?.id || "", qtd: 1 });
    renderOpmeRows();
  });

  procedimentoSelect.addEventListener("change", refreshProcedureBundles);
  niveisInput.addEventListener("change", refreshProcedureBundles);

  document.querySelectorAll("input[name='carater']").forEach((item) => {
    item.addEventListener("change", () => {
      document.querySelector("#urgenciaExtra").classList.toggle("hidden", item.value !== "Urgencia");
    });
  });

  importBtn.addEventListener("click", async () => {
    const file = fileInput.files?.[0];
    if (!file) {
      showToast("Selecione um arquivo PDF ou TXT");
      return;
    }

    try {
      const text = await parseFileToText(file);
      document.querySelector("#relatoInput").value = text;
      showToast("Relato importado com sucesso.");
    } catch (error) {
      showToast(error.message);
    }
  });

  analyzeBtn.addEventListener("click", () => {
    const result = parseRelato();
    document.querySelector("#dossieEscala").checked = result.detections.escala;
    document.querySelector("#dossieImagem").checked = result.detections.imagem;
    document.querySelector("#dossieConservador").checked = result.detections.conservador;
    document.querySelector("#dossieCorrelacao").checked = result.detections.correlacao;
    document.querySelector("#urgDeficit").checked = result.detections.urgencia.deficitProgressivo;
    document.querySelector("#urgCauda").checked = result.detections.urgencia.caudaEquinaOuCompressao;
    document.querySelector("#urgFratura").checked = result.detections.urgencia.fraturaInstavel;
    document.querySelector("#urgInfeccao").checked = result.detections.urgencia.infeccaoOuTumor;
    if (result.suggestedProtocolId) {
      patologiaSelect.value = result.suggestedProtocolId;
      patologiaSelect.dispatchEvent(new Event("change"));
    }

    showToast("Analise concluida: flags de dossie e sugestao de patologia aplicadas.");
  });

  previewBtn.addEventListener("click", async () => {
    try {
      const payload = collectNovoPedidoPayload();
      const preview = await api("/api/pedidos/preview", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      state.farolPreview = preview;
      const proto = state.bootstrap.protocolos.find((p) => p.id === payload.protocoloId);
      farolWrap.innerHTML = sanitizeMedicoCurrency(renderFarolCard(preview, proto));
      submitBtn.textContent = preview.farol === "g" ? "Enviar pedido autorizado ao hospital ->" : "Registrar pedido e seguir fluxo ->";
    } catch (error) {
      showToast(error.message);
    }
  });

  submitBtn.addEventListener("click", async () => {
    try {
      const payload = collectNovoPedidoPayload();
      const response = await api("/api/pedidos", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      showToast(`Pedido ${response.pedido.seq} registrado.`);
      document.querySelector("#pacienteInput").value = "";
      document.querySelector("#carteirinhaInput").value = "";
      document.querySelector("#relatoInput").value = "";
      document.querySelector("#cidInput").value = "";
      document.querySelector("#farolPreview").innerHTML = "";
      state.farolPreview = null;
    } catch (error) {
      showToast(error.message);
    }
  });

  refreshProcedureBundles();
}

function renderNovoPedido() {
  const protocolos = state.bootstrap.protocolos;
  const operadoras = state.bootstrap.operadoras;
  const procedimentos = [...new Set(state.bootstrap.pacotesOpme.map((p) => p.procedimento))];

  content.innerHTML = sanitizeMedicoCurrency(`
    <div class="card">
      <h3>Passo 1 · Vinculo do pedido</h3>
      <div class="grid-4">
        <label>CRM<input id="crmInput" type="text" placeholder="Ex.: 123456" /></label>
        <label>UF<input id="ufInput" type="text" placeholder="SP" maxlength="2" /></label>
        <label>Nome do medico<input id="medicoNomeInput" type="text" /></label>
        <label>Paciente (iniciais/prontuario)<input id="pacienteInput" type="text" placeholder="Nunca nome completo" /></label>
      </div>
      <div class="grid-3">
        <label>Operadora<select id="operadoraSelect"><option value="">Selecione</option>${operadoras
          .map((op) => `<option value="${op.nome}">${op.nome}</option>`)
          .join("")}</select></label>
        <label>Carteirinha<input id="carteirinhaInput" type="text" /></label>
        <label>Hospital<select id="hospitalSelect"><option value="">Selecione</option></select></label>
      </div>
      <p id="faturamentoInfo" class="info-band"></p>
      <div class="row">
        <label class="check-row"><input type="radio" name="carater" value="Eletiva" checked /> Eletiva</label>
        <label class="check-row"><input type="radio" name="carater" value="Urgencia" /> Urgencia (PS)</label>
      </div>
      <div id="urgenciaExtra" class="grid-2 hidden">
        <label>Preenchido por (medico do PS)<input id="preenchidoPSInput" type="text" /></label>
        <label>Paciente tem medico assistente?
          <select id="temAssistenteSelect"><option value="">Selecione</option><option>Sim</option><option>Nao</option></select>
        </label>
      </div>
    </div>

    <div class="card">
      <h3>Passo 2 · Dossie minimo</h3>
      <div class="row">
        <input id="relatoFileInput" type="file" accept=".pdf,.txt" />
        <button id="importRelatoBtn" class="btn btn-ghost" type="button">Importar anamnese/evolucao (PDF ou TXT)</button>
        <button id="analisarRelatoBtn" class="btn btn-ghost" type="button">Analisar texto e pre-preencher</button>
      </div>
      <div class="grid-2">
        <label>Relato estruturado<textarea id="relatoInput" rows="8"></textarea></label>
        <div>
          <label>CID-10<input id="cidInput" type="text" /></label>
          <label>Patologia principal<select id="patologiaSelect"><option value="">Selecione</option>${protocolos
            .map((p) => `<option value="${p.id}">${p.nome}</option>`)
            .join("")}</select></label>
          <div class="card" id="perguntasProtocolo"></div>
        </div>
      </div>
      <div class="grid-2">
        <label class="check-row"><input id="dossieImagem" type="checkbox" /> Imagem compativel</label>
        <label class="check-row"><input id="dossieEscala" type="checkbox" /> Escala funcional documentada</label>
        <label class="check-row"><input id="dossieConservador" type="checkbox" /> Falha do conservador</label>
        <label class="check-row"><input id="dossieCorrelacao" type="checkbox" /> Correlacao clinica x imagem</label>
      </div>
      <div class="urgency-box">
        <p><strong>Criterios de urgencia</strong></p>
        <label class="check-row"><input id="urgDeficit" type="checkbox" /> Deficit progressivo</label>
        <label class="check-row"><input id="urgCauda" type="checkbox" /> Cauda equina / compressao medular</label>
        <label class="check-row"><input id="urgFratura" type="checkbox" /> Fratura instavel</label>
        <label class="check-row"><input id="urgInfeccao" type="checkbox" /> Infeccao / tumor com compressao</label>
      </div>
    </div>

    <div class="card">
      <h3>Passo 3 · Procedimento, codigos e OPME</h3>
      <div class="grid-2">
        <label>Procedimento<select id="procedimentoSelect"><option value="">Selecione</option>${procedimentos
          .map((p) => `<option value="${p}">${p}</option>`)
          .join("")}</select></label>
        <label>Niveis<input id="niveisInput" type="number" min="1" max="4" value="1" /></label>
      </div>
      <h4>TUSS sugeridos</h4>
      <div id="tussWrap" class="row"></div>
      <h4>Kit padrao OPME</h4>
      <div id="opmeWrap" class="stack-gap"></div>
      <button id="addOpmeRowBtn" class="btn btn-ghost" type="button">+ adicionar item</button>
      <div id="opmeStatus" class="info-band"></div>
    </div>

    <div class="card">
      <h3>Passo 4 · Farol</h3>
      <div class="row">
        <button id="previewFarolBtn" class="btn" type="button">Atualizar semaforo</button>
        <button id="submitPedidoBtn" class="btn btn-ghost" type="button">Registrar pedido e seguir fluxo -></button>
      </div>
      <div id="farolPreview"></div>
    </div>
  `);

  bindNovoPedidoEvents();
}

async function renderMeusPedidos() {
  const data = await api("/api/pedidos");
  state.pedidos = data.pedidos || [];
  content.innerHTML = sanitizeMedicoCurrency(`
    <div class="card">
      <div class="row">
        <button id="exportPedidosBtn" class="btn btn-ghost" type="button">Exportar JSON</button>
        <button id="clearPedidosBtn" class="btn btn-ghost" type="button">Limpar testes</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>Paciente</th><th>Procedimento</th><th>Carater</th><th>Farol</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${state.pedidos
              .map(
                (item) =>
                  `<tr><td>${item.seq}</td><td>${item.pacientePseudonimizado}</td><td>${item.procedimento}</td><td>${item.carater}</td><td>${item.farol.toUpperCase()}</td><td>${item.status}</td></tr>`
              )
              .join("") || "<tr><td colspan='6'>Sem pedidos.</td></tr>"}
          </tbody>
        </table>
      </div>
    </div>
  `);

  document.querySelector("#exportPedidosBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state.pedidos, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meus-pedidos.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  document.querySelector("#clearPedidosBtn").addEventListener("click", async () => {
    await api("/api/pedidos/mine", { method: "DELETE" });
    showToast("Pedidos de teste removidos.");
    renderMeusPedidos();
  });
}

async function renderMeuDesempenho() {
  const data = await api("/api/pedidos");
  const casos = data.pedidos.length;
  const abaixoMinimo = casos < 20;
  const percentilClinico = Math.min(95, 45 + casos);
  const percentilAdesao = Math.min(98, 40 + casos);

  content.innerHTML = sanitizeMedicoCurrency(`
    <div class="card">
      <p class="info-band">Percentis a partir de 20 casos - voce tem ${casos}. ${abaixoMinimo ? "Barras ilustrativas." : "Calculo ativo."}</p>
      <div class="kpi-wrap">
        <div class="kpi"><small>Percentil clinico</small><strong>${percentilClinico}</strong></div>
        <div class="kpi"><small>Percentil adesao de protocolo</small><strong>${percentilAdesao}</strong></div>
      </div>
      <p class="muted">Sua posicao nao muda por pagar a assinatura. Ninguem ve seu nome.</p>
    </div>
  `);
}

function renderProtocolosDuvidas() {
  content.innerHTML = sanitizeMedicoCurrency(`
    <div class="card">
      ${state.bootstrap.protocolos
        .map(
          (p) => `
        <article class="card">
          <h3>${p.nome}</h3>
          <p><strong>Autorizar quando:</strong> ${p.autorizarQuando.join(" | ")}</p>
          <p><strong>Ponto de controle:</strong> ${p.pontoDeControle}</p>
          <p><strong>Perguntas importantes:</strong> ${p.perguntasImportantes.join(" | ")}</p>
          <div class="row">${p.referencias
            .map((r) => `<a class="pill" href="${r.link || "#"}" target="_blank" rel="noreferrer">${r.titulo}</a>`)
            .join("")}</div>
        </article>
      `
        )
        .join("")}
    </div>
  `);
}

async function renderOperadoraVisaoGeral() {
  const [kpis, pedidosResp] = await Promise.all([api("/api/operadora/kpis"), api("/api/pedidos")]);
  content.innerHTML = `
    <div class="card">
      <div class="kpi-wrap">
        <div class="kpi"><small>Total de pedidos</small><strong>${kpis.total}</strong></div>
        <div class="kpi"><small>% verde</small><strong>${kpis.percentualVerde.toFixed(1)}%</strong></div>
        <div class="kpi"><small>Custo medio OPME</small><strong>${brCurrency(kpis.custoMedio)}</strong></div>
        <div class="kpi"><small>Fora do padrao</small><strong>${kpis.foraPadrao}</strong></div>
      </div>
      <p class="info-band">Regra de comunicacao: papel medico nunca visualiza valores de OPME.</p>
      <p class="muted">Pedidos monitorados: ${pedidosResp.pedidos.length}</p>
    </div>
  `;
}

async function renderOperadoraFila() {
  const data = await api("/api/pedidos");
  content.innerHTML = `
    <div class="card table-wrap">
      <table>
        <thead><tr><th>#</th><th>Paciente</th><th>Farol</th><th>Racional</th><th>Custo OPME</th></tr></thead>
        <tbody>
          ${data.pedidos
            .map((p) => `<tr><td>${p.seq}</td><td>${p.pacientePseudonimizado}</td><td>${p.farol.toUpperCase()}</td><td>${p.racional}</td><td>${brCurrency(p.custoTotalCalculado)}</td></tr>`)
            .join("") || "<tr><td colspan='5'>Sem pedidos.</td></tr>"}
        </tbody>
      </table>
    </div>
  `;
}

function renderOperadoraRegrasRange() {
  content.innerHTML = `
    <div class="card">
      <h3>Tetos por pacote (range verde)</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Procedimento</th><th>Niveis</th><th>Teto</th></tr></thead>
          <tbody>
            ${state.bootstrap.pacotesOpme
              .map((p) => `<tr><td>${p.procedimento}</td><td>${p.niveis}</td><td>${brCurrency(p.teto)}</td></tr>`)
              .join("")}
          </tbody>
        </table>
      </div>
      <article class="card">
        <p>Empresa nao parceira -> amarelo (validacao de fornecedor).</p>
        <p>Item em blacklist -> revisao de material com alternativa.</p>
        <p>Acima do teto -> amarelo (OPME em validacao).</p>
        <p>Dossie incompleto -> amarelo (completar dossie).</p>
        <p>Urgencia com criterio -> cuidado liberado + revisao retrospectiva.</p>
        <p>Urgencia sem criterio -> internar e reclassificar 24-72h.</p>
      </article>
    </div>
  `;
}

async function renderHospitalFila() {
  const data = await api("/api/pedidos");
  const pedidos = data.pedidos;
  const autorizados = pedidos.filter((p) => p.farol === "g").length;
  const exigemAcao = pedidos.filter((p) => p.farol === "a").length;
  const urgencias = pedidos.filter((p) => p.carater === "Urgencia").length;

  content.innerHTML = `
    <div class="card">
      <div class="kpi-wrap">
        <div class="kpi"><small>Chegaram autorizados</small><strong>${autorizados}</strong></div>
        <div class="kpi"><small>Exigem acao</small><strong>${exigemAcao}</strong></div>
        <div class="kpi"><small>Urgencias</small><strong>${urgencias}</strong></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Paciente</th><th>Farol</th><th>Acao hospital</th></tr></thead>
          <tbody>
            ${pedidos
              .map((p) => {
                const acao = p.farol === "g" ? "Agendar" : p.farol === "a" ? "Validar OPME" : "c/ operadora";
                return `<tr><td>${p.seq}</td><td>${p.pacientePseudonimizado}</td><td>${p.farol.toUpperCase()}</td><td>${acao}</td></tr>`;
              })
              .join("") || "<tr><td colspan='4'>Sem pedidos.</td></tr>"}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function renderHospitalUrgencias() {
  const data = await api("/api/hospital/urgencias");
  content.innerHTML = `
    <div class="card">
      <p class="info-band">Toda urgencia entra em revisao retrospectiva; padrao por medico e monitorado.</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Criterio clinico</th><th>Medico assistente</th><th>Conduta</th></tr></thead>
          <tbody>
            ${data.urgencias
              .map((u) => {
                const conduta = u.urgenciaCriterioPresente
                  ? "cuidado liberado · OPME a parte"
                  : "internar p/ analgesia -> reclassificar";
                return `<tr><td>${u.seq}</td><td>${u.urgenciaCriterioPresente ? "Presente" : "Ausente"}</td><td>${u.temMedicoAssistente || "N/I"}</td><td>${conduta}</td></tr>`;
              })
              .join("") || "<tr><td colspan='4'>Sem urgencias.</td></tr>"}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function renderAdminScreen(mode) {
  const data = await api("/api/admin/all");

  if (mode === "admin-protocolos") {
    content.innerHTML = `
      <div class="card">
        <h3>Novo protocolo</h3>
        <div class="grid-2">
          <label>Nome<input id="admProtoNome" type="text" /></label>
          <label>Regiao<input id="admProtoRegiao" type="text" /></label>
        </div>
        <label>Autorizar quando (uma linha por criterio)<textarea id="admProtoAutorizar" rows="4"></textarea></label>
        <label>Ponto de controle<textarea id="admProtoControle" rows="2"></textarea></label>
        <label>Perguntas importantes (uma linha por pergunta)<textarea id="admProtoPerguntas" rows="4"></textarea></label>
        <label>Referencias (titulo | link por linha)<textarea id="admProtoRefs" rows="4"></textarea></label>
        <button id="admProtoSave" class="btn" type="button">Salvar protocolo</button>
      </div>
      <div class="card table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>Regiao</th><th>Acoes</th></tr></thead>
          <tbody>
            ${data.protocolos
              .map((p) => `<tr><td>${p.nome}</td><td>${p.regiao}</td><td><button class="btn btn-ghost" data-del-proto="${p.id}" type="button">Excluir</button></td></tr>`)
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    document.querySelector("#admProtoSave").addEventListener("click", async () => {
      const payload = {
        nome: document.querySelector("#admProtoNome").value,
        regiao: document.querySelector("#admProtoRegiao").value,
        autorizarQuando: document
          .querySelector("#admProtoAutorizar")
          .value.split("\n")
          .map((v) => v.trim())
          .filter(Boolean),
        pontoDeControle: document.querySelector("#admProtoControle").value,
        perguntasImportantes: document
          .querySelector("#admProtoPerguntas")
          .value.split("\n")
          .map((v) => v.trim())
          .filter(Boolean),
        referencias: document
          .querySelector("#admProtoRefs")
          .value.split("\n")
          .map((line) => line.split("|").map((v) => v.trim()))
          .filter((parts) => parts[0])
          .map((parts) => ({ titulo: parts[0], link: parts[1] || "" }))
      };
      await api("/api/admin/protocolos", { method: "POST", body: JSON.stringify(payload) });
      showToast("Protocolo salvo.");
      renderAdminScreen(mode);
    });

    document.querySelectorAll("[data-del-proto]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await api(`/api/admin/protocolos/${btn.dataset.delProto}`, { method: "DELETE" });
        renderAdminScreen(mode);
      });
    });

    return;
  }

  if (mode === "admin-opme") {
    content.innerHTML = `
      <div class="card">
        <h3>Novo item OPME</h3>
        <div class="grid-3">
          <label>Nome<input id="admOpmeNome" type="text" /></label>
          <label>Codigo interno<input id="admOpmeCodigo" type="text" /></label>
          <label>Tipo<input id="admOpmeTipo" type="text" /></label>
          <label>Empresa<input id="admOpmeEmpresa" type="text" /></label>
          <label>Custo backoffice<input id="admOpmeCusto" type="number" min="0" /></label>
          <label>Parceira<select id="admOpmeParceira"><option value="true">Sim</option><option value="false">Nao</option></select></label>
          <label>Blacklist<select id="admOpmeBlacklist"><option value="false">Nao</option><option value="true">Sim</option></select></label>
          <label>Motivo blacklist<input id="admOpmeMotivo" type="text" /></label>
        </div>
        <button id="admOpmeSave" class="btn" type="button">Salvar item</button>
      </div>
      <div class="card">
        <h3>Pacote OPME (upsert por procedimento + niveis)</h3>
        <div class="grid-3">
          <label>Procedimento<input id="admPacProc" type="text" /></label>
          <label>Niveis<input id="admPacNiveis" type="number" min="1" value="1" /></label>
          <label>Teto<input id="admPacTeto" type="number" min="0" /></label>
        </div>
        <label>Itens do pacote (itemId:qtd por linha)<textarea id="admPacItens" rows="4"></textarea></label>
        <button id="admPacSave" class="btn" type="button">Salvar pacote</button>
      </div>
      <div class="card table-wrap">
        <table>
          <thead><tr><th>Item</th><th>Empresa</th><th>Parceira</th><th>Blacklist</th><th>Custo</th><th>Acoes</th></tr></thead>
          <tbody>
            ${data.opmeItens
              .map(
                (item) =>
                  `<tr><td>${item.nome}</td><td>${item.empresa}</td><td>${item.parceira ? "Sim" : "Nao"}</td><td>${item.blacklist ? "Sim" : "Nao"}</td><td>${brCurrency(item.custoUnitario)}</td><td><button class="btn btn-ghost" data-del-opme="${item.id}" type="button">Excluir</button></td></tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    document.querySelector("#admOpmeSave").addEventListener("click", async () => {
      const payload = {
        nome: document.querySelector("#admOpmeNome").value,
        codigoInterno: document.querySelector("#admOpmeCodigo").value,
        tipo: document.querySelector("#admOpmeTipo").value,
        empresa: document.querySelector("#admOpmeEmpresa").value,
        custoUnitario: Number(document.querySelector("#admOpmeCusto").value || 0),
        parceira: document.querySelector("#admOpmeParceira").value === "true",
        blacklist: document.querySelector("#admOpmeBlacklist").value === "true",
        blacklistMotivo: document.querySelector("#admOpmeMotivo").value
      };
      await api("/api/admin/opme-itens", { method: "POST", body: JSON.stringify(payload) });
      showToast("Item OPME salvo.");
      renderAdminScreen(mode);
    });

    document.querySelector("#admPacSave").addEventListener("click", async () => {
      const itens = document
        .querySelector("#admPacItens")
        .value.split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [itemId, qtd] = line.split(":");
          return { itemId: itemId.trim(), qtd: Number(qtd || 1) };
        });

      const payload = {
        procedimento: document.querySelector("#admPacProc").value,
        niveis: Number(document.querySelector("#admPacNiveis").value || 1),
        teto: Number(document.querySelector("#admPacTeto").value || 0),
        itens
      };

      await api("/api/admin/pacotes-opme", { method: "POST", body: JSON.stringify(payload) });
      showToast("Pacote salvo e versionado.");
      renderAdminScreen(mode);
    });

    document.querySelectorAll("[data-del-opme]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await api(`/api/admin/opme-itens/${btn.dataset.delOpme}`, { method: "DELETE" });
        renderAdminScreen(mode);
      });
    });

    return;
  }

  content.innerHTML = `
    <div class="card">
      <h3>Novo codigo TUSS</h3>
      <div class="grid-3">
        <label>Codigo<input id="admTussCod" type="text" /></label>
        <label>Descricao<input id="admTussDesc" type="text" /></label>
        <label>Procedimento vinculado<input id="admTussProc" type="text" placeholder="Todos ou nome" /></label>
        <label>Tipo<input id="admTussTipo" type="text" /></label>
        <label>Obs<input id="admTussObs" type="text" /></label>
      </div>
      <button id="admTussSave" class="btn" type="button">Salvar codigo</button>
    </div>
    <div class="card table-wrap">
      <table>
        <thead><tr><th>Codigo</th><th>Descricao</th><th>Vinculo</th><th>Tipo</th><th>Acoes</th></tr></thead>
        <tbody>
          ${data.codigoTuss
            .map(
              (t) =>
                `<tr><td>${t.codigo}</td><td>${t.descricao}</td><td>${t.procedimentoVinculado}</td><td>${t.tipo}</td><td><button class="btn btn-ghost" data-del-tuss="${t.codigo}" type="button">Excluir</button></td></tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  document.querySelector("#admTussSave").addEventListener("click", async () => {
    const payload = {
      codigo: document.querySelector("#admTussCod").value,
      descricao: document.querySelector("#admTussDesc").value,
      procedimentoVinculado: document.querySelector("#admTussProc").value || "Todos",
      tipo: document.querySelector("#admTussTipo").value,
      obs: document.querySelector("#admTussObs").value
    };

    await api("/api/admin/tuss", { method: "POST", body: JSON.stringify(payload) });
    showToast("Codigo TUSS salvo.");
    renderAdminScreen(mode);
  });

  document.querySelectorAll("[data-del-tuss]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await api(`/api/admin/tuss/${btn.dataset.delTuss}`, { method: "DELETE" });
      renderAdminScreen(mode);
    });
  });
}

async function renderScreen() {
  try {
    if (!state.bootstrap) {
      state.bootstrap = await api("/api/bootstrap");
    }

    switch (state.activeScreen) {
      case "novo-pedido":
        renderNovoPedido();
        return;
      case "meus-pedidos":
        await renderMeusPedidos();
        return;
      case "meu-desempenho":
        await renderMeuDesempenho();
        return;
      case "protocolos-duvidas":
        renderProtocolosDuvidas();
        return;
      case "visao-geral":
        await renderOperadoraVisaoGeral();
        return;
      case "fila-autorizacao":
        await renderOperadoraFila();
        return;
      case "regras-range":
        renderOperadoraRegrasRange();
        return;
      case "fila-pedidos":
        await renderHospitalFila();
        return;
      case "urgencias":
        await renderHospitalUrgencias();
        return;
      case "admin-protocolos":
      case "admin-opme":
      case "admin-tuss":
        await renderAdminScreen(state.activeScreen);
        return;
      default:
        content.innerHTML = "<div class='card'><p>Tela nao mapeada.</p></div>";
    }
  } catch (error) {
    content.innerHTML = `<div class="card"><p>Erro ao carregar: ${error.message}</p></div>`;
  }
}

async function bootstrapAuth() {
  if (!state.token) {
    renderLayout();
    return;
  }

  try {
    const me = await api("/api/auth/me");
    state.user = me.user;
    renderLayout();
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    state.token = "";
    state.user = null;
    renderLayout();
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginFeedback.textContent = "Autenticando...";
  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: loginEmail.value.trim(), password: loginPassword.value })
    });
    state.token = data.token;
    state.user = data.user;
    state.bootstrap = null;
    localStorage.setItem(TOKEN_KEY, state.token);
    loginFeedback.textContent = "Acesso liberado.";
    renderLayout();
  } catch (error) {
    loginFeedback.textContent = error.message;
  }
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem(TOKEN_KEY);
  state.token = "";
  state.user = null;
  state.bootstrap = null;
  state.activeScreen = "";
  renderLayout();
});

bootstrapAuth();
