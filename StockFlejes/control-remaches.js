"use strict";

/* ============================================================
   CONTROL REMACHES · GP2
   ============================================================
   Recepciones de remaches (GP2.recepcion_insumo donde el componente
   es del Sector Remache = sector_id 8) pendientes de control.
   La recepcion se carga rapido en KG del remito. El control se hace
   despues aca: se pesa y se anotan los KG controlados.
   Al confirmar llama al RPC GP2.controlar_recepcion_kg que:
     - pisa la cantidad con los kg controlados
     - marca controlado=true + controlado_en + controlado_por
     - ajusta el movimiento asociado (los triggers recalculan inventario)
   La cantidad declarada por el proveedor queda en cantidad_declarada.
   ============================================================ */

const SB = window.supabase.createClient(self.SB_URL, self.SB_ANON, { db: { schema: "GP2" } });

const $ = (id) => document.getElementById(id);
const listaEl = $("lista");
const statusMsg = $("statusMsg");
const selEstado = $("selEstado");
const selProv = $("selProv");
const ctaCount = $("ctaCount");
const ov = $("ovCtrl");
const inKg = $("inKg"), lblDiff = $("lblDiff");
const ctrlTitle = $("ctrlTitle"), ctrlInfo = $("ctrlInfo"), ctrlMsg = $("ctrlMsg");
const btnCancel = $("btnCancel"), btnConfirm = $("btnConfirm"), btnDesmarcar = $("btnDesmarcar");

const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const fmt = (n) => Number(n||0).toLocaleString("es-AR", { maximumFractionDigits: 3 });
const parseKg = (v) => { const n = Number(String(v||"").replace(/[^0-9.,]/g,"").replace(",", ".")); return isNaN(n) ? 0 : n; };

let recepciones = [];
let selected = null;

function fmtFechaCorta(iso) {
  if (!iso) return "—";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])}-${Number(m[2])}` : String(iso);
}

async function cargar() {
  statusMsg.textContent = "Cargando…"; statusMsg.className = "status";
  try {
    const { data, error } = await SB.rpc("control_remaches_bundle");
    if (error) throw error;
    recepciones = (data && data.recepciones) || [];
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
  const map = new Map();
  for (const r of rows) {
    const rem = r.remito ? String(r.remito) : "SR";
    const fecha = String(r.fecha || "").slice(0, 10);
    // Agrupar por REMITO, no por dia (regla usuario 2026-09-02). Sin remito ("SR")
    // se cae al fallback por fecha para no mezclar cargas de dias distintos.
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
    const txt = est === "pendientes" ? "No hay remaches pendientes de control." :
                est === "controladas" ? "No hay remaches controlados todavía." :
                "No hay recepciones de remaches.";
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
          <div class="rem-meta">${esc(fmtFechaCorta(g.fecha))} · ${totG} ítem(s)</div>
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
        ctrlLine = `<div class="ctrl">Real: ${fmt(real)} kg</div>`;
        ctrlLine += (Math.abs(dif) < 0.001)
          ? `<div class="diff ok">coincide ✓</div>`
          : `<div class="diff dif">${dif > 0 ? "+" : ""}${fmt(dif)} kg vs declarado</div>`;
      }
      html += `<div class="${cls}" data-id="${it.id}">
        <span class="tilde">✓</span>
        <span class="cod">${esc(it.codigo || "—")}</span>
        <span class="desc">${esc(it.descripcion || "")}</span>
        <span class="decl">Declarado: <b>${fmt(decl)}</b> kg</span>
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
  const kg = parseKg(inKg.value);
  if (selected) {
    const decl = Number(selected.cantidad_declarada != null ? selected.cantidad_declarada : selected.cantidad) || 0;
    if (kg > 0 && decl > 0) {
      const dif = kg - decl;
      lblDiff.style.display = "block";
      if (Math.abs(dif) < 0.001) {
        lblDiff.className = "diff-line ok";
        lblDiff.textContent = `Coincide con lo declarado (${fmt(decl)} kg) ✓`;
      } else {
        lblDiff.className = "diff-line bad";
        const s2 = dif > 0 ? "sobran" : "faltan";
        lblDiff.textContent = `Declarado ${fmt(decl)} kg · ${s2} ${fmt(Math.abs(dif))} kg`;
      }
    } else {
      lblDiff.style.display = "none";
    }
  }
  btnConfirm.disabled = !(kg > 0);
  return kg;
}

function abrirPopup(it) {
  selected = it;
  ctrlMsg.textContent = ""; ctrlMsg.className = "msg";
  const decl = Number(it.cantidad_declarada != null ? it.cantidad_declarada : it.cantidad) || 0;
  ctrlTitle.textContent = it.controlado ? `Revisar control — ${it.codigo || ""}` : `Control — ${it.codigo || ""}`;
  ctrlInfo.innerHTML = `
    <b>${esc(it.codigo || "")}</b>${it.descripcion ? " — " + esc(it.descripcion) : ""}
    <br>Proveedor: ${esc(it.proveedor || "—")} · Remito ${esc(it.remito || "—")} · ${esc(fmtFechaCorta(it.fecha))}
    <br>Declarado por proveedor: <b>${fmt(decl)}</b> kg
  `;
  inKg.value = it.controlado ? String(it.cantidad).replace(".", ",") : "";
  btnDesmarcar.style.display = it.controlado ? "" : "none";
  calc();
  ov.classList.add("open");
  setTimeout(() => inKg.focus(), 60);
}

function cerrarPopup() { ov.classList.remove("open"); selected = null; }

async function confirmar() {
  if (!selected) return;
  const kg = calc();
  if (kg <= 0) { ctrlMsg.textContent = "Ingresá los kg controlados."; ctrlMsg.className = "msg bad"; return; }

  const decl = Number(selected.cantidad_declarada != null ? selected.cantidad_declarada : selected.cantidad) || 0;
  if (decl > 0) {
    const dif = kg - decl;
    const pct = Math.abs(dif) / decl;
    if (pct > 0.10) {
      const txt = dif > 0 ? `sobran ${fmt(dif)}` : `faltan ${fmt(-dif)}`;
      if (!confirm(`Difiere ±${(pct*100).toFixed(1)}% de lo declarado.\nDeclarado: ${fmt(decl)} kg · Controlado: ${fmt(kg)} kg (${txt}).\n¿Confirmar de todos modos?`)) return;
    }
  }

  const usuario = (sessionStorage.getItem("gp_user") || sessionStorage.getItem("gp_role") || "").toString().slice(0, 80);
  btnConfirm.disabled = true;
  ctrlMsg.textContent = "Guardando…"; ctrlMsg.className = "msg";
  try {
    const { data, error } = await SB.rpc("controlar_recepcion_kg", {
      p_recepcion_id: selected.id, p_kg: kg, p_usuario: usuario || null
    });
    if (error) throw error;
    ctrlMsg.textContent = "OK ✓ · " + fmt((data && data.kg) || kg) + " kg"; ctrlMsg.className = "msg ok";
    setTimeout(async () => { cerrarPopup(); await cargar(); }, 350);
  } catch (err) {
    console.error(err);
    ctrlMsg.textContent = "Error: " + (err.message || err); ctrlMsg.className = "msg bad";
    btnConfirm.disabled = false;
  }
}

async function desmarcar() {
  if (!selected || !selected.controlado) return;
  if (!confirm("¿Desmarcar el control? La cantidad vuelve al valor declarado.")) return;
  const decl = Number(selected.cantidad_declarada != null ? selected.cantidad_declarada : selected.cantidad) || 0;
  btnDesmarcar.disabled = true;
  ctrlMsg.textContent = "Deshaciendo…"; ctrlMsg.className = "msg";
  try {
    const { error } = await SB
      .from("recepcion_insumo")
      .update({ controlado: false, controlado_en: null, controlado_por: null, cantidad: decl })
      .eq("id", selected.id);
    if (error) throw error;
    if (selected.movimiento_id) {
      await SB.from("movimiento").update({ cantidad: decl }).eq("id", selected.movimiento_id);
    }
    ctrlMsg.textContent = "Desmarcado ✓"; ctrlMsg.className = "msg ok";
    setTimeout(async () => { cerrarPopup(); await cargar(); }, 300);
  } catch (err) {
    console.error(err);
    ctrlMsg.textContent = "Error: " + (err.message || err); ctrlMsg.className = "msg bad";
    btnDesmarcar.disabled = false;
  }
}

/* ===== Listeners ===== */
inKg.addEventListener("input", () => {
  inKg.value = inKg.value.replace(/[^0-9.,]/g, "").replace(/([.,].*)[.,]/g, "$1");
  calc();
});
inKg.addEventListener("keydown", e => { if (e.key === "Enter") btnConfirm.click(); });
btnCancel.addEventListener("click", cerrarPopup);
btnConfirm.addEventListener("click", confirmar);
btnDesmarcar.addEventListener("click", desmarcar);
// NO cerrar al tocar afuera: se sale solo con Cancelar (evita perder lo tipeado).
selEstado.addEventListener("change", cargar);
selProv.addEventListener("change", render);

/* ===== Init ===== */
cargar();
