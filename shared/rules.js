const STATUS_BY_FAROL = {
  g: "Autorizado fast-track",
  a: "Em validacao",
  r: "Urgencia em curso"
};

function normalizeText(value) {
  return String(value || "").trim();
}

function hasUrgencyCriteria(urgencyFlags) {
  if (!urgencyFlags) {
    return false;
  }

  return Boolean(
    urgencyFlags.deficitProgressivo ||
      urgencyFlags.caudaEquinaOuCompressao ||
      urgencyFlags.fraturaInstavel ||
      urgencyFlags.infeccaoOuTumor
  );
}

function analyzeRelato(relato) {
  const text = String(relato || "").toLowerCase();

  const flags = {
    escala: /(eva|odi|ndi|mjoa|oswestry)/i.test(text),
    imagem: /(ressonancia|\brm\b|tomografia|\btc\b)/i.test(text),
    conservador: /(fisioterapia|conservador|bloqueio|infiltra|falha do tratamento)/i.test(text),
    correlacao: /(compativel com a clinica|correlacao|concordan)/i.test(text)
  };

  let sugestaoPatologia = "";
  if (/(hernia).*(radiculopatia|lombociatalgia)|(radiculopatia).*(hernia)/i.test(text)) {
    sugestaoPatologia = "Hernia de disco lombar";
  } else if (/(claudicacao|estenose)/i.test(text)) {
    sugestaoPatologia = "Estenose lombar";
  } else if (/(espondilolistese|instabilidade)/i.test(text)) {
    sugestaoPatologia = "Artrodese lombar por instabilidade";
  } else if (/(mielopatia|mjoa)/i.test(text)) {
    sugestaoPatologia = "Mielopatia cervical";
  } else if (/(fratura toracolombar|tlics|fratura)/i.test(text)) {
    sugestaoPatologia = "Fratura toracolombar";
  }

  const urgenciaDetectada = {
    deficitProgressivo: /deficit progressivo/i.test(text),
    caudaEquinaOuCompressao: /(cauda equina|compressao medular)/i.test(text),
    fraturaInstavel: /(fratura instavel|luxacao)/i.test(text),
    infeccaoOuTumor: /(abscesso|espondilodiscite|tumor com compress)/i.test(text)
  };

  return { flags, sugestaoPatologia, urgenciaDetectada };
}

function evaluateFarol(input) {
  const missing = [];
  if (!input.protocoloId) {
    missing.push("Selecione a patologia principal (protocolo).");
  }
  if (normalizeText(input.relato).length < 20) {
    missing.push("Relato clinico com pelo menos 20 caracteres.");
  }
  if (!input.flags?.imagemCompatavel) {
    missing.push("Confirme imagem compativel.");
  }
  if (!input.flags?.escalaFuncional) {
    missing.push("Confirme escala funcional.");
  }
  if (!input.flags?.falhaConservador) {
    missing.push("Confirme falha do tratamento conservador.");
  }
  if (!input.flags?.correlacaoClinicaImagem) {
    missing.push("Confirme correlacao clinica x imagem.");
  }
  if (!input.tussExiste) {
    missing.push("Adicione ao menos um codigo TUSS valido para o procedimento.");
  }
  if (Array.isArray(input.perguntasObrigatoriasSemResposta)) {
    input.perguntasObrigatoriasSemResposta.forEach((q) => missing.push(`Responder pergunta obrigatoria: ${q}`));
  }

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
      subtitulo:
        "Cuidado liberado de imediato; OPME acima do kit exige justificativa. Caso segue para revisao retrospectiva.",
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
      subtitulo:
        "Internar para analgesia e reclassificar como eletiva em 24-72h. O cuidado nao e interrompido.",
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
      subtitulo:
        "Indicacao clinica aprovada; material em revisao tecnica pelo conselho. Substitua por alternativa parceira ou siga com justificativa para outro fluxo.",
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
      subtitulo:
        "Verde clinico mantido. Escolha alternativa parceira, cotacao com a empresa escolhida via operadora, ou fluxo hospital.",
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
      subtitulo:
        "Composicao fora do pacote padrao. Revise quantidades ou siga com justificativa para validacao em ate 5 dias uteis.",
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
    subtitulo:
      "Pedido segue autorizado no range delegado. Encaminhar ao hospital com visao de instantaneo e meta operacional de 5 dias uteis.",
    nextSteps: [
      "Enviar pedido autorizado ao hospital.",
      "Registrar trilha da regra aplicada para auditoria."
    ],
    checklist,
    pendencias: []
  };
}

function statusFromFarol(farol) {
  return STATUS_BY_FAROL[farol] || "Em validacao";
}

module.exports = {
  analyzeRelato,
  evaluateFarol,
  hasUrgencyCriteria,
  statusFromFarol
};
