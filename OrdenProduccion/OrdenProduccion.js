"use strict";

/* =====================================================================
   Orden de Produccion (schema GP2)

   Que calcula
   -----------
   Por cada MATRIZ, cuantas unidades hay que fabricar para llenar los
   maximos de los sectores que esa matriz produce, expresado en unidades,
   cajones y kilos (kilos de pieza y kilos de fleje a consumir).

   De donde sale cada dato
   -----------------------
   GP2.ruta_paso (tipo_paso='matriz')  -> que matriz produce que sector,
                                          entrando desde que fleje.
   GP2.matriz.partes_por_kilo_de_fleje -> piezas por kilo de fleje (con
                                          desperdicio) para pasar a kg.
   GP2.componente                      -> uni_x_cajon y kg_x_uni del sector.
   GP2.inventario (ubicacion Sector     -> maximo (en unidades) y cantidad
   Crudo / Sector Procesado)              actual del sector.

   Una matriz puede alimentar varios sectores entrando desde flejes
   distintos (ej. matriz 28: J2 y J5 desde el fleje A1, A15 desde el F1A).
   Por eso la orden se agrupa por FLEJE dentro de cada matriz: cada bloque
   es un fleje distinto y no se mezclan al cortar.

   Cuando la matriz entrega a un sector de transito (piezas a medio hacer
   tipo "E6-M132"), se sigue la cadena hasta el sector crudo o procesado
   final, porque el faltante que manda es el de la punta de la cadena.
   ===================================================================== */

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { db: { schema: "GP2" } });

/* ===== BLOQUE: DOM ===== */
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const totalesEl = document.getElementById("totales");
const searchInput = document.getElementById("searchInput");
const filtroDestino = document.getElementById("filtroDestino");
const filtroFleje = document.getElementById("filtroFleje");
const soloFaltante = document.getElementById("soloFaltante");
const btnImprimir = document.getElementById("btnImprimir");

/* ===== BLOQUE: ESTADO ===== */
const UBIC_DESTINO = { crudo: "Sector Crudo", procesado: "Sector Procesado" };
const STOCK_KEY = "ordenprod_stock_manual_v1";
const MAX_SALTOS_CADENA = 8;

let ordenesG = [];        // una entrada por (matriz, fleje)
let stockManualG = {};    // { componenteId: unidades } override del operario

/* ===== BLOQUE: HELPERS ===== */
function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function normalizeText(s) {
  return String(s == null ? "" : s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function num(v) {
  if (v == null || v === "") return 0;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function fmtUni(n) {
  return Math.round(n).toLocaleString("es-AR");
}

function fmtDec(n, dec) {
  return Number(n).toLocaleString("es-AR", {
    minimumFractionDigits: dec, maximumFractionDigits: dec
  });
}

async function fetchAllPaginated(tabla, cols) {
  const PAGE = 1000;
  let from = 0;
  const out = [];
  for (;;) {
    const { data, error } = await sb.from(tabla).select(cols).range(from, from + PAGE - 1);
    if (error) throw new Error(tabla + ": " + error.message);
    const rows = data || [];
    out.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

function leerStockManual() {
  try {
    const raw = localStorage.getItem(STOCK_KEY);
    const obj = raw ? JSON.parse(raw) : null;
    return obj && typeof obj === "object" ? obj : {};
  } catch (e) {
    return {};
  }
}

function guardarStockManual() {
  try {
    localStorage.setItem(STOCK_KEY, JSON.stringify(stockManualG));
  } catch (e) { /* sin localStorage, se pierde al recargar */ }
}

/* ===== BLOQUE: CARGA ===== */
async function cargarTodo() {
  try {
    statusEl.textContent = "Cargando datos de GP2...";
    stockManualG = leerStockManual();

    const [sectores, componentes, flejeDet, matrices, pasos, ubicaciones, inventario] =
      await Promise.all([
        fetchAllPaginated("sector", "id,tipo,nombre"),
        fetchAllPaginated("componente", "id,codigo,descripcion,sector_id,kg_x_uni,uni_x_cajon"),
        fetchAllPaginated("fleje_detalle", "componente_id,n_fleje,medida_mm,kg_uni_desp"),
        fetchAllPaginated("matriz", "id,n_matriz,descripcion,partes_por_kilo_de_fleje"),
        fetchAllPaginated("ruta_paso", "tipo_paso,matriz_id,comp_entrada_id,comp_salida_id"),
        fetchAllPaginated("ubicacion", "id,nombre"),
        fetchAllPaginated("inventario", "componente_id,ubicacion_id,cantidad,maximo")
      ]);

    ordenesG = construirOrdenes({
      sectores, componentes, flejeDet, matrices, pasos, ubicaciones, inventario
    });

    poblarFiltroFlejes();
    filtrarYRender();
  } catch (e) {
    statusEl.textContent = "Error cargando datos: " + e.message;
    statusEl.classList.add("status-error");
  }
}

/* ===== BLOQUE: ARMADO DE LA ORDEN ===== */
function construirOrdenes(d) {
  const tipoPorSector = new Map(d.sectores.map(s => [s.id, s.tipo]));

  const compPorId = new Map();
  d.componentes.forEach(c => {
    compPorId.set(c.id, {
      id: c.id,
      codigo: c.codigo || "",
      descripcion: c.descripcion || "",
      tipo: tipoPorSector.get(c.sector_id) || "",
      kgUni: num(c.kg_x_uni),
      uniCajon: num(c.uni_x_cajon)
    });
  });

  const flejePorComp = new Map(d.flejeDet.map(f => [f.componente_id, f]));
  const matrizPorId = new Map(d.matrices.map(m => [m.id, m]));

  // Ubicaciones destino: el maximo a llenar es el del sector, no el del
  // tallerista ni el de Virgilio.
  const ubicPorNombre = new Map(d.ubicaciones.map(u => [u.nombre, u.id]));
  const ubicDestino = {
    crudo: ubicPorNombre.get(UBIC_DESTINO.crudo),
    procesado: ubicPorNombre.get(UBIC_DESTINO.procesado)
  };

  const invPorClave = new Map();
  d.inventario.forEach(i => {
    invPorClave.set(i.componente_id + "|" + i.ubicacion_id, i);
  });

  // ruta_paso repite el mismo paso en cada ruta que lo usa: deduplicar.
  const pasosMatriz = [];
  const vistos = new Set();
  d.pasos.forEach(p => {
    if (p.tipo_paso !== "matriz") return;
    if (!p.matriz_id || !p.comp_entrada_id || !p.comp_salida_id) return;
    const k = p.matriz_id + "|" + p.comp_entrada_id + "|" + p.comp_salida_id;
    if (vistos.has(k)) return;
    vistos.add(k);
    pasosMatriz.push(p);
  });

  // Para seguir cadenas de transito: que pasos arrancan desde cada componente.
  const pasosPorEntrada = new Map();
  pasosMatriz.forEach(p => {
    if (!pasosPorEntrada.has(p.comp_entrada_id)) pasosPorEntrada.set(p.comp_entrada_id, []);
    pasosPorEntrada.get(p.comp_entrada_id).push(p);
  });

  // Un componente de transito no tiene maximo propio: el faltante que manda
  // es el del sector crudo/procesado donde termina la cadena.
  function resolverDestinos(compId, visitados, saltos) {
    const comp = compPorId.get(compId);
    if (!comp) return [];
    if (comp.tipo === "crudo" || comp.tipo === "procesado") return [compId];
    if (comp.tipo !== "transito") return [];
    if (saltos >= MAX_SALTOS_CADENA || visitados.has(compId)) return [];
    visitados.add(compId);
    const salidas = pasosPorEntrada.get(compId) || [];
    const out = new Set();
    salidas.forEach(p => {
      resolverDestinos(p.comp_salida_id, visitados, saltos + 1).forEach(x => out.add(x));
    });
    return [...out];
  }

  // Agrupa por (matriz, componente de entrada). La entrada es el fleje:
  // dos flejes distintos = dos bloques distintos de la misma matriz.
  const bloques = new Map();

  pasosMatriz.forEach(p => {
    const matriz = matrizPorId.get(p.matriz_id);
    const entrada = compPorId.get(p.comp_entrada_id);
    if (!matriz || !entrada) return;

    const destinos = resolverDestinos(p.comp_salida_id, new Set(), 0);
    if (!destinos.length) return;

    const clave = p.matriz_id + "|" + p.comp_entrada_id;
    if (!bloques.has(clave)) {
      const fd = flejePorComp.get(entrada.id);
      bloques.set(clave, {
        matrizId: matriz.id,
        nMatriz: matriz.n_matriz || "",
        descMatriz: matriz.descripcion || "",
        // piezas por kilo de fleje: incluye el desperdicio del corte
        partesPorKilo: num(matriz.partes_por_kilo_de_fleje),
        entradaCod: entrada.codigo,
        entradaTipo: entrada.tipo,
        esFleje: entrada.tipo === "fleje",
        nFleje: fd ? (fd.n_fleje || "") : "",
        medidaFleje: fd ? (fd.medida_mm || "") : "",
        destinos: new Map()
      });
    }
    const bloque = bloques.get(clave);

    destinos.forEach(destId => {
      if (bloque.destinos.has(destId)) return;
      const dest = compPorId.get(destId);
      const ubicId = ubicDestino[dest.tipo];
      const inv = ubicId ? invPorClave.get(destId + "|" + ubicId) : null;
      bloque.destinos.set(destId, {
        compId: destId,
        sector: dest.codigo,
        descripcion: dest.descripcion,
        tipo: dest.tipo,
        uniCajon: dest.uniCajon,
        kgUni: dest.kgUni,
        maximoUni: inv ? num(inv.maximo) : 0,
        stockUni: inv ? num(inv.cantidad) : 0,
        // el paso pudo llegar por una cadena de transito
        viaTransito: dest.id !== p.comp_salida_id,
        pasoDirecto: compPorId.get(p.comp_salida_id)
          ? compPorId.get(p.comp_salida_id).codigo : ""
      });
    });
  });

  return [...bloques.values()]
    .map(b => ({ ...b, destinos: [...b.destinos.values()] }))
    .sort((a, b) => {
      const na = parseInt(a.nMatriz, 10), nb = parseInt(b.nMatriz, 10);
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
      return String(a.nMatriz).localeCompare(String(b.nMatriz), "es");
    });
}

/* ===== BLOQUE: CALCULO POR DESTINO ===== */
// Faltante = maximo del sector - lo que ya hay. Todo arranca en unidades:
// los cajones y los kilos son conversiones de ese faltante.
function calcularDestino(dest, partesPorKilo) {
  const stock = (stockManualG[dest.compId] != null)
    ? num(stockManualG[dest.compId])
    : dest.stockUni;

  const faltanteUni = Math.max(0, dest.maximoUni - stock);

  return {
    ...dest,
    stockUsado: stock,
    stockManual: stockManualG[dest.compId] != null,
    faltanteUni,
    faltanteCaj: dest.uniCajon > 0 ? faltanteUni / dest.uniCajon : null,
    maximoCaj: dest.uniCajon > 0 ? dest.maximoUni / dest.uniCajon : null,
    kgPieza: dest.kgUni > 0 ? faltanteUni * dest.kgUni : null,
    kgFleje: partesPorKilo > 0 ? faltanteUni / partesPorKilo : null
  };
}

function calcularBloque(bloque) {
  const destinos = bloque.destinos.map(d => calcularDestino(d, bloque.partesPorKilo));
  return {
    ...bloque,
    destinosCalc: destinos,
    totalUni: destinos.reduce((s, d) => s + d.faltanteUni, 0),
    totalCaj: destinos.reduce((s, d) => s + (d.faltanteCaj || 0), 0),
    totalKgPieza: destinos.reduce((s, d) => s + (d.kgPieza || 0), 0),
    totalKgFleje: destinos.reduce((s, d) => s + (d.kgFleje || 0), 0)
  };
}

/* ===== BLOQUE: FILTROS ===== */
function poblarFiltroFlejes() {
  const flejes = new Map();
  ordenesG.forEach(b => {
    if (!b.esFleje) return;
    const label = b.nFleje ? ("N° " + b.nFleje + " (" + b.entradaCod + ")") : b.entradaCod;
    flejes.set(b.entradaCod, label);
  });
  const ordenados = [...flejes.entries()].sort((a, b) =>
    a[1].localeCompare(b[1], "es", { numeric: true })
  );
  ordenados.forEach(([cod, label]) => {
    const opt = document.createElement("option");
    opt.value = cod;
    opt.textContent = label;
    filtroFleje.appendChild(opt);
  });
}

function filtrarYRender() {
  const q = normalizeText(searchInput.value);
  const destinoSel = filtroDestino.value;
  const flejeSel = filtroFleje.value;
  const soloConFaltante = soloFaltante.checked;

  const bloques = ordenesG
    .map(calcularBloque)
    .map(b => {
      // El filtro de destino recorta los sectores dentro del bloque, asi los
      // totales de fleje reflejan lo que se esta mirando.
      if (!destinoSel) return b;
      const destinos = b.destinosCalc.filter(d => d.tipo === destinoSel);
      return {
        ...b,
        destinosCalc: destinos,
        totalUni: destinos.reduce((s, d) => s + d.faltanteUni, 0),
        totalCaj: destinos.reduce((s, d) => s + (d.faltanteCaj || 0), 0),
        totalKgPieza: destinos.reduce((s, d) => s + (d.kgPieza || 0), 0),
        totalKgFleje: destinos.reduce((s, d) => s + (d.kgFleje || 0), 0)
      };
    })
    .filter(b => b.destinosCalc.length > 0)
    .filter(b => !flejeSel || b.entradaCod === flejeSel)
    .filter(b => !soloConFaltante || b.totalUni > 0)
    .filter(b => {
      if (!q) return true;
      const heno = [
        b.nMatriz, b.descMatriz, b.entradaCod, b.nFleje, b.medidaFleje,
        ...b.destinosCalc.map(d => d.sector + " " + d.descripcion)
      ].join(" ");
      return normalizeText(heno).includes(q);
    });

  renderTotales(bloques);
  renderOrdenes(bloques);
}

/* ===== BLOQUE: RENDER ===== */
function renderTotales(bloques) {
  const matrices = new Set(bloques.map(b => b.nMatriz));
  const totUni = bloques.reduce((s, b) => s + b.totalUni, 0);
  const totCaj = bloques.reduce((s, b) => s + b.totalCaj, 0);
  const totKgFleje = bloques.reduce((s, b) => s + b.totalKgFleje, 0);

  totalesEl.classList.remove("hidden");
  totalesEl.innerHTML = `
    <div class="tot-item"><span class="tot-lbl">Matrices</span><span class="tot-val">${matrices.size}</span></div>
    <div class="tot-item"><span class="tot-lbl">Ordenes (matriz x fleje)</span><span class="tot-val">${bloques.length}</span></div>
    <div class="tot-item"><span class="tot-lbl">Unidades a fabricar</span><span class="tot-val">${fmtUni(totUni)}</span></div>
    <div class="tot-item"><span class="tot-lbl">Cajones a llenar</span><span class="tot-val">${fmtDec(totCaj, 1)}</span></div>
    <div class="tot-item"><span class="tot-lbl">Kg de fleje a consumir</span><span class="tot-val">${fmtDec(totKgFleje, 1)}</span></div>
  `;

  statusEl.textContent = bloques.length
    ? "Maximos y stock del Sector Crudo y Sector Procesado (GP2.inventario). El stock se puede corregir a mano en cada fila."
    : "";
}

function renderOrdenes(bloques) {
  if (!bloques.length) {
    resultEl.innerHTML = `<div class="vacio">No hay ordenes con los filtros actuales.</div>`;
    return;
  }

  // Bloques de la misma matriz van juntos: cada uno es un fleje distinto.
  const porMatriz = new Map();
  bloques.forEach(b => {
    if (!porMatriz.has(b.nMatriz)) porMatriz.set(b.nMatriz, []);
    porMatriz.get(b.nMatriz).push(b);
  });

  const html = [...porMatriz.entries()].map(([nMatriz, lista]) => {
    const desc = lista[0].descMatriz;
    const avisoFlejes = lista.length > 1
      ? `<div class="aviso-flejes">Esta matriz entra desde ${lista.length} flejes distintos: cada bloque va por separado, no mezclar.</div>`
      : "";

    return `
      <section class="orden">
        <header class="orden-head">
          <div class="orden-matriz">
            <span class="mat-n">Matriz ${escapeHtml(nMatriz)}</span>
            <span class="mat-desc">${escapeHtml(desc)}</span>
          </div>
        </header>
        ${avisoFlejes}
        ${lista.map(renderBloque).join("")}
      </section>`;
  }).join("");

  resultEl.innerHTML = html;
  enlazarInputsStock();
}

function renderBloque(b) {
  const entradaLbl = b.esFleje
    ? `Fleje N° ${escapeHtml(b.nFleje || "?")}` +
      (b.medidaFleje ? ` <span class="fleje-med">${escapeHtml(b.medidaFleje)}</span>` : "") +
      ` <span class="fleje-cod">${escapeHtml(b.entradaCod)}</span>`
    : `Entrada ${escapeHtml(b.entradaCod)} <span class="fleje-cod">${escapeHtml(b.entradaTipo)}</span>`;

  const kgFlejeTot = b.esFleje && b.partesPorKilo > 0
    ? `${fmtDec(b.totalKgFleje, 1)} kg`
    : "&mdash;";

  const filas = b.destinosCalc.map(d => `
    <tr class="${d.faltanteUni > 0 ? "" : "fila-ok"}">
      <td class="sector">${escapeHtml(d.sector)}</td>
      <td>${escapeHtml(d.descripcion)}
        ${d.viaTransito ? `<span class="via">via ${escapeHtml(d.pasoDirecto)}</span>` : ""}
      </td>
      <td><span class="chip chip-${d.tipo}">${d.tipo === "crudo" ? "Crudo" : "Procesado"}</span></td>
      <td class="num">${fmtUni(d.maximoUni)}</td>
      <td class="num">${d.maximoCaj == null ? "&mdash;" : fmtDec(d.maximoCaj, 1)}</td>
      <td class="num">
        <input type="number" class="stock-input ${d.stockManual ? "manual" : ""}"
               data-comp="${d.compId}" min="0" step="1"
               value="${Math.round(d.stockUsado)}" />
      </td>
      <td class="num falta">${fmtUni(d.faltanteUni)}</td>
      <td class="num">${d.faltanteCaj == null ? "&mdash;" : fmtDec(d.faltanteCaj, 1)}</td>
      <td class="num">${d.kgPieza == null ? "&mdash;" : fmtDec(d.kgPieza, 1)}</td>
      <td class="num kgfleje">${d.kgFleje == null ? "&mdash;" : fmtDec(d.kgFleje, 1)}</td>
    </tr>`).join("");

  return `
    <div class="bloque">
      <div class="bloque-head">
        <div class="bloque-entrada">${entradaLbl}</div>
        <div class="bloque-tot">
          <span>A fabricar: <b>${fmtUni(b.totalUni)}</b> uni</span>
          <span><b>${fmtDec(b.totalCaj, 1)}</b> cajones</span>
          <span>Fleje a consumir: <b>${kgFlejeTot}</b></span>
        </div>
      </div>
      <div class="tabla-wrap">
        <table class="tabla">
          <thead>
            <tr>
              <th>Sector</th>
              <th>Descripcion</th>
              <th>Destino</th>
              <th class="num">Max uni</th>
              <th class="num">Max caj</th>
              <th class="num">Stock uni</th>
              <th class="num">Falta uni</th>
              <th class="num">Falta caj</th>
              <th class="num">Kg pieza</th>
              <th class="num">Kg fleje</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
      ${b.esFleje && b.partesPorKilo > 0
        ? `<div class="bloque-nota">${fmtDec(b.partesPorKilo, 2)} piezas por kilo de fleje (con desperdicio).</div>`
        : ""}
    </div>`;
}

function enlazarInputsStock() {
  resultEl.querySelectorAll(".stock-input").forEach(inp => {
    inp.addEventListener("change", () => {
      const compId = inp.dataset.comp;
      const v = inp.value.trim();
      if (v === "") delete stockManualG[compId];
      else stockManualG[compId] = num(v);
      guardarStockManual();
      filtrarYRender();
    });
  });
}

/* ===== BLOQUE: INIT ===== */
searchInput.addEventListener("input", filtrarYRender);
filtroDestino.addEventListener("change", filtrarYRender);
filtroFleje.addEventListener("change", filtrarYRender);
soloFaltante.addEventListener("change", filtrarYRender);
btnImprimir.addEventListener("click", () => window.print());

document.addEventListener("DOMContentLoaded", cargarTodo);
