const STORAGE_KEY_LESIONS = "simplecoluna.lesoes.v1";
const SESSION_KEY_AUTH = "simplecoluna.session.auth.v1";
const AUTH_LOGIN = "administracao@simplecoluna.com";
const AUTH_LOGIN_ALIASES = ["administracao@simplecoluna.com", "admistracao@simplecoluna.com"];
const AUTH_PASSWORD = "simplecoluna";
const STORAGE_KEY_REQUEST_HISTORY = "simplecoluna.requests.v1";
const STORAGE_KEY_FOCUS_MODE = "simplecoluna.landing.focus.v1";
const STORAGE_KEY_ACCESS_PROGRESS = "simplecoluna.landing.access-progress.v1";
const NEGATIVE_TUSS_CODES = ["30715270", "30715210", "30715199", "30715261", "31401260"];
const CFM_SEARCH_BASE_URL = "https://portal.cfm.org.br/busca-medicos/";
const CFM_PROXY_BASE_URL = "https://r.jina.ai/http://portal.cfm.org.br/busca-medicos/";
const SAMPLE_DOCTOR_RANKING = [
  {
    doctorName: "Dra. Carla Fernandes",
    crm: "527596/RJ",
    requests: 18,
    score: 92,
    scoreDetails: "Exemplo: 18 documentos (criados/auditados), alta completude tecnica e baixa intercorrencia."
  },
  {
    doctorName: "Dr. Renato Almeida",
    crm: "184233/SP",
    requests: 12,
    score: 84,
    scoreDetails: "Exemplo: boa qualidade documental, com pequenas pendencias de codificacao."
  },
  {
    doctorName: "Dra. Juliana Mota",
    crm: "90311/MG",
    requests: 9,
    score: 76,
    scoreDetails: "Exemplo: performance regular, com mais necessidade de ajuste em TUSS/OPME."
  }
];

const FALLBACK_LESIONS = [
  {
    id: "hernia-lombar",
    nome: "Hernia de disco lombar com radiculopatia",
    regiao: "lombar",
    sinais_alerta: "Dor irradiada, deficit motor progressivo, falha de tratamento conservador",
    exame_sugerido: "Ressonancia magnetica da coluna lombar",
    tecnica_possivel: "Microdiscectomia (avaliar indicacao clinica)",
    observacoes: "Correlacionar com distribuicao dermatomerica e deficit neurologico.",
    materiais: [
      { item: "Retrator tubular", codigo: "OPME-LB-101", tipo: "Instrumental" },
      { item: "Pinca pituitaria", codigo: "OPME-LB-104", tipo: "Instrumental" }
    ]
  },
  {
    id: "estenose-lombar",
    nome: "Estenose lombar degenerativa",
    regiao: "lombar",
    sinais_alerta: "Claudicacao neurogenica, limitacao funcional importante",
    exame_sugerido: "Ressonancia magnetica e radiografias dinamicas",
    tecnica_possivel: "Descompressao com ou sem artrodese",
    observacoes: "Avaliar estabilidade segmentar pre-operatoria.",
    materiais: [
      { item: "Sistema de parafuso pedicular", codigo: "OPME-LB-201", tipo: "Implante" },
      { item: "Haste de titanio", codigo: "OPME-LB-204", tipo: "Implante" }
    ]
  },
  {
    id: "mielopatia-cervical",
    nome: "Mielopatia cervical espondilotica",
    regiao: "cervical",
    sinais_alerta: "Alteracao de marcha, hiperreflexia, perda de destreza",
    exame_sugerido: "Ressonancia magnetica cervical",
    tecnica_possivel: "Descompressao cervical anterior ou posterior",
    observacoes: "Sinais longos de trato piramidal aumentam urgencia de avaliacao.",
    materiais: [
      { item: "Placa cervical", codigo: "OPME-CV-305", tipo: "Implante" },
      { item: "Cage cervical", codigo: "OPME-CV-309", tipo: "Implante" }
    ]
  },
  {
    id: "fratura-toracolombar",
    nome: "Fratura toracolombar instavel",
    regiao: "toracica",
    sinais_alerta: "Trauma de alta energia, dor intensa, suspeita de instabilidade",
    exame_sugerido: "Tomografia com reconstrucao e ressonancia quando indicada",
    tecnica_possivel: "Fixacao posterior segmentar",
    observacoes: "Classificar padrao da fratura e risco neurologico.",
    materiais: [
      { item: "Parafuso pedicular canulado", codigo: "OPME-TL-401", tipo: "Implante" },
      { item: "Conector transversal", codigo: "OPME-TL-408", tipo: "Implante" }
    ]
  }
];

const ALLOWED_COMPANIES = ["STRYKER", "SMITH NEPHEW", "JOHNSON", "ZIMMER", "MEDTRONIC", "SATRATTNER", "HANDLE"];

const SURGERY_PROTOCOLS = {
  cervical: {
    label: "Artrodese de coluna cervical via anterior ou postero-lateral",
    defaultCid: "M50.1",
    procedure:
      "Artrodese de coluna cervical via anterior ou postero-lateral com descompressao neural e estabilizacao por segmento.",
    tuss: [
      {
        codigo: "30715024",
        descricao: "Artrodese de coluna via anterior ou postero-lateral",
        multiplicarPorNivel: true,
        aplicacao:
          "Realizacao da artrodese dos niveis cervicais abordados para estabilizacao mecanica do segmento."
      },
      {
        codigo: "30715393",
        descricao: "Hernia de disco cervical",
        multiplicarPorNivel: true,
        aplicacao:
          "Tratamento cirurgico da patologia discal cervical no(s) nivel(is) planejado(s)."
      },
      {
        codigo: "30715091",
        descricao: "Descompressao medular",
        multiplicarPorNivel: true,
        aplicacao:
          "Descompressao das estruturas neurais comprimidas com objetivo de alivio neurologico."
      },
      {
        codigo: "30715369",
        descricao: "Tratamento do canal vertebral estreito",
        multiplicarPorNivel: false,
        aplicacao:
          "Ampliacao do canal vertebral em estenose comprovada por imagem para reducao da compressao."
      }
    ],
    opmeByLevel: {
      1: [
        "04 Parafusos",
        "01 Placa cervical de bloqueio",
        "01 Espacador intersomatico cervical",
        "01 Enxerto osseo",
        "01 Pinca bipolar"
      ],
      2: [
        "06 Parafusos",
        "01 Placa cervical de bloqueio",
        "02 Espacadores intersomaticos cervicais",
        "01 Enxerto osseo",
        "01 Pinca bipolar"
      ],
      3: [
        "08 Parafusos",
        "01 Placa cervical de bloqueio",
        "03 Espacadores intersomaticos cervicais",
        "01 Enxerto osseo",
        "01 Pinca bipolar"
      ]
    },
    opmeKeywords: ["placa cervical", "espacador intersomatico", "enxerto osseo", "pinca bipolar"]
  },
  lombar: {
    label: "Artrodese de coluna lombar via anterior ou postero-lateral",
    defaultCid: "M51.1",
    procedure:
      "Artrodese lombar com descompressao neural e instrumentacao segmentar para estabilizacao biomecanica.",
    tuss: [
      {
        codigo: "30715024",
        descricao: "Artrodese de coluna via anterior ou postero-lateral",
        multiplicarPorNivel: true,
        aplicacao:
          "Realizacao da artrodese lombar no(s) segmento(s) acometido(s), com consolidacao planejada."
      },
      {
        codigo: "30715180",
        descricao: "Hernia de disco lombar",
        multiplicarPorNivel: true,
        aplicacao:
          "Tratamento cirurgico da patologia discal lombar correlata ao quadro clinico-radiologico."
      },
      {
        codigo: "30715091",
        descricao: "Descompressao medular",
        multiplicarPorNivel: true,
        aplicacao:
          "Descompressao das estruturas neurais comprimidas para alivio de dor e deficit neurologico."
      },
      {
        codigo: "30715369",
        descricao: "Tratamento do canal vertebral estreito",
        multiplicarPorNivel: false,
        aplicacao:
          "Tratamento da estenose do canal vertebral com base em comprovacao por imagem."
      }
    ],
    opmeByLevel: {
      1: [
        "02 Hastes verticais",
        "04 Parafusos",
        "04 Bloqueadores",
        "01 Espacador intersomatico lombar",
        "01 Enxerto osseo",
        "01 Pinca bipolar"
      ],
      2: [
        "02 Hastes verticais",
        "06 Parafusos",
        "06 Bloqueadores",
        "01 Conector transverso",
        "02 Espacadores intersomaticos lombares",
        "01 Enxerto osseo",
        "01 Pinca bipolar"
      ],
      3: [
        "02 Hastes verticais",
        "08 Parafusos",
        "08 Bloqueadores",
        "01 Conector transverso",
        "03 Espacadores intersomaticos lombares",
        "01 Enxerto osseo",
        "01 Pinca bipolar"
      ]
    },
    opmeKeywords: ["haste", "parafuso", "bloqueador", "conector transverso", "espacador intersomatico"]
  },
  endoscopica: {
    label: "Cirurgia endoscopica de coluna",
    defaultCid: "M51.1",
    procedure:
      "Cirurgia endoscopica de coluna com acesso percutaneo e descompressao dirigida da estrutura neural acometida.",
    tuss: [
      {
        codigo: "30715059",
        descricao: "Cirurgia endoscopica de coluna",
        multiplicarPorNivel: false,
        aplicacao: "Execucao do acesso endoscopico e tratamento do segmento alvo por tecnica minimamente invasiva."
      },
      {
        codigo: "30715180",
        descricao: "Hernia de disco lombar",
        multiplicarPorNivel: false,
        aplicacao: "Resseccao da hernia discal por via endoscopica com descompressao neural direta."
      },
      {
        codigo: "30715091",
        descricao: "Descompressao medular",
        multiplicarPorNivel: false,
        aplicacao: "Descompressao do canal e do recesso lateral conforme alvo radiologico e clinico."
      },
      {
        codigo: "30715369",
        descricao: "Tratamento do canal vertebral estreito",
        multiplicarPorNivel: false,
        aplicacao: "Tratamento da estenose vertebral em contexto de cirurgia endoscopica."
      }
    ],
    opmeByLevel: {
      1: [
        "01 Kit de acesso percutaneo",
        "01 Eletrodo bipolar",
        "01 Broca cortante",
        "01 Broca diamantada",
        "Kit Spine Cut"
      ]
    },
    opmeKeywords: ["kit de acesso percutaneo", "eletrodo bipolar", "broca cortante", "broca diamantada", "spine cut"]
  }
};

const ALL_VALID_TUSS = new Set(
  Object.values(SURGERY_PROTOCOLS)
    .flatMap((config) => config.tuss)
    .map((item) => item.codigo)
);

let lesions = [];

const searchInput = document.querySelector("#searchInput");
const regionFilter = document.querySelector("#regionFilter");
const lesionGrid = document.querySelector("#lesionGrid");
const resultCount = document.querySelector("#resultCount");
const materialsTableBody = document.querySelector("#materialsTableBody");

const adminToggleBtn = document.querySelector("#adminToggleBtn");
const adminSection = document.querySelector("#adminSection");
const enterPlatformBtn = document.querySelector("#enterPlatformBtn");
const loginGate = document.querySelector("#loginGate");
const loginForm = document.querySelector("#loginForm");
const loginEmailInput = document.querySelector("#loginEmailInput");
const loginPasswordInput = document.querySelector("#loginPasswordInput");
const loginFeedback = document.querySelector("#loginFeedback");
const publicArea = document.querySelector("#publicArea");
const appArea = document.querySelector("#appArea");
const focusModeToggle = document.querySelector("#focusModeToggle");
const journeyAnchorBtn = document.querySelector("#journeyAnchorBtn");
const topAuthBtn = document.querySelector("#topAuthBtn");
const finalLoginCta = document.querySelector("#finalLoginCta");
const quickAccessLoginBtn = document.querySelector("#quickAccessLoginBtn");
const accessProgressText = document.querySelector("#accessProgressText");
const accessProgressBar = document.querySelector("#accessProgressBar");
const accessProgressFill = document.querySelector("#accessProgressFill");
const accessProgressSteps = document.querySelectorAll("#accessProgressSteps li");
const internalTabButtons = document.querySelectorAll(".internal-tab-btn");
const internalTabPanels = document.querySelectorAll(".internal-tab-panel");

const lesionForm = document.querySelector("#lesionForm");
const editingIdInput = document.querySelector("#editingId");
const nomeInput = document.querySelector("#nomeInput");
const regiaoInput = document.querySelector("#regiaoInput");
const sinaisInput = document.querySelector("#sinaisInput");
const exameInput = document.querySelector("#exameInput");
const tecnicaInput = document.querySelector("#tecnicaInput");
const observacoesInput = document.querySelector("#observacoesInput");
const materiaisInput = document.querySelector("#materiaisInput");
const lesionFormFeedback = document.querySelector("#lesionFormFeedback");
const newLesionBtn = document.querySelector("#newLesionBtn");
const adminLesionsTableBody = document.querySelector("#adminLesionsTableBody");

const modeQuestionnaireBtn = document.querySelector("#modeQuestionnaireBtn");
const modeUploadBtn = document.querySelector("#modeUploadBtn");
const questionnairePanel = document.querySelector("#questionnairePanel");
const uploadPanel = document.querySelector("#uploadPanel");

const surgeryTypeSelect = document.querySelector("#surgeryTypeSelect");
const levelsSelect = document.querySelector("#levelsSelect");
const redFlagNeuroInput = document.querySelector("#redFlagNeuroInput");
const redFlagCompressionInput = document.querySelector("#redFlagCompressionInput");
const yellowPainInput = document.querySelector("#yellowPainInput");
const yellowFailureInput = document.querySelector("#yellowFailureInput");
const imageProofInput = document.querySelector("#imageProofInput");
const classHighMorbidityInput = document.querySelector("#classHighMorbidityInput");
const classComplexAnatomyInput = document.querySelector("#classComplexAnatomyInput");
const classNeedPrecisionInput = document.querySelector("#classNeedPrecisionInput");
const classConventionalLimitInput = document.querySelector("#classConventionalLimitInput");
const functionalLimitationsInput = document.querySelector("#functionalLimitationsInput");
const cidInput = document.querySelector("#cidInput");
const mainDiagnosisInput = document.querySelector("#mainDiagnosisInput");
const techGoalSelect = document.querySelector("#techGoalSelect");
const generateDecisionBtn = document.querySelector("#generateDecisionBtn");
const decisionResult = document.querySelector("#decisionResult");

const pedidoFileInput = document.querySelector("#pedidoFileInput");
const pedidoTextInput = document.querySelector("#pedidoTextInput");
const analyzePedidoBtn = document.querySelector("#analyzePedidoBtn");
const uploadResult = document.querySelector("#uploadResult");

const doctorNameInput = document.querySelector("#doctorNameInput");
const doctorCrmInput = document.querySelector("#doctorCrmInput");
const doctorUfSelect = document.querySelector("#doctorUfSelect");
const patientNameInput = document.querySelector("#patientNameInput");
const patientDocumentInput = document.querySelector("#patientDocumentInput");
const surgeryDateInput = document.querySelector("#surgeryDateInput");
const checkCfmBtn = document.querySelector("#checkCfmBtn");
const doctorSpecialtyInput = document.querySelector("#doctorSpecialtyInput");
const doctorStatusInput = document.querySelector("#doctorStatusInput");
const cfmLookupFeedback = document.querySelector("#cfmLookupFeedback");

const outcomeForm = document.querySelector("#outcomeForm");
const outcomeRequestSelect = document.querySelector("#outcomeRequestSelect");
const reoperationDateInput = document.querySelector("#reoperationDateInput");
const negTuss30715270 = document.querySelector("#negTuss30715270");
const negTuss30715210 = document.querySelector("#negTuss30715210");
const negTuss30715199 = document.querySelector("#negTuss30715199");
const negTuss30715261 = document.querySelector("#negTuss30715261");
const negTuss31401260 = document.querySelector("#negTuss31401260");
const outcomeFeedback = document.querySelector("#outcomeFeedback");
const doctorRankingTableBody = document.querySelector("#doctorRankingTableBody");

let activeLesionId = null;
let uploadedPedidoText = "";
let latestRequestTemplate = "";
let latestRequestFileName = "solicitacao-cirurgia.txt";
let isAuthenticated = false;
let requestHistory = [];
let latestDoctorLookup = { checked: false, verified: false, source: "nao-consultado", message: "" };

function applyAuthState() {
  publicArea?.classList.toggle("hidden", isAuthenticated);
  appArea?.classList.toggle("hidden", !isAuthenticated);
  loginGate?.classList.toggle("hidden", isAuthenticated);

  if (topAuthBtn) {
    topAuthBtn.textContent = isAuthenticated ? "Sair" : "Login seguro";
    topAuthBtn.setAttribute("href", isAuthenticated ? "#" : "#loginGate");
  }

  if (adminToggleBtn) {
    adminToggleBtn.disabled = !isAuthenticated;
    adminToggleBtn.classList.toggle("hidden", !isAuthenticated);
  }

  if (isAuthenticated && loginFeedback) {
    loginFeedback.textContent = "Acesso liberado.";
    loginFeedback.classList.remove("error");
  }
}

function isValidLogin(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();
  const allowedEmails = new Set([AUTH_LOGIN, ...AUTH_LOGIN_ALIASES]);
  return allowedEmails.has(normalizedEmail) && normalizedPassword === AUTH_PASSWORD;
}

function bindLoginGate() {
  if (!loginForm || !loginEmailInput || !loginPasswordInput || !loginFeedback) {
    isAuthenticated = true;
    applyAuthState();
    return;
  }

  isAuthenticated = sessionStorage.getItem(SESSION_KEY_AUTH) === "1";
  applyAuthState();

  loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = loginEmailInput?.value || "";
    const password = loginPasswordInput?.value || "";
    if (!isValidLogin(email, password)) {
      isAuthenticated = false;
      sessionStorage.removeItem(SESSION_KEY_AUTH);
      loginFeedback.textContent = "Credenciais inválidas. Verifique login e senha.";
      loginFeedback.classList.add("error");
      applyAuthState();
      return;
    }

    isAuthenticated = true;
    sessionStorage.setItem(SESSION_KEY_AUTH, "1");
    loginFeedback.textContent = "Login realizado com sucesso.";
    loginFeedback.classList.remove("error");
    loginForm.reset();
    setInternalTab("build");
    applyAuthState();
    appArea?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalized(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function toFileSafe(value) {
  return normalized(value)
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function toIsoDate(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

function daysBetween(isoA, isoB) {
  const a = new Date(isoA);
  const b = new Date(isoB);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) {
    return null;
  }
  return Math.abs(Math.round((b.getTime() - a.getTime()) / 86400000));
}

function buildCfmLookupUrl(crm, uf) {
  const params = new URLSearchParams({ crm, uf });
  return `${CFM_SEARCH_BASE_URL}?${params.toString()}`;
}

function getRequestContext() {
  const doctorName = (doctorNameInput?.value || "").trim();
  const doctorCrm = onlyDigits(doctorCrmInput?.value || "");
  const doctorUf = (doctorUfSelect?.value || "").trim().toUpperCase();
  const doctorSpecialty = (doctorSpecialtyInput?.value || "").trim();
  const doctorStatus = (doctorStatusInput?.value || "").trim();
  const patientName = (patientNameInput?.value || "").trim();
  const patientDocument = (patientDocumentInput?.value || "").trim();
  const surgeryDate = toIsoDate(surgeryDateInput?.value || "");

  return {
    doctor: {
      name: doctorName,
      crm: doctorCrm,
      uf: doctorUf,
      specialty: doctorSpecialty,
      status: doctorStatus,
      cfm: { ...latestDoctorLookup }
    },
    patient: {
      name: patientName,
      document: patientDocument
    },
    surgeryDate
  };
}

function validateRequestContext() {
  const context = getRequestContext();
  const missing = [];
  if (!context.doctor.name) missing.push("nome do médico");
  if (!context.doctor.crm) missing.push("CRM");
  if (!context.doctor.uf) missing.push("UF do CRM");
  if (!context.patient.name) missing.push("nome do paciente");
  if (!context.patient.document) missing.push("documento do paciente");
  if (!context.surgeryDate) missing.push("data da cirurgia");

  if (missing.length) {
    return {
      ok: false,
      message: `Preencha: ${missing.join(", ")}.`
    };
  }

  return { ok: true, context };
}

function persistRequestHistory() {
  localStorage.setItem(STORAGE_KEY_REQUEST_HISTORY, JSON.stringify(requestHistory));
}

function loadRequestHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REQUEST_HISTORY);
    requestHistory = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(requestHistory)) {
      requestHistory = [];
    }
  } catch {
    requestHistory = [];
  }
}

function registerRequestEntry(payload) {
  const previousSamePatient = requestHistory.find(
    (entry) =>
      normalized(entry.patient.document || "") === normalized(payload.patient.document || "") &&
      entry.id !== payload.id
  );

  if (previousSamePatient) {
    const interval = daysBetween(previousSamePatient.surgeryDate, payload.surgeryDate);
    if (interval !== null && interval > 10) {
      payload.outcomes = {
        ...(payload.outcomes || {}),
        reoperationUnder90: true,
        reoperationDate: payload.surgeryDate
      };
    }
  }

  requestHistory.unshift(payload);
  persistRequestHistory();
  renderOutcomeRequestOptions();
  renderDoctorRanking();
}

function buildRequestId() {
  return `PED-${Date.now()}`;
}

function evaluateEntryScore(entry) {
  const expectedTussCodes = entry.expectedTussCodes || [];
  const informedTussCodes = entry.tussCodes || [];
  const matchedTuss = informedTussCodes.filter((code) => expectedTussCodes.includes(code)).length;
  const missingTuss = Math.max(expectedTussCodes.length - matchedTuss, 0);

  const expectedOpme = entry.expectedOpmeCount || 1;
  const informedOpme = entry.opmeItems?.length || 0;
  const opmeCompleted = informedOpme >= expectedOpme;

  const hasDoctorIdentity =
    Boolean((entry.doctor?.name || "").trim()) && Boolean((entry.doctor?.crm || "").trim()) && Boolean((entry.doctor?.uf || "").trim());
  const hasPatientIdentity =
    Boolean((entry.patient?.name || "").trim()) &&
    Boolean((entry.patient?.document || "").trim()) &&
    Boolean((entry.surgeryDate || "").trim());

  const negativeCodes = entry.outcomes?.negativeCodes || [];
  const complications = negativeCodes.filter((code) => NEGATIVE_TUSS_CODES.includes(code)).length;
  const hasEarlyReoperation = Boolean(entry.outcomes?.reoperationUnder90);

  const base = 35;
  const bonusTuss = matchedTuss * 9;
  const bonusOpme = opmeCompleted ? 12 : 0;
  const bonusDoctor = hasDoctorIdentity ? 7 : 0;
  const bonusPatient = hasPatientIdentity ? 7 : 0;

  const penaltyMissingTuss = missingTuss * 10;
  const penaltyOpme = opmeCompleted ? 0 : 12;
  const penaltyDoctor = hasDoctorIdentity ? 0 : 8;
  const penaltyPatient = hasPatientIdentity ? 0 : 8;
  const penaltyComplications = complications * 20;
  const penaltyEarlyReoperation = hasEarlyReoperation ? 25 : 0;

  const positive = base + bonusTuss + bonusOpme + bonusDoctor + bonusPatient;
  const negative =
    penaltyMissingTuss +
    penaltyOpme +
    penaltyDoctor +
    penaltyPatient +
    penaltyComplications +
    penaltyEarlyReoperation;
  const score = Math.max(0, Math.min(100, Math.round(positive - negative)));

  return {
    score,
    complications,
    hasEarlyReoperation,
    points: {
      base,
      bonusTuss,
      bonusOpme,
      bonusDoctor,
      bonusPatient,
      penaltyMissingTuss,
      penaltyOpme,
      penaltyDoctor,
      penaltyPatient,
      penaltyComplications,
      penaltyEarlyReoperation
    }
  };
}

function rankDoctors() {
  const groups = new Map();

  requestHistory
    .filter((entry) => ["criado", "auditado"].includes(entry.documentSource || ""))
    .forEach((entry) => {
      const key = `${entry.doctor.crm}-${entry.doctor.uf}`;
      if (!groups.has(key)) {
        groups.set(key, {
          doctorName: entry.doctor.name,
          crm: `${entry.doctor.crm}/${entry.doctor.uf}`,
          requests: 0,
          scoreSum: 0,
          complications: 0,
          earlyReoperations: 0,
          points: {
            base: 0,
            bonusTuss: 0,
            bonusOpme: 0,
            bonusDoctor: 0,
            bonusPatient: 0,
            penaltyMissingTuss: 0,
            penaltyOpme: 0,
            penaltyDoctor: 0,
            penaltyPatient: 0,
            penaltyComplications: 0,
            penaltyEarlyReoperation: 0
          }
        });
      }

      const entryScore = evaluateEntryScore(entry);
      const doctor = groups.get(key);
      doctor.requests += 1;
      doctor.scoreSum += entryScore.score;
      doctor.complications += entryScore.complications;
      doctor.earlyReoperations += entryScore.hasEarlyReoperation ? 1 : 0;

      Object.keys(doctor.points).forEach((pointKey) => {
        doctor.points[pointKey] += entryScore.points[pointKey] || 0;
      });
    });

  return [...groups.values()]
    .map((doctor) => {
      const score = doctor.requests ? Math.round(doctor.scoreSum / doctor.requests) : 0;
      const details = [
        `Base: +${doctor.points.base}`,
        `Criterios preenchidos: +${doctor.points.bonusTuss + doctor.points.bonusOpme + doctor.points.bonusDoctor + doctor.points.bonusPatient}`,
        `Pendencias: -${doctor.points.penaltyMissingTuss + doctor.points.penaltyOpme + doctor.points.penaltyDoctor + doctor.points.penaltyPatient}`,
        `Complicacoes (codigos negativos): -${doctor.points.penaltyComplications}`,
        `Reabordagem precoce: -${doctor.points.penaltyEarlyReoperation}`
      ];

      return {
        ...doctor,
        score,
        scoreDetails: details.join(" | ")
      };
    })
    .sort((a, b) => b.score - a.score || b.requests - a.requests);
}

function renderDoctorRanking() {
  if (!doctorRankingTableBody) {
    return;
  }

  const ranking = rankDoctors();
  doctorRankingTableBody.innerHTML = "";

  const source = ranking.length ? ranking : SAMPLE_DOCTOR_RANKING;
  source.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(item.doctorName)}</td>
      <td>${escapeHtml(item.crm)}</td>
      <td>${item.requests || 0}</td>
      <td><strong>${item.score}</strong></td>
      <td>${escapeHtml(item.scoreDetails)}</td>
    `;
    doctorRankingTableBody.appendChild(row);
  });
}

function renderOutcomeRequestOptions() {
  if (!outcomeRequestSelect) {
    return;
  }

  const current = outcomeRequestSelect.value;
  outcomeRequestSelect.innerHTML = "<option value=''>Selecione um pedido registrado</option>";

  requestHistory.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = `${entry.id} - ${entry.doctor.name} / ${entry.patient.name} (${entry.surgeryDate})`;
    outcomeRequestSelect.appendChild(option);
  });

  if (current && requestHistory.some((entry) => entry.id === current)) {
    outcomeRequestSelect.value = current;
  }
}

function filteredLesions() {
  const query = searchInput.value.trim().toLowerCase();
  const region = regionFilter.value;

  return lesions.filter((lesion) => {
    const byRegion = !region || lesion.regiao === region;
    const byQuery =
      !query ||
      `${lesion.nome} ${lesion.sinais_alerta} ${lesion.exame_sugerido} ${lesion.tecnica_possivel}`
        .toLowerCase()
        .includes(query);
    return byRegion && byQuery;
  });
}

function renderCards() {
  if (!resultCount || !lesionGrid) {
    return;
  }

  const data = filteredLesions();
  resultCount.textContent = `${data.length} resultado(s)`;
  lesionGrid.innerHTML = "";

  data.forEach((lesion) => {
    const card = document.createElement("article");
    card.className = `lesion-card${activeLesionId === lesion.id ? " active" : ""}`;
    card.dataset.id = lesion.id;
    card.innerHTML = `
      <span class="tag">${escapeHtml(lesion.regiao)}</span>
      <h3>${escapeHtml(lesion.nome)}</h3>
      <p><strong>Sinais de alerta:</strong> ${escapeHtml(lesion.sinais_alerta)}</p>
      <p><strong>Exame sugerido:</strong> ${escapeHtml(lesion.exame_sugerido)}</p>
      <p><strong>Tecnica possivel:</strong> ${escapeHtml(lesion.tecnica_possivel)}</p>
    `;

    card.addEventListener("click", () => {
      activeLesionId = lesion.id;
      renderCards();
      renderMaterials();
    });

    lesionGrid.appendChild(card);
  });

  if (!data.length) {
    lesionGrid.innerHTML = "<p>Nenhuma lesao encontrada com os filtros atuais.</p>";
    activeLesionId = null;
  }
}

function renderMaterials() {
  if (!materialsTableBody) {
    return;
  }

  const visibleLesions = filteredLesions();
  const source = activeLesionId
    ? visibleLesions.filter((lesion) => lesion.id === activeLesionId)
    : visibleLesions;

  materialsTableBody.innerHTML = "";

  source.forEach((lesion) => {
    lesion.materiais.forEach((mat) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(lesion.nome)}</td>
        <td>${escapeHtml(mat.item)}</td>
        <td>${escapeHtml(mat.codigo)}</td>
        <td>${escapeHtml(mat.tipo)}</td>
      `;
      materialsTableBody.appendChild(row);
    });
  });

  if (!source.length) {
    materialsTableBody.innerHTML = "<tr><td colspan='4'>Sem materiais para o filtro atual.</td></tr>";
  }
}

function renderAdminTable() {
  adminLesionsTableBody.innerHTML = "";

  lesions.forEach((lesion) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(lesion.nome)}</td>
      <td>${escapeHtml(lesion.regiao)}</td>
      <td>
        <div class="admin-row-actions">
          <button class="admin-btn secondary" type="button" data-action="edit" data-id="${escapeHtml(
            lesion.id
          )}">Editar</button>
          <button class="admin-btn secondary" type="button" data-action="delete" data-id="${escapeHtml(
            lesion.id
          )}">Excluir</button>
        </div>
      </td>
    `;
    adminLesionsTableBody.appendChild(row);
  });

  if (!lesions.length) {
    adminLesionsTableBody.innerHTML = "<tr><td colspan='3'>Sem lesoes cadastradas.</td></tr>";
  }
}

function bindFilters() {
  if (!searchInput || !regionFilter) {
    return;
  }

  searchInput.addEventListener("input", () => {
    activeLesionId = null;
    renderCards();
    renderMaterials();
  });

  regionFilter.addEventListener("change", () => {
    activeLesionId = null;
    renderCards();
    renderMaterials();
  });
}

function toSlug(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function parseMateriais(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [item, codigo, tipo] = line.split("|").map((chunk) => chunk.trim());
      return {
        item: item || "Material não informado",
        codigo: codigo || "SEM-CODIGO",
        tipo: tipo || "Não definido"
      };
    });
}

function materiaisToText(materiais) {
  return materiais.map((mat) => `${mat.item} | ${mat.codigo} | ${mat.tipo}`).join("\n");
}

function resetLesionForm() {
  editingIdInput.value = "";
  lesionForm.reset();
  lesionFormFeedback.textContent = "Pronto para novo cadastro.";
  lesionFormFeedback.classList.remove("error");
}

function persistLesions() {
  localStorage.setItem(STORAGE_KEY_LESIONS, JSON.stringify(lesions));
}

function upsertLesion(payload) {
  const idx = lesions.findIndex((lesion) => lesion.id === payload.id);
  if (idx >= 0) {
    lesions[idx] = payload;
    return;
  }
  lesions.unshift(payload);
}

function fillFormForEdit(lesion) {
  editingIdInput.value = lesion.id;
  nomeInput.value = lesion.nome;
  regiaoInput.value = lesion.regiao;
  sinaisInput.value = lesion.sinais_alerta;
  exameInput.value = lesion.exame_sugerido;
  tecnicaInput.value = lesion.tecnica_possivel;
  observacoesInput.value = lesion.observacoes || "";
  materiaisInput.value = materiaisToText(lesion.materiais || []);
  lesionFormFeedback.textContent = `Editando: ${lesion.nome}`;
  lesionFormFeedback.classList.remove("error");
}

function refreshAllViews() {
  renderCards();
  renderMaterials();
  renderAdminTable();
}

function bindAdmin() {
  adminToggleBtn.addEventListener("click", () => {
    adminSection.classList.toggle("hidden");
    if (!adminSection.classList.contains("hidden")) {
      adminSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  newLesionBtn.addEventListener("click", () => {
    resetLesionForm();
  });

  lesionForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const nome = nomeInput.value.trim();
    const regiao = regiaoInput.value;
    const sinais = sinaisInput.value.trim();
    const exame = exameInput.value.trim();
    const tecnica = tecnicaInput.value.trim();
    const observacoes = observacoesInput.value.trim();
    const materiais = parseMateriais(materiaisInput.value);

    if (!materiais.length) {
      lesionFormFeedback.textContent = "Informe ao menos 1 material valido.";
      lesionFormFeedback.classList.add("error");
      return;
    }

    const currentId = editingIdInput.value || toSlug(nome);
    const payload = {
      id: currentId,
      nome,
      regiao,
      sinais_alerta: sinais,
      exame_sugerido: exame,
      tecnica_possivel: tecnica,
      observacoes,
      materiais
    };

    upsertLesion(payload);
    persistLesions();
    lesionFormFeedback.textContent = "Lesao salva com sucesso.";
    lesionFormFeedback.classList.remove("error");
    refreshAllViews();
    fillFormForEdit(payload);
  });

  adminLesionsTableBody.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) {
      return;
    }

    const id = btn.dataset.id;
    const action = btn.dataset.action;
    const lesion = lesions.find((item) => item.id === id);
    if (!lesion) {
      return;
    }

    if (action === "edit") {
      fillFormForEdit(lesion);
      return;
    }

    if (action === "delete") {
      const confirmed = window.confirm(`Excluir ${lesion.nome}?`);
      if (!confirmed) {
        return;
      }

      lesions = lesions.filter((item) => item.id !== id);
      if (activeLesionId === id) {
        activeLesionId = null;
      }

      persistLesions();
      resetLesionForm();
      refreshAllViews();
    }
  });
}

function bindLanding() {
  enterPlatformBtn?.addEventListener("click", () => {
    setAccessProgress(3);
    if (isAuthenticated) {
      appArea?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    loginGate?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  journeyAnchorBtn?.addEventListener("click", () => setAccessProgress(2));
  topAuthBtn?.addEventListener("click", (event) => {
    if (isAuthenticated) {
      event.preventDefault();
      isAuthenticated = false;
      sessionStorage.removeItem(SESSION_KEY_AUTH);
      setAccessProgress(1);
      applyAuthState();
      publicArea?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setAccessProgress(3);
  });
  finalLoginCta?.addEventListener("click", () => setAccessProgress(3));
  quickAccessLoginBtn?.addEventListener("click", () => setAccessProgress(3));
}

function setAccessProgress(step) {
  if (!accessProgressText || !accessProgressSteps.length) {
    return;
  }

  const normalizedStep = Math.max(1, Math.min(3, Number(step) || 1));
  accessProgressText.textContent = `Progresso de acesso: ${normalizedStep}/3`;

  const progressPercent = ((normalizedStep - 1) / 2) * 100;
  if (accessProgressFill) {
    accessProgressFill.style.width = `${progressPercent}%`;
  }
  if (accessProgressBar) {
    accessProgressBar.setAttribute("aria-valuenow", String(normalizedStep));
  }

  accessProgressSteps.forEach((item) => {
    const itemStep = Number(item.dataset.step || "1");
    item.classList.toggle("active", itemStep === normalizedStep);
    item.classList.toggle("done", itemStep < normalizedStep);
  });

  try {
    localStorage.setItem(STORAGE_KEY_ACCESS_PROGRESS, String(normalizedStep));
  } catch {
    // Ignora indisponibilidade de armazenamento local.
  }
}

function bindAccessProgress() {
  if (!accessProgressText || !accessProgressSteps.length) {
    return;
  }

  let startStep = 1;
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY_ACCESS_PROGRESS) || "1");
    if (!Number.isNaN(saved)) {
      startStep = saved;
    }
  } catch {
    startStep = 1;
  }

  if (window.location.hash === "#loginGate") {
    startStep = 3;
  } else if (window.location.hash === "#landingJourney") {
    startStep = Math.max(startStep, 2);
  }

  setAccessProgress(startStep);
}

function bindFocusMode() {
  if (!focusModeToggle) {
    return;
  }

  try {
    focusModeToggle.checked = localStorage.getItem(STORAGE_KEY_FOCUS_MODE) === "1";
  } catch {
    focusModeToggle.checked = false;
  }

  focusModeToggle.addEventListener("change", () => {
    try {
      localStorage.setItem(STORAGE_KEY_FOCUS_MODE, focusModeToggle.checked ? "1" : "0");
    } catch {
      // Ignora falhas de persistencia local sem interromper a interface.
    }
  });
}

function setDecisionMode(mode) {
  if (!questionnairePanel || !uploadPanel || !modeQuestionnaireBtn || !modeUploadBtn) {
    return;
  }

  const questionnaire = mode === "questionnaire";
  questionnairePanel.classList.toggle("hidden", !questionnaire);
  uploadPanel.classList.toggle("hidden", questionnaire);

  modeQuestionnaireBtn.classList.toggle("secondary", !questionnaire);
  modeUploadBtn.classList.toggle("secondary", questionnaire);
}

function calculateUrgency(flags) {
  const reasons = [];
  let track = "4 - Sem indicacao atual";
  let operationalSignal = "amarelo";
  let operationalLabel = "Auditar";

  if (flags.neuro || flags.compression) {
    reasons.push("Risco neurologico com necessidade de priorizacao imediata.");
    track = "1 - Urgencia absoluta";
    operationalSignal = "verde";
    operationalLabel = "Autorizar rapido";
    return { level: "vermelho", css: "status-red", reasons, track, operationalSignal, operationalLabel };
  }

  if (flags.intensePain && flags.conservativeFailure && flags.imageProof) {
    reasons.push("Dor intensa refrataria e falha terapeutica conservadora documentada.");
    track = "2 - Indicacao provavel";
    operationalSignal = "verde";
    operationalLabel = "Autorizar";
    return { level: "amarelo", css: "status-yellow", reasons, track, operationalSignal, operationalLabel };
  }

  if (flags.intensePain || flags.conservativeFailure || flags.needPrecision || flags.complexAnatomy) {
    reasons.push("Indicacao com incerteza parcial, requer auditoria tecnica estruturada.");
    if (!flags.imageProof) {
      reasons.push("Imagem compativel ausente no dossie minimo nacional.");
    }
    track = "3 - Indicacao duvidosa";
    operationalSignal = "vermelho";
    operationalLabel = "Segunda opiniao / painel";
    return { level: "amarelo", css: "status-yellow", reasons, track, operationalSignal, operationalLabel };
  }

  reasons.push("Sem sinais de emergencia neurologica no checklist atual.");
  reasons.push("Priorizar linha conservadora com reavaliacao entre 6 e 12 semanas.");
  if (!flags.imageProof) {
    reasons.push("Necessario anexar imagem para robustez tecnica da solicitacao.");
  }
  return { level: "verde", css: "status-green", reasons, track, operationalSignal, operationalLabel };
}

function buildTechnologyRecommendations(flags, techGoal) {
  const recommendations = [];

  if (flags.complexAnatomy || flags.needPrecision) {
    recommendations.push(
      "Cirurgia robotica/navegacao para maior precisao de trajetoria e potencial reducao de fluoroscopia."
    );
  }

  if (flags.needPrecision || techGoal === "planejamento") {
    recommendations.push(
      "Planejamento 3D com apoio de IA para classificacao e estrategia pre-operatoria baseada em dados."
    );
  }

  if (flags.conventionalLimit || techGoal === "tempo") {
    recommendations.push(
      "Impressao 3D para modelos/guia com foco em menor tempo de sala e menor trauma cirurgico."
    );
  }

  if (techGoal === "formacao") {
    recommendations.push(
      "Realidade aumentada/virtual para simulacao de casos complexos e treinamento da equipe."
    );
  }

  if (!recommendations.length) {
    recommendations.push(
      "Selecionar tecnologia adjuvante conforme objetivo clinico e disponibilidade institucional."
    );
  }

  return recommendations;
}

function buildTussItems(protocol, levels) {
  return protocol.tuss.map((item) => {
    const multiplier = item.multiplicarPorNivel && levels > 1 ? ` x${levels}` : "";
    return {
      code: item.codigo,
      title: item.descricao,
      application: `${item.aplicacao}${multiplier ? ` (niveis: ${levels})` : ""}`
    };
  });
}

function getOpmeForProtocol(protocol, levels) {
  if (protocol.opmeByLevel[levels]) {
    return protocol.opmeByLevel[levels];
  }
  return protocol.opmeByLevel[1] || [];
}

function buildSurgeryRequestTemplate(payload) {
  const tushList = payload.tuss
    .map(
      (item) =>
        `- ${item.code} - ${item.title} - Aplicacao: ${item.application}`
    )
    .join("\n");

  const opmeList = payload.opme.map((item) => `- ${item}`).join("\n");

  return `SOLICITACAO DE CIRURGIA\nMEDICO SOLICITANTE: ${payload.doctorName} | CRM ${payload.doctorCrm}/${payload.doctorUf}\nPACIENTE: ${payload.patientName} | DOCUMENTO: ${payload.patientDocument}\nDATA DA CIRURGIA: ${payload.surgeryDate}\nIDENTIFICACAO E CONTEXTO CLINICO: ${payload.patientContext}\nPATOLOGIA E JUSTIFICATIVA TECNICA: ${payload.justification}\nCID-10:\n- ${payload.cid}\nPROCEDIMENTO CIRURGICO PROPOSTO:\n- ${payload.procedure}\nCODIGOS TUSS (4 itens cirurgicos, sem condicionalidade):\n${tushList}\nOPME / MATERIAIS CIRURGICOS:\n${opmeList}\n- Empresas: ${ALLOWED_COMPANIES.join(", ")}.\nANEXOS (obrigatorio):\nOS EXAMES COMPROBATORIOS DO CASO ESTAO EM ANEXO.`;
}

function renderQuestionnaireResult(result) {
  latestRequestTemplate = result.template;
  latestRequestFileName = `solicitacao-${toFileSafe(result.protocol.label)}-${result.cid || "cid"}.txt`;
  const reasonsHtml = result.urgency.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("");
  const tussHtml = result.tuss
    .map((item) => `<li><strong>${escapeHtml(item.code)}</strong> - ${escapeHtml(item.title)}</li>`)
    .join("");
  const opmeHtml = result.opme.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const techHtml = result.technologyRecommendations
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const operationalCss =
    result.urgency.operationalSignal === "verde"
      ? "status-green"
      : result.urgency.operationalSignal === "amarelo"
        ? "status-yellow"
        : "status-red";

  decisionResult.innerHTML = `
    <span class="status-pill ${result.urgency.css}">Urgencia ${escapeHtml(result.urgency.level)}</span>
    <span class="status-pill ${operationalCss}">Saida operacional ${escapeHtml(result.urgency.operationalSignal)}</span>
    <h3>${escapeHtml(result.protocol.label)}</h3>
    <p><strong>Esteira de entrada:</strong> ${escapeHtml(result.urgency.track)}</p>
    <p><strong>Acao recomendada:</strong> ${escapeHtml(result.urgency.operationalLabel)}</p>
    <p><strong>CID-10:</strong> ${escapeHtml(result.cid)}</p>
    <p><strong>Niveis abordados:</strong> ${escapeHtml(String(result.levels))}</p>
    <ul>${reasonsHtml}</ul>
    <p><strong>TUSS sugeridos (4):</strong></p>
    <ul>${tussHtml}</ul>
    <p><strong>OPME sugeridos:</strong></p>
    <ul>${opmeHtml}</ul>
    <p><strong>Tecnologia recomendada (aula):</strong></p>
    <ul>${techHtml}</ul>
    <div class="result-actions">
      <button id="copyRequestBtn" class="admin-btn secondary" type="button">Copiar solicitação</button>
      <button id="downloadRequestBtn" class="admin-btn secondary" type="button">Baixar .txt</button>
    </div>
    <p><strong>Pedido padronizado:</strong></p>
    <pre>${escapeHtml(result.template)}</pre>
  `;
}

function validateQuestionnaireInputs() {
  if (!surgeryTypeSelect.value) {
    decisionResult.innerHTML = "<p>Selecione o tipo de cirurgia para gerar o fluxo.</p>";
    return null;
  }

  const contextCheck = validateRequestContext();
  if (!contextCheck.ok) {
    decisionResult.innerHTML = `<p>${escapeHtml(contextCheck.message)}</p>`;
    return null;
  }
  const requestContext = contextCheck.context;

  const protocol = SURGERY_PROTOCOLS[surgeryTypeSelect.value];
  const levels = protocol === SURGERY_PROTOCOLS.endoscopica ? 1 : Number(levelsSelect.value || "1");
  const cid = (cidInput.value || protocol.defaultCid).trim();
  const diagnosis = (mainDiagnosisInput.value || protocol.label).trim();
  const limitations =
    (functionalLimitationsInput.value ||
      "Limitacao funcional dolorosa com prejuizo de atividades de vida diaria e capacidade laboral.").trim();

  const flags = {
    neuro: redFlagNeuroInput.checked,
    compression: redFlagCompressionInput.checked,
    intensePain: yellowPainInput.checked,
    conservativeFailure: yellowFailureInput.checked,
    imageProof: imageProofInput.checked,
    highMorbidity: classHighMorbidityInput?.checked || false,
    complexAnatomy: classComplexAnatomyInput?.checked || false,
    needPrecision: classNeedPrecisionInput?.checked || false,
    conventionalLimit: classConventionalLimitInput?.checked || false
  };
  const techGoal = techGoalSelect?.value || "";

  const urgency = calculateUrgency(flags);
  const tuss = buildTussItems(protocol, levels);
  const opme = getOpmeForProtocol(protocol, levels);
  const technologyRecommendations = buildTechnologyRecommendations(flags, techGoal);

  const complexityPillars = [];
  if (flags.highMorbidity) complexityPillars.push("alta morbimortalidade");
  if (flags.complexAnatomy) complexityPillars.push("anatomia 3D complexa");
  if (flags.needPrecision) complexityPillars.push("demanda de precisao");
  if (flags.conventionalLimit) complexityPillars.push("limitacao convencional");

  const patientContext = `${diagnosis}; ${levels} nivel(is) planejado(s); limitacoes funcionais objetivas: ${limitations}`;
  const justification = `${diagnosis}. ${limitations}. ${
    flags.conservativeFailure
      ? "Evolucao com falha de tratamento conservador documentada."
      : "Evolucao clinica com indicacao cirurgica em discussao especializada."
  } ${flags.imageProof ? "Comprovacao por imagem disponivel." : "Necessaria confirmacao complementar por imagem para robustez documental."} ${
    complexityPillars.length ? `Complexidade destacada: ${complexityPillars.join(", ")}.` : ""
  }`;

  const template = buildSurgeryRequestTemplate({
    doctorName: requestContext.doctor.name,
    doctorCrm: requestContext.doctor.crm,
    doctorUf: requestContext.doctor.uf,
    patientName: requestContext.patient.name,
    patientDocument: requestContext.patient.document,
    surgeryDate: requestContext.surgeryDate,
    cid,
    procedure: protocol.procedure,
    patientContext,
    justification,
    tuss,
    opme
  });

  return {
    protocol,
    levels,
    cid,
    urgency,
    tuss,
    opme,
    technologyRecommendations,
    template,
    requestContext
  };
}

function extractPossibleCid(text) {
  const matches = text.match(/\b[A-TV-Z][0-9][0-9AB](?:\.[0-9A-Z]{1,2})?\b/gi) || [];
  return [...new Set(matches.map((item) => item.toUpperCase()))];
}

function extractTussCodes(text) {
  const found = text.match(/\b\d{8}\b/g) || [];
  return [...new Set(found)].filter((code) => ALL_VALID_TUSS.has(code));
}

function detectProtocolByText(text) {
  const source = normalized(text);

  if (source.includes("endoscop") || source.includes("30715059") || source.includes("spine cut")) {
    return SURGERY_PROTOCOLS.endoscopica;
  }
  if (source.includes("cervical") || source.includes("30715393") || source.includes("placa cervical")) {
    return SURGERY_PROTOCOLS.cervical;
  }
  if (source.includes("lombar") || source.includes("30715180") || source.includes("haste vertical")) {
    return SURGERY_PROTOCOLS.lombar;
  }
  return null;
}

function evaluatePedido(text) {
  const content = text || "";
  const normalizedContent = normalized(content);
  const protocol = detectProtocolByText(content);

  const cidFound = extractPossibleCid(content);
  const tussFound = extractTussCodes(content);
  const hasProcedureBlock = normalizedContent.includes("procedimento cirurgico proposto");
  const hasLevels =
    /\bniveis?\b|\bnivel\b|\bc[0-7]-c[0-7]\b|\bl[1-5]-s1\b|\bl[1-5]-l[1-5]\b|\bt[1-9][0-9]?-[tl][0-9]+\b/i.test(
      content
    );
  const hasImage =
    normalizedContent.includes("ressonancia") ||
    normalizedContent.includes("tomografia") ||
    normalizedContent.includes("tc") ||
    normalizedContent.includes("imagem") ||
    normalizedContent.includes("anexo");
  const hasFunctionalScale =
    /\beva\b|\bodi\b|\bndi\b|\bmjoa\b|\beq-5d\b|\bpromis\b/i.test(content);
  const hasPreviousTreatment =
    normalizedContent.includes("tratamento conservador") ||
    normalizedContent.includes("fisioterapia") ||
    normalizedContent.includes("reabilit") ||
    normalizedContent.includes("infiltr") ||
    normalizedContent.includes("bloqueio") ||
    normalizedContent.includes("falha");
  const hasAnexoPhrase = normalizedContent.includes("os exames comprobatorios do caso estao em anexo");
  const hasCompanies = ALLOWED_COMPANIES.some((company) => normalizedContent.includes(normalized(company)));
  const hasOpme = protocol
    ? protocol.opmeKeywords.some((keyword) => normalizedContent.includes(normalized(keyword)))
    : normalizedContent.includes("opme") || normalizedContent.includes("material");

  const hasCidAndProcedure = cidFound.length > 0 && hasProcedureBlock;
  const hasItemizedOpme = hasOpme && (normalizedContent.includes("opme") || normalizedContent.includes("parafuso"));

  const checks = [
    {
      ok: hasCidAndProcedure,
      label: "CID + procedimento"
    },
    {
      ok: hasLevels,
      label: "Niveis solicitados"
    },
    {
      ok: hasImage,
      label: "Imagem anexada"
    },
    {
      ok: hasFunctionalScale,
      label: "Escala funcional"
    },
    {
      ok: hasPreviousTreatment,
      label: "Tratamento previo"
    },
    {
      ok: hasItemizedOpme,
      label: "OPME por item"
    }
  ];

  const okCount = checks.filter((item) => item.ok).length;
  const approved = checks.every((item) => item.ok) && tussFound.length >= 4 && hasCompanies && hasAnexoPhrase;

  let operationalSignal = "vermelho";
  let operationalLabel = "Segunda opiniao / painel";

  if (approved) {
    operationalSignal = "verde";
    operationalLabel = "Autoriza";
  } else if (okCount >= 4) {
    operationalSignal = "amarelo";
    operationalLabel = "Audita";
  }

  return {
    approved,
    protocolLabel: protocol?.label || "Não identificado automaticamente",
    cidFound,
    tussFound,
    checks,
    operationalSignal,
    operationalLabel,
    hasCompanies,
    hasAnexoPhrase
  };
}

function buildAlternativePedido(report) {
  const missingItems = report.checks.filter((item) => !item.ok).map((item) => item.label);
  const missingTuss = report.tussFound.length >= 4 ? "" : "Incluir 4 codigos TUSS cirurgicos compativeis com o caso.";
  const missingCompany = report.hasCompanies ? "" : "Inserir empresa permitida (Stryker, Smith Nephew, Johnson, Zimmer, Medtronic, Satrattner, Handle).";
  const missingAnexo = report.hasAnexoPhrase ? "" : "Adicionar frase final obrigatoria de anexos comprobatórios.";

  const adjustments = [...missingItems, missingTuss, missingCompany, missingAnexo].filter(Boolean);

  return [
    "VERSAO ALTERNATIVA SUGERIDA PARA AUDITORIA",
    "",
    "Ajustes recomendados:",
    ...adjustments.map((item) => `- ${item}`),
    "",
    "Estrutura minima sugerida:",
    "- CID-10 principal + procedimento cirurgico proposto.",
    "- Niveis cirurgicos explicitados.",
    "- Justificativa clinica com falha de tratamento prévio e escala funcional.",
    "- Lista de OPME por item, com codigos e objetivo tecnico.",
    "- Bloco final: OS EXAMES COMPROBATORIOS DO CASO ESTAO EM ANEXO."
  ].join("\n");
}

function renderUploadResult(report) {
  const statusClass =
    report.operationalSignal === "verde"
      ? "status-green"
      : report.operationalSignal === "amarelo"
        ? "status-yellow"
        : "status-red";
  const statusText = report.operationalLabel;
  const checklist = report.checks
    .map((item) => `<li>${item.ok ? "[OK]" : "[FALTA]"} ${escapeHtml(item.label)}</li>`)
    .join("");

  uploadResult.innerHTML = `
    <span class="status-pill ${statusClass}">${statusText}</span>
    <h3>Avaliacao do pedido</h3>
    <p><strong>Cirurgia detectada:</strong> ${escapeHtml(report.protocolLabel)}</p>
    <p><strong>CID-10 encontrado:</strong> ${escapeHtml(report.cidFound.join(", ") || "Nenhum")}</p>
    <p><strong>TUSS encontrados:</strong> ${escapeHtml(report.tussFound.join(", ") || "Nenhum")}</p>
    <p><strong>Empresa permitida:</strong> ${report.hasCompanies ? "OK" : "FALTA"}</p>
    <p><strong>Frase final de anexos:</strong> ${report.hasAnexoPhrase ? "OK" : "FALTA"}</p>
    <ul>${checklist}</ul>
    <p><strong>Regra da aula:</strong> verde autoriza, amarelo audita, vermelho segunda opiniao/painel.</p>
  `;

  if (!report.approved) {
    const alternative = buildAlternativePedido(report);
    const altBlock = document.createElement("div");
    altBlock.className = "result-actions";
    altBlock.innerHTML = `
      <p><strong>Versão alternativa sugerida:</strong></p>
      <pre>${escapeHtml(alternative)}</pre>
    `;
    uploadResult.appendChild(altBlock);
  }
}

function setInternalTab(tabId) {
  internalTabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  internalTabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `internalTab-${tabId}`);
  });
}

function bindInternalTabs() {
  if (!internalTabButtons.length || !internalTabPanels.length) {
    return;
  }

  internalTabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      setInternalTab(btn.dataset.tab || "build");
    });
  });

  setInternalTab("build");
}

function parseDoctorProfileFromCfmText(text, crm, uf) {
  const source = String(text || "");
  const crmUfRegex = new RegExp(`${crm}\\s*\\/?\\s*${uf}`, "i");
  const nameMatch =
    source.match(/Nome(?: do medico| do m[eé]dico)?\s*[:\-]\s*([^\n\r|]{6,120})/i) ||
    source.match(/M[eé]dico\s*[:\-]\s*([^\n\r|]{6,120})/i) ||
    source.match(new RegExp(`([A-ZÀ-Ú][A-Za-zÀ-ÿ'\\s.-]{6,120})\\s+CRM\\s*[:\\-]?\\s*${crm}`, "i"));
  const specialtyMatch = source.match(/Especialidade(?: Registrada)?\s*[:\-]\s*([^\n\r|]{3,120})/i);
  const statusMatch = source.match(/Situa[cç][aã]o(?: da Inscri[cç][aã]o)?\s*[:\-]\s*([^\n\r|]{3,80})/i);

  const clean = (value) =>
    String(value || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  const isLikelyDoctorName = (value) => /[A-Za-zÀ-ÿ]{3,}/.test(value) && !/[<>]/.test(value);
  const parsedName = clean(nameMatch?.[1] || "");
  if (!crmUfRegex.test(source) && !isLikelyDoctorName(parsedName)) {
    return null;
  }

  return {
    name: isLikelyDoctorName(parsedName) ? parsedName : "",
    specialty: clean(specialtyMatch?.[1] || "Não informado"),
    status: clean(statusMatch?.[1] || "Ativo")
  };
}

async function fetchDoctorProfileFromCfm(crm, uf) {
  const directUrl = buildCfmLookupUrl(crm, uf);
  const proxyUrl = `${CFM_PROXY_BASE_URL}?crm=${encodeURIComponent(crm)}&uf=${encodeURIComponent(uf)}`;
  const attempts = [
    { url: directUrl, source: "cfm-direto" },
    { url: proxyUrl, source: "cfm-proxy" }
  ];

  const fetchTextWithTimeout = async (url) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      if (!response.ok) {
        return null;
      }

      return await response.text();
    } finally {
      clearTimeout(timeoutId);
    }
  };

  for (const attempt of attempts) {
    try {
      const text = await fetchTextWithTimeout(attempt.url);
      if (!text) {
        continue;
      }

      const profile = parseDoctorProfileFromCfmText(text, crm, uf);
      if (profile) {
        return { ...profile, source: attempt.source };
      }
    } catch {
      // Ignora tentativa e segue para a proxima rota.
    }
  }

  return null;
}


function findDoctorProfileFromHistory(crm, uf) {
  let sourceHistory = requestHistory;
  if (!Array.isArray(sourceHistory) || !sourceHistory.length) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_REQUEST_HISTORY);
      const parsed = raw ? JSON.parse(raw) : [];
      sourceHistory = Array.isArray(parsed) ? parsed : [];
    } catch {
      sourceHistory = [];
    }
  }

  const matches = sourceHistory.filter(
    (entry) => onlyDigits(entry.doctor?.crm || "") === crm && (entry.doctor?.uf || "").trim().toUpperCase() === uf
  );
  if (!matches.length) {
    return null;
  }

  const firstNonEmpty = (values, fallback) => values.find((value) => String(value || "").trim()) || fallback;
  const names = matches.map((entry) => (entry.doctor?.name || "").trim());
  const specialties = matches.map((entry) => (entry.doctor?.specialty || "").trim());
  const statuses = matches.map((entry) => (entry.doctor?.status || "").trim());

  return {
    name: firstNonEmpty(names, `CRM ${crm}/${uf}`),
    specialty: firstNonEmpty(specialties, "Não informado"),
    status: firstNonEmpty(statuses, "Ativo"),
    source: "historico-local"
  };
}
function bindDoctorRegistry() {
  const updateFeedback = (message, isError = false) => {
    if (!cfmLookupFeedback) {
      return;
    }
    cfmLookupFeedback.textContent = message;
    cfmLookupFeedback.classList.toggle("error", isError);
  };

  const applyDoctorProfile = (profile) => {
    if (profile.name && doctorNameInput) {
      doctorNameInput.value = profile.name;
    }
    if (doctorSpecialtyInput) {
      doctorSpecialtyInput.value = profile.specialty || "Não informado";
    }
    if (doctorStatusInput) {
      doctorStatusInput.value = profile.status || "Não informado";
    }
  };

  checkCfmBtn?.addEventListener("click", async () => {
    const crm = onlyDigits(doctorCrmInput?.value || "");
    const uf = (doctorUfSelect?.value || "").trim().toUpperCase();
    if (!crm || !uf) {
      updateFeedback("Informe CRM e UF para consultar o CFM.", true);
      return;
    }

    updateFeedback("Consultando CFM por CRM e UF...");
    const profileFromCfm = await fetchDoctorProfileFromCfm(crm, uf);
    const profile = profileFromCfm || findDoctorProfileFromHistory(crm, uf);
    if (!profile) {
      latestDoctorLookup = {
        checked: true,
        verified: false,
        source: "cfm-indisponivel-com-fallback",
        checkedAt: new Date().toISOString(),
        message: "CFM indisponivel no momento. Dados basicos foram preenchidos para continuidade do fluxo."
      };
      if (doctorNameInput && !doctorNameInput.value.trim()) {
        doctorNameInput.value = `CRM ${crm}/${uf}`;
      }
      if (doctorSpecialtyInput) {
        doctorSpecialtyInput.value = "Não informado";
      }
      if (doctorStatusInput) {
        doctorStatusInput.value = "Verificacao pendente";
      }
      updateFeedback(latestDoctorLookup.message, false);
      return;
    }

    applyDoctorProfile(profile);
    latestDoctorLookup = {
      checked: true,
      verified: true,
      source: profile.source,
      checkedAt: new Date().toISOString(),
      message:
        profile.source === "historico-local"
          ? "Dados preenchidos pelo historico local de pedidos/documentos."
          : "Dados do médico preenchidos automaticamente a partir da busca no CFM."
    };
    updateFeedback(latestDoctorLookup.message, false);
  });

  doctorCrmInput?.addEventListener("input", () => {
    latestDoctorLookup = { checked: false, verified: false, source: "nao-consultado", message: "" };
  });

  doctorUfSelect?.addEventListener("change", () => {
    latestDoctorLookup = { checked: false, verified: false, source: "nao-consultado", message: "" };
  });
}

function extractDoctorFromUploadText(text) {
  const content = String(text || "");
  const crmMatch = content.match(/CRM\s*[:\-]?\s*(\d{4,8})\s*\/?\s*([A-Z]{2})?/i);
  const doctorLineMatch = content.match(/MEDICO\s+SOLICITANTE\s*:\s*([^\n\r|]+)/i);
  const specialtyMatch = content.match(/ESPECIALIDADE\s*:\s*([^\n\r]+)/i);

  return {
    crm: crmMatch?.[1] ? onlyDigits(crmMatch[1]) : "",
    uf: crmMatch?.[2] ? crmMatch[2].toUpperCase() : "",
    name: doctorLineMatch?.[1] ? doctorLineMatch[1].trim() : "",
    specialty: specialtyMatch?.[1] ? specialtyMatch[1].trim() : ""
  };
}

function hydrateDoctorFromUploadText(text) {
  const extracted = extractDoctorFromUploadText(text);
  if (!extracted.crm && !extracted.name) {
    return;
  }

  if (extracted.crm && doctorCrmInput) {
    doctorCrmInput.value = extracted.crm;
  }

  if (extracted.uf && doctorUfSelect) {
    doctorUfSelect.value = extracted.uf;
  }

  if (extracted.name && doctorNameInput) {
    doctorNameInput.value = extracted.name;
  }

  if (extracted.specialty && doctorSpecialtyInput) {
    doctorSpecialtyInput.value = extracted.specialty;
  }

  if (doctorStatusInput && !doctorStatusInput.value.trim()) {
    doctorStatusInput.value = "Ativo";
  }
}

function registerUploadRequest(report, text) {
  hydrateDoctorFromUploadText(text);

  const context = getRequestContext();
  if (!context.doctor.crm || !context.doctor.uf) {
    uploadResult.innerHTML =
      "<p>Não foi possível ranquear: informe CRM e UF do médico (ou inclua no texto do pedido).</p>";
    return false;
  }

  if (!context.doctor.name) {
    context.doctor.name = `CRM ${context.doctor.crm}/${context.doctor.uf}`;
    if (doctorNameInput) {
      doctorNameInput.value = context.doctor.name;
    }
  }

  if (!context.patient.name) {
    context.patient.name = "Paciente não informado";
  }

  if (!context.patient.document) {
    context.patient.document = `SEM-DOC-${Date.now()}`;
  }

  if (!context.surgeryDate) {
    context.surgeryDate = new Date().toISOString().slice(0, 10);
    if (surgeryDateInput) {
      surgeryDateInput.value = context.surgeryDate;
    }
  }

  const protocol = detectProtocolByText(text);
  const expectedTussCodes = protocol ? protocol.tuss.map((item) => item.codigo) : [...ALL_VALID_TUSS].slice(0, 4);

  const payload = {
    id: buildRequestId(),
    createdAt: new Date().toISOString(),
    documentSource: "auditado",
    doctor: context.doctor,
    patient: context.patient,
    surgeryDate: context.surgeryDate,
    protocolLabel: report.protocolLabel,
    tussCodes: report.tussFound,
    expectedTussCodes,
    opmeItems: report.checks.find((item) => item.label === "OPME por item")?.ok ? ["OPME informado"] : [],
    expectedOpmeCount: 1,
    outcomes: {
      negativeCodes: [],
      reoperationUnder90: false,
      reoperationDate: ""
    }
  };
  registerRequestEntry(payload);
  return true;
}

function registerQuestionnaireRequest(result) {
  const expectedTussCodes = result.protocol.tuss.map((item) => item.codigo);
  const payload = {
    id: buildRequestId(),
    createdAt: new Date().toISOString(),
    documentSource: "criado",
    doctor: result.requestContext.doctor,
    patient: result.requestContext.patient,
    surgeryDate: result.requestContext.surgeryDate,
    protocolLabel: result.protocol.label,
    tussCodes: result.tuss.map((item) => item.code),
    expectedTussCodes,
    opmeItems: result.opme,
    expectedOpmeCount: result.opme.length,
    outcomes: {
      negativeCodes: [],
      reoperationUnder90: false,
      reoperationDate: ""
    }
  };
  registerRequestEntry(payload);
}

function bindRankingWindow() {
  outcomeForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const requestId = outcomeRequestSelect?.value || "";
    const entry = requestHistory.find((item) => item.id === requestId);
    if (!entry) {
      outcomeFeedback.textContent = "Selecione um pedido válido para registrar o desfecho.";
      outcomeFeedback.classList.add("error");
      return;
    }

    const selectedCodes = [];
    if (negTuss30715270?.checked) selectedCodes.push("30715270");
    if (negTuss30715210?.checked) selectedCodes.push("30715210");
    if (negTuss30715199?.checked) selectedCodes.push("30715199");
    if (negTuss30715261?.checked) selectedCodes.push("30715261");
    if (negTuss31401260?.checked) selectedCodes.push("31401260");

    const reoperationDate = toIsoDate(reoperationDateInput?.value || "");
    const interval = reoperationDate ? daysBetween(entry.surgeryDate, reoperationDate) : null;
    const reoperationUnder90 = interval !== null && interval > 10;

    entry.outcomes = {
      negativeCodes: selectedCodes,
      reoperationDate,
      reoperationUnder90
    };

    persistRequestHistory();
    renderDoctorRanking();

    outcomeFeedback.textContent = reoperationUnder90
      ? "Desfecho salvo com alerta de reoperação em intervalo superior a 10 dias."
      : "Desfecho salvo no ranking médico.";
    outcomeFeedback.classList.remove("error");
  });
}

async function extractTextFromFile(file) {
  if (!file) {
    return "";
  }

  const lowerName = file.name.toLowerCase();
  const textLike = [".txt", ".md", ".csv", ".json"];
  if (textLike.some((ext) => lowerName.endsWith(ext))) {
    return file.text();
  }

  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const latin1 = new TextDecoder("latin1", { fatal: false }).decode(buffer);

  const utf8Score = (utf8.match(/[a-zA-Z0-9]/g) || []).length;
  const latin1Score = (latin1.match(/[a-zA-Z0-9]/g) || []).length;
  return utf8Score >= latin1Score ? utf8 : latin1;
}

function bindDecisionHub() {
  if (modeQuestionnaireBtn && modeUploadBtn && questionnairePanel && uploadPanel) {
    setDecisionMode("questionnaire");
    modeQuestionnaireBtn.addEventListener("click", () => setDecisionMode("questionnaire"));
    modeUploadBtn.addEventListener("click", () => setDecisionMode("upload"));
  }

  surgeryTypeSelect.addEventListener("change", () => {
    const isEndoscopic = surgeryTypeSelect.value === "endoscopica";
    levelsSelect.disabled = isEndoscopic;
    if (isEndoscopic) {
      levelsSelect.value = "1";
    }
  });

  generateDecisionBtn.addEventListener("click", () => {
    const result = validateQuestionnaireInputs();
    if (!result) {
      return;
    }
    registerQuestionnaireRequest(result);
    renderQuestionnaireResult(result);
  });

  pedidoFileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      uploadedPedidoText = "";
      return;
    }

    try {
      uploadedPedidoText = await extractTextFromFile(file);
      uploadResult.innerHTML = `<p>Arquivo carregado: <strong>${escapeHtml(file.name)}</strong>.</p>`;
    } catch (error) {
      uploadedPedidoText = "";
      uploadResult.innerHTML = `<p>Falha ao ler arquivo: ${escapeHtml(error.message)}</p>`;
    }
  });

  analyzePedidoBtn.addEventListener("click", () => {
    const combined = `${uploadedPedidoText}\n${pedidoTextInput.value || ""}`.trim();
    if (!combined) {
      uploadResult.innerHTML =
        "<p>Envie um arquivo ou cole o texto do pedido para executar a avaliacao de liberacao.</p>";
      return;
    }

    const report = evaluatePedido(combined);
    const registered = registerUploadRequest(report, combined);
    if (!registered) {
      return;
    }
    renderUploadResult(report);
  });

  decisionResult.addEventListener("click", async (event) => {
    const btn = event.target.closest("#copyRequestBtn");
    const downloadBtn = event.target.closest("#downloadRequestBtn");

    if (btn) {
      if (!latestRequestTemplate) {
        return;
      }

      try {
        await navigator.clipboard.writeText(latestRequestTemplate);
        btn.textContent = "Copiado";
        setTimeout(() => {
          btn.textContent = "Copiar solicitação";
        }, 1500);
      } catch {
        btn.textContent = "Falha ao copiar";
        setTimeout(() => {
          btn.textContent = "Copiar solicitação";
        }, 1500);
      }
      return;
    }

    if (downloadBtn) {
      if (!latestRequestTemplate) {
        return;
      }

      const blob = new Blob([latestRequestTemplate], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = latestRequestFileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      downloadBtn.textContent = "Arquivo baixado";
      setTimeout(() => {
        downloadBtn.textContent = "Baixar .txt";
      }, 1500);
    }
  });
}

async function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_LESIONS);
    if (stored) {
      lesions = JSON.parse(stored);
      refreshAllViews();
      return;
    }

    const response = await fetch("./data/lesoes.json");
    if (!response.ok) {
      throw new Error("Falha ao carregar base de lesoes.");
    }

    lesions = await response.json();
    refreshAllViews();
  } catch (error) {
    lesions = FALLBACK_LESIONS;
    refreshAllViews();

    if (location.protocol === "file:") {
      lesionGrid.innerHTML = `<p>Erro ao carregar dados: ${escapeHtml(
        error.message
      )} Em execucao local (file://), use um servidor simples para habilitar o carregamento JSON.</p>`;
      resultCount.textContent = "0 resultado(s)";
      materialsTableBody.innerHTML = "<tr><td colspan='4'>Dados indisponiveis.</td></tr>";
    }
  }
}

function init() {
  bindFocusMode();
  bindAccessProgress();
  bindInternalTabs();
  loadRequestHistory();
  renderOutcomeRequestOptions();
  renderDoctorRanking();
  bindLoginGate();
  bindLanding();
  bindFilters();
  bindAdmin();
  bindDoctorRegistry();
  bindDecisionHub();
  bindRankingWindow();
  loadData();
}

init();









