"use strict";

/* ============================================================
   CONTROL CAJAS · GP2
   ============================================================
   Recepciones de cajas (GP2.recepcion_insumo donde el componente
   es del sector Caja = sector_id 11) pendientes de control fisico.
   La recepcion es rapida (unidades del remito). El control se hace
   despues aca: se cuenta por base x pisos + sueltas.
     total = base * pisos * uni_x_paq + sueltas   (uni_x_paq = 25)
   Al confirmar, llama al RPC GP2.controlar_recepcion_cajas que:
     - guarda base/pisos/sueltas/paquetes/uni_x_paq
     - marca controlado=true + controlado_en + controlado_por
     - pisa la cantidad con el total real
     - ajusta el movimiento asociado (los triggers recalculan inventario)

   v1.4.0 (2026-10-02) — EL BOTÓN "→ Virgilio" VA ARRIBA [Thomas: "que sea un botón arriba. No en esa
   pantalla principal"]: pasa de la fila de acciones (abajo) al tope del popup, debajo del encabezado;
   el input sigue apareciendo al tocarlo. Mismo RPC y misma cuenta (esperado = remito − Virgilio).

   v1.3.1 (2026-10-02) — NO MORIR MUDO SI NO CARGÓ supabase-js [Thomas: "me mandó a esta página
   sin mostrarme el control"]. El cliente se arma dentro de cargar() (con try/catch), no al tope
   del script; si la librería no llegó, se ve un error claro en vez de quedar en "0 items".

   v1.3.0 (2026-10-01) — BOTÓN "→ Virgilio" [Thomas: "si el total del remito no entra en Cervantes
   porque excede el espacio físico, no se baja del camión una parte y va directo para Virgilio ...
   un botón en el control de cajas y flejes que se pueda mandar una cantidad a Virgilio"]. El remito
   entra completo a Cervantes (la O.C./factura cierra por el total); el botón traslada a Virgilio lo
   que no bajó (RPC recepcion_a_virgilio, que reusa enviar_a_virgilio sector→depósito Virgilio) y lo
   deja anotado en recepcion_insumo.virgilio. El control ya no compara contra el remito sino contra
   el ESPERADO = remito − lo de Virgilio, así la diferencia deja de leerse como faltante.

   v1.2.0 (2026-09-23) — LA TOLERANCIA ES 5 % Y SALE DE LA BASE [usuario: "acordate de la regla
   de que todo control no puede exceder el 5% de diferencia"]. Aca habia un 10 % escrito a mano;
   ahora hay UNA clave para toda la casa, parametro.tol_ctrl_pct (5), que control_recepcion_bundle
   manda en tol_pct y leen tambien el control por peso y el de entregas.
   ============================================================ */

// Cliente GP2 (schema GP2 + sesión del login), resuelto cuando hace falta — NO al cargar el
// script. Antes acá había `const SB = window.supabase.createClient(...)` al tope del archivo:
// si el CDN de supabase-js no llegaba (conexión floja de la tablet), esa línea tiraba y, como
// corre antes de cargar(), la pantalla quedaba congelada en "0 items" SIN ningún aviso — ni
// "Cargando…" ni error [Thomas 2026-10-02: "me mandó a esta página sin mostrarme el control"].
// Ahora cliente() se llama DENTRO de cargar()/confirmar()/… (todas con try/catch), así un
// problema de carga se ve como error claro y no como pantalla muda. Usa GP2_SB() (el cliente
// de la casa: schema GP2, sesión del login y redirección sola si la sesión cayó).
let SB = null;
function cliente() {
  if (SB) return SB;
  if (typeof GP2_SB !== "function" || !window.supabase)
    throw new Error("No se pudo cargar. Revisá la conexión y recargá la página.");
  SB = GP2_SB();
  return SB;
}

const $ = (id) => document.getElementById(id);
const listaEl = $("lista");
const statusMsg = $("statusMsg");
const selEstado = $("selEstado");
const selProv = $("selProv");
const ctaCount = $("ctaCount");
const ov = $("ovCtrl");
const inBase = $("inBase"), inPisos = $("inPisos"), inSueltas = $("inSueltas");
const lblPaq = $("lblPaq"), lblUpp = $("lblUpp"), lblTotal = $("lblTotal"), lblDiff = $("lblDiff");
const ctrlTitle = $("ctrlTitle"), ctrlInfo = $("ctrlInfo"), ctrlMsg = $("ctrlMsg");
const btnCancel = $("btnCancel"), btnConfirm = $("btnConfirm"), btnDesmarcar = $("btnDesmarcar");
const virgLine = $("virgLine"), virgBox = $("virgBox"), inVirg = $("inVirg");
const btnVirgilio = $("btnVirgilio"), btnVirgSave = $("btnVirgSave");

const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const fmt = (n) => Number(n||0).toLocaleString("es-AR");
const parseInt0 = (v) => { const n = parseInt(String(v||"").replace(/\D/g,""), 10); return isNaN(n) ? 0 : n; };
const UPP_DEFAULT = 25;

let recepciones = [];  // filas del bundle
let selected = null;
/* Tolerancia del control, en %: la misma para toda la casa (5 %, parametro.tol_ctrl_pct, lo
   manda control_recepcion_bundle) [usuario 2026-09-23: "todo control no puede exceder el 5% de
   diferencia"]. Antes acá había un 10 % escrito a mano. */
let TOL_PCT = 5;

// Lo que se mandó directo a Virgilio (no entró a Cervantes).
const virgDe = (it) => Number(it && it.virgilio) || 0;
// Remito que declaró el proveedor (lo que vino en total).
const declDe = (it) => Number(it && (it.cantidad_declarada != null ? it.cantidad_declarada : it.cantidad)) || 0;
// Lo que SE ESPERA contar físicamente en Cervantes = remito - lo que se fue a Virgilio.
const esperadoDe = (it) => declDe(it) - virgDe(it);

function fmtFechaCorta(iso) {
  if (!iso) return "—";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])}-${Number(m[2])}` : String(iso);
}

async function cargar() {
  statusMsg.textContent = "Cargando…"; statusMsg.className = "status";
  try {
    // misma RPC que control-remaches.js (control_recepcion_bundle), sector Caja = 11
    const { data, error } = await cliente().rpc("control_recepcion_bundle", { p_sector_id: 11 });
    if (error) throw error;
    recepciones = (data && data.recepciones) || [];
    TOL_PCT = Number(data && data.tol_pct) || 5;
    poblarProveedores();
    render();
    statusMsg.textContent = "";
  } catch (err) {
    console.error(err);
    statusMsg.textContent = "Error: " + (err.message || err);
    statusMsg.className = "status bad";
  }
}

function poblarProveedores() {
  const provs = new Set(recepciones.map(r => String(r.proveedor || "").trim()).filter(Boolean));
  const cur = selProv.value;
  selProv.innerHTML = '<option value="todos">Todos</option>' +
    [...provs].sort().map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join("");
  if (cur && [...selProv.options].some(o => o.value === cur)) selProv.value = cur;
}

function filtrar() {
  const estado = selEstado.value;
  const prov = selProv.value;
  return recepciones.filter(r => {
    if (estado === "pendientes" && r.controlado) return false;
    if (estado === "controladas" && !r.controlado) return false;
    if (prov !== "todos" && String(r.proveedor || "").trim() !== prov) return false;
    return true;
  });
}

function agrupar(rows) {
  // Agrupar por REMITO (regla usuario 2026-09-02: "aparece por día, quiero que
  // aparezca por remito"). Con remito real la key NO lleva fecha, asi cada remito
  // es un grupo aunque cruce dias. Solo las recepciones viejas sin remito ("SR")
  // caen al fallback por fecha para no juntar cargas de dias distintos.
  const map = new Map();
  for (const r of rows) {
    const rem = r.remito ? String(r.remito) : "SR";
    const fecha = String(r.fecha || "").slice(0, 10);
    const key = rem === "SR" ? `SR||${fecha}||${r.proveedor||""}` : `${r.proveedor||""}||${rem}`;
    if (!map.has(key)) map.set(key, { fecha, proveedor: r.proveedor, remito: r.remito, items: [] });
    map.get(key).items.push(r);
  }
  return [...map.values()].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
}

function render() {
  const rows = filtrar();
  const total = rows.length;
  const controladas = rows.filter(r => r.controlado).length;
  const pend = total - controladas;
  ctaCount.textContent = pend > 0 ? `${pend} pendiente(s) · ${controladas} OK` : (total ? `${controladas} controladas` : "sin recepciones");
  ctaCount.classList.toggle("done", pend === 0 && total > 0);

  const grupos = agrupar(rows);
  if (!grupos.length) {
    const est = selEstado.value;
    const txt = est === "pendientes" ? "No hay cajas pendientes de control." :
                est === "controladas" ? "No hay cajas controladas todavía." :
                "No hay recepciones de cajas.";
    listaEl.innerHTML = `<div class="empty">${txt}</div>`;
    return;
  }

  let html = "";
  for (const g of grupos) {
    const totG = g.items.length;
    const okG = g.items.filter(x => x.controlado).length;
    const pendG = totG - okG;
    const badgeCls = pendG === 0 ? "rem-badge done" : "rem-badge";
    const badgeTxt = pendG === 0 ? `${okG}/${totG} OK` : `${pendG} pendiente(s)`;
    html += `<div class="rem-block">
      <div class="rem-hdr">
        <div>
          <div class="rem-title">${esc(g.proveedor || "—")} · Remito ${esc(g.remito || "—")}</div>
          <div class="rem-meta">${esc(fmtFechaCorta(g.fecha))} · ${totG} caja(s)</div>
        </div>
        <div class="${badgeCls}">${badgeTxt}</div>
      </div>
      <div class="items-grid">`;
    for (const it of g.items) {
      const cls = it.controlado ? "item-btn done" : "item-btn";
      const decl = declDe(it);
      const virg = virgDe(it);
      const esperado = esperadoDe(it);   // lo que se espera contar en Cervantes
      let ctrlLine = "";
      if (it.controlado) {
        // cantidad guardada = contado + virgilio; el contado físico es cantidad - virgilio.
        const real = (Number(it.cantidad) || 0) - virg;
        const dif = real - esperado;
        const b = Number(it.base) || 0, p = Number(it.pisos) || 0, s = Number(it.sueltas) || 0;
        const paq = Number(it.paquetes) || (b * p);
        const desglose = (b && p) ? `${b}×${p} = ${paq} paq` : (paq ? `${paq} paq` : "");
        const sTxt = s ? ` + ${s} sueltas` : "";
        ctrlLine = `<div class="ctrl">Contado: ${fmt(real)} uni<small>${esc(desglose)}${esc(sTxt)}</small></div>`;
        ctrlLine += (dif === 0)
          ? `<div class="diff ok">coincide ✓</div>`
          : `<div class="diff dif">${dif > 0 ? "+" : ""}${fmt(dif)} vs esperado</div>`;
      }
      const virgLn = virg > 0
        ? `<span class="decl" style="color:#9a3412">→ Virgilio: <b>${fmt(virg)}</b> uni · esperado acá <b>${fmt(esperado)}</b></span>`
        : "";
      html += `<div class="${cls}" data-id="${it.id}">
        <span class="tilde">✓</span>
        <span class="cod">${esc(it.codigo || "—")}</span>
        <span class="desc">${esc(it.descripcion || "")}</span>
        <span class="decl">Declarado: <b>${fmt(decl)}</b> uni</span>
        ${virgLn}
        ${ctrlLine}
      </div>`;
    }
    html += `</div></div>`;
  }
  listaEl.innerHTML = html;

  listaEl.querySelectorAll(".item-btn").forEach(el => {
    el.addEventListener("click", () => {
      const id = Number(el.dataset.id);
      const it = recepciones.find(x => x.id === id);
      if (it) abrirPopup(it);
    });
  });
}

function calc() {
  const b = parseInt0(inBase.value);
  const p = parseInt0(inPisos.value);
  const s = parseInt0(inSueltas.value);
  const upp = UPP_DEFAULT;
  const paq = b * p;
  const total = paq * upp + s;
  lblPaq.textContent = fmt(paq);
  lblUpp.textContent = fmt(upp);
  lblTotal.textContent = `Total: ${fmt(total)} cajas`;
  if (selected) {
    // Se cuenta lo que entró a Cervantes; se compara contra lo esperado = remito - lo de Virgilio.
    const esperado = esperadoDe(selected);
    const virg = virgDe(selected);
    if (total > 0 && esperado > 0) {
      const dif = total - esperado;
      lblDiff.style.display = "block";
      const colaV = virg > 0 ? ` (remito ${fmt(declDe(selected))} − ${fmt(virg)} a Virgilio)` : "";
      if (dif === 0) {
        lblDiff.className = "diff-line ok";
        lblDiff.textContent = `Coincide con lo esperado (${fmt(esperado)} uni)${colaV} ✓`;
      } else {
        lblDiff.className = "diff-line bad";
        const s2 = dif > 0 ? "sobran" : "faltan";
        lblDiff.textContent = `Esperado ${fmt(esperado)}${colaV} · ${s2} ${fmt(Math.abs(dif))} cajas`;
      }
    } else {
      lblDiff.style.display = "none";
    }
  }
  btnConfirm.disabled = !(total > 0);
  return { b, p, s, paq, upp, total };
}

function abrirPopup(it) {
  selected = it;
  ctrlMsg.textContent = ""; ctrlMsg.className = "msg";
  const decl = declDe(it);
  ctrlTitle.textContent = it.controlado
    ? `Revisar control — ${it.codigo || ""}`
    : `Control — ${it.codigo || ""}`;
  ctrlInfo.innerHTML = `
    <b>${esc(it.codigo || "")}</b>${it.descripcion ? " — " + esc(it.descripcion) : ""}
    <br>Proveedor: ${esc(it.proveedor || "—")} · Remito ${esc(it.remito || "—")} · ${esc(fmtFechaCorta(it.fecha))}
    <br>Declarado por proveedor: <b>${fmt(decl)}</b> unidades
  `;
  inBase.value    = it.controlado ? String(it.base    || "") : "";
  inPisos.value   = it.controlado ? String(it.pisos   || "") : "";
  inSueltas.value = it.controlado ? String(it.sueltas || "") : "";
  btnDesmarcar.style.display = it.controlado ? "" : "none";
  renderVirg();
  calc();
  ov.classList.add("open");
  setTimeout(() => inBase.focus(), 60);
}

// Muestra el estado de "a Virgilio" y deja el cajón de carga cerrado al abrir.
function renderVirg() {
  const virg = virgDe(selected);
  if (virg > 0) {
    virgLine.style.display = "block";
    virgLine.innerHTML = `→ Virgilio: <b>${fmt(virg)}</b> uni · esperado en Cervantes <b>${fmt(esperadoDe(selected))}</b>`;
  } else {
    virgLine.style.display = "none";
  }
  virgBox.style.display = "none";
  btnVirgilio.classList.remove("on");
  inVirg.value = virg > 0 ? String(virg) : "";
  btnVirgilio.innerHTML = virg > 0 ? `→ Virgilio: <b>${fmt(virg)}</b> uni` : "→ Virgilio";
}

function cerrarPopup() { ov.classList.remove("open"); selected = null; }

async function confirmar() {
  if (!selected) return;
  const { b, p, s, upp, total } = calc();
  if (total <= 0) { ctrlMsg.textContent = "Ingresá al menos base×pisos o sueltas."; ctrlMsg.className = "msg bad"; return; }

  // Tolerancia contra lo ESPERADO en Cervantes (remito menos lo que se fue a Virgilio).
  const esperado = esperadoDe(selected);
  if (esperado > 0) {
    const dif = total - esperado;
    const pct = Math.abs(dif) / esperado;
    if (pct * 100 > TOL_PCT) {
      const txt = dif > 0 ? `sobran ${fmt(dif)}` : `faltan ${fmt(-dif)}`;
      if (!confirm(`Difiere ±${(pct*100).toFixed(1)}% de lo esperado (tolerancia ${fmt(TOL_PCT)} %).\nEsperado: ${fmt(esperado)} · Contado: ${fmt(total)} (${txt}).\n¿Confirmar de todos modos?`)) return;
    }
  }

  const usuario = (sessionStorage.getItem("gp_user") || sessionStorage.getItem("gp_role") || "").toString().slice(0, 80);
  btnConfirm.disabled = true;
  ctrlMsg.textContent = "Guardando…"; ctrlMsg.className = "msg";
  try {
    const { data, error } = await cliente().rpc("controlar_recepcion_cajas", {
      p_recepcion_id: selected.id,
      p_base: b, p_pisos: p, p_sueltas: s,
      p_uni_x_paq: upp, p_usuario: usuario || null
    });
    if (error) throw error;
    ctrlMsg.textContent = "OK ✓ · Total " + fmt((data && data.total) || total) + " uni"; ctrlMsg.className = "msg ok";
    setTimeout(async () => { cerrarPopup(); await cargar(); }, 350);
  } catch (err) {
    console.error(err);
    ctrlMsg.textContent = "Error: " + (err.message || err); ctrlMsg.className = "msg bad";
    btnConfirm.disabled = false;
  }
}

async function desmarcar() {
  if (!selected || !selected.controlado) return;
  if (!confirm("¿Desmarcar el control? La cantidad vuelve al valor declarado y se borra el desglose.")) return;
  btnDesmarcar.disabled = true;
  ctrlMsg.textContent = "Deshaciendo…"; ctrlMsg.className = "msg";
  try {
    // Por RPC (2026-09-05): anon no puede escribir tablas GP2 directo desde el 2026-08-31,
    // asi que el UPDATE que habia aca fallaba con "permission denied". La RPC vuelve la
    // cantidad al declarado, borra el desglose y ajusta el movimiento (el trigger recalcula
    // el inventario).
    const { error } = await cliente().rpc("descontrolar_recepcion", { p_recepcion_id: selected.id });
    if (error) throw error;
    ctrlMsg.textContent = "Desmarcado ✓"; ctrlMsg.className = "msg ok";
    setTimeout(async () => { cerrarPopup(); await cargar(); }, 300);
  } catch (err) {
    console.error(err);
    ctrlMsg.textContent = "Error: " + (err.message || err); ctrlMsg.className = "msg bad";
    btnDesmarcar.disabled = false;
  }
}

/* ===== A Virgilio: lo que no entró a Cervantes y se bajó directo a Virgilio ===== */
function toggleVirg() {
  if (!selected) return;
  const abrir = virgBox.style.display === "none";
  virgBox.style.display = abrir ? "flex" : "none";
  btnVirgilio.classList.toggle("on", abrir);
  if (abrir) setTimeout(() => inVirg.focus(), 60);
}

async function guardarVirg() {
  if (!selected) return;
  const cant = parseInt0(inVirg.value);
  const remito = declDe(selected);
  if (cant > remito) { ctrlMsg.textContent = `No puede superar el remito (${fmt(remito)} uni).`; ctrlMsg.className = "msg bad"; return; }
  const usuario = (sessionStorage.getItem("gp_user") || sessionStorage.getItem("gp_role") || "").toString().slice(0, 80);
  btnVirgSave.disabled = true;
  ctrlMsg.textContent = "Enviando a Virgilio…"; ctrlMsg.className = "msg";
  try {
    // recepcion_a_virgilio traslada sector(Cervantes) -> depósito de Virgilio y deja anotado cuánto;
    // el control compara después contra remito - lo de Virgilio.
    const { error } = await cliente().rpc("recepcion_a_virgilio", {
      p_recepcion_id: selected.id, p_cantidad: cant, p_usuario: usuario || null
    });
    if (error) throw error;
    ctrlMsg.textContent = cant > 0 ? `A Virgilio: ${fmt(cant)} uni ✓` : "Envío a Virgilio anulado ✓";
    ctrlMsg.className = "msg ok";
    setTimeout(async () => { cerrarPopup(); await cargar(); }, 350);
  } catch (err) {
    console.error(err);
    ctrlMsg.textContent = "Error: " + (err.message || err); ctrlMsg.className = "msg bad";
    btnVirgSave.disabled = false;
  }
}

/* ===== Listeners ===== */
[inBase, inPisos, inSueltas].forEach(el => {
  el.addEventListener("input", () => { el.value = el.value.replace(/\D/g, ""); calc(); });
  el.addEventListener("keydown", e => { if (e.key === "Enter") btnConfirm.click(); });
});
inVirg.addEventListener("input", () => { inVirg.value = inVirg.value.replace(/\D/g, ""); });
inVirg.addEventListener("keydown", e => { if (e.key === "Enter") btnVirgSave.click(); });
btnVirgilio.addEventListener("click", toggleVirg);
btnVirgSave.addEventListener("click", guardarVirg);
btnCancel.addEventListener("click", cerrarPopup);
btnConfirm.addEventListener("click", confirmar);
btnDesmarcar.addEventListener("click", desmarcar);
// NO cerrar al tocar afuera: se sale solo con Cancelar (pedido del usuario,
// evita perder lo tipeado por un toque accidental en el fondo).
selEstado.addEventListener("change", cargar);
selProv.addEventListener("change", render);

/* ===== Init ===== */
cargar();
