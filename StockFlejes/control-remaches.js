"use strict";

/* ============================================================
   CONTROL POR PESO · GP2   (archivo historicamente "control-remaches")
   ============================================================
   Recepciones pendientes de control POR PESO: se pesa y se anotan los
   KG controlados contra lo que declaro el proveedor (cantidad_declarada).
   Al confirmar llama al RPC GP2.controlar_recepcion_kg que:
     - pisa la cantidad con los kg controlados
     - marca controlado=true + controlado_en + controlado_por
     - ajusta el movimiento asociado (los triggers recalculan inventario)

   SIRVE PARA VARIOS SECTORES (2026-09-03). Nacio atado al Sector Remache
   (8), pero lo unico especifico de remaches era ese numero: pesar y comparar
   vale igual para cualquier insumo que se controle en kg, y
   controlar_recepcion_kg ya era generico. El sector llega por querystring
   (?sector=N) y por defecto es 8, asi que el link viejo sin parametro sigue
   entrando al control de remaches como siempre.
     ?sector=8 -> Remaches        ?sector=6 -> Plasticos
   [usuario 2026-09-03: "termine de cargar una entrega de maspoli de
   plasticos y no me mando al control. que sea control en kg"]
   El nombre del archivo quedo historico para no romper los links que ya
   existen; el titulo de la pantalla sale del sector que devuelve el bundle.

   v1.4.0 (2026-09-03) — PASAJE KG -> UNIDADES. Si el insumo tiene kg_x_uni, el
   popup muestra a cuantas UNIDADES equivalen los kg pesados y cuantas declaro
   el proveedor [usuario 2026-09-03: "en el control ponga kg y me haga el pasaje
   a unidades con el kg por uni"]. Es el caso de bombillas y remaches: se
   reciben CONTANDO unidades, el movimiento viaja en kg y el stock del sector
   vive en unidades, asi que el operario necesita ver las dos caras.

   v1.3.0 (2026-09-03) — CAJAS x KG POR CAJA. Los insumos marcados
   componente.recibe_en_cajas (hoy el Clavo 505 de Trefilados) no se cuentan:
   vienen en cajas y se pesan. Para esos aparecen dos campos arriba de los kg
   —cajas y kg por caja— que multiplican y completan los kg controlados
   [usuario 2026-09-03: "en el caso del control de este componente que me deje
   poner cant de cajas y kg por caja"]. El campo de kg sigue mandando: se puede
   escribir a mano. Ademas la pantalla pasa a usar gp2-numero.js (la regla de
   numero de la casa) en vez del saneador propio que tenia.
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
/* Cajas x kg por caja: solo para los insumos marcados recibe_en_cajas. */
const cajasBox = $("cajasBox"), inCajas = $("inCajas"), inKgCaja = $("inKgCaja"), lblCajas = $("lblCajas");
/* Pasaje a unidades: solo si el insumo tiene kg_x_uni. */
const lblUni = $("lblUni");

const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const fmt = (n) => Number(n||0).toLocaleString("es-AR", { maximumFractionDigits: 3 });
// El kg por unidad es chico (0,0046 kg un resorte): con 3 decimales se ve "0,005"
// y no sirve para controlar la cuenta.
const fmtKx = (n) => Number(n||0).toLocaleString("es-AR", { maximumFractionDigits: 6 });
/* La regla de numero es una sola y vive en gp2-numero.js: el punto es el
   separador de miles y la coma el decimal. Nada de sanear a mano. */
const parseKg = (v) => window.GP2N.num(v);

let recepciones = [];
let selected = null;
/* Sector a controlar. Sin ?sector= cae en 8 (Remaches), que es como entraba
   esta pantalla antes de que sirviera para varios sectores. */
const SECTOR_ID = Number(new URLSearchParams(location.search).get("sector")) || 8;
/* Como llamar al insumo en los carteles de "no hay nada". El nombre lindo del
   sector lo manda el bundle; esto es solo para el plural de la frase. */
const NOMBRE_PLURAL = { 8: "remaches", 6: "plásticos" }[SECTOR_ID] || "ítems";

function fmtFechaCorta(iso) {
  if (!iso) return "—";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])}-${Number(m[2])}` : String(iso);
}

async function cargar() {
  statusMsg.textContent = "Cargando…"; statusMsg.className = "status";
  try {
    const { data, error } = await SB.rpc("control_kg_bundle", { p_sector_id: SECTOR_ID });
    if (error) throw error;
    recepciones = (data && data.recepciones) || [];
    // El titulo sale del sector que devuelve el bundle, asi no hay que mantener
    // una lista de nombres en el JS cuando se sume otro sector al control por peso.
    const h1 = $("pageTitle");
    if (h1 && data && data.sector) h1.textContent = "Control " + String(data.sector).replace(/^Sector\s+/i, "");
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
    const txt = est === "pendientes" ? `No hay ${NOMBRE_PLURAL} pendientes de control.` :
                est === "controladas" ? `No hay ${NOMBRE_PLURAL} controlados todavía.` :
                `No hay recepciones de ${NOMBRE_PLURAL}.`;
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

/* Pasaje kg -> unidades con el kg_x_uni del insumo [usuario 2026-09-03: "en el
   control ponga kg y me haga el pasaje a unidades con el kg por uni"]. Vale para
   bombillas y remaches por igual: se reciben CONTANDO unidades, el movimiento
   viaja en kg y el stock del sector vive en unidades. Sin kg_x_uni no hay pasaje
   posible y no se muestra nada. */
function pintarUnidades(kg) {
  const kx = Number(selected && selected.kg_x_uni) || 0;
  if (!lblUni) return;
  if (!kx) { lblUni.style.display = "none"; return; }
  lblUni.style.display = "block";
  const decl = Number(selected.cantidad_declarada != null ? selected.cantidad_declarada : selected.cantidad) || 0;
  const uniDecl = decl > 0 ? Math.round(decl / kx) : 0;
  if (kg > 0) {
    const uni = Math.round(kg / kx);
    lblUni.innerHTML = `<b>${fmt(uni)}</b> unidades` +
      (uniDecl ? ` · declaradas <b>${fmt(uniDecl)}</b>` : "") +
      ` <span class="uni-nota">(1 uni = ${fmtKx(kx)} kg)</span>`;
  } else {
    lblUni.innerHTML = (uniDecl ? `Declaradas <b>${fmt(uniDecl)}</b> unidades ` : "") +
      `<span class="uni-nota">(1 uni = ${fmtKx(kx)} kg)</span>`;
  }
}

function calc() {
  const kg = parseKg(inKg.value);
  pintarUnidades(kg);
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

/* Cajas x kg por caja -> kg controlados. El campo de kg sigue siendo el que
   manda (se puede escribir a mano); esto solo lo completa. */
function calcCajas() {
  const cajas = parseKg(inCajas.value), kgCaja = parseKg(inKgCaja.value);
  if (cajas > 0 && kgCaja > 0) {
    const total = cajas * kgCaja;
    lblCajas.textContent = `${fmt(cajas)} caja${cajas === 1 ? "" : "s"} x ${fmt(kgCaja)} kg = ${fmt(total)} kg`;
    // Redondeo a gramos para que 3 x 8,4 no termine en 25,199999999999996
    inKg.value = String(Math.round(total * 1000) / 1000).replace(".", ",");
  } else {
    lblCajas.textContent = cajas > 0 || kgCaja > 0 ? "Falta uno de los dos datos" : "";
  }
  calc();
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
  // Cajas x kg por caja: el insumo lo dice (recibe_en_cajas). Arranca vacio
  // siempre — las cajas y el peso son de ESTA entrega, no del insumo.
  const enCajas = !!it.recibe_en_cajas;
  cajasBox.style.display = enCajas ? "" : "none";
  inCajas.value = ""; inKgCaja.value = ""; lblCajas.textContent = "";
  btnDesmarcar.style.display = it.controlado ? "" : "none";
  calc();
  ov.classList.add("open");
  setTimeout(() => (enCajas ? inCajas : inKg).focus(), 60);
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
// El formato lo pone gp2-numero.js (auto-enganche por inputmode); aca solo se
// recalcula la diferencia contra lo declarado.
inKg.addEventListener("input", calc);
inCajas.addEventListener("input", calcCajas);
inKgCaja.addEventListener("input", calcCajas);
inKgCaja.addEventListener("keydown", e => { if (e.key === "Enter") btnConfirm.click(); });
inKg.addEventListener("keydown", e => { if (e.key === "Enter") btnConfirm.click(); });
btnCancel.addEventListener("click", cerrarPopup);
btnConfirm.addEventListener("click", confirmar);
btnDesmarcar.addEventListener("click", desmarcar);
// NO cerrar al tocar afuera: se sale solo con Cancelar (evita perder lo tipeado).
selEstado.addEventListener("change", cargar);
selProv.addEventListener("change", render);

/* ===== Init ===== */
cargar();
