const TOKEN_KEY = "simplecoluna.auth.token.v2";
const MEDICO_PROFILE_KEY = "simplecoluna.medico.profile.v2";
const LOCAL_DB_KEY = "simplecoluna.local.db.v1";
const API_BASE = (document.querySelector('meta[name="simplecoluna-api-base"]')?.content || "").trim().replace(/\/$/, "");

const state = {
  token: localStorage.getItem(TOKEN_KEY) || "",
  apiMode: "remote",
  localModeNotified: false,
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

function hasUrgencyCriteria(flags) {
  if (!flags) {
    return false;
  }
  return Boolean(flags.deficitProgressivo || flags.caudaEquinaOuCompressao || flags.fraturaInstavel || flags.infeccaoOuTumor);
}

function localStatusFromFarol(farol) {
  if (farol === "g") return "Autorizado fast-track";
  if (farol === "r") return "Urgencia em curso";
  return "Em validacao";
}

function localEvaluateFarol(input) {
  const missing = [];
  if (!input.protocoloId) missing.push("Selecione a patologia principal (protocolo).");
  if (String(input.relato || "").trim().length < 20) missing.push("Relato clinico com pelo menos 20 caracteres.");
  if (!input.flags?.imagemCompatavel) missing.push("Confirme imagem compativel.");
  if (!input.flags?.escalaFuncional) missing.push("Confirme escala funcional.");
  if (!input.flags?.falhaConservador) missing.push("Confirme falha do tratamento conservador.");
  if (!input.flags?.correlacaoClinicaImagem) missing.push("Confirme correlacao clinica x imagem.");
  if (!input.tussExiste) missing.push("Adicione ao menos um codigo TUSS valido para o procedimento.");
  (input.perguntasObrigatoriasSemResposta || []).forEach((q) => missing.push(`Responder pergunta obrigatoria: ${q}`));

  const checklist = {
    clinicaCompleta: missing.length === 0,
    fornecedor: input.temNaoParceira ? "!" : "ok",
    material: input.temBlacklist ? "!" : "ok",
    opmePacote: input.acimaTeto ? "!" : "ok",
    urgencia: input.carater === "Urgencia" ? (input.temCriterioUrgencia ? "!" : "pendente") : "na"
  };

  if (input.carater === "Urgencia" && input.temCriterioUrgencia) {
    return {
      farol: "r",
      titulo: "Fluxo de urgencia",
      subtitulo: "Cuidado liberado de imediato; OPME acima do kit exige justificativa. Caso segue para revisao retrospectiva.",
      nextSteps: [
        "Registrar urgencia com criterio clinico objetivo.",
        "Se OPME fugir do kit validado, anexar justificativa tecnica.",
        "Hospital e operadora acompanham revisao retrospectiva."
      ],
      checklist,
      pendencias: []
    };
  }

  if (input.carater === "Urgencia" && !input.temCriterioUrgencia) {
    return {
      farol: "a",
      titulo: "Urgencia a confirmar - protocolo de reclassificacao",
      subtitulo: "Internar para analgesia e reclassificar como eletiva em 24-72h. O cuidado nao e interrompido.",
      nextSteps: [
        "Registrar conduta de analgesia e observacao.",
        "Reclassificar para eletiva em ate 72h com dossie completo.",
        "Manter rastreio para revisao retrospectiva da urgencia."
      ],
      checklist,
      pendencias: []
    };
  }

  if (missing.length) {
    return {
      farol: "a",
      titulo: "Complete o dossie",
      subtitulo: "Preencha os campos clinicos obrigatorios para seguir em fast-track.",
      nextSteps: ["Finalizar o dossie minimo e reenviar para classificacao automatica."],
      checklist,
      pendencias: missing
    };
  }

  if (input.temBlacklist) {
    return {
      farol: "r",
      titulo: "Revisao de material - alternativa necessaria",
      subtitulo: "Indicacao clinica aprovada; material em revisao tecnica pelo conselho. Substitua por alternativa parceira ou siga com justificativa para outro fluxo.",
      nextSteps: [
        "Substituir item blacklist por alternativa parceira para retorno ao verde.",
        "Ou manter com justificativa para segunda opiniao / fluxo hospital."
      ],
      checklist,
      pendencias: []
    };
  }

  if (input.temNaoParceira) {
    return {
      farol: "a",
      titulo: "Validacao de fornecedor",
      subtitulo: "Verde clinico mantido. Escolha alternativa parceira, cotacao com a empresa escolhida via operadora, ou fluxo hospital.",
      nextSteps: [
        "Trocar para item de empresa parceira e autorizar imediatamente.",
        "Ou manter fornecedor atual para cotacao formal pela operadora.",
        "Ou seguir via fluxo hospital."
      ],
      checklist,
      pendencias: []
    };
  }

  if (input.acimaTeto) {
    return {
      farol: "a",
      titulo: "OPME em validacao",
      subtitulo: "Composicao fora do pacote padrao. Revise quantidades ou siga com justificativa para validacao em ate 5 dias uteis.",
      nextSteps: [
        "Revisar composicao do kit conforme pacote.",
        "Se mantiver composicao atual, anexar justificativa tecnica para validacao."
      ],
      checklist,
      pendencias: []
    };
  }

  return {
    farol: "g",
    titulo: "Pronto para fast-track",
    subtitulo: "Pedido segue autorizado no range delegado. Encaminhar ao hospital com visao de instantaneo e meta operacional de 5 dias uteis.",
    nextSteps: ["Enviar pedido autorizado ao hospital.", "Registrar trilha da regra aplicada para auditoria."],
    checklist,
    pendencias: []
  };
}

function localSeedData() {
  return {
    users: [
      { id: "u-med-1", role: "medico", email: "medico@simplecoluna.com", password: "simple123", nome: "Dr. Rafael Lima" },
      { id: "u-op-1", role: "operadora", email: "operadora@simplecoluna.com", password: "simple123", nome: "Analista Operadora" },
      { id: "u-hosp-1", role: "hospital", email: "hospital@simplecoluna.com", password: "simple123", nome: "Central Hospitalar", hospitalPadrao: "Hospital Santa Coluna" },
      { id: "u-admin-1", role: "admin", email: "admin@simplecoluna.com", password: "simple123", nome: "Administracao" }
    ],
    medicoPerfis: [],
    protocolos: [
      {
        id: "p-hernia",
        nome: "Hernia de disco lombar",
        regiao: "Lombar",
        autorizarQuando: ["Radiculopatia com correlacao clinica e imagem", "Falha de tratamento conservador com limitacao funcional"],
        pontoDeControle: "Confirmar deficit neurologico e imagem compativel.",
        perguntasImportantes: ["Existe deficit motor progressivo documentado?", "Por quanto tempo foi conduzido tratamento conservador?"],
        referencias: [
          { titulo: "NASS Guideline - Lumbar Disc Herniation", link: "https://www.spine.org/" },
          { titulo: "Choosing Wisely - Spine Surgery", link: "https://www.choosingwisely.org/" }
        ]
      },
      {
        id: "p-estenose",
        nome: "Estenose lombar",
        regiao: "Lombar",
        autorizarQuando: ["Claudicacao neurogenica limitante", "Imagem compativel e falha do conservador"],
        pontoDeControle: "Definir necessidade de descompressao isolada ou com artrodese.",
        perguntasImportantes: ["Ha limitacao funcional em marcha validada por escala?", "Radiografia dinamica sugere instabilidade?"],
        referencias: [
          { titulo: "NASS Guideline - Lumbar Stenosis", link: "https://www.spine.org/" },
          { titulo: "Forsth et al. NEJM 2016", link: "https://www.nejm.org/" }
        ]
      },
      {
        id: "p-artrodese",
        nome: "Artrodese lombar por instabilidade",
        regiao: "Lombar",
        autorizarQuando: ["Instabilidade mecanica documentada", "Falha de abordagem nao cirurgica"],
        pontoDeControle: "Conferir indicacao de fusao e niveis alvo.",
        perguntasImportantes: ["Existe espondilolistese documentada?", "Ha risco de pseudoartrose aumentado?"],
        referencias: [
          { titulo: "Choosing Wisely - Fusion", link: "https://www.choosingwisely.org/" },
          { titulo: "Ghogawala et al. NEJM 2016", link: "https://www.nejm.org/" }
        ]
      },
      {
        id: "p-mielopatia",
        nome: "Mielopatia cervical",
        regiao: "Cervical",
        autorizarQuando: ["Mielopatia progressiva com imagem compativel", "Impacto funcional em mJOA"],
        pontoDeControle: "Mensurar mJOA e progressao neurologica.",
        perguntasImportantes: ["Qual o escore mJOA atual?", "Ha progressao neurologica nas ultimas semanas?"],
        referencias: [
          { titulo: "AO Spine - Fehlings 2017", link: "https://www.aofoundation.org/" },
          { titulo: "Guideline mJOA", link: "https://pubmed.ncbi.nlm.nih.gov/" }
        ]
      },
      {
        id: "p-fratura",
        nome: "Fratura toracolombar",
        regiao: "Toracolombar",
        autorizarQuando: ["Instabilidade biomecanica por AO/TLICS", "Risco neurologico elevado"],
        pontoDeControle: "Classificar AO/TLICS e plano de estabilizacao.",
        perguntasImportantes: ["Qual o escore TLICS?", "Ha deficit neurologico associado?"],
        referencias: [
          { titulo: "AO Spine Thoracolumbar", link: "https://www.aofoundation.org/" },
          { titulo: "Vaccaro TLICS", link: "https://pubmed.ncbi.nlm.nih.gov/" }
        ]
      }
    ],
    opmeItens: [
      { id: "i-1", nome: "Parafuso pedicular titanio", codigoInterno: "OP-001", tipo: "Implante", empresa: "Empresa Parceira A", custoUnitario: 2400, parceira: true, blacklist: false, blacklistMotivo: "" },
      { id: "i-2", nome: "Haste titanio 5.5", codigoInterno: "OP-002", tipo: "Implante", empresa: "Empresa Parceira A", custoUnitario: 1900, parceira: true, blacklist: false, blacklistMotivo: "" },
      { id: "i-3", nome: "Conector transversal", codigoInterno: "OP-003", tipo: "Implante", empresa: "Empresa Parceira B", custoUnitario: 900, parceira: true, blacklist: false, blacklistMotivo: "" },
      { id: "i-4", nome: "Cage intersomatico PEEK", codigoInterno: "OP-004", tipo: "Implante", empresa: "Empresa Parceira B", custoUnitario: 3300, parceira: true, blacklist: false, blacklistMotivo: "" },
      { id: "i-5", nome: "Placa cervical", codigoInterno: "OP-005", tipo: "Implante", empresa: "Empresa Parceira C", custoUnitario: 4300, parceira: true, blacklist: false, blacklistMotivo: "" },
      { id: "i-6", nome: "Parafuso cervical", codigoInterno: "OP-006", tipo: "Implante", empresa: "Empresa Parceira C", custoUnitario: 700, parceira: true, blacklist: false, blacklistMotivo: "" },
      { id: "i-7", nome: "Kit endoscopico basico", codigoInterno: "OP-007", tipo: "Instrumental", empresa: "Empresa Parceira A", custoUnitario: 5100, parceira: true, blacklist: false, blacklistMotivo: "" },
      { id: "i-8", nome: "Canula de trabalho", codigoInterno: "OP-008", tipo: "Instrumental", empresa: "Empresa Parceira B", custoUnitario: 1850, parceira: true, blacklist: false, blacklistMotivo: "" },
      { id: "i-9", nome: "Burr diamantada", codigoInterno: "OP-009", tipo: "Instrumental", empresa: "Empresa Parceira C", custoUnitario: 970, parceira: true, blacklist: false, blacklistMotivo: "" },
      { id: "i-10", nome: "Enxerto osseo sintetico", codigoInterno: "OP-010", tipo: "Biologico", empresa: "Empresa Parceira B", custoUnitario: 1600, parceira: true, blacklist: false, blacklistMotivo: "" },
      { id: "i-11", nome: "Hemostatico absorvivel", codigoInterno: "OP-011", tipo: "Suporte", empresa: "Empresa Parceira C", custoUnitario: 350, parceira: true, blacklist: false, blacklistMotivo: "" },
      { id: "i-12", nome: "Sistema de navegacao descartavel", codigoInterno: "OP-012", tipo: "Tecnologia", empresa: "Empresa Parceira A", custoUnitario: 2100, parceira: true, blacklist: false, blacklistMotivo: "" },
      { id: "i-13", nome: "Cage expansivel premium", codigoInterno: "OP-013", tipo: "Implante", empresa: "Empresa Nao Parceira X", custoUnitario: 5900, parceira: false, blacklist: false, blacklistMotivo: "" },
      { id: "i-14", nome: "Kit parafusos cannulados", codigoInterno: "OP-014", tipo: "Implante", empresa: "Empresa Parceira B", custoUnitario: 3200, parceira: true, blacklist: false, blacklistMotivo: "" },
      { id: "i-15", nome: "Sistema dinamico interespinhoso", codigoInterno: "OP-015", tipo: "Implante", empresa: "Empresa Nao Parceira X", custoUnitario: 7700, parceira: false, blacklist: true, blacklistMotivo: "Evidencia insuficiente, em revisao pelo conselho" }
    ],
    pacotesOpme: [
      { id: "pk-1", procedimento: "Artrodese lombar", niveis: 1, teto: 22000, itens: [{ itemId: "i-1", qtd: 4 }, { itemId: "i-2", qtd: 2 }, { itemId: "i-4", qtd: 1 }, { itemId: "i-10", qtd: 1 }] },
      { id: "pk-2", procedimento: "Artrodese lombar", niveis: 2, teto: 32000, itens: [{ itemId: "i-1", qtd: 6 }, { itemId: "i-2", qtd: 2 }, { itemId: "i-3", qtd: 1 }, { itemId: "i-4", qtd: 2 }, { itemId: "i-10", qtd: 1 }] },
      { id: "pk-3", procedimento: "Artrodese cervical", niveis: 1, teto: 26000, itens: [{ itemId: "i-5", qtd: 1 }, { itemId: "i-6", qtd: 4 }, { itemId: "i-4", qtd: 1 }, { itemId: "i-10", qtd: 1 }] },
      { id: "pk-4", procedimento: "Endoscopica", niveis: 1, teto: 15000, itens: [{ itemId: "i-7", qtd: 1 }, { itemId: "i-8", qtd: 1 }, { itemId: "i-9", qtd: 1 }, { itemId: "i-11", qtd: 2 }] }
    ],
    codigoTuss: [
      { codigo: "30715024", descricao: "Artrodese de coluna via anterior ou postero-lateral", procedimentoVinculado: "Artrodese cervical", tipo: "Principal", obs: "Principal para fusao" },
      { codigo: "30715180", descricao: "Instrumentacao de coluna", procedimentoVinculado: "Artrodese lombar", tipo: "Secundario", obs: "Associar ao principal" },
      { codigo: "30715091", descricao: "Descompressao medular", procedimentoVinculado: "Todos", tipo: "Secundario", obs: "Conforme compressao neural" },
      { codigo: "30715369", descricao: "Tratamento do canal vertebral estreito", procedimentoVinculado: "Estenose lombar", tipo: "Secundario", obs: "Pode exigir imagem" },
      { codigo: "30732026", descricao: "Fixacao vertebral segmentar", procedimentoVinculado: "Fratura toracolombar", tipo: "Secundario", obs: "Trauma" },
      { codigo: "30715393", descricao: "Hernia de disco cervical", procedimentoVinculado: "Artrodese cervical", tipo: "Secundario·exige imagem", obs: "Indicar nivel" },
      { codigo: "30715059", descricao: "Discectomia lombar", procedimentoVinculado: "Hernia de disco lombar", tipo: "Principal", obs: "Principal em hernia" }
    ],
    operadoras: [
      { id: "op-1", nome: "Operadora Alfa", faturamentoOPME: "operadora", hospitais: ["Hospital Santa Coluna", "Hospital Central Sul", "Hospital Vida Nova"] },
      { id: "op-2", nome: "Operadora Beta", faturamentoOPME: "hospital", hospitais: ["Hospital Vida Nova", "Hospital Sao Eixo"] },
      { id: "op-3", nome: "Operadora Gama", faturamentoOPME: "operadora", hospitais: ["Hospital Sao Eixo", "Hospital Santa Coluna"] },
      { id: "op-4", nome: "Operadora Delta", faturamentoOPME: "hospital", hospitais: ["Hospital Metropolitano", "Hospital Central Sul"] },
      { id: "op-5", nome: "Operadora Omega", faturamentoOPME: "operadora", hospitais: ["Hospital Santa Coluna", "Hospital Metropolitano"] }
    ],
    pedidos: [],
    rangeVersions: [],
    auditTrail: []
  };
}

function readLocalDb() {
  try {
    const raw = localStorage.getItem(LOCAL_DB_KEY);
    if (!raw) {
      const seeded = localSeedData();
      localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw);
  } catch {
    const seeded = localSeedData();
    localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeLocalDb(db) {
  localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
}

function localTokenForUser(user) {
  return btoa(JSON.stringify({ userId: user.id, role: user.role, exp: Date.now() + 1000 * 60 * 60 * 12 }));
}

function localUserFromToken(db, token) {
  if (!token) return null;
  try {
    const decoded = JSON.parse(atob(token));
    if (!decoded.exp || decoded.exp < Date.now()) return null;
    return db.users.find((u) => u.id === decoded.userId) || null;
  } catch {
    return null;
  }
}

function localNormalizeRoleData(role, db) {
  const base = {
    protocolos: db.protocolos,
    operadoras: db.operadoras,
    pacotesOpme: db.pacotesOpme,
    codigoTuss: db.codigoTuss
  };
  if (role === "medico" || role === "hospital") {
    return {
      ...base,
      opmeItens: db.opmeItens.map((item) => ({
        id: item.id,
        nome: item.nome,
        codigoInterno: item.codigoInterno,
        tipo: item.tipo,
        empresa: item.empresa,
        parceira: item.parceira,
        blacklist: item.blacklist,
        blacklistMotivo: item.blacklistMotivo
      }))
    };
  }
  return { ...base, opmeItens: db.opmeItens };
}

function localCheckTussForProcedure(codigosTuss, procedimento, db) {
  const valid = db.codigoTuss.filter(
    (t) => t.procedimentoVinculado === "Todos" || procedimento.includes(t.procedimentoVinculado) || t.procedimentoVinculado.includes(procedimento)
  );
  const set = new Set(valid.map((item) => item.codigo));
  return (codigosTuss || []).some((c) => set.has(c));
}

function localComputePedido(body, db) {
  const pacote = db.pacotesOpme.find((p) => p.procedimento === body.procedimento && Number(p.niveis) === Number(body.niveis));
  const itens = Array.isArray(body.itensOPME) ? body.itensOPME : [];

  let custoTotal = 0;
  let temBlacklist = false;
  let temNaoParceira = false;

  itens.forEach((entry) => {
    const item = db.opmeItens.find((op) => op.id === entry.itemId);
    if (!item) return;
    custoTotal += Number(item.custoUnitario || 0) * Number(entry.qtd || 0);
    temBlacklist = temBlacklist || Boolean(item.blacklist);
    temNaoParceira = temNaoParceira || !item.parceira;
  });

  const perguntasSemResposta = (body.perguntasImportantes || [])
    .filter((item) => !String(item.r || "").trim())
    .map((item) => item.q);

  const criterioUrgencia = hasUrgencyCriteria(body.urgenciaFlags || {});
  const farolResult = localEvaluateFarol({
    carater: body.carater,
    temCriterioUrgencia: criterioUrgencia,
    protocoloId: body.protocoloId,
    relato: body.relato,
    flags: body.dossieFlags || {},
    perguntasObrigatoriasSemResposta: perguntasSemResposta,
    tussExiste: localCheckTussForProcedure(body.codigosTuss || [], body.procedimento || "", db),
    temBlacklist,
    temNaoParceira,
    acimaTeto: pacote ? custoTotal > Number(pacote.teto || 0) : false
  });

  return {
    ...farolResult,
    custoTotal,
    criterioUrgencia,
    pacoteId: pacote?.id || null,
    tetoPacote: pacote?.teto || null,
    acimaTeto: pacote ? custoTotal > Number(pacote.teto || 0) : false
  };
}

function localJson(status, payload) {
  if (status >= 400) {
    throw new Error(payload.error || "Falha de comunicacao");
  }
  return payload;
}

async function localApi(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};
  const db = readLocalDb();
  const authUser = localUserFromToken(db, state.token);

  if (method === "POST" && path === "/api/auth/login") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const user = db.users.find((u) => u.email === email && u.password === password);
    if (!user) return localJson(401, { error: "Credenciais invalidas." });
    const token = localTokenForUser(user);
    return localJson(200, { token, user: { id: user.id, role: user.role, nome: user.nome, email: user.email } });
  }

  if (path.startsWith("/api/") && !authUser) {
    return localJson(401, { error: "Nao autenticado." });
  }

  if (method === "GET" && path === "/api/auth/me") {
    return localJson(200, { user: { id: authUser.id, role: authUser.role, nome: authUser.nome, email: authUser.email } });
  }

  if (method === "GET" && path === "/api/bootstrap") {
    return localJson(200, localNormalizeRoleData(authUser.role, db));
  }

  if (method === "POST" && path === "/api/pedidos/preview") {
    return localJson(200, localComputePedido(body, db));
  }

  if (method === "POST" && path === "/api/pedidos") {
    const calc = localComputePedido(body, db);
    const seq = db.pedidos.length ? Math.max(...db.pedidos.map((p) => Number(p.seq))) + 1 : 1001;
    const pedido = {
      id: `ped-${seq}`,
      seq,
      medico: body.medico,
      medicoUserId: authUser.id,
      pacientePseudonimizado: body.pacientePseudonimizado,
      operadora: body.operadora,
      carteirinha: body.carteirinha,
      hospital: body.hospital,
      carater: body.carater,
      preenchidoPorPS: body.preenchidoPorPS || "",
      temMedicoAssistente: body.temMedicoAssistente || "",
      relato: body.relato,
      cid: body.cid,
      protocoloId: body.protocoloId,
      respostasPerguntas: body.perguntasImportantes || [],
      procedimento: body.procedimento,
      niveis: Number(body.niveis || 1),
      codigosTuss: body.codigosTuss || [],
      itensOPME: body.itensOPME || [],
      custoTotalCalculado: calc.custoTotal,
      farol: calc.farol,
      titulo: calc.titulo,
      racional: calc.subtitulo,
      pendencias: calc.pendencias,
      status: calc.farol === "r" && calc.titulo !== "Fluxo de urgencia" ? "2a opiniao" : localStatusFromFarol(calc.farol),
      urgenciaCriterioPresente: calc.criterioUrgencia,
      pacoteId: calc.pacoteId,
      tetoPacote: calc.tetoPacote,
      acimaTeto: calc.acimaTeto,
      referencias: (db.protocolos.find((p) => p.id === body.protocoloId)?.referencias || []),
      regraVersao: `${calc.pacoteId || "sem-pacote"}@${new Date().toISOString().slice(0, 10)}`,
      data: new Date().toISOString()
    };
    db.pedidos.push(pedido);
    db.auditTrail.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
      userId: authUser.id,
      action: "pedido.autorizacao",
      details: { pedidoId: pedido.id, farol: pedido.farol, regraVersao: pedido.regraVersao }
    });
    writeLocalDb(db);
    return localJson(201, { pedido });
  }

  if (method === "GET" && path === "/api/pedidos") {
    let pedidos = db.pedidos;
    if (authUser.role === "medico") pedidos = pedidos.filter((p) => p.medicoUserId === authUser.id);
    if (authUser.role === "hospital") pedidos = pedidos.filter((p) => p.hospital === authUser.hospitalPadrao || p.carater === "Urgencia");
    return localJson(200, { pedidos });
  }

  if (method === "DELETE" && path === "/api/pedidos/mine") {
    db.pedidos = db.pedidos.filter((p) => p.medicoUserId !== authUser.id);
    db.auditTrail.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
      userId: authUser.id,
      action: "pedido.clear.mine",
      details: {}
    });
    writeLocalDb(db);
    return localJson(200, { ok: true });
  }

  if (method === "GET" && path === "/api/operadora/kpis") {
    const pedidos = db.pedidos;
    const total = pedidos.length || 1;
    const verdes = pedidos.filter((p) => p.farol === "g").length;
    const custoMedio = pedidos.reduce((acc, p) => acc + Number(p.custoTotalCalculado || 0), 0) / total;
    const foraPadrao = pedidos.filter((p) => p.farol !== "g").length;
    return localJson(200, { total: pedidos.length, percentualVerde: (verdes / total) * 100, custoMedio, foraPadrao });
  }

  if (method === "GET" && path === "/api/hospital/urgencias") {
    const urgencias = db.pedidos.filter((p) => p.carater === "Urgencia");
    return localJson(200, { urgencias });
  }

  if (method === "GET" && path === "/api/admin/all") {
    return localJson(200, { protocolos: db.protocolos, opmeItens: db.opmeItens, pacotesOpme: db.pacotesOpme, codigoTuss: db.codigoTuss, auditTrail: db.auditTrail });
  }

  if (method === "POST" && path === "/api/admin/protocolos") {
    const proto = {
      id: `p-${Date.now()}`,
      nome: body.nome,
      regiao: body.regiao,
      autorizarQuando: body.autorizarQuando || [],
      pontoDeControle: body.pontoDeControle || "",
      perguntasImportantes: body.perguntasImportantes || [],
      referencias: body.referencias || []
    };
    db.protocolos.push(proto);
    writeLocalDb(db);
    return localJson(201, { protocolo: proto });
  }

  if (method === "DELETE" && path.startsWith("/api/admin/protocolos/")) {
    const id = decodeURIComponent(path.split("/").pop());
    db.protocolos = db.protocolos.filter((p) => p.id !== id);
    writeLocalDb(db);
    return localJson(200, { ok: true });
  }

  if (method === "POST" && path === "/api/admin/opme-itens") {
    const item = {
      id: `i-${Date.now()}`,
      nome: body.nome,
      codigoInterno: body.codigoInterno,
      tipo: body.tipo,
      empresa: body.empresa,
      custoUnitario: Number(body.custoUnitario || 0),
      parceira: Boolean(body.parceira),
      blacklist: Boolean(body.blacklist),
      blacklistMotivo: body.blacklistMotivo || ""
    };
    db.opmeItens.push(item);
    writeLocalDb(db);
    return localJson(201, { item });
  }

  if (method === "DELETE" && path.startsWith("/api/admin/opme-itens/")) {
    const id = decodeURIComponent(path.split("/").pop());
    db.opmeItens = db.opmeItens.filter((p) => p.id !== id);
    db.pacotesOpme = db.pacotesOpme.map((pk) => ({ ...pk, itens: (pk.itens || []).filter((it) => it.itemId !== id) }));
    writeLocalDb(db);
    return localJson(200, { ok: true });
  }

  if (method === "POST" && path === "/api/admin/pacotes-opme") {
    const keyProc = String(body.procedimento || "").trim();
    const keyNiveis = Number(body.niveis || 1);
    const payload = {
      id: `pk-${Date.now()}`,
      procedimento: keyProc,
      niveis: keyNiveis,
      teto: Number(body.teto || 0),
      itens: body.itens || []
    };
    const idx = db.pacotesOpme.findIndex((p) => p.procedimento === keyProc && Number(p.niveis) === keyNiveis);
    if (idx >= 0) db.pacotesOpme[idx] = { ...db.pacotesOpme[idx], ...payload };
    else db.pacotesOpme.push(payload);
    db.rangeVersions.push({ id: `rv-${Date.now()}`, at: new Date().toISOString(), regra: `${keyProc}-${keyNiveis}` });
    writeLocalDb(db);
    return localJson(201, { pacote: payload });
  }

  if (method === "POST" && path === "/api/admin/tuss") {
    db.codigoTuss = db.codigoTuss.filter((t) => t.codigo !== body.codigo);
    const novo = {
      codigo: String(body.codigo || "").trim(),
      descricao: body.descricao || "",
      procedimentoVinculado: body.procedimentoVinculado || "Todos",
      tipo: body.tipo || "Secundario",
      obs: body.obs || ""
    };
    db.codigoTuss.push(novo);
    writeLocalDb(db);
    return localJson(201, { tuss: novo });
  }

  if (method === "DELETE" && path.startsWith("/api/admin/tuss/")) {
    const codigo = decodeURIComponent(path.split("/").pop());
    db.codigoTuss = db.codigoTuss.filter((t) => t.codigo !== codigo);
    writeLocalDb(db);
    return localJson(200, { ok: true });
  }

  return localJson(404, { error: "Rota nao encontrada." });
}

function activateLocalMode() {
  state.apiMode = "local";
  if (!state.localModeNotified) {
    state.localModeNotified = true;
    showToast("Modo online indisponivel neste dominio. Usando modo local persistido no navegador.");
  }
}

function resolveApiUrl(path) {
  return API_BASE ? `${API_BASE}${path}` : path;
}

async function api(path, options = {}) {
  if (state.apiMode === "local") {
    return localApi(path, options);
  }

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const url = resolveApiUrl(path);

  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 404 || response.status === 405 || response.status >= 500) {
        activateLocalMode();
        return localApi(path, options);
      }
      throw new Error(data.error || "Falha de comunicacao");
    }
    return data;
  } catch (error) {
    activateLocalMode();
    return localApi(path, options);
  }
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
