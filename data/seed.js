function initialData() {
  return {
    users: [
      { id: "u-med-1", role: "medico", email: "medico@simplecoluna.com", passwordHash: "", nome: "Dr. Rafael Lima" },
      { id: "u-op-1", role: "operadora", email: "operadora@simplecoluna.com", passwordHash: "", nome: "Analista Operadora" },
      { id: "u-hosp-1", role: "hospital", email: "hospital@simplecoluna.com", passwordHash: "", nome: "Central Hospitalar", hospitalPadrao: "Hospital Santa Coluna" },
      { id: "u-admin-1", role: "admin", email: "admin@simplecoluna.com", passwordHash: "", nome: "Administracao" }
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

module.exports = {
  initialData
};
