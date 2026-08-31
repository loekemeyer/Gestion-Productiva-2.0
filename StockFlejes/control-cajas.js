"use strict";

/* ============================================================
   CONTROL CAJAS
   ============================================================
   Recepciones de cajas (rubro='Cajas' en Recepcion_Insumos)
   pendientes de control fisico. La recepcion es rapida (unidades
   del remito). El control se hace despues aca: se cuenta por
   base x pisos + sueltas.
     total = base * pisos * Uni_x_Paq + sueltas
   (Uni_x_Paq viene de la tabla Cajas — hoy uniforme = 25).
   Al confirmar el control:
     - actualiza Recepcion_Insumos.cantidad = total real
     - guarda desglose en rollos_json = { base, pisos, paquetes, sueltas, uni_x_paq }
     - marca controlado = true + controlado_en + controlado_por
   La cantidad declarada por el proveedor queda en cantidad_declarada
   (no se pisa) para poder comparar declarado vs real.
   ============================================================ */

const SUPABASE_URL = "https://hrxfctzncixxqmpfhskv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyeGZjdHpuY2l4eHFtcGZoc2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjQyNjEsImV4cCI6MjA4ODMwMDI2MX0.4L6wguch8UZGhC2VpzrWcCjJGUV-IkYsl9JoCWrOLUs";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (id) => document.getElementById(id);
const listaEl = $("lista");
const statusMsg = $("statusMsg");
const selEstado = $("selEstado");
const selProv = $("selProv");
const ctaCount = $("ctaCount");

const ov = $("ovCtrl");
const inBase = $("inBase");
const inPisos = $("inPisos");
const inSueltas = $("inSueltas");
const lblPaq = $("lblPaq");
const lblUpp = $("lblUpp");
const lblTotal = $("lblTotal");
const lblDiff = $("lblDiff");
const ctrlTitle = $("ctrlTitle");
const ctrlInfo = $("ctrlInfo");
const ctrlMsg = $("ctrlMsg");
const btnCancel = $("btnCancel");
const btnConfirm = $("btnConfirm");
const btnDesmarcar = $("btnDesmarcar");

const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const fmt = (n) => Number(n||0).toLocaleString("es-AR");
const parseInt0 = (v) => { const n = parseInt(String(v||"").replace(/\D/g,""), 10); return isNaN(n) ? 0 : n; };

// UNI x paquete por defecto (por si Cajas no tuviera Uni_x_Paq para algun N_Caja).
const UPP_DEFAULT = 25;

let cajasMap = new Map(); // N_Caja -> { uniXPaq, sector, medidas, cod_isis, descripcion }
let filas = [];          // filas de Recepcion_Insumos con datos enriquecidos
let selected = null;     // fila abierta en el popup

function arDateISO() {
  return new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
function fmtFechaCorta(iso) {
  if (!iso) return "—";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])}-${Number(m[2])}` : String(iso);
}

async function cargarCajas() {
  const { data, error } = await sb.from("Cajas")
    .select('"N_Caja","Uni_x_Paq","Sector","Medidas","Cod_ISIS_LK","Descripcion"');
  if (error) throw error;
  cajasMap.clear();
  (data || []).forEach(c => {
    const n = Number(c["N_Caja"]);
    if (!n) return;
    cajasMap.set(n, {
      uniXPaq: Number(c["Uni_x_Paq"]) || UPP_DEFAULT,
      sector: String(c["Sector"] || "").trim(),
      medidas: String(c["Medidas"] || "").trim(),
      cod_isis: String(c["Cod_ISIS_LK"] || "").trim(),
      descripcion: String(c["Descripcion"] || "").trim()
    });
  });
}

async function cargarRecepciones() {
  const estado = selEstado.value;
  let q = sb.from("Recepcion_Insumos")
    .select("*")
    .eq("rubro", "Cajas")
    .order("fecha", { ascending: false })
    .order("id", { ascending: false });
  if (estado === "pendientes")   q = q.eq("controlado", false);
  if (estado === "controladas")  q = q.eq("controlado", true);
  const { data, error } = await q;
  if (error) throw error;
  filas = (data || []).map(r => {
    const nCaja = Number(String(r.codigo || "").trim());
    const info = cajasMap.get(nCaja) || {};
    return {
      ...r,
      nCaja,
      uniXPaq: info.uniXPaq || UPP_DEFAULT,
      sector: info.sector || "",
      medidas: info.medidas || "",
      descripcion: r.descripcion || info.descripcion || (nCaja ? "Caja " + nCaja : "—"),
      _rj: r.rollos_json || null
    };
  });
}

function poblarProveedores() {
  const provs = new Set(filas.map(f => String(f.proveedor || "").trim()).filter(Boolean));
  const cur = selProv.value;
  selProv.innerHTML = '<option value="todos">Todos</option>' +
    [...provs].sort().map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join("");
  if (cur && [...selProv.options].some(o => o.value === cur)) selProv.value = cur;
}

function agrupar(filasFiltradas) {
  // clave = fecha|proveedor|remito (remito puede ser null → "SR")
  const map = new Map();
  for (const f of filasFiltradas) {
    const rem = f.remito ? String(f.remito) : "SR";
    const key = `${f.fecha}||${f.proveedor||""}||${rem}`;
    if (!map.has(key)) map.set(key, { fecha: f.fecha, proveedor: f.proveedor, remito: f.remito, items: [] });
    map.get(key).items.push(f);
  }
  return [...map.values()].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
}

function render() {
  const provSel = selProv.value;
  let f = filas;
  if (provSel !== "todos") f = f.filter(x => String(x.proveedor || "").trim() === provSel);

  const total = f.length;
  const controladas = f.filter(x => x.controlado).length;
  const pend = total - controladas;
  ctaCount.textContent = pend > 0 ? `${pend} pendiente(s) · ${controladas} OK` : `${controladas} controladas`;
  ctaCount.classList.toggle("done", pend === 0 && total > 0);

  const grupos = agrupar(f);
  if (!grupos.length) {
    listaEl.innerHTML = '<div class="empty">No hay recepciones para mostrar.</div>';
    return;
  }
  let html = "";
  for (const g of grupos) {
    const totalG = g.items.length;
    const okG = g.items.filter(x => x.controlado).length;
    const pendG = totalG - okG;
    const badgeCls = pendG === 0 ? "rem-badge done" : "rem-badge";
    const badgeTxt = pendG === 0 ? `${okG}/${totalG} OK` : `${pendG} pendiente(s)`;
    html += `<div class="rem-block">
      <div class="rem-hdr">
        <div>
          <div class="rem-title">${esc(g.proveedor || "—")} · Remito ${esc(g.remito || "—")}</div>
          <div class="rem-meta">${esc(fmtFechaCorta(g.fecha))} · ${totalG} caja(s)</div>
        </div>
        <div class="${badgeCls}">${badgeTxt}</div>
      </div>
      <div class="items-grid">`;
    for (const it of g.items) {
      const cls = it.controlado ? "item-btn done" : "item-btn";
      const decl = Number(it.cantidad_declarada != null ? it.cantidad_declarada : it.cantidad) || 0;
      let ctrlLine = "";
      if (it.controlado) {
        const real = Number(it.cantidad) || 0;
        const dif = real - decl;
        const rj = it._rj || {};
        const b = Number(rj.base) || 0, p = Number(rj.pisos) || 0, s = Number(rj.sueltas) || 0;
        const paq = Number(rj.paquetes) || (b * p);
        const desglose = (b && p) ? `${b}×${p} = ${paq} paq` : (paq ? `${paq} paq` : "");
        const sTxt = s ? ` + ${s} sueltas` : "";
        ctrlLine = `<div class="ctrl">Real: ${fmt(real)} cajas</div>
          <div class="ctrl" style="color:#555;font-weight:600;font-size:12px">${esc(desglose)}${esc(sTxt)}</div>`;
        if (dif !== 0) {
          ctrlLine += `<div class="diff dif">${dif > 0 ? "+" : ""}${fmt(dif)} vs declarado</div>`;
        } else {
          ctrlLine += `<div class="diff ok">coincide ✓</div>`;
        }
      }
      html += `<div class="${cls}" data-id="${it.id}">
        <span class="tilde">✓</span>
        <span class="caja-n">Caja ${esc(String(it.nCaja || it.codigo || "—"))}</span>
        <span class="medidas">${esc(it.medidas || "")}</span>
        <span class="sector">${esc(it.sector || "")}</span>
        <span class="decl">Declarado: <b>${fmt(decl)}</b> uni</span>
        ${ctrlLine}
      </div>`;
    }
    html += `</div></div>`;
  }
  listaEl.innerHTML = html;

  // Bind clicks
  listaEl.querySelectorAll(".item-btn").forEach(el => {
    el.addEventListener("click", () => {
      const id = Number(el.dataset.id);
      const it = filas.find(x => x.id === id);
      if (it) abrirPopup(it);
    });
  });
}

function calc() {
  const b = parseInt0(inBase.value);
  const p = parseInt0(inPisos.value);
  const s = parseInt0(inSueltas.value);
  const upp = selected ? (selected.uniXPaq || UPP_DEFAULT) : UPP_DEFAULT;
  const paq = b * p;
  const total = paq * upp + s;
  lblPaq.textContent = fmt(paq);
  lblUpp.textContent = fmt(upp);
  lblTotal.textContent = `Total: ${fmt(total)} cajas`;
  // Diff vs declarado
  if (selected) {
    const decl = Number(selected.cantidad_declarada != null ? selected.cantidad_declarada : selected.cantidad) || 0;
    if (total > 0 && decl > 0) {
      const dif = total - decl;
      lblDiff.style.display = "block";
      if (dif === 0) {
        lblDiff.className = "diff-line ok";
        lblDiff.textContent = `Coincide con lo declarado (${fmt(decl)} uni) ✓`;
      } else {
        lblDiff.className = "diff-line bad";
        const s2 = dif > 0 ? "sobran" : "faltan";
        lblDiff.textContent = `Declarado ${fmt(decl)} · ${s2} ${fmt(Math.abs(dif))} cajas`;
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
  ctrlMsg.textContent = "";
  ctrlMsg.className = "msg";
  const decl = Number(it.cantidad_declarada != null ? it.cantidad_declarada : it.cantidad) || 0;
  ctrlTitle.textContent = it.controlado ? "Revisar control — Caja " + (it.nCaja || it.codigo) : "Control — Caja " + (it.nCaja || it.codigo);
  ctrlInfo.innerHTML = `
    <b>Caja ${esc(String(it.nCaja || it.codigo))}</b>${it.medidas ? " — " + esc(it.medidas) : ""}
    ${it.sector ? `<br>Sector: <b>${esc(it.sector)}</b>` : ""}
    <br>Proveedor: ${esc(it.proveedor || "—")} · Remito ${esc(it.remito || "—")} · ${esc(fmtFechaCorta(it.fecha))}
    <br>Declarado por proveedor: <b>${fmt(decl)}</b> unidades
  `;
  // Precargar si ya estaba controlado (revision)
  const rj = it._rj || {};
  inBase.value = it.controlado ? String(rj.base || "") : "";
  inPisos.value = it.controlado ? String(rj.pisos || "") : "";
  inSueltas.value = it.controlado ? String(rj.sueltas || "") : "";
  btnDesmarcar.style.display = it.controlado ? "" : "none";
  calc();
  ov.classList.add("open");
  setTimeout(() => inBase.focus(), 60);
}

function cerrarPopup() { ov.classList.remove("open"); selected = null; }

async function confirmar() {
  if (!selected) return;
  const { b, p, s, paq, upp, total } = calc();
  if (total <= 0) { ctrlMsg.textContent = "Ingresá al menos base×pisos o sueltas."; ctrlMsg.className = "msg bad"; return; }

  const decl = Number(selected.cantidad_declarada != null ? selected.cantidad_declarada : selected.cantidad) || 0;
  if (decl > 0) {
    const dif = total - decl;
    const pct = Math.abs(dif) / decl;
    if (pct > 0.10) { // >10% de diferencia: pedir confirmacion
      const txt = dif > 0 ? `sobran ${fmt(dif)}` : `faltan ${fmt(-dif)}`;
      if (!confirm(`Difiere +/- ${(pct*100).toFixed(1)}% de lo declarado.\nDeclarado: ${fmt(decl)} · Contado: ${fmt(total)} (${txt}).\n¿Confirmar de todos modos?`)) return;
    }
  }

  const usuario = (sessionStorage.getItem("gp_user") || sessionStorage.getItem("gp_role") || "").toString().slice(0, 80);
  btnConfirm.disabled = true;
  ctrlMsg.textContent = "Guardando…"; ctrlMsg.className = "msg";
  try {
    const patch = {
      cantidad: total,
      controlado: true,
      controlado_en: new Date().toISOString(),
      controlado_por: usuario || null,
      rollos_json: { base: b, pisos: p, paquetes: paq, sueltas: s, uni_x_paq: upp }
    };
    const { error } = await sb.from("Recepcion_Insumos").update(patch).eq("id", selected.id);
    if (error) throw error;
    ctrlMsg.textContent = "OK ✓"; ctrlMsg.className = "msg ok";
    setTimeout(async () => { cerrarPopup(); await recargar(); }, 300);
  } catch (err) {
    console.error(err);
    ctrlMsg.textContent = "Error: " + (err.message || err); ctrlMsg.className = "msg bad";
    btnConfirm.disabled = false;
  }
}

async function desmarcar() {
  if (!selected || !selected.controlado) return;
  if (!confirm("¿Desmarcar el control? La cantidad volverá al valor declarado y se borrará el desglose.")) return;
  const decl = Number(selected.cantidad_declarada != null ? selected.cantidad_declarada : selected.cantidad) || 0;
  btnDesmarcar.disabled = true;
  ctrlMsg.textContent = "Deshaciendo…"; ctrlMsg.className = "msg";
  try {
    const patch = {
      controlado: false,
      controlado_en: null,
      controlado_por: null,
      rollos_json: null,
      cantidad: decl // vuelve al declarado
    };
    const { error } = await sb.from("Recepcion_Insumos").update(patch).eq("id", selected.id);
    if (error) throw error;
    ctrlMsg.textContent = "Desmarcado ✓"; ctrlMsg.className = "msg ok";
    setTimeout(async () => { cerrarPopup(); await recargar(); }, 300);
  } catch (err) {
    console.error(err);
    ctrlMsg.textContent = "Error: " + (err.message || err); ctrlMsg.className = "msg bad";
    btnDesmarcar.disabled = false;
  }
}

async function recargar() {
  statusMsg.textContent = "Cargando…"; statusMsg.className = "status";
  try {
    await cargarRecepciones();
    poblarProveedores();
    render();
    statusMsg.textContent = "";
  } catch (err) {
    console.error(err);
    statusMsg.textContent = "Error: " + (err.message || err); statusMsg.className = "status bad";
  }
}

/* ===== Listeners ===== */
[inBase, inPisos, inSueltas].forEach(el => {
  el.addEventListener("input", () => { el.value = el.value.replace(/\D/g, ""); calc(); });
  el.addEventListener("keydown", e => { if (e.key === "Enter") btnConfirm.click(); });
});
btnCancel.addEventListener("click", cerrarPopup);
btnConfirm.addEventListener("click", confirmar);
btnDesmarcar.addEventListener("click", desmarcar);
ov.addEventListener("click", e => { if (e.target === ov) cerrarPopup(); });
selEstado.addEventListener("change", recargar);
selProv.addEventListener("change", render);

/* ===== Init ===== */
(async () => {
  statusMsg.textContent = "Cargando cajas…"; statusMsg.className = "status";
  try {
    await cargarCajas();
    await recargar();
  } catch (err) {
    console.error(err);
    statusMsg.textContent = "Error: " + (err.message || err); statusMsg.className = "status bad";
  }
})();
