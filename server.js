const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { initialData } = require("./data/seed");
const { evaluateFarol, hasUrgencyCriteria, statusFromFarol } = require("./shared/rules");

const PORT = Number(process.env.PORT || 3000);
const DB_PATH = path.join(__dirname, "data", "db.json");
const SECRET = process.env.SIMPLE_COLUNA_SECRET || "simple-coluna-secret";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function sha(text) {
  return crypto.createHash("sha256").update(String(text)).digest("hex");
}

function ensureDb() {
  if (fs.existsSync(DB_PATH)) {
    return;
  }

  const db = initialData();
  db.users = db.users.map((user) => ({ ...user, passwordHash: sha("simple123") }));
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function buildToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifyToken(token) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [body, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  if (signature !== expected) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    if (!decoded.exp || decoded.exp < Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function toJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1e7) {
        reject(new Error("Payload muito grande"));
      }
    });
    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("JSON invalido"));
      }
    });
  });
}

function normalizeRoleData(role, db) {
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

  return {
    ...base,
    opmeItens: db.opmeItens
  };
}

function getAuthUser(req, db) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }

  return db.users.find((u) => u.id === decoded.userId) || null;
}

function checkTussForProcedure(codigosTuss, procedimento, db) {
  const valid = db.codigoTuss.filter(
    (t) => t.procedimentoVinculado === "Todos" || procedimento.includes(t.procedimentoVinculado) || t.procedimentoVinculado.includes(procedimento)
  );
  if (!valid.length) {
    return false;
  }

  const set = new Set(valid.map((item) => item.codigo));
  return codigosTuss.some((c) => set.has(c));
}

function computePedido(body, db) {
  const pacote = db.pacotesOpme.find((p) => p.procedimento === body.procedimento && Number(p.niveis) === Number(body.niveis));
  const itens = Array.isArray(body.itensOPME) ? body.itensOPME : [];

  let custoTotal = 0;
  let temBlacklist = false;
  let temNaoParceira = false;

  itens.forEach((entry) => {
    const item = db.opmeItens.find((op) => op.id === entry.itemId);
    if (!item) {
      return;
    }
    custoTotal += Number(item.custoUnitario || 0) * Number(entry.qtd || 0);
    temBlacklist = temBlacklist || Boolean(item.blacklist);
    temNaoParceira = temNaoParceira || !item.parceira;
  });

  const perguntasSemResposta = (body.perguntasImportantes || [])
    .filter((item) => !String(item.r || "").trim())
    .map((item) => item.q);

  const criterioUrgencia = hasUrgencyCriteria(body.urgenciaFlags || {});
  const farolResult = evaluateFarol({
    carater: body.carater,
    temCriterioUrgencia: criterioUrgencia,
    protocoloId: body.protocoloId,
    relato: body.relato,
    flags: body.dossieFlags || {},
    perguntasObrigatoriasSemResposta: perguntasSemResposta,
    tussExiste: checkTussForProcedure(body.codigosTuss || [], body.procedimento || "", db),
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

function appendAudit(db, event) {
  db.auditTrail.push({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    ...event
  });
}

function handleApi(req, res, pathname) {
  const db = readDb();

  if (req.method === "POST" && pathname === "/api/auth/login") {
    return parseBody(req)
      .then((body) => {
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");
        const user = db.users.find((u) => u.email === email);

        if (!user || user.passwordHash !== sha(password)) {
          toJson(res, 401, { error: "Credenciais invalidas." });
          return;
        }

        const token = buildToken({ userId: user.id, role: user.role, exp: Date.now() + 1000 * 60 * 60 * 12 });
        toJson(res, 200, { token, user: { id: user.id, role: user.role, nome: user.nome, email: user.email } });
      })
      .catch((err) => toJson(res, 400, { error: err.message }));
  }

  const authUser = getAuthUser(req, db);

  if (pathname.startsWith("/api/") && !authUser) {
    toJson(res, 401, { error: "Nao autenticado." });
    return;
  }

  if (req.method === "GET" && pathname === "/api/auth/me") {
    toJson(res, 200, { user: { id: authUser.id, role: authUser.role, nome: authUser.nome, email: authUser.email } });
    return;
  }

  if (req.method === "GET" && pathname === "/api/bootstrap") {
    toJson(res, 200, normalizeRoleData(authUser.role, db));
    return;
  }

  if (req.method === "POST" && pathname === "/api/pedidos/preview") {
    parseBody(req)
      .then((body) => {
        const preview = computePedido(body, db);
        toJson(res, 200, preview);
      })
      .catch((err) => toJson(res, 400, { error: err.message }));
    return;
  }

  if (req.method === "POST" && pathname === "/api/pedidos") {
    parseBody(req)
      .then((body) => {
        const calc = computePedido(body, db);
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
          status: calc.farol === "r" && calc.titulo !== "Fluxo de urgencia" ? "2a opiniao" : statusFromFarol(calc.farol),
          urgenciaCriterioPresente: calc.criterioUrgencia,
          pacoteId: calc.pacoteId,
          tetoPacote: calc.tetoPacote,
          acimaTeto: calc.acimaTeto,
          referencias: (db.protocolos.find((p) => p.id === body.protocoloId)?.referencias || []),
          regraVersao: `${calc.pacoteId || "sem-pacote"}@${new Date().toISOString().slice(0, 10)}`,
          data: new Date().toISOString()
        };

        db.pedidos.push(pedido);
        appendAudit(db, {
          userId: authUser.id,
          action: "pedido.autorizacao",
          details: {
            pedidoId: pedido.id,
            farol: pedido.farol,
            regraVersao: pedido.regraVersao
          }
        });
        writeDb(db);
        toJson(res, 201, { pedido });
      })
      .catch((err) => toJson(res, 400, { error: err.message }));
    return;
  }

  if (req.method === "GET" && pathname === "/api/pedidos") {
    let pedidos = db.pedidos;
    if (authUser.role === "medico") {
      pedidos = pedidos.filter((p) => p.medicoUserId === authUser.id);
    }
    if (authUser.role === "hospital") {
      pedidos = pedidos.filter((p) => p.hospital === authUser.hospitalPadrao || p.carater === "Urgencia");
    }

    toJson(res, 200, { pedidos });
    return;
  }

  if (req.method === "DELETE" && pathname === "/api/pedidos/mine") {
    if (authUser.role !== "medico") {
      toJson(res, 403, { error: "Somente medico." });
      return;
    }

    const before = db.pedidos.length;
    db.pedidos = db.pedidos.filter((p) => p.medicoUserId !== authUser.id);
    appendAudit(db, {
      userId: authUser.id,
      action: "pedido.clear-tests",
      details: { removed: before - db.pedidos.length }
    });
    writeDb(db);
    toJson(res, 200, { removed: before - db.pedidos.length });
    return;
  }

  if (req.method === "GET" && pathname === "/api/operadora/kpis") {
    if (!["operadora", "admin"].includes(authUser.role)) {
      toJson(res, 403, { error: "Acesso restrito." });
      return;
    }

    const total = db.pedidos.length;
    const verdes = db.pedidos.filter((p) => p.farol === "g").length;
    const media = total ? db.pedidos.reduce((sum, p) => sum + Number(p.custoTotalCalculado || 0), 0) / total : 0;
    const foraPadrao = db.pedidos.filter((p) => p.acimaTeto || p.farol !== "g").length;

    toJson(res, 200, { total, percentualVerde: total ? (verdes / total) * 100 : 0, custoMedio: media, foraPadrao });
    return;
  }

  if (req.method === "GET" && pathname === "/api/hospital/urgencias") {
    if (!["hospital", "admin"].includes(authUser.role)) {
      toJson(res, 403, { error: "Acesso restrito." });
      return;
    }

    const urgencias = db.pedidos.filter((p) => p.carater === "Urgencia");
    toJson(res, 200, { urgencias });
    return;
  }

  if (pathname.startsWith("/api/admin/") && authUser.role !== "admin") {
    toJson(res, 403, { error: "Acesso admin." });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/all") {
    toJson(res, 200, {
      protocolos: db.protocolos,
      opmeItens: db.opmeItens,
      pacotesOpme: db.pacotesOpme,
      codigoTuss: db.codigoTuss,
      operadoras: db.operadoras,
      rangeVersions: db.rangeVersions,
      auditTrail: db.auditTrail
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/protocolos") {
    parseBody(req)
      .then((body) => {
        const item = { ...body, id: body.id || `p-${Date.now()}` };
        db.protocolos.push(item);
        appendAudit(db, { userId: authUser.id, action: "protocolo.create", details: { id: item.id } });
        writeDb(db);
        toJson(res, 201, { item });
      })
      .catch((err) => toJson(res, 400, { error: err.message }));
    return;
  }

  if (req.method === "PUT" && pathname.startsWith("/api/admin/protocolos/")) {
    parseBody(req)
      .then((body) => {
        const id = pathname.split("/").pop();
        const idx = db.protocolos.findIndex((p) => p.id === id);
        if (idx === -1) {
          toJson(res, 404, { error: "Nao encontrado" });
          return;
        }
        db.protocolos[idx] = { ...db.protocolos[idx], ...body, id };
        appendAudit(db, { userId: authUser.id, action: "protocolo.update", details: { id } });
        writeDb(db);
        toJson(res, 200, { item: db.protocolos[idx] });
      })
      .catch((err) => toJson(res, 400, { error: err.message }));
    return;
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/admin/protocolos/")) {
    const id = pathname.split("/").pop();
    db.protocolos = db.protocolos.filter((p) => p.id !== id);
    appendAudit(db, { userId: authUser.id, action: "protocolo.delete", details: { id } });
    writeDb(db);
    toJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/opme-itens") {
    parseBody(req)
      .then((body) => {
        const item = { ...body, id: body.id || `i-${Date.now()}` };
        db.opmeItens.push(item);
        appendAudit(db, { userId: authUser.id, action: "opme-item.create", details: { id: item.id } });
        writeDb(db);
        toJson(res, 201, { item });
      })
      .catch((err) => toJson(res, 400, { error: err.message }));
    return;
  }

  if (req.method === "PUT" && pathname.startsWith("/api/admin/opme-itens/")) {
    parseBody(req)
      .then((body) => {
        const id = pathname.split("/").pop();
        const idx = db.opmeItens.findIndex((p) => p.id === id);
        if (idx === -1) {
          toJson(res, 404, { error: "Nao encontrado" });
          return;
        }
        db.opmeItens[idx] = { ...db.opmeItens[idx], ...body, id };
        appendAudit(db, { userId: authUser.id, action: "opme-item.update", details: { id } });
        writeDb(db);
        toJson(res, 200, { item: db.opmeItens[idx] });
      })
      .catch((err) => toJson(res, 400, { error: err.message }));
    return;
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/admin/opme-itens/")) {
    const id = pathname.split("/").pop();
    db.opmeItens = db.opmeItens.filter((p) => p.id !== id);
    appendAudit(db, { userId: authUser.id, action: "opme-item.delete", details: { id } });
    writeDb(db);
    toJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/pacotes-opme") {
    parseBody(req)
      .then((body) => {
        const key = `${body.procedimento}::${Number(body.niveis)}`;
        const idx = db.pacotesOpme.findIndex((p) => `${p.procedimento}::${Number(p.niveis)}` === key);
        const payload = { ...body, id: body.id || `pk-${Date.now()}`, niveis: Number(body.niveis), teto: Number(body.teto) };

        if (idx >= 0) {
          const old = db.pacotesOpme[idx];
          db.pacotesOpme[idx] = { ...old, ...payload, id: old.id };
          db.rangeVersions.push({
            id: `rv-${Date.now()}`,
            pacoteId: old.id,
            oldTeto: old.teto,
            newTeto: payload.teto,
            changedBy: authUser.id,
            changedAt: new Date().toISOString()
          });
          appendAudit(db, { userId: authUser.id, action: "pacote.update", details: { id: old.id, oldTeto: old.teto, newTeto: payload.teto } });
          writeDb(db);
          toJson(res, 200, { item: db.pacotesOpme[idx] });
          return;
        }

        db.pacotesOpme.push(payload);
        appendAudit(db, { userId: authUser.id, action: "pacote.create", details: { id: payload.id } });
        writeDb(db);
        toJson(res, 201, { item: payload });
      })
      .catch((err) => toJson(res, 400, { error: err.message }));
    return;
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/admin/pacotes-opme/")) {
    const id = pathname.split("/").pop();
    db.pacotesOpme = db.pacotesOpme.filter((p) => p.id !== id);
    appendAudit(db, { userId: authUser.id, action: "pacote.delete", details: { id } });
    writeDb(db);
    toJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/tuss") {
    parseBody(req)
      .then((body) => {
        const idx = db.codigoTuss.findIndex((item) => item.codigo === body.codigo);
        if (idx >= 0) {
          db.codigoTuss[idx] = { ...db.codigoTuss[idx], ...body };
          appendAudit(db, { userId: authUser.id, action: "tuss.update", details: { codigo: body.codigo } });
          writeDb(db);
          toJson(res, 200, { item: db.codigoTuss[idx] });
          return;
        }

        db.codigoTuss.push(body);
        appendAudit(db, { userId: authUser.id, action: "tuss.create", details: { codigo: body.codigo } });
        writeDb(db);
        toJson(res, 201, { item: body });
      })
      .catch((err) => toJson(res, 400, { error: err.message }));
    return;
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/admin/tuss/")) {
    const codigo = pathname.split("/").pop();
    db.codigoTuss = db.codigoTuss.filter((item) => item.codigo !== codigo);
    appendAudit(db, { userId: authUser.id, action: "tuss.delete", details: { codigo } });
    writeDb(db);
    toJson(res, 200, { ok: true });
    return;
  }

  toJson(res, 404, { error: "Rota nao encontrada" });
}

function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(__dirname, safePath);
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const fallback = path.join(__dirname, "index.html");
    const content = fs.readFileSync(fallback);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(content);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": contentType });
  res.end(fs.readFileSync(filePath));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname.startsWith("/api/")) {
    handleApi(req, res, pathname);
    return;
  }

  if (req.method !== "GET") {
    res.writeHead(405);
    res.end("Method not allowed");
    return;
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  ensureDb();
  // eslint-disable-next-line no-console
  console.log(`Simple Coluna em http://localhost:${PORT}`);
});
