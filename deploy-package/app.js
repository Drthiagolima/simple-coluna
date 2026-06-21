const STORAGE_KEY_LESIONS = "simplecoluna.lesoes.v1";

const FALLBACK_LESIONS = [
  {
    id: "hernia-lombar",
    nome: "Hérnia de disco lombar com radiculopatia",
    regiao: "lombar",
    sinais_alerta: "Dor irradiada, déficit motor progressivo, falha de tratamento conservador",
    exame_sugerido: "Ressonância magnética da coluna lombar",
    tecnica_possivel: "Microdiscectomia (avaliar indicação clínica)",
    observacoes: "Correlacionar com distribuição dermatomérica e déficit neurológico.",
    materiais: [
      { item: "Retrator tubular", codigo: "OPME-LB-101", tipo: "Instrumental" },
      { item: "Pinça pituitária", codigo: "OPME-LB-104", tipo: "Instrumental" }
    ]
  },
  {
    id: "estenose-lombar",
    nome: "Estenose lombar degenerativa",
    regiao: "lombar",
    sinais_alerta: "Claudicação neurogênica, limitação funcional importante",
    exame_sugerido: "Ressonância magnética e radiografias dinâmicas",
    tecnica_possivel: "Descompressão com ou sem artrodese",
    observacoes: "Avaliar estabilidade segmentar pré-operatória.",
    materiais: [
      { item: "Sistema de parafuso pedicular", codigo: "OPME-LB-201", tipo: "Implante" },
      { item: "Haste de titânio", codigo: "OPME-LB-204", tipo: "Implante" }
    ]
  },
  {
    id: "mielopatia-cervical",
    nome: "Mielopatia cervical espondilótica",
    regiao: "cervical",
    sinais_alerta: "Alteração de marcha, hiperreflexia, perda de destreza",
    exame_sugerido: "Ressonância magnética cervical",
    tecnica_possivel: "Descompressão cervical anterior ou posterior",
    observacoes: "Sinais longos de trato piramidal aumentam urgência de avaliação.",
    materiais: [
      { item: "Placa cervical", codigo: "OPME-CV-305", tipo: "Implante" },
      { item: "Cage cervical", codigo: "OPME-CV-309", tipo: "Implante" }
    ]
  },
  {
    id: "fratura-toracolombar",
    nome: "Fratura toracolombar instável",
    regiao: "toracica",
    sinais_alerta: "Trauma de alta energia, dor intensa, suspeita de instabilidade",
    exame_sugerido: "Tomografia com reconstrução e ressonância quando indicada",
    tecnica_possivel: "Fixação posterior segmentar",
    observacoes: "Classificar padrão da fratura e risco neurológico.",
    materiais: [
      { item: "Parafuso pedicular canulado", codigo: "OPME-TL-401", tipo: "Implante" },
      { item: "Conector transversal", codigo: "OPME-TL-408", tipo: "Implante" }
    ]
  }
];

let lesions = [];

const searchInput = document.querySelector("#searchInput");
const regionFilter = document.querySelector("#regionFilter");
const lesionGrid = document.querySelector("#lesionGrid");
const resultCount = document.querySelector("#resultCount");
const materialsTableBody = document.querySelector("#materialsTableBody");

const adminToggleBtn = document.querySelector("#adminToggleBtn");
const adminSection = document.querySelector("#adminSection");
const adminManager = document.querySelector("#adminManager");
const enterPlatformBtn = document.querySelector("#enterPlatformBtn");
const exploreBtn = document.querySelector("#exploreBtn");

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

let activeLesionId = null;

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
  const data = filteredLesions();
  resultCount.textContent = `${data.length} resultado(s)`;

  lesionGrid.innerHTML = "";

  data.forEach((lesion) => {
    const card = document.createElement("article");
    card.className = `lesion-card${activeLesionId === lesion.id ? " active" : ""}`;
    card.dataset.id = lesion.id;
    card.innerHTML = `
      <span class="tag">${lesion.regiao}</span>
      <h3>${lesion.nome}</h3>
      <p><strong>Sinais de alerta:</strong> ${lesion.sinais_alerta}</p>
      <p><strong>Exame sugerido:</strong> ${lesion.exame_sugerido}</p>
      <p><strong>Técnica possível:</strong> ${lesion.tecnica_possivel}</p>
    `;

    card.addEventListener("click", () => {
      activeLesionId = lesion.id;
      renderCards();
      renderMaterials();
    });

    lesionGrid.appendChild(card);
  });

  if (!data.length) {
    lesionGrid.innerHTML = "<p>Nenhuma lesão encontrada com os filtros atuais.</p>";
    activeLesionId = null;
  }
}

function renderMaterials() {
  const visibleLesions = filteredLesions();
  const source = activeLesionId
    ? visibleLesions.filter((lesion) => lesion.id === activeLesionId)
    : visibleLesions;

  materialsTableBody.innerHTML = "";

  source.forEach((lesion) => {
    lesion.materiais.forEach((mat) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${lesion.nome}</td>
        <td>${mat.item}</td>
        <td>${mat.codigo}</td>
        <td>${mat.tipo}</td>
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
      <td>${lesion.nome}</td>
      <td>${lesion.regiao}</td>
      <td>
        <div class="admin-row-actions">
          <button class="admin-btn secondary" type="button" data-action="edit" data-id="${lesion.id}">Editar</button>
          <button class="admin-btn secondary" type="button" data-action="delete" data-id="${lesion.id}">Excluir</button>
        </div>
      </td>
    `;
    adminLesionsTableBody.appendChild(row);
  });

  if (!lesions.length) {
    adminLesionsTableBody.innerHTML = "<tr><td colspan='3'>Sem lesões cadastradas.</td></tr>";
  }
}

function bindFilters() {
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
      lesionFormFeedback.textContent = "Informe ao menos 1 material válido.";
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
    lesionFormFeedback.textContent = "Lesão salva com sucesso.";
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
  const scrollToApp = () => {
    document.querySelector("#appArea")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  enterPlatformBtn?.addEventListener("click", scrollToApp);
  exploreBtn?.addEventListener("click", scrollToApp);
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
      throw new Error("Falha ao carregar base de lesões.");
    }

    lesions = await response.json();
    refreshAllViews();
  } catch (error) {
    lesions = FALLBACK_LESIONS;
    refreshAllViews();

    if (location.protocol === "file:") {
      lesionGrid.innerHTML = `<p>Erro ao carregar dados: ${error.message} Em execução local (file://), use um servidor simples para habilitar o carregamento JSON.</p>`;
      resultCount.textContent = "0 resultado(s)";
      materialsTableBody.innerHTML = "<tr><td colspan='4'>Dados indisponíveis.</td></tr>";
    }
  }
}

function init() {
  bindLanding();
  bindFilters();
  bindAdmin();
  loadData();
}

init();
