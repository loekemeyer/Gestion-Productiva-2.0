"use strict";

/* ============================================================
   operarios_gp2.js — App de operarios sobre schema GP2
   Usa registro_operarios_bundle() para datos y
   registrar_evento_prod(p jsonb) para eventos.
   Eduardo Barrionuevo (legajo "19"): CT button + rollo en E/PR.
   ============================================================ */

const SUPABASE_URL = "https://hrxfctzncixxqmpfhskv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyeGZjdHpuY2l4eHFtcGZoc2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjQyNjEsImV4cCI6MjA4ODMwMDI2MX0.4L6wguch8UZGhC2VpzrWcCjJGUV-IkYsl9JoCWrOLUs";
const LEGAJO_EDUARDO = "19";
const APP_VERSION = "1.2.0"; // bumpear en cada actualizacion (junto con el ?v= del HTML)

const SB = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: "GP2" },
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "gp2_operarios_anon" }
});

/* ============================================================
   DATOS (cargados una vez desde bundle)
   ============================================================ */
/* Shape real de registro_operarios_bundle():
   empleados    { legajo -> {nombre, activo, hora_entrada} }
   matrices     [ {n, d, ppk} ]
   matriz_fleje { n_matriz -> {comp_id, codigo, descripcion} }
   rollos_saldo [ {comp_id, codigo, kg_por_rollo, rollos} ]              */
let D = {};

async function cargarBundle() {
  const { data, error } = await SB.rpc("registro_operarios_bundle");
  if (error) { console.error("Bundle error:", error); return; }
  D = data || {};
  D.matricesMap = new Map((D.matrices || []).map(m => [String(m.n || "").trim(), m]));
  if (selected && ["E", "CM"].includes(selected.code)) renderMatrizPicker($("matrizSearch").value);
}

function nombreMatriz(n) { return D.matricesMap?.get(String(n).trim())?.d || ""; }

/* ============================================================
   OPCIONES (botones)
   ============================================================ */
const OPTIONS = [
  // row 1
  { code: "E",  desc: "Empece Matriz",     row: 1, needsInput: true,  label: "Ingresa el número", validate: /^[0-9]+[A-Za-z]?$/ },
  { code: "C",  desc: "Cajon",             row: 1, needsInput: true,  label: "Ingresa cantidad", validate: /^[0-9]+$/ },
  // row 2
  { code: "PB",   desc: "Pare Bano",       row: 2, needsInput: false },
  { code: "BC",   desc: "Busque Cajon",    row: 2, needsInput: false },
  { code: "MOV",  desc: "Movimiento",      row: 2, needsInput: false },
  { code: "LIMP", desc: "Limpieza",        row: 2, needsInput: false },
  { code: "Perm", desc: "Permiso",         row: 2, needsInput: false },
  // row 3
  { code: "AL",    desc: "Ayuda Logistica",     row: 3, needsInput: false },
  { code: "PR",    desc: "Pare Carga Rollo",     row: 3, needsInput: false },
  { code: "PC",    desc: "Pare Comida",          row: 3, needsInput: false },
  { code: "RD",    desc: "Rollo Fleje Doblado",  row: 3, needsInput: false },
  { code: "MOV P", desc: "Movimiento Piedra",    row: 3, needsInput: false },
  // row 4
  { code: "CM",  desc: "Cambiar Matriz",   row: 4, needsInput: true,  label: "Número matriz nueva", validate: /^[0-9]+[A-Za-z]?$/ },
  { code: "PM",  desc: "Pare Matriz",      row: 4, needsInput: false },
  { code: "RM",  desc: "Rotura Matriz",    row: 4, needsInput: false },
  { code: "REM", desc: "Reparando Matriz", row: 4, needsInput: false },
];

const CT_OPTION = { code: "CT", desc: "Cajon Termine", row: 1, needsInput: false, isCT: true };

const NON_DOWNTIME = new Set(["E", "C", "CT", "RM", "PM", "RD", "LT"]);
const isDowntime = (op) => !NON_DOWNTIME.has(op);
const sameDowntime = (a, b) => a && b && a.opcion === b.opcion && (a.texto || "") === (b.texto || "");

/* ============================================================
   TIEMPO / ZONA AR
   ============================================================ */
function isoNow() { return new Date().toISOString(); }

function formatDateTimeAR(iso) {
  try {
    return new Date(iso).toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires", hour12: false
    });
  } catch { return ""; }
}

function dayKeyAR() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const y = parts.find(p => p.type === "year")?.value || "0000";
  const m = parts.find(p => p.type === "month")?.value || "00";
  const d = parts.find(p => p.type === "day")?.value || "00";
  return `${y}-${m}-${d}`;
}

function nowMinutesAR() {
  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).formatToParts(new Date());
  return Number(parts.find(p => p.type === "hour")?.value || 0) * 60 +
         Number(parts.find(p => p.type === "minute")?.value || 0);
}

function uuidv4() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16);
  (window.crypto || window.msCrypto).getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

/* ============================================================
   ESTADO POR LEGAJO (localStorage)
   ============================================================ */
const LS_PREFIX  = "gp2_op_state";
const LS_QUEUE   = "gp2_op_queue";

function stateKey(legajo) { return `${LS_PREFIX}::${dayKeyAR()}::${String(legajo).trim()}`; }

function freshState() {
  return { lastMatrix: null, lastCajon: null, lastDowntime: null, last2: [],
           lateArrivalSent: false, lateArrivalDiscarded: false, matrixNeedsC: false };
}

function readState(legajo) {
  try {
    const raw = localStorage.getItem(stateKey(legajo));
    if (!raw) return freshState();
    const s = JSON.parse(raw);
    if (!s || typeof s !== "object") return freshState();
    s.last2 = Array.isArray(s.last2) ? s.last2 : [];
    s.lastMatrix = s.lastMatrix || null;
    s.lastCajon  = s.lastCajon  || null;
    s.lastDowntime = s.lastDowntime || null;
    s.matrixNeedsC = !!s.matrixNeedsC;
    return s;
  } catch { return freshState(); }
}

function writeState(legajo, state) {
  localStorage.setItem(stateKey(legajo), JSON.stringify(state));
}

function updateStateAfterSend(legajo, payload) {
  const s = readState(legajo);
  const op = payload.opcion;

  if (op === "E") {
    if (s.lastMatrix && s.lastMatrix.texto !== payload.texto) s.lastCajon = null;
    s.lastMatrix = { opcion: "E", texto: payload.texto || "", ts: payload.ts_event,
                     comp_salida_id: payload.comp_salida_id || null, pieza: payload.pieza || null };
    s.lastDowntime = null; s.matrixNeedsC = true;
    s.last2.push({ ...payload, status: "queued" });
    writeState(legajo, s); return;
  }
  if (op === "C" || op === "CT") {
    s.lastCajon = { opcion: op, texto: payload.texto || "", ts: payload.ts_event };
    s.lastDowntime = null; s.matrixNeedsC = false;
    s.last2.push({ ...payload, status: "queued" });
    writeState(legajo, s); return;
  }
  if (["RM", "PM", "RD"].includes(op)) {
    s.lastDowntime = null;
    s.last2.push({ ...payload, status: "queued" });
    writeState(legajo, s); return;
  }
  if (isDowntime(op)) {
    const item = { opcion: op, texto: payload.texto || "", ts: payload.ts_event };
    if (!s.lastDowntime) s.lastDowntime = item;
    else if (sameDowntime(s.lastDowntime, payload)) s.lastDowntime = null;
    else s.lastDowntime = item;
  }
  s.last2.push({ ...payload, status: "queued" });
  writeState(legajo, s);
}

function markSent(legajo, id) {
  const s = readState(legajo);
  const item = s.last2.find(x => x.id === id);
  if (item) { item.status = "sent"; item.sentAt = isoNow(); }
  writeState(legajo, s);
}

function markFailed(legajo, id, err) {
  const s = readState(legajo);
  const item = s.last2.find(x => x.id === id);
  if (item) { item.status = "failed"; item.lastError = String(err || ""); }
  writeState(legajo, s);
}

/* ============================================================
   COLA OFFLINE
   ============================================================ */
function readQueue()  { try { return JSON.parse(localStorage.getItem(LS_QUEUE) || "[]"); } catch { return []; } }
function writeQueue(q) { localStorage.setItem(LS_QUEUE, JSON.stringify(q || [])); }

function enqueue(payload) {
  const q = readQueue();
  if (!q.some(x => x.id === payload.id)) q.push(payload);
  writeQueue(q);
}

function horaAR(iso) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    }).format(new Date(iso));
  } catch { return ""; }
}

/* Traduce el evento local al shape que espera GP2.registrar_evento_prod(p jsonb).
   `matriz` es obligatorio del lado SQL: para E/CM es el numero tipeado, para los
   eventos de matriz activa es el guardado en el payload, y para los tiempos
   muertos se manda el codigo del evento (queda en matriz_raw, sin matriz_id). */
function toRpcPayload(p) {
  const op = String(p.opcion || "").toUpperCase();
  let matriz;
  if (["E", "CM"].includes(op)) matriz = p.texto || "";
  else if (p.matriz) matriz = p.matriz;
  else matriz = op;

  const rpc = {
    fecha: p.ts_event,
    legajo: String(p.legajo || ""),
    matriz: String(matriz || "").trim(),
    id_ejecucion: p.id,
    hora_fin: horaAR(p.ts_event)
  };
  if (p.hs_inicio) rpc.hora_inicio = horaAR(p.hs_inicio);
  if (p.comp_salida_id) rpc.comp_salida_id = p.comp_salida_id;

  if (["C", "CT"].includes(op)) {
    rpc.uni = Number(p.texto) || 0;
    rpc.nombre_matriz = nombreMatriz(matriz) || undefined;
  } else {
    rpc.uni = 0;
    rpc.nombre_matriz = ["E", "CM"].includes(op) ? (nombreMatriz(matriz) || undefined) : p.descripcion;
  }

  const segs = (p.hs_inicio && p.ts_event)
    ? Math.max(0, Math.round((new Date(p.ts_event) - new Date(p.hs_inicio)) / 1000))
    : null;
  if (segs !== null) {
    if (["C", "CT"].includes(op)) rpc.segundos_trabajados = segs;
    else if (isDowntime(op)) rpc.segundos_tiempo_muerto = segs;
  }
  return rpc;
}

async function flushQueue() {
  const q = readQueue();
  if (!q.length) return;
  const restantes = [];
  for (const payload of q) {
    try {
      const { error } = await SB.rpc("registrar_evento_prod", { p: toRpcPayload(payload) });
      if (error) throw error;
      markSent(payload.legajo, payload.id);
    } catch (e) {
      markFailed(payload.legajo, payload.id, e?.message || e);
      restantes.push(payload);
    }
  }
  writeQueue(restantes);
}

/* ============================================================
   LLEGADA TARDE
   ============================================================ */
function maybeSendLateArrival(legajo) {
  const s = readState(legajo);
  const isFirst = !s.last2.length && !s.lastMatrix && !s.lastCajon && !s.lastDowntime;
  if (!isFirst || s.lateArrivalSent || s.lateArrivalDiscarded) return;

  if (nowMinutesAR() <= 8 * 60 + 30) {
    s.lateArrivalDiscarded = true; writeState(legajo, s); return;
  }
  const day = dayKeyAR();
  const payload = {
    id: uuidv4(), legajo, opcion: "LT", descripcion: "Llegada Tarde",
    texto: "", ts_event: isoNow(), hs_inicio: `${day}T08:30:00-03:00`, matriz: ""
  };
  s.lateArrivalSent = true; writeState(legajo, s);
  enqueue(payload);
}

/* ============================================================
   ROLLOS (Eduardo)
   ============================================================ */
function rollosParaMatriz(n_matriz) {
  const fleje = (D.matriz_fleje || {})[String(n_matriz).trim()];
  if (!fleje?.comp_id) return [];
  return (D.rollos_saldo || []).filter(r => r.comp_id === fleje.comp_id && Number(r.rollos) > 0);
}

async function tomarRollo(legajo, comp_id, kg_por_rollo, matriz) {
  try {
    const { error } = await SB.rpc("tomar_rollo", {
      p_legajo: String(legajo), p_comp_id: Number(comp_id),
      p_kg_por_rollo: Number(kg_por_rollo), p_matriz: String(matriz)
    });
    if (error) console.error("tomar_rollo error:", error);
  } catch (e) { console.error("tomar_rollo:", e); }
}

async function cerrarRollo(legajo, quedoResto) {
  try {
    const { error } = await SB.rpc("cerrar_rollo", {
      p_legajo: String(legajo), p_quedo_resto: !!quedoResto
    });
    if (error) console.error("cerrar_rollo error:", error);
  } catch (e) { console.error("cerrar_rollo:", e); }
}

/* ============================================================
   UI helpers
   ============================================================ */
const $ = id => document.getElementById(id);
let selected = null;

function legajoKey() { return String($("legajoInput").value || "").trim(); }
function isEduardo()  { return legajoKey() === LEGAJO_EDUARDO; }

function computeHsInicio(state) {
  if (state.lastCajon?.ts) return state.lastCajon.ts;
  if (state.lastMatrix?.ts) return state.lastMatrix.ts;
  return "";
}

function renderSummary() {
  const leg = legajoKey();
  const el = $("daySummary");
  if (!leg) { el.className = "history-empty"; el.innerText = "Ingresa tu legajo para ver el resumen"; return; }
  const s = readState(leg);
  if (!s.last2.length) {
    el.className = ""; el.innerHTML = '<div class="day-item"><div class="t1">Historial del día</div><div class="t2">Sin registros</div></div>';
    return;
  }
  const badge = st => {
    if (st === "sent")   return '<span style="padding:2px 8px;border-radius:999px;background:#e8fff0;color:#0b6b2c;font-weight:800;font-size:12px;">ENVIADO</span>';
    if (st === "queued") return '<span style="padding:2px 8px;border-radius:999px;background:#fff7e6;color:#8a5a00;font-weight:800;font-size:12px;">PENDIENTE</span>';
    if (st === "failed") return '<span style="padding:2px 8px;border-radius:999px;background:#ffecec;color:#9b1c1c;font-weight:800;font-size:12px;">ERROR</span>';
    return "";
  };
  el.className = "";
  el.innerHTML = `<div class="day-item">
    <div class="t1">Historial del día (${s.last2.length})</div>
    <div class="t2" style="max-height:360px;overflow:auto;">
      ${s.last2.map((it, idx) => `
        <div style="margin-top:10px;padding-bottom:10px;border-bottom:1px solid rgba(0,0,0,.08);">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span style="font-weight:900;font-size:34px;">${it.opcion}${it.texto ? `: ${it.texto}` : ""}</span>
            ${badge(it.status)}
            <span class="hist-btn hist-del" data-idx="${idx}" title="Eliminar">🗑</span>
          </div>
          ${it.ts_event ? `<div style="color:#555;">${formatDateTimeAR(it.ts_event)}</div>` : ""}
          ${it.lastError ? `<div style="color:#9b1c1c;font-size:12px;">${it.lastError}</div>` : ""}
        </div>`).join("")}
    </div>
  </div>`;

  el.querySelectorAll(".hist-del").forEach(btn => {
    btn.addEventListener("click", () => deleteHistItem(leg, parseInt(btn.dataset.idx)));
  });
}

function renderPending() {
  const q = readQueue();
  const sec = $("pendingSection");
  const list = $("pendingList");
  if (!q.length) { sec.classList.add("hidden"); return; }
  sec.classList.remove("hidden");
  list.innerHTML = q.map(x => `<div>${x.opcion}${x.texto ? ` ${x.texto}` : ""} — ${formatDateTimeAR(x.ts_event)}</div>`).join("");
}

function renderSyncBadge() {
  const q = readQueue();
  const el = $("syncBadge");
  el.innerText = q.length ? `GP2 v${APP_VERSION} ⚠ ${q.length} pend.` : `GP2 v${APP_VERSION} ✓`;
  el.style.background = q.length ? "#fff7ed" : "#f1f5f9";
  el.style.color = q.length ? "#9a3412" : "#475569";
}

function renderMatrizInfo() {
  const el = $("matrizInfo");
  if (!selected || !["C", "CT", "RM", "PM", "RD", "CM"].includes(selected.code)) {
    el.classList.add("hidden"); return;
  }
  const s = readState(legajoKey());
  if (!s.lastMatrix?.texto) { el.classList.add("hidden"); return; }
  const nm = s.lastMatrix.texto;
  const desc = nombreMatriz(nm);
  el.classList.remove("hidden");
  const pieza = s.lastMatrix.pieza ? ` · Pieza: ${s.lastMatrix.pieza}` : "";
  el.innerHTML = `<b>Matriz activa: ${nm}</b>${desc ? ` — ${desc}` : ""}${pieza}`;
}

/* ============================================================
   LISTADO DE MATRICES (E / CM)
   ============================================================ */
function renderMatrizPicker(filtro) {
  const grid = $("matrizGrid");
  if (!grid) return;
  const elegida = String($("textInput").value || "").trim();
  // Si el buscador esta vacio pero el operario tipeo un numero, filtrar por eso.
  const q = String(filtro || "").trim().toLowerCase() || elegida.toLowerCase();
  const matrices = (D.matrices || []).filter(m => {
    if (!q) return true;
    return String(m.n || "").toLowerCase().includes(q) ||
           String(m.d || "").toLowerCase().includes(q);
  });

  if (!matrices.length) {
    grid.innerHTML = `<div class="mz-empty">${(D.matrices || []).length ? "Sin resultados" : "Cargando matrices..."}</div>`;
    return;
  }

  grid.innerHTML = "";
  matrices.forEach(m => {
    const n = String(m.n || "").trim();
    const el = document.createElement("div");
    el.className = "mz" + (n === elegida ? " sel" : "");
    el.dataset.n = n;
    el.innerHTML = `<div class="mz-n">${n}</div><div class="mz-d">${m.d || ""}</div>`;
    el.addEventListener("click", () => elegirMatriz(n));
    grid.appendChild(el);
  });
}

function elegirMatriz(n) {
  $("textInput").value = n;
  $("error").innerText = "";
  document.querySelectorAll("#matrizGrid .mz").forEach(x => {
    x.classList.toggle("sel", x.dataset.n === n);
  });
  renderPiezaPicker(n);
  if (isEduardo() && selected?.code === "E") actualizarRolloPicker(n);
}

/* ============================================================
   SELECTOR DE PIEZA (matrices con varias salidas)
   La pieza elegida viaja como comp_salida_id en el C para que
   el stock se sume en el componente correcto.
   ============================================================ */
let piezaSel = null; // {comp_id, codigo, descripcion}

function salidasDeMatriz(n) {
  return (D.matriz_salidas || {})[String(n || "").trim()] || [];
}

function renderPiezaPicker(n) {
  const wrap = $("piezaPicker"), grid = $("piezaGrid");
  if (!wrap || !grid) return;
  const salidas = (selected && ["E", "CM"].includes(selected.code)) ? salidasDeMatriz(n) : [];
  if (salidas.length < 2) {
    piezaSel = null; wrap.classList.add("hidden"); grid.innerHTML = ""; return;
  }
  if (piezaSel && !salidas.some(x => x.comp_id === piezaSel.comp_id)) piezaSel = null;
  wrap.classList.remove("hidden");
  grid.innerHTML = "";
  salidas.forEach(sa => {
    const el = document.createElement("div");
    el.className = "mz" + (piezaSel?.comp_id === sa.comp_id ? " sel" : "");
    el.innerHTML = `<div class="mz-n">${sa.codigo || ""}</div><div class="mz-d">${sa.descripcion || ""}</div>`;
    el.addEventListener("click", () => { piezaSel = sa; $("error").innerText = ""; renderPiezaPicker(n); });
    grid.appendChild(el);
  });
}

/* ============================================================
   RENDERIZAR BOTONES
   ============================================================ */
function renderOptions() {
  const isEd = isEduardo();
  [1, 2, 3, 4].forEach(r => { $(`row${r}`).innerHTML = ""; });

  const all = isEd ? [...OPTIONS, CT_OPTION] : OPTIONS;
  all.forEach(opt => {
    const el = document.createElement("div");
    el.className = "box" + (opt.isCT ? " ct-btn" : "");
    el.dataset.code = opt.code;
    el.innerHTML = `<div style="font-size:18px;font-weight:900;">${opt.code}</div><div style="font-size:11px;font-weight:600;color:inherit;margin-top:3px;">${opt.desc}</div>`;
    el.addEventListener("click", () => selectOption(opt));
    $(`row${opt.row}`).appendChild(el);
  });
}

function selectOption(opt) {
  selected = opt;
  document.querySelectorAll(".box.selected").forEach(x => x.classList.remove("selected"));
  const box = document.querySelector(`.box[data-code="${opt.code}"]`);
  if (box) box.classList.add("selected");

  $("selectedBox").innerText = opt.code;
  $("selectedDesc").innerText = opt.desc;
  $("selectedArea").classList.remove("hidden");

  const inputArea = $("inputArea");
  const textInput = $("textInput");
  if (opt.needsInput) {
    $("inputLabel").innerText = opt.label || "Ingresa valor";
    textInput.value = "";
    inputArea.classList.remove("hidden");
    setTimeout(() => textInput.focus(), 50);
  } else {
    inputArea.classList.add("hidden");
    textInput.value = "";
  }

  // Listado de matrices para E / CM
  const matrizPicker = $("matrizPicker");
  piezaSel = null;
  if (["E", "CM"].includes(opt.code)) {
    matrizPicker.classList.remove("hidden");
    $("matrizSearch").value = "";
    renderMatrizPicker("");
    renderPiezaPicker("");
  } else {
    matrizPicker.classList.add("hidden");
    renderPiezaPicker("");
  }

  // Eduardo: rollo picker para E
  const rolloPicker = $("rolloPicker");
  if (isEduardo() && opt.code === "E") {
    rolloPicker.classList.remove("hidden");
    $("rolloSelect").innerHTML = '<option value="">-- Elegir rollo --</option>';
    textInput.oninput = () => {
      renderMatrizPicker($("matrizSearch").value);
      renderPiezaPicker(textInput.value.trim());
      actualizarRolloPicker(textInput.value.trim());
    };
    actualizarRolloPicker("");
  } else {
    rolloPicker.classList.add("hidden");
    textInput.oninput = ["E", "CM"].includes(opt.code)
      ? () => {
          renderMatrizPicker($("matrizSearch").value);
          renderPiezaPicker(textInput.value.trim());
        }
      : null;
  }

  // Eduardo: quedoResto para PR
  const quedoRestoWrap = $("quedoRestoWrap");
  if (isEduardo() && opt.code === "PR") {
    quedoRestoWrap.classList.remove("hidden");
    $("quedoRestoChk").checked = false;
  } else {
    quedoRestoWrap.classList.add("hidden");
  }

  renderMatrizInfo();
  $("error").innerText = "";
}

function actualizarRolloPicker(n_matriz) {
  const rollos = n_matriz ? rollosParaMatriz(n_matriz) : [];
  const sel = $("rolloSelect");
  sel.innerHTML = '<option value="">-- Elegir rollo --</option>';
  rollos.forEach(r => {
    const opt = document.createElement("option");
    opt.value = JSON.stringify({ comp_id: r.comp_id, kg_por_rollo: r.kg_por_rollo });
    opt.textContent = `${r.codigo || "Fleje"}: ${r.kg_por_rollo} kg/rollo (${r.rollos} disp.)`;
    sel.appendChild(opt);
  });
  if (!rollos.length && n_matriz && D.matricesMap?.has(n_matriz)) {
    sel.innerHTML = '<option value="">Sin rollos disponibles</option>';
  }
}

function resetSelection() {
  const s = readState(legajoKey());
  if (s?.lastDowntime) return;
  selected = null;
  $("selectedArea").classList.add("hidden");
  $("error").innerText = "";
  $("matrizInfo").classList.add("hidden");
  $("matrizPicker").classList.add("hidden");
  $("piezaPicker").classList.add("hidden");
  piezaSel = null;
  $("rolloPicker").classList.add("hidden");
  $("quedoRestoWrap").classList.add("hidden");
  document.querySelectorAll(".box.selected").forEach(x => x.classList.remove("selected"));
}

/* ============================================================
   ENVIAR
   ============================================================ */
async function sendFast() {
  if (!selected) return;
  const legajo = legajoKey();
  if (!legajo) { alert("Ingresa el número de legajo"); return; }

  maybeSendLateArrival(legajo);

  const texto = String($("textInput").value || "").trim();
  const s = readState(legajo);

  // Validaciones
  if (selected.needsInput) {
    if (!selected.validate?.test(texto)) {
      $("error").innerText = "Solo se permiten números"; return;
    }
  }

  if (selected.code === "E") {
    if (s.matrixNeedsC) {
      alert('Antes de iniciar una nueva matriz (E), enviá al menos 1 Cajón (C).'); return;
    }
    if (!D.matricesMap?.has(texto)) {
      alert(`La matriz ${texto} no existe. Verifica el número.`); return;
    }
  }
  if (selected.code === "CM") {
    if (!D.matricesMap?.has(texto)) {
      alert(`La matriz ${texto} no existe.`); return;
    }
  }
  if (["E", "CM"].includes(selected.code) && salidasDeMatriz(texto).length > 1 && !piezaSel) {
    $("error").innerText = "Esta matriz hace varias piezas. Elegí cuál vas a fabricar.";
    return;
  }
  if (["C", "CT", "RM", "PM", "RD"].includes(selected.code)) {
    if (!s.lastMatrix?.texto) {
      alert('Primero enviá "E (Empecé Matriz)" para registrar una matriz.'); return;
    }
  }
  if (s.lastDowntime && !sameDowntime(s.lastDowntime, { opcion: selected.code, texto })) {
    alert(`Hay un Tiempo Muerto pendiente (${s.lastDowntime.opcion}). Enviá el MISMO para cerrarlo.`);
    return;
  }

  // Eduardo: validar rollo si es E
  let rolloInfo = null;
  if (isEduardo() && selected.code === "E") {
    const rolloVal = $("rolloSelect").value;
    if (rolloVal) {
      try { rolloInfo = JSON.parse(rolloVal); } catch {}
    }
  }

  const tsEvent = isoNow();
  const payload = {
    id: uuidv4(), legajo, opcion: selected.code, descripcion: selected.desc,
    texto, ts_event: tsEvent, hs_inicio: "", matriz: ""
  };

  if (["E", "CM"].includes(payload.opcion) && piezaSel) {
    payload.comp_salida_id = piezaSel.comp_id;
    payload.pieza = piezaSel.codigo || "";
  }
  if (["C", "CT", "RM", "PM", "RD"].includes(payload.opcion)) {
    payload.matriz = s.lastMatrix?.texto || "";
    if (["C", "CT"].includes(payload.opcion) && s.lastMatrix?.comp_salida_id) {
      payload.comp_salida_id = s.lastMatrix.comp_salida_id;
      payload.pieza = s.lastMatrix.pieza || "";
    }
  }
  if (payload.opcion === "C" || payload.opcion === "CT") {
    payload.hs_inicio = computeHsInicio(s);
  }
  if (["RM", "PM", "RD"].includes(payload.opcion)) {
    payload.hs_inicio = tsEvent;
  }
  if (s.lastDowntime && sameDowntime(s.lastDowntime, payload)) {
    payload.hs_inicio = s.lastDowntime.ts || "";
  }

  $("btnEnviar").disabled = true;
  $("btnEnviar").innerText = "Enviando...";

  // Eduardo: tomar/cerrar rollo
  if (isEduardo()) {
    if (selected.code === "E" && rolloInfo) {
      await tomarRollo(legajo, rolloInfo.comp_id, rolloInfo.kg_por_rollo, texto);
    }
    if (selected.code === "CT") {
      await cerrarRollo(legajo, false);
    }
    if (selected.code === "PR") {
      const quedoResto = !!$("quedoRestoChk")?.checked;
      await cerrarRollo(legajo, quedoResto);
    }
  }

  updateStateAfterSend(legajo, payload);
  enqueue(payload);
  renderSummary();
  renderPending();

  selected = null;
  $("selectedArea").classList.add("hidden");
  $("optionsScreen").classList.add("hidden");
  $("legajoScreen").classList.remove("hidden");
  $("matrizInfo").classList.add("hidden");
  $("error").innerText = "";
  document.querySelectorAll(".box.selected").forEach(x => x.classList.remove("selected"));

  try {
    await flushQueue();
    renderPending();
    renderSyncBadge();
    renderSummary();
  } finally {
    $("btnEnviar").disabled = false;
    $("btnEnviar").innerText = "Enviar";
  }
}

/* ============================================================
   ELIMINAR ITEM DEL HISTORIAL
   ============================================================ */
async function deleteHistItem(legajo, idx) {
  if (!confirm("¿Eliminar este registro?")) return;
  const s = readState(legajo);
  const item = s.last2[idx];
  if (!item) return;
  const op = String(item.opcion || "").toUpperCase();

  // Baja logica en la base (si ya se habia enviado)
  if (item.id && item.status === "sent") {
    try {
      await SB.from("produccion").update({ eliminar: "S" }).eq("id_ejecucion", item.id);
    } catch (e) { console.warn("No se pudo marcar eliminado:", e); }
  }

  s.last2.splice(idx, 1);
  if (op === "E") {
    if (s.lastMatrix?.texto === (item.texto || "")) { s.lastMatrix = null; s.matrixNeedsC = false; }
  } else if (op === "C" || op === "CT") {
    s.matrixNeedsC = true;
    s.lastCajon = s.last2.find(x => ["C","CT"].includes(String(x.opcion||"").toUpperCase()))
                  ? { opcion: s.lastCajon?.opcion, texto: s.lastCajon?.texto } : null;
  }
  writeState(legajo, s);

  const q = readQueue().filter(x => x.id !== item.id);
  writeQueue(q);

  renderSummary();
  renderPending();
  renderSyncBadge();
}

/* ============================================================
   TERMINAR DIA
   ============================================================ */
function openTerminarDia() {
  const legajo = legajoKey();
  const s = readState(legajo);
  const cont = $("terminarDiaContent");

  if (s.lastDowntime) {
    cont.innerHTML = `<p>Hay un <b>Tiempo Muerto abierto (${s.lastDowntime.opcion})</b>. Cerralo antes de terminar el día.</p>`;
    $("btnConfirmTD").disabled = true;
  } else if (s.matrixNeedsC) {
    cont.innerHTML = `<p>Hay una <b>Matriz abierta (${s.lastMatrix?.texto})</b> sin cajón. Si terminaste, enviá el cajón (C) primero.</p>`;
    $("btnConfirmTD").disabled = true;
  } else {
    cont.innerHTML = `<p>¿Confirmás que terminaste el día?</p>`;
    $("btnConfirmTD").disabled = false;
  }
  $("terminarDiaModal").classList.remove("hidden");
}

async function confirmarTerminarDia() {
  const legajo = legajoKey();
  const payload = {
    id: uuidv4(), legajo, opcion: "FJ", descripcion: "Fin Jornada",
    texto: "", ts_event: isoNow(), hs_inicio: "", matriz: ""
  };
  const s = readState(legajo);
  s.last2.push({ ...payload, status: "queued" });
  writeState(legajo, s);
  enqueue(payload);

  $("terminarDiaModal").classList.add("hidden");
  await flushQueue();
  renderSummary();
  renderPending();
  renderSyncBadge();
}

/* ============================================================
   HISTORIAL DIAS ANTERIORES
   ============================================================ */
function openHistDias() {
  const leg = legajoKey();
  if (!leg) { alert("Ingresa tu legajo primero"); return; }
  const today = dayKeyAR();
  const dias = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith(LS_PREFIX + "::")) continue;
    const parts = k.split("::");
    const dia = parts[1]; const legStored = parts[2];
    if (legStored !== leg || dia === today) continue;
    try {
      const s = JSON.parse(localStorage.getItem(k));
      if (s?.last2?.length) dias.push({ dia, items: s.last2 });
    } catch {}
  }
  dias.sort((a, b) => b.dia.localeCompare(a.dia));

  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:300;overflow-y:auto;padding:20px;";
  const box = document.createElement("div");
  box.style.cssText = "background:#fff;border-radius:14px;max-width:480px;margin:0 auto;padding:20px;";
  box.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
    <b style="font-size:18px;">Historial días anteriores</b>
    <button id="closeHistDias" style="background:none;border:none;font-size:24px;cursor:pointer;">×</button>
  </div>` + (dias.length ? dias.map(d => `
    <div style="margin-bottom:16px;">
      <div style="font-weight:700;color:#475569;margin-bottom:6px;">${d.dia}</div>
      ${d.items.map(it => `<div style="font-size:14px;padding:4px 0;border-bottom:1px solid #f1f5f9;">${it.opcion}${it.texto ? ` ${it.texto}` : ""} — ${formatDateTimeAR(it.ts_event)}</div>`).join("")}
    </div>`).join("") : '<p style="color:#94a3b8;">Sin historial.</p>');
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  document.getElementById("closeHistDias").onclick = () => overlay.remove();
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}

/* ============================================================
   NAVEGACION
   ============================================================ */
function goToOptions() {
  const legajo = legajoKey();
  if (!legajo) { alert("Ingresa el número de legajo"); return; }
  if (!D.empleados?.[legajo]) {
    alert(`El legajo ${legajo} no existe en el sistema.`); return;
  }
  const emp = D.empleados[legajo];
  const nombre = typeof emp === "string" ? emp : (emp?.nombre || "");
  $("btnBackLabel").innerText = `${nombre} · Legajo ${legajo}`;
  $("legajoScreen").classList.add("hidden");
  $("optionsScreen").classList.remove("hidden");
  renderOptions();
  resetSelection();
}

function goToLegajo() {
  $("optionsScreen").classList.add("hidden");
  $("legajoScreen").classList.remove("hidden");
}

/* ============================================================
   LIMPIEZA DIARIA (retiene 14 dias)
   ============================================================ */
function cleanupOldStates() {
  const keep = new Set();
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    keep.add(`${y}-${m}-${dd}`);
  }
  const toDel = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith(LS_PREFIX + "::")) continue;
    const dia = k.split("::")[1];
    if (dia && !keep.has(dia)) toDel.push(k);
  }
  toDel.forEach(k => localStorage.removeItem(k));
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  cleanupOldStates();

  // Cargar bundle en background
  cargarBundle().catch(e => console.warn("Bundle GP2:", e));

  // Legajo input: render summary on change
  $("legajoInput").addEventListener("input", () => { renderSummary(); renderPending(); });

  $("btnContinuar").addEventListener("click", goToOptions);
  $("legajoInput").addEventListener("keydown", e => { if (e.key === "Enter") goToOptions(); });

  $("btnBackTop").addEventListener("click", goToLegajo);
  $("btnBackLabel").addEventListener("click", goToLegajo);
  $("btnResetSelection").addEventListener("click", resetSelection);
  $("matrizSearch").addEventListener("input", e => renderMatrizPicker(e.target.value));
  $("btnEnviar").addEventListener("click", sendFast);

  $("syncBadge").addEventListener("click", async () => {
    $("syncBadge").innerText = "Enviando...";
    await flushQueue();
    renderSummary(); renderPending(); renderSyncBadge();
  });

  $("btnHistDias").addEventListener("click", openHistDias);
  $("btnTerminarDia").addEventListener("click", openTerminarDia);
  $("btnCancelTD").addEventListener("click", () => $("terminarDiaModal").classList.add("hidden"));
  $("btnConfirmTD").addEventListener("click", confirmarTerminarDia);

  $("editCancel").addEventListener("click", () => $("editModal").classList.add("hidden"));

  renderSummary();
  renderPending();
  renderSyncBadge();

  // Flush periodico (cada 60s)
  setInterval(async () => {
    await flushQueue();
    renderPending();
    renderSyncBadge();
    renderSummary();
  }, 60000);
});
