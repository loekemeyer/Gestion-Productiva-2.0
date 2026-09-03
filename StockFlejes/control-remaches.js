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

   SE PESA EN KG, SE GUARDA EN LA UNIDAD DE LA RECEPCION (2026-09-03)
   [usuario: "en el control que pueda poner los kg y con el kg por uni de cada
   componente me lo pase a uni"]. Los remitos de remaches y de los plasticos de
   Eduardo Pintos / Pat Bet Plast / Pettofrezza Rafael vienen en UNIDADES y la
   recepcion se guarda en unidades (recepcion_insumo.unidad='uni'), que ademas
   es la unidad canonica del inventario de esos sectores. Contar 5.000 piezas a
   mano no se puede, asi que el control se sigue haciendo con la balanza: se
   tipean los KG pesados y la pantalla los divide por componente.kg_x_uni para
   llegar a las unidades reales, que son las que se comparan contra lo declarado
   y las que se guardan.
     recepcion.unidad = 'uni' + kg_x_uni  -> input en kg, se guarda uni
     recepcion.unidad = 'uni' sin kg_x_uni -> input directo en unidades
     recepcion.unidad = 'kg'               -> input en kg, se guarda kg (lo de siempre)
   La ultima rama mantiene andando las recepciones viejas, que quedaron en kg.
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

/* ===== Unidad de cada recepcion =====
   La recepcion manda: si se cargo en unidades, el control tiene que terminar en
   unidades aunque el operario pese kg. kg_x_uni viene en el bundle por item. */
const kxDe    = (it) => Number(it && it.kg_x_uni) || 0;
/* El kg por unidad tiene 6 decimales (0,00035 en el remache espiral): con el
   fmt() general, que corta en 3, el cartel decia "1 uni = 0 kg" y parecia que
   el dato faltaba. Ya nos mordio una vez (CONOCIMIENTO_GP2.md 4a). */
const fmtKx   = (n) => Number(n||0).toLocaleString("es-AR", { maximumFractionDigits: 6 });
const umDe    = (it) => (String((it && it.unidad) || "kg").toLowerCase() === "kg" ? "kg" : "uni");
/* true = se tipea la balanza en kg y se guarda la cantidad convertida a unidades. */
const pesaAUni = (it) => umDe(it) === "uni" && kxDe(it) > 0;
/* Unidad en la que se TIPEA (siempre kg, salvo que no haya kg_x_uni para convertir). */
const umInput = (it) => (umDe(it) === "uni" && !kxDe(it) ? "uni" : "kg");
/* De lo tipeado a la cantidad real en la unidad de la recepcion. Las unidades
   se redondean: media pieza no existe, y la balanza nunca da exacto. */
function aReal(it, v) {
  if (!pesaAUni(it)) return v;
  return Math.round(v / kxDe(it));
}

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
      const um = umDe(it);   // unidad de la recepcion: 'uni' o 'kg'
      let ctrlLine = "";
      if (it.controlado) {
        const real = Number(it.cantidad) || 0;
        const dif = real - decl;
        ctrlLine = `<div class="ctrl">Real: ${fmt(real)} ${um}</div>`;
        ctrlLine += (Math.abs(dif) < 0.001)
          ? `<div class="diff ok">coincide ✓</div>`
          : `<div class="diff dif">${dif > 0 ? "+" : ""}${fmt(dif)} ${um} vs declarado</div>`;
      }
      html += `<div class="${cls}" data-id="${it.id}">
        <span class="tilde">✓</span>
        <span class="cod">${esc(it.codigo || "—")}</span>
        <span class="desc">${esc(it.descripcion || "")}</span>
        <span class="decl">Declarado: <b>${fmt(decl)}</b> ${um}</span>
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

/* calc(): lee lo tipeado, lo pasa a la unidad de la recepcion y pinta la
   conversion + la diferencia. Devuelve la cantidad REAL (la que se guarda). */
function calc() {
  const v = parseKg(inKg.value);          // lo tipeado (kg, salvo sin kg_x_uni)
  const real = selected ? aReal(selected, v) : v;
  const conv = $("convLine");
  if (selected && pesaAUni(selected)) {
    // El operario pesa; la pantalla le muestra en vivo cuantas piezas son.
    conv.style.display = v > 0 ? "block" : "none";
    conv.innerHTML = v > 0
      ? `= <b>${fmt(real)}</b> uni <span style="color:#666;font-weight:600">(1 uni = ${fmtKx(kxDe(selected))} kg)</span>`
      : "";
  } else if (conv) {
    conv.style.display = "none"; conv.innerHTML = "";
  }
  if (selected) {
    const um = umDe(selected);
    const decl = Number(selected.cantidad_declarada != null ? selected.cantidad_declarada : selected.cantidad) || 0;
    if (real > 0 && decl > 0) {
      const dif = real - decl;
      lblDiff.style.display = "block";
      if (Math.abs(dif) < 0.001) {
        lblDiff.className = "diff-line ok";
        lblDiff.textContent = `Coincide con lo declarado (${fmt(decl)} ${um}) ✓`;
      } else {
        lblDiff.className = "diff-line bad";
        const s2 = dif > 0 ? "sobran" : "faltan";
        lblDiff.textContent = `Declarado ${fmt(decl)} ${um} · ${s2} ${fmt(Math.abs(dif))} ${um}`;
      }
    } else {
      lblDiff.style.display = "none";
    }
  }
  btnConfirm.disabled = !(real > 0);
  return real;
}

function abrirPopup(it) {
  selected = it;
  ctrlMsg.textContent = ""; ctrlMsg.className = "msg";
  const decl = Number(it.cantidad_declarada != null ? it.cantidad_declarada : it.cantidad) || 0;
  const um = umDe(it);
  ctrlTitle.textContent = it.controlado ? `Revisar control — ${it.codigo || ""}` : `Control — ${it.codigo || ""}`;
  ctrlInfo.innerHTML = `
    <b>${esc(it.codigo || "")}</b>${it.descripcion ? " — " + esc(it.descripcion) : ""}
    <br>Proveedor: ${esc(it.proveedor || "—")} · Remito ${esc(it.remito || "—")} · ${esc(fmtFechaCorta(it.fecha))}
    <br>Declarado por proveedor: <b>${fmt(decl)}</b> ${um}
    ${um === "uni" && !kxDe(it)
      ? '<br><span style="color:#b42318;font-weight:800">Sin kg por unidad cargado: contá las unidades (no se puede convertir el peso).</span>'
      : ""}
  `;
  // Que se pide tipear: la balanza (kg) salvo que no haya kg_x_uni para convertir.
  const entrada = umInput(it);
  $("lblKg").textContent = entrada === "kg"
    ? (pesaAUni(it) ? "Kg pesados en la balanza" : "Kg controlados (pesados)")
    : "Unidades controladas (contadas)";
  inKg.placeholder = entrada === "kg" ? "0,0" : "0";
  inKg.setAttribute("inputmode", entrada === "kg" ? "decimal" : "numeric");
  // Al revisar un control ya hecho se repone lo TIPEADO, no lo guardado: si se
  // guardo en uni hay que volver a mostrar los kg que se habian pesado.
  const previo = pesaAUni(it) ? (Number(it.cantidad) || 0) * kxDe(it) : Number(it.cantidad) || 0;
  inKg.value = it.controlado ? String(previo).replace(".", ",") : "";
  btnDesmarcar.style.display = it.controlado ? "" : "none";
  calc();
  ov.classList.add("open");
  setTimeout(() => inKg.focus(), 60);
}

function cerrarPopup() { ov.classList.remove("open"); selected = null; }

async function confirmar() {
  if (!selected) return;
  const um = umDe(selected);
  const real = calc();   // ya convertido a la unidad de la recepcion
  if (real <= 0) {
    ctrlMsg.textContent = umInput(selected) === "kg"
      ? (parseKg(inKg.value) > 0 ? "Ese peso no llega a 1 unidad." : "Ingresá los kg controlados.")
      : "Ingresá las unidades contadas.";
    ctrlMsg.className = "msg bad"; return;
  }

  const decl = Number(selected.cantidad_declarada != null ? selected.cantidad_declarada : selected.cantidad) || 0;
  if (decl > 0) {
    const dif = real - decl;
    const pct = Math.abs(dif) / decl;
    if (pct > 0.10) {
      const txt = dif > 0 ? `sobran ${fmt(dif)}` : `faltan ${fmt(-dif)}`;
      if (!confirm(`Difiere ±${(pct*100).toFixed(1)}% de lo declarado.\nDeclarado: ${fmt(decl)} ${um} · Controlado: ${fmt(real)} ${um} (${txt}).\n¿Confirmar de todos modos?`)) return;
    }
  }

  const usuario = (sessionStorage.getItem("gp_user") || sessionStorage.getItem("gp_role") || "").toString().slice(0, 80);
  btnConfirm.disabled = true;
  ctrlMsg.textContent = "Guardando…"; ctrlMsg.className = "msg";
  try {
    // OJO con el nombre del parametro: controlar_recepcion_kg NO convierte nada,
    // pisa recepcion_insumo.cantidad (y el movimiento) con el numero que recibe.
    // La unidad de la recepcion no cambia, asi que se le manda la cantidad YA
    // expresada en esa unidad: unidades para los remitos en uni, kg para los
    // viejos en kg. El "kg" del nombre quedo del dia que solo servia a remaches.
    const { data, error } = await SB.rpc("controlar_recepcion_kg", {
      p_recepcion_id: selected.id, p_kg: real, p_usuario: usuario || null
    });
    if (error) throw error;
    ctrlMsg.textContent = "OK ✓ · " + fmt((data && data.kg) || real) + " " + um; ctrlMsg.className = "msg ok";
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
  // Contando unidades no hay decimales: media pieza no existe.
  if (selected && umInput(selected) === "uni") inKg.value = inKg.value.replace(/[.,]/g, "");
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
