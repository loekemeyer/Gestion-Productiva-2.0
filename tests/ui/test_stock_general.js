/* Stocks General v2.0.0 (2026-09-15): la pantalla se rediseñó de un árbol plano
   (Cód/Descripción/Cantidad SIN unidad) al mismo diseño de "Stock por Sector":
   arriba un SELECTOR DE RUBROS y abajo la tabla rica Base | Online (Kg/Caj/Uni) |
   Movimientos | Info, con las columnas adaptadas a cada rubro. Este test fija:
     - que el stock se separe por Kg / Caj / Uni (el pedido central del usuario),
     - que Flejes NO tenga Caj ni Uni×Cajón (y sí N° Fleje),
     - que los rubros que no son sector (Prov AT, Tránsito) rendericen su tabla,
     - el PAYLOAD EXACTO del Ajuste +/- (heredado, contrato que no cambia),
     - los últimos movimientos, y el render celular (390px, tocable, 18px).
   v2.8.0 (2026-10-01): las pestañas DEJAN de ser un destino exclusivo [Thomas: "Cuando entro a
   stock general quiero ver los stocks de todo y después si quiero puedo filtrar por Cervantes,
   Virgilio, Terceros"]. Se entra SIEMPRE viendo "Todos los rubros" combinado (Cervantes +
   Virgilio + Terceros); las pestañas pasan a ser un FILTRO sobre ese índice, no un pane que tapa
   a los otros dos. Virgilio deja de tener su propio motor de tabla (RUBROS_VIR/renderVir): sus
   6 rubros se mudan al RUBROS principal y pasan por el MISMO engine (con columnas de movimiento
   donde corresponde, ej. Bolsas Plásticas — antes se calculaban y se tiraban).
   v2.7.0 (2026-10-01): las 3 cajas DE VERDAD (Cervantes / Virgilio / Terceros — Prov. Servicio,
   Talleristas, Prov. Art. Term. e Inyectores se mudan a su propia pestaña, ya no "Otros" adentro
   de Cervantes) y, en Virgilio, SC/SP/Fleje/Plástico/Caja muestran TODO el universo del sector
   (con stock 0 si todavía no se mandó nada), no sólo lo que ya tiene movimiento.
   v2.6.0 (2026-10-01): Virgilio con contenido — Bolsas Plásticas (se mudó de Cervantes) +
   SC/SP/Fleje/Plástico/Caja en el depósito virgilio_sector (D.inv, sin RPC nueva); Cervantes
   suma el rubro Art. Terminado (lo que Fábrica produjo y no mandó, stock_general_extra_bundle).
   v2.4.0 (2026-10-01): tocar el Máximo abre su desglose (maximo_desglose por comp + ubic). */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const BUNDLE = {
  sect: { '1': { nom: 'Sector Crudo', tipo: 'crudo' }, '2': { nom: 'D1', tipo: 'crudo' }, '12': { nom: 'Terminado', tipo: 'terminado' }, '14': { nom: 'Bolsas Plásticas', tipo: 'insumo' } },
  ubic: {
    '1': { tipo: 'sector', ref: 2, nom: 'D1' },
    '2': { tipo: 'tallerista', ref: 3, nom: 'Cervantes (fábrica)' },
    '3': { tipo: 'tallerista', ref: 6, nom: 'Tall Martin' },
    '4': { tipo: 'virgilio', nom: 'Virgilio' },
    '5': { tipo: 'sector', ref: 12, nom: 'Terminado' },
    '6': { tipo: 'proveedor_servicio', ref: 9, nom: 'Pedernera Ilario' },
    '7': { tipo: 'inyector', ref: 10, nom: 'Inyector Pettofrezza Rafael' },
    // v2.6.0: el depósito de Virgilio para SC (sector 1) — lo que se envió con "Enviar -> Virgilio"
    // de la Tablet y todavía no volvió con "Recibir -> Virgilio".
    '8': { tipo: 'virgilio_sector', ref: 1, nom: 'Sector Crudo en Virgilio' },
    // v2.8.0: Bolsas Plásticas (sector 14) es una ubicación tipo "sector" como cualquier otra —
    // vive del lado Virgilio desde siempre, pero NO es tipo "virgilio_sector", así que el barrido
    // general de Cervantes/Terceros SÍ la recorre (ocultarInv no la excluye).
    '9': { tipo: 'sector', ref: 14, nom: 'Bolsas Plásticas' },
    // v3.1.0: la ubicación REAL de Art. Terminado en producción (ubic 74): tipo art_terminado y SIN
    // NINGUNA fila en inventario — lo que se produjo vive en stock_general_extra_bundle.
    '10': { tipo: 'art_terminado', nom: 'Art. Terminado (Fábrica)' },
  },
  tall: { '3': { nom: 'Fabrica' }, '6': { nom: 'Martin' } },
  prov_serv: { '9': { nom: 'Pedernera Ilario', proceso: 'Cromado' } },
  comp: {
    '10': { cod: 'A10', d: 'Cpo Una', s: 2, um: 'uni', kg_x_uni: 0.05, uxc: 100 },
    '20': { cod: 'T1', d: 'Terminado uno', s: 12, um: 'uni' },
    // v3.1.0: T2 = el caso del 323E — un terminado que nunca se produjo: está en la lista de Art.
    // Terminado (cant 0) y NO tiene fila de inventario en ningún lado.
    '90': { cod: 'T2', d: 'Terminado dos', s: 12, um: 'uni' },
    '30': { cod: 'B5', d: 'Parte be', s: 2, um: 'uni' },
    '50': { cod: 'CAJ1', d: 'Caja 510', s: 11, um: 'uni' }, // sector Caja = insumo de empaque
    '60': { cod: '2405', d: 'PP 2630 (Polipropileno)', s: 14, um: 'kg' }, // MP plastica, kg sin factor
    '80': { cod: 'BOL1', d: 'Bolsa chica', s: 14, um: 'uni' },
  },
  rp: {},
  c2a: {},
  bom_art: {},
  bom_comp: {},
  // el ajuste opera sobre A10 (comp 10) en el sector D1 (ubic 1): una sola ubicacion.
  // Pedernera (ubic 6, PS): A10 procesado en 0 (se muestra) y CAJ1 caja en 0 (SEED, se oculta).
  // B5 (comp 30) esta en DOS lados -el sector y el taller de Martin-: es el caso del usuario,
  // "no se a que sector pertenece el componente". T1 (comp 20) vive en el sector Terminado,
  // que NO tiene boton propio: sin el rubro global no se ve en ningun lado.
  inv: {
    '10:1': { cant: 100, max: 200 }, '30:1': { cant: 50, max: 0 }, '20:5': { cant: 0, max: 0 },
    '10:6': { cant: 0, max: null }, '50:6': { cant: 0, max: null }, '30:3': { cant: 20, max: null },
    '60:7': { cant: 1250, max: null }, // 1.250 kg de PP mandados al inyector Pettofrezza
    '80:9': { cant: 15, max: 40 }, // Bolsas Plásticas: via el barrido general (no via el bloque virg)
    // v2.7.0: la pestaña Virgilio ya NO lee D.inv por virgilio_sector (ver SECTOR[1].filas,
    // campo en_virgilio) — esta fila queda sin consumidor a propósito, es la foto de ANTES.
  },
};
/* Prov AT y transito salen de su propia RPC. */
const EXTRA = {
  prov_at: [{ id: 1, nom: 'Cabral', ubic: 34, filas: [{ cid: 10, cant: 0, max: null }] }],
  transito: [{ cid: 30, ps1: 'Laboratorio FAAT', ps2: 'Guazzaroni Patricio', cant: 7 }],
  // v2.3.1: la resina de cada inyector sale de sus piezas; Pat Bet Plast nunca recibió nada
  // (no tiene fila en inventario) y igual tiene que verse, en 0.
  inyector: [
    { id: 11, nom: 'Pat Bet Plast', ubic: 8, filas: [{ cid: 60, cant: 0 }] },
    { id: 10, nom: 'Pettofrezza Rafael', ubic: 7, filas: [{ cid: 60, cant: 1250 }] },
  ],
  // v2.6.0: lo que Fábrica produjo (T1) y todavía no mandó a Virgilio.
  art_terminado: { ubic: 10, filas: [{ cid: 20, uxc: 12, cant: 36 }, { cid: 90, uxc: 12, cant: 0 }] },
};
/* stock_sector_bundle por sector: SC (1) es el rubro por defecto; Flejes (5) prueba
   que NO salen las columnas de cajones (pedido del usuario, textual). */
const SECTOR = {
  // v2.9.0: Sector Afilado — Y1 tal como está en la base al 01/10 (stock 0, máximo 41.638, sin movimientos)
  4: {
    sector: { id: 4, nombre: 'Sector Afilado' }, ubicacion_id: 4, ubicacion_virgilio_id: null,
    filas: [{ comp_id: 165, cod: 'Y1', desc: 'Cuchilla para Afilar', um: 'unidad', kg_x_uni: null, uni_x_cajon: null,
              online: 0, en_virgilio: 0, maximo: 41638, n_fleje: null, mov: {} }],
  },
  1: {
    sector: { id: 1, nombre: 'Sector Crudo' }, ubicacion_id: 1, ubicacion_virgilio_id: 8,
    filas: [
      {
        comp_id: 10, cod: 'A10', desc: 'Cpo Una', um: 'uni', kg_x_uni: 0.05, uni_x_cajon: 100,
        online: 100, en_virgilio: 25, maximo: 200, n_fleje: null,
        mov: { fabricacion: { ent: 120, sal: 20, n: 3 }, envio_ps: { ent: 0, sal: 80, n: 2 } },
      },
      // v2.7.0: B9 todavía no se mandó a Virgilio (en_virgilio 0) y TIENE que aparecer igual
      // [Thomas 2026-10-01: "tienen que aparecerme los componentes con stock cero"].
      {
        comp_id: 70, cod: 'B9', desc: 'Cpo sin mandar', um: 'uni', kg_x_uni: null, uni_x_cajon: null,
        online: 40, en_virgilio: 0, maximo: null, n_fleje: null, mov: {},
      },
    ],
  },
  5: {
    sector: { id: 5, nombre: 'Sector Fleje' }, ubicacion_id: 9, ubicacion_virgilio_id: null,
    filas: [{
      comp_id: 40, cod: 'F1', desc: 'Fleje uno', um: 'kg', kg_x_uni: 1, uni_x_cajon: null,
      online: 30, en_virgilio: null, maximo: 50, n_fleje: '12',
      mov: { compra: { ent: 60, sal: 0, n: 1 } },
    }],
  },
  /* Garage (9): los codigos vienen DESORDENADOS a proposito para probar el orden numerico
     [Nazareno 2026-09-30: "Primero tendria que aparecer GRJ4, GRJ5...GRJ10, GRJ10A"] */
  9: {
    sector: { id: 9, nombre: 'Sector Garage' }, ubicacion_id: 12, ubicacion_virgilio_id: null,
    filas: ['GRJ12', 'GRJ10A', 'GRJ4', 'GRJ10'].map((cod, i) => ({
      comp_id: 60 + i, cod, desc: 'Garage ' + cod, um: 'uni', kg_x_uni: null, uni_x_cajon: null,
      online: 0, en_virgilio: null, maximo: null, n_fleje: null, mov: {},
    })),
  },
  // v2.8.0: Bolsas Plásticas pasó al rubro principal (mode "sector" como cualquier otro) —
  // ahora SÍ pasa por el motor de columnas de movimiento (antes se calculaban y se tiraban).
  14: {
    sector: { id: 14, nombre: 'Bolsas Plásticas' }, ubicacion_id: 9, ubicacion_virgilio_id: null,
    filas: [{
      comp_id: 80, cod: 'BOL1', desc: 'Bolsa chica', um: 'uni', kg_x_uni: null, uni_x_cajon: null,
      online: 15, en_virgilio: null, maximo: 40, n_fleje: null,
      mov: { compra: { ent: 20, sal: 0, n: 1 } },
    }],
  },
};
/* v2.4.0: maximo_desglose(comp, ubic) por fila. A10 en D1 (ubic 1) = consumo x meses (Crudo/
   Procesado, con tope de 5 cajones que no llega); F1 (ubic 9) = fleje en kg por articulo. */
const MAXD = {
  '10:1': {
    base: 'articulos', unidad: 'uni', maximo: 200, maximo_origen: 'consumo_meses', meses: 2,
    consumo_mes: 100, consumo_x_meses: 200, tope_cajones: 500, cajones: 5,
    comp: { cod: 'A10', uni_x_cajon: 100 }, ubic: { tipo: 'sector', nom: 'D1' },
    filas: [
      { cod: '501', desc: 'Art uno', venta_uni_mes: 60, aporte_uni_mes: 60, aporte_kg: 3 },
      { cod: '502', desc: 'Art dos', venta_uni_mes: 40, aporte_uni_mes: 40, aporte_kg: 2 },
    ],
  },
  '40:9': {
    base: 'articulos', unidad: 'kg', maximo: 50, maximo_origen: 'est_madre', meses: 5,
    consumo_mes: 10, consumo_x_meses: 50, comp: { cod: 'F1' }, ubic: { tipo: 'sector', nom: 'Fleje' },
    filas: [{ cod: '501', desc: 'Art uno', venta_uni_mes: 60, aporte_kg: 10 }],
  },
};
const MOVS = [{
  id: 1, fecha: '2026-08-30T12:00:00', tipo_mov: 'ajuste', comp_id: 10,
  ubic_origen_id: null, ubic_destino_id: 1, cantidad: -5, unidad_origen: 'uni',
  comp_transformado_id: null, cantidad_transformada: null, unidad_destino: 'uni',
}];

// v3.2.0: fixture de la RPC de insumos de Virgilio sin código asignado (pestaña Virgilio)
const VINS_DATA = { actualizado_en: '2026-10-05T14:05:00-03:00', total: 2, con_saldo: 2, filas: [
  { cod_v: 'Mgo Pelador 505', nombre: 'Mango Pelador 505 Rojo', categoria: 'partes_plasticas', unidad: 'Uni', saldo: 27000, ubicacion: null, isis: '' },
  { cod_v: 'N°13', nombre: '84 X 1,75', categoria: 'fleje', unidad: 'Kg', saldo: 3251, ubicacion: 'V14AD', isis: '12345' },
]};

const STUB = `
window.__rpc = [];
window.supabase = { createClient: function(){ return {
  rpc: async function(name, args){
    window.__rpc.push({ n: name, a: args || null });
    if (name === 'movimientos_bundle') return { data: JSON.parse(JSON.stringify(${JSON.stringify(BUNDLE)})), error: null };
    if (name === 'stock_general_extra_bundle') return { data: JSON.parse(JSON.stringify(${JSON.stringify(EXTRA)})), error: null };
    if (name === 'stock_sector_bundle') { var S = ${JSON.stringify(SECTOR)}; return { data: S[args.p_sector_id] || { filas: [], ubicacion_id: null }, error: null }; }
    if (name === 'registrar_movimientos') return { data: { ok: true, n: (args.p_rows || []).length }, error: null };
    if (name === 'composicion_stock') return { data: { movs: [] }, error: null };
    if (name === 'maximo_desglose') { var M = ${JSON.stringify(MAXD)}; return { data: M[args.p_componente_id + ':' + args.p_ubicacion_id] || { base: null, filas: [] }, error: null }; }
    if (name === 'virgilio_insumos_sin_match_bundle') return { data: JSON.parse(JSON.stringify(${JSON.stringify(VINS_DATA)})), error: null };
    if (name === 'virgilio_equivalencia_guardar') return { data: { ok: true, cod_virgilio: (args && args.p_cod_virgilio), componente_id: 999, cod_cervantes: (args && args.p_cod_cervantes), isis: (args && args.p_isis) }, error: null };
    return { data: null, error: { message: 'rpc desconocida ' + name } };
  },
  from: function(){ return { select: function(){ return { order: function(){ return { limit: async function(){
    return { data: JSON.parse(JSON.stringify(${JSON.stringify(MOVS)})), error: null };
  } }; } }; } }; }
};}};
`;

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  page.on('dialog', d => { console.log('DIALOG:', d.message()); d.accept(); });
  await page.route('**/@supabase/supabase-js@2', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/auth-guard.js*', r => r.fulfill({ contentType: 'application/javascript', body: 'window.GP2_AUTH_ON=false;' }));
  await page.route('**/*.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
  await page.goto(ROOT + '/Stocks%20General/StockGeneral_GP2.html');
  await page.waitForSelector('.rubro-btn');
  // v2.8.0: el rubro por defecto es "Todos los rubros" (vista combinada), no Stock SC.
  await page.waitForFunction(() => document.querySelectorAll('#tbody tr').length > 0);

  const vis = (id) => page.evaluate(i => { const e = document.getElementById(i); return !!e && e.offsetParent !== null; }, id);
  const activoPill = (id) => page.evaluate(i => document.getElementById(i).classList.contains('active'), id);

  // ── v2.8.0: AL ENTRAR, "Todos" está activo y la tabla ya es la combinada ──
  const base = await page.evaluate(() => ({
    rubros: document.querySelectorAll('.rubro-btn').length,
    horizontal: document.documentElement.scrollWidth > window.innerWidth,
    hAj: document.querySelector('.hlink') ? document.querySelector('.hlink').getBoundingClientRect().height : 0,
    thead: document.getElementById('thead').innerText,
    body: document.getElementById('tbody').innerText,
  }));
  ok(await activoPill('tabTodos'), 'al entrar, la pestaña "🔎 Todos" está activa');
  ok(base.rubros >= 20, 'con "Todos" activo, la grilla muestra los rubros de las 3 plantas juntas (' + base.rubros + ')');
  ok(!base.horizontal, 'celular 390px: sin scroll horizontal');
  // v3.0.2 ["Ordená por rubro"]: en "Todos" la tabla va por RUBRO, en el orden de los botones —
  // un rubro no vuelve a aparecer después de que empezó otro (antes iba por código y se mezclaban)
  const ordRub = await page.evaluate(() => {
    const orden = Array.from(document.querySelectorAll('#rubros .rubro-btn')).map(b => b.getAttribute('data-k'));
    const seq = Array.from(document.querySelectorAll('#tbody td.rub-cell')).map(td => td.getAttribute('data-rub'));
    const idx = seq.map(k => orden.indexOf(k));
    return { seq: seq.filter((k, i) => i === 0 || seq[i - 1] !== k), creciente: idx.every((v, i) => i === 0 || idx[i - 1] <= v), n: seq.length };
  });
  ok(ordRub.n > 1 && ordRub.creciente, 'Todos: ordenado por rubro en el orden de los botones — ' + ordRub.seq.join(' > '));
  ok(base.hAj >= 44, 'boton Ajuste tocable (' + Math.round(base.hAj) + 'px, minimo 44)');
  ok(await vis('btnAjuste'), '± Ajuste siempre a la vista (ya no se esconde por pestaña)');
  ok(/RUBRO/i.test(base.thead) && /DÓNDE/i.test(base.thead), 'Todos: la tabla dice en qué rubro y en qué lugar está cada fila');
  // Thomas: "quiero ver los stocks de todo" — Cervantes, Virgilio y Terceros, sin tocar nada
  ok(/Pedernera Ilario/.test(base.body), 'Todos: Terceros (Prov. Servicio) ya está, sin filtrar');
  ok(/Martin/.test(base.body), 'Todos: Terceros (Talleristas) ya está, sin filtrar');
  ok(/Cabral/.test(base.body), 'Todos: Terceros (Prov. Art. Term.) ya está, sin filtrar');
  ok(/T1/.test(base.body), 'Todos: Cervantes (Art. Terminado) ya está, sin filtrar');
  ok(/BOL1/.test(base.body), 'Todos: Virgilio (Bolsas Plásticas) ya está, sin filtrar');
  const bol1Count = (base.body.match(/BOL1/g) || []).length;
  ok(bol1Count === 1, 'Bolsas Plásticas NO se duplica (vive del barrido general Y del bloque Virgilio, pero sólo uno la empuja) — ' + bol1Count);

  // A10 vive en varias plantas: el sector D1 (ref 2, rubro Stock SP) por D.inv con 100, y en la
  // contraparte Virgilio del sector Crudo (sid 1, rubro SC en Virgilio, vía stock_sector_bundle)
  // con 25 — son DOS fuentes distintas (D.inv vs. stock_sector_bundle), a propósito desincronizadas
  // en el fixture (igual que puede pasar en producción: lo que se mandó vs. lo que GP2 ve online).
  await page.fill('#q', 'A10');
  await page.waitForFunction(() => document.querySelectorAll('#tbody tr').length > 0);
  const a10dos = await page.$$eval('#tbody tr', es => es.map(e => e.innerText.replace(/\s+/g, ' ')));
  ok(a10dos.some(t => /Stock SP/.test(t) && /\b100\b/.test(t)), 'Todos: A10 de Cervantes (Stock SP, 100) — ' + a10dos.join(' / '));
  ok(a10dos.some(t => /SC en Virgilio/.test(t) && /\b25\b/.test(t)), 'Todos: A10 de Virgilio (SC en Virgilio, 25) — ' + a10dos.join(' / '));
  await page.fill('#q', '');

  // ── v2.8.0: la pestaña "🏭 Cervantes" FILTRA el índice combinado, no lo tapa ──
  await page.click('#tabCervantes');
  ok(await activoPill('tabCervantes') && !(await activoPill('tabTodos')), 'pestaña Cervantes queda activa');
  const cerv = await page.evaluate(() => document.getElementById('tbody').innerText);
  ok(/A10/.test(cerv) && /Stock SP/.test(cerv), 'Cervantes: A10 de Stock SP sigue viéndose');
  ok(!/SC en Virgilio/.test(cerv), 'Cervantes: NO se ve "SC en Virgilio"');
  ok(!/BOL1/.test(cerv), 'Cervantes: NO se ve Bolsas Plásticas (es de Virgilio)');
  ok(!/Pedernera Ilario/.test(cerv), 'Cervantes: NO se ve Prov. Servicio (es de Terceros)');
  ok(!/Cabral/.test(cerv), 'Cervantes: NO se ve Prov. Art. Term. (es de Terceros)');
  const rubrosCerv = await page.$$eval('#rubros .rubro-btn', xs => xs.map(x => x.textContent.trim()));
  ok(rubrosCerv.indexOf('🔎 Todos los rubros') === 0, 'Cervantes: "Todos los rubros" sigue siempre a la vista — ' + rubrosCerv.join(' | '));
  ok(rubrosCerv.indexOf('Talleristas') < 0 && rubrosCerv.indexOf('Bolsas Plásticas') < 0,
     'Cervantes: su selector de rubros NO ofrece Talleristas ni Bolsas Plásticas');
  ok(rubrosCerv.indexOf('Art. Terminado') >= 0, 'Cervantes: tiene el rubro Art. Terminado');
  // v2.9.0: Afilado (sector 4) era el único sector con ubicación sin botón — se conserva
  ok(rubrosCerv.indexOf('Afilado') === rubrosCerv.indexOf('En Movimiento') + 1,
     'Cervantes: botón Afilado (sector 4), después de En Movimiento');
  await page.click('#rubros .rubro-btn:has-text("Afilado")');
  await page.waitForFunction(() => /Y1/.test(document.getElementById('tbody').innerText));
  const afi = await page.evaluate(() => ({ thead: document.getElementById('thead').innerText,
    fila: Array.from(document.querySelectorAll('#tbody tr td')).map(t => t.textContent.trim()).join(' | ') }));
  ok(/FABRICADO/i.test(afi.thead) && /CONSUMIDO/i.test(afi.thead) && /MÁXIMO/i.test(afi.thead),
     'Afilado: columnas Fabricado / Consumido + Máximo — ' + afi.thead.replace(/\s+/g, ' '));
  ok(/Cuchilla para Afilar/.test(afi.fila) && /41\.638/.test(afi.fila), 'Afilado: Y1 con su máximo 41.638 — ' + afi.fila);

  // ── v2.8.0: "🏬 Virgilio" — SC/SP/Fleje/Plástico/Caja con TODO el universo (stock 0 incluido) ──
  await page.click('#tabVirgilio');
  ok(await activoPill('tabVirgilio'), 'pestaña Virgilio queda activa');
  const virg = await page.evaluate(() => document.getElementById('tbody').innerText);
  ok(/BOL1/.test(virg) && !/A10.*Stock SC/.test(virg), 'Virgilio: Bolsas Plásticas sí, Stock SC de Cervantes no');
  ok(!/Pedernera Ilario/.test(virg) && !/Cabral/.test(virg), 'Virgilio: nada de Terceros');
  const rubrosVirg = await page.$$eval('#rubros .rubro-btn', xs => xs.map(x => x.textContent.trim()));
  ok(JSON.stringify(rubrosVirg) === JSON.stringify(['🔎 Todos los rubros', 'Bolsas Plásticas', 'SC en Virgilio', 'SP en Virgilio', 'Flejes en Virgilio', 'Plásticos en Virgilio', 'Cajas en Virgilio']),
     'Virgilio: "Todos los rubros" + sus 6 rubros, en orden — ' + rubrosVirg.join(' | '));

  // v3.2.0: la tabla "Insumos de Virgilio sin asignar a un código" aparece en Virgilio, arriba de los filtros
  ok(await vis('vinsBox'), 'Virgilio: aparece la tabla de insumos sin asignar');
  await page.waitForFunction(() => document.querySelectorAll('#vinsBody tr').length > 0);
  const vins = await page.$$eval('#vinsBody tr', es => es.map(e => Array.from(e.cells).map(td => td.textContent.trim())));
  ok(vins.length === 2, 'Insumos sin asignar: las 2 filas del espejo — ' + vins.length);
  const vMgo = vins.filter(c => c[1] === 'Mgo Pelador 505')[0] || [];
  // columnas: Cod ISIS | Cod V | Cod C | Descripción | Rubro | Saldo | Unidad | Ubicación
  ok(vMgo[3] === 'Mango Pelador 505 Rojo' && vMgo[5] === '27.000', 'Insumos sin asignar: descripción y saldo del espejo — ' + vMgo.join(' | '));
  // v3.3.0: Cod ISIS y Cod C son editables + ✓ para vincular la equivalencia
  const tieneEditor = await page.evaluate(() => {
    const tr = [...document.querySelectorAll('#vinsBody tr')].find(t => t.getAttribute('data-cv') === 'Mgo Pelador 505');
    return !!(tr && tr.querySelector('.vins-cerv') && tr.querySelector('.vins-isis') && tr.querySelector('.vins-ok'));
  });
  ok(tieneEditor, 'Insumos sin asignar: la fila tiene inputs de Cod C / Cod ISIS y el botón ✓');
  await page.evaluate(() => {
    const tr = [...document.querySelectorAll('#vinsBody tr')].find(t => t.getAttribute('data-cv') === 'Mgo Pelador 505');
    tr.querySelector('.vins-cerv').value = 'GRJ31';
    tr.querySelector('.vins-ok').click();
  });
  await page.waitForFunction(() => (window.__rpc || []).some(r => r.n === 'virgilio_equivalencia_guardar'));
  const argEq = await page.evaluate(() => (window.__rpc || []).filter(r => r.n === 'virgilio_equivalencia_guardar').pop().a);
  ok(argEq && argEq.p_cod_virgilio === 'Mgo Pelador 505' && argEq.p_cod_cervantes === 'GRJ31',
     'Vincular: ✓ guarda la equivalencia (Cod V + Cod C) — ' + JSON.stringify(argEq));

  await page.click('#rubros .rubro-btn:has-text("SC en Virgilio")');
  ok(await activoPill('tabVirgilio'), 'al clickear un rubro de Virgilio, la pestaña sigue en Virgilio');
  await page.waitForFunction(() => document.querySelectorAll('#tbody tr').length > 0);
  // v2.7.0: el universo entero del sector (A10 CON stock + B9 en 0), no sólo lo que ya se mandó
  // [Thomas 2026-10-01: "tienen que aparecerme los componentes con stock cero"]. Se lee celda por
  // celda (no el textContent crudo de la fila, que pega los números sin separador).
  const filasSC = await page.$$eval('#tbody tr', es => es.map(e => Array.from(e.cells).map(td => td.textContent.trim())));
  ok(filasSC.length === 2, 'SC en Virgilio: TODO el universo del sector (A10 + B9), no sólo lo que ya tiene stock — ' + filasSC.length);
  const filaA10 = filasSC.filter(c => c[0] === 'A10')[0] || [];
  const filaB9 = filasSC.filter(c => c[0] === 'B9')[0] || [];
  // columnas (sin Caj por sin_caj=false, sin Máximo por sin_max=true): Código|Descripción|Kg|Caj|Uni|Kg×Uni|Uni×Cajón
  ok(filaA10[4] === '25', 'SC en Virgilio: A10 con 25 (lo enviado y no recibido de vuelta) — ' + filaA10.join(' | '));
  ok(filaB9[4] === '0', 'SC en Virgilio: B9 en 0 TAMBIÉN aparece (todavía no se le mandó nada) — ' + filaB9.join(' | '));
  const theadVSC = await page.evaluate(() => document.getElementById('thead').innerText);
  ok(!/MÁXIMO/i.test(theadVSC), 'SC en Virgilio: sin columna Máximo (ese concepto es de la demanda de Cervantes)');
  const hTab = await page.evaluate(() => document.getElementById('tabVirgilio').getBoundingClientRect().height);
  ok(hTab >= 44, 'pestaña tocable (' + Math.round(hTab) + 'px)');
  const horizVir = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  ok(!horizVir, 'Virgilio a 390px: sin scroll horizontal');

  // v2.8.0: Bolsas Plásticas (mode "sector" como cualquier otro) ahora SÍ muestra sus columnas
  // de movimiento — antes (renderVir) se calculaban y se tiraban.
  await page.click('#rubros .rubro-btn:has-text("Bolsas Plásticas")');
  await page.waitForFunction(() => /BOL1/.test(document.getElementById('tbody').innerText));
  const bolThead = await page.evaluate(() => document.getElementById('thead').innerText);
  ok(/COMPRAS/i.test(bolThead), 'Bolsas Plásticas: ahora muestra su columna de movimiento (Compras)');
  const bolCells = await page.$eval('#tbody tr', e => Array.from(e.cells).map(td => td.textContent.trim()));
  // columnas: Código|Descripción|Kg|Caj|Uni|Compras|Envíos a inyector|Kg×Uni|Uni×Cajón|Máximo
  ok(bolCells[0] === 'BOL1' && bolCells[4] === '15' && bolCells[5] === '20',
     'Bolsas Plásticas: BOL1 con 15 de stock y 20 de compras — ' + bolCells.join(' | '));

  // ── v2.8.0: "👥 Terceros" ──
  await page.click('#tabCervantes'); // por las dudas, volver a un estado conocido antes de ir a Terceros
  await page.click('#tabTerceros');
  ok(await activoPill('tabTerceros'), 'pestaña Terceros queda activa');
  ok(!(await vis('vinsBox')), 'la tabla de insumos sin asignar NO aparece fuera de Virgilio');
  const rubrosTerc = await page.$$eval('#rubros .rubro-btn', xs => xs.map(x => x.textContent.trim()));
  ok(JSON.stringify(rubrosTerc) === JSON.stringify(['🔎 Todos los rubros', 'Prov. Servicio', 'Talleristas', 'Prov. Art. Term.', 'Inyectores']),
     'Terceros: "Todos los rubros" + exactamente sus 4 rubros — ' + rubrosTerc.join(' | '));
  const gruposTerc = await page.evaluate(() => {
    const g = []; document.querySelectorAll('#rubros > div').forEach(d => { if (d.classList.contains('rubro-grp')) g.push(d.textContent.trim()); });
    return g;
  });
  ok(JSON.stringify(gruposTerc) === JSON.stringify(['Buscar', 'Terceros']), 'Terceros: dos grupos — Buscar (el índice) y Terceros — ' + gruposTerc.join(' | '));

  await page.click('#rubros .rubro-btn:has-text("Prov. Art. Term.")');
  await page.waitForFunction(() => /Cabral/.test(document.getElementById('tbody').innerText));
  ok(true, 'Terceros · Prov. Art. Terminado: aparece el proveedor con sus cajas/cartones (Cabral)');

  await page.click('#rubros .rubro-btn:has-text("Inyectores")');
  await page.waitForFunction(() => /Pettofrezza Rafael/.test(document.getElementById('tbody').innerText));
  const iny = await page.evaluate(() => ({
    body: document.getElementById('tbody').innerText,
    thead: document.getElementById('thead').innerText,
    celdas: Array.from(document.querySelectorAll('#tbody tr')).map(tr => Array.from(tr.cells).map(t => t.textContent.trim()))
      .filter(c => c[0] === 'Pettofrezza Rafael')[0] || [],
    kpis: document.getElementById('kpis').innerText,
  }));
  ok(!/\bCAJ\b/i.test(iny.thead) && !/MÁXIMO/i.test(iny.thead), 'Terceros · Inyectores: sin Caj ni Máximo');
  // columnas: Inyector | Código | Descripción | Kg | Uni | Kg×Uni
  ok(iny.celdas[0] === 'Pettofrezza Rafael' && iny.celdas[1] === '2405' && iny.celdas[3] === '1.250' && iny.celdas[4] === '—',
     'Terceros · Inyectores: 1.250 kg de PP van en Kg y Uni queda vacío — ' + iny.celdas.join(' | '));
  ok(/Total kg\s*1\.250/i.test(iny.kpis), 'Terceros · Inyectores: el KPI Total kg suma la MP — ' + iny.kpis.replace(/\s+/g, ' '));
  ok(/Pat Bet Plast/.test(iny.body), 'Terceros · Inyectores: aparece Pat Bet Plast aunque nunca se le mandó resina (sin fila en inventario)');

  await page.click('#rubros .rubro-btn:has-text("Prov. Servicio")');
  await page.waitForFunction(() => /Pedernera Ilario/.test(document.getElementById('tbody').innerText));
  const ps = await page.evaluate(() => ({
    thead: document.getElementById('thead').innerText,
    body: document.getElementById('tbody').innerText,
  }));
  ok(!/MÁXIMO/i.test(ps.thead), 'Terceros · PS: la tabla NO tiene columna Máximo (el maximo vive en el sector procesado)');
  ok(/A10/.test(ps.body), 'Terceros · PS: se ve la pieza procesada que el PS cromaria (A10)');
  ok(!/CAJ1/.test(ps.body), 'Terceros · PS: NO aparece la caja (insumo de empaque sembrado en 0 en el PS)');

  // ── de vuelta a Cervantes para el resto de los rubros de sector ──
  await page.click('#tabCervantes');
  ok(await activoPill('tabCervantes') &&
     !(await page.locator('#rubros .rubro-btn:has-text("Prov. Servicio")').count()),
     'vuelve a Cervantes y su selector ya no tiene los rubros de Terceros');
  await page.click('#rubros .rubro-btn:has-text("Stock SC")');
  await page.waitForFunction(() => /A10/.test(document.getElementById('tbody').innerText));
  const sc = await page.evaluate(() => ({
    thead: document.getElementById('thead').innerText,
    row: document.querySelector('#tbody tr').innerText,
  }));

  // el pedido central: el stock separado por Kg / Caj / Uni + Info con Uni×Cajón
  ok(/ONLINE/i.test(sc.thead) && /\bKG\b/i.test(sc.thead) && /\bCAJ\b/i.test(sc.thead) && /\bUNI\b/i.test(sc.thead),
     'SC: el stock se separa en Kg / Caj / Uni (no una "cantidad" cruda)');
  ok(/KG × UNI/i.test(sc.thead) && /UNI × CAJÓN/i.test(sc.thead) && /MÁXIMO/i.test(sc.thead),
     'SC: bloque Info con Kg×Uni, Uni×Cajón y Máximo');
  ok(/FABRICACIÓN/i.test(sc.thead), 'SC: columnas de movimiento propias del sector (Fabricación)');
  // A10: 100 uni, kg_x_uni 0.05 -> 5 kg, uni_x_cajon 100 -> 1 caj
  ok(/A10/.test(sc.row) && /\b100\b/.test(sc.row) && /\b5\b/.test(sc.row),
     'SC: la fila A10 muestra sus Kg/Caj/Uni — ' + sc.row.replace(/\s+/g, ' '));

  // ── v2.4.0: TOCAR EL MÁXIMO ABRE SU DESGLOSE [Elías 2026-10-01] ──
  ok(await page.locator('#tbody td.max-cell').count() === 1, 'SC: la celda Máximo de A10 se puede tocar');
  await page.click('#tbody td.max-cell');
  await page.waitForFunction(() => /Total/.test(document.getElementById('popBody').innerText));
  const mx = await page.evaluate(() => ({
    abierto: document.getElementById('popup').classList.contains('open'),
    titulo: document.getElementById('popTitle').innerText,
    body: document.getElementById('popBody').innerText,
    call: window.__rpc.filter(c => c.n === 'maximo_desglose').pop(),
    horizontal: document.documentElement.scrollWidth > window.innerWidth,
  }));
  ok(mx.abierto && /A10/.test(mx.titulo) && /Máximo/.test(mx.titulo), 'Máximo: abre el popup con el código — ' + mx.titulo.replace(/\s+/g, ' '));
  ok(mx.call && mx.call.a.p_componente_id === 10 && mx.call.a.p_ubicacion_id === 1,
     'Máximo: pide el desglose de ESA fila (componente + ubicación) — ' + JSON.stringify(mx.call && mx.call.a));
  ok(/100 uni\/mes × 2 meses = 200 uni/.test(mx.body), 'Máximo: la cuenta en una línea (consumo/mes × meses) — ' + mx.body.split('\n')[0]);
  ok(/501/.test(mx.body) && /502/.test(mx.body) && /Total \(2\)/.test(mx.body), 'Máximo: la tabla por artículo con su total');
  ok(!/no coincide/.test(mx.body), 'Máximo: si la cuenta cierra con la celda, no hay aviso');
  ok(!mx.horizontal, 'Máximo: celular 390px sin scroll horizontal con el popup abierto');
  await page.click('#popClose');

  // ── FLEJES: sin cajones ni Uni×Cajón, con N° Fleje (pedido textual del usuario) ──
  await page.click('#rubros .rubro-btn:has-text("Flejes")');
  await page.waitForFunction(() => /F1/.test(document.getElementById('tbody').innerText));
  const fle = await page.evaluate(() => document.getElementById('thead').innerText);
  ok(!/\bCAJ\b/i.test(fle) && !/UNI × CAJÓN/i.test(fle), 'Flejes: NO hay columna de cajones ni Uni×Cajón');
  ok(/N° FLEJE/i.test(fle), 'Flejes: sí aparece N° Fleje');
  // El fleje (um kg) va en la columna Kg, NO en Uni [Thomas 2026-10-02: "me pusiste 33 unidades de
  // fleje cuando son kg"]: su stock ya está en kg (inventario y depósito de Virgilio).
  const celF1 = await page.evaluate(() =>
    Array.from(document.querySelector('#tbody tr').cells).map(c => c.textContent.trim()));
  ok(celF1[2] === '30' && celF1[3] === '—', 'Flejes: el stock va en Kg (30) y Uni queda en — (no "30 unidades") — ' + JSON.stringify(celF1.slice(0, 4)));
  // el fleje va en kg por artículo (de la matriz, igual que el máximo)
  await page.click('#tbody td.max-cell');
  await page.waitForFunction(() => /Total/.test(document.getElementById('popBody').innerText));
  const mxF = await page.locator('#popBody').innerText();
  ok(/CONSUME\s*\(KG\/MES\)/i.test(mxF) && /10 kg\/mes × 5 meses = 50 kg/.test(mxF), 'Máximo fleje: en kg por artículo — ' + mxF.replace(/\s+/g, ' '));
  await page.click('#popClose');

  // ── SECTORES: el codigo se ordena numerico, no alfabetico (GRJ4 antes que GRJ10) ──
  await page.click('#rubros .rubro-btn:has-text("Garage")');
  await page.waitForFunction(() => /GRJ4/.test(document.getElementById('tbody').innerText));
  const ordGar = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#tbody tr .cod')).map(e => e.textContent).join(','));
  ok(ordGar === 'GRJ4,GRJ10,GRJ10A,GRJ12', 'Garage: orden numerico del codigo — ' + ordGar);

  // ── Tránsito PS y Art. Terminado: rubros de Cervantes, grupo CERVANTES (NO se mudaron) ──
  // [Thomas, 01/10: "que se llame CERVANTES en vez de SECTORES"] — mismo rótulo que las otras
  // dos plantas (Virgilio / Terceros), ahora las 3 son nombres de planta.
  const grupos = await page.evaluate(() => {
    const g = {}; let cur = null;
    document.querySelectorAll('#rubros > div').forEach(d => {
      if (d.classList.contains('rubro-grp')) cur = d.textContent.trim();
      else d.querySelectorAll('.rubro-btn').forEach(b => { g[b.textContent.trim()] = cur; });
    });
    return g;
  });
  ok(grupos['Tránsito PS'] === 'Cervantes', 'Tránsito PS está en el grupo Cervantes (' + grupos['Tránsito PS'] + ')');
  ok(grupos['Art. Terminado'] === 'Cervantes', 'Art. Terminado está en el grupo Cervantes (' + grupos['Art. Terminado'] + ')');
  ok(!grupos['Inyectores'], 'Inyectores ya no vive en el selector de Cervantes (es de Terceros)');

  await page.click('#rubros .rubro-btn:has-text("Tránsito PS")');
  await page.waitForFunction(() => /Laboratorio FAAT → Guazzaroni Patricio/.test(document.getElementById('tbody').innerText));
  ok(true, 'Tránsito PS: aparece el par PS origen → PS siguiente');

  // ── v2.6.0: Art. Terminado — lo que Fábrica produjo y todavía no mandó a Virgilio ──
  await page.click('#rubros .rubro-btn:has-text("Art. Terminado")');
  await page.waitForFunction(() => /T1/.test(document.getElementById('tbody').innerText));
  const artRow = await page.$eval('#tbody tr', e => e.textContent.replace(/\s+/g, ' ').trim());
  ok(/T1/.test(artRow) && /36/.test(artRow), 'Art. Terminado: T1 con 36 unidades (3 cajas de 12) — ' + artRow);

  // ── v2.8.0: elegir un rubro de OTRA planta sincroniza la pestaña sola ──
  await page.click('#tabTodos');
  ok(await activoPill('tabTodos'), 'vuelve a "Todos"');
  await page.click('#rubros .rubro-btn:has-text("Talleristas")');
  ok(await activoPill('tabTerceros') && !(await activoPill('tabTodos')), 'clickear "Talleristas" desde Todos saltó la pestaña sola a Terceros');
  await page.waitForFunction(() => /Martin/.test(document.getElementById('tbody').innerText));
  // y "Todos los rubros" NO resetea el filtro: sigue mostrando sólo Terceros
  await page.click('#rubros .rubro-btn:has-text("Todos los rubros")');
  ok(await activoPill('tabTerceros'), '"Todos los rubros" no toca la pestaña — sigue en Terceros');
  const todosFiltrado = await page.evaluate(() => document.getElementById('tbody').innerText);
  ok(/Martin/.test(todosFiltrado) && !/A10.*Stock SC/.test(todosFiltrado) && !/BOL1/.test(todosFiltrado),
     '"Todos los rubros" con la pestaña en Terceros: sólo filas de Terceros');

  // ── BUSCAR SIN SABER EL RUBRO (v2.1.0), ahora cruzando las 3 plantas ──
  await page.click('#tabTodos');
  ok(await activoPill('tabTodos'), 'vuelve a "Todos" (sin filtro) para buscar en todo');
  await page.click('#rubros .rubro-btn:has-text("Todos los rubros")');
  await page.waitForFunction(() => /Martin/.test(document.getElementById('tbody').innerText));
  ok(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), 'Todos: celular 390px sin scroll horizontal');
  ok(/T1/.test(await page.evaluate(() => document.getElementById('tbody').innerText)) , 'Todos: aparece lo que NO tiene botón propio (T1 en el sector Terminado)');

  // ── v3.1.0 [usuario 2026-10-05: "Todos los rubros se tiene que armar de todos los items que hay
  // acá adentro"] ── Caso real: buscar 323 no traía el terminado 323E (Art. Terminado, sin NINGUNA fila
  // de inventario). T2 es ese caso; B9 e Y1 son componentes de sector que tampoco tienen fila.
  const filasDe = async (q) => {
    await page.fill('#q', q);
    await page.waitForFunction(() => document.getElementById('status').textContent.indexOf('Todos los rubros') === 0);
    return page.$$eval('#tbody tr', trs => trs.map(tr => ({
      rub: (tr.querySelector('td.rub-cell') || {}).dataset ? tr.querySelector('td.rub-cell').dataset.rub : null,
      cod: (tr.querySelector('.cod') || {}).textContent, txt: tr.innerText.replace(/\s+/g, ' ') })));
  };
  const t2 = (await filasDe('T2')).filter(f => f.cod === 'T2');
  ok(t2.length === 1 && t2[0].rub === 'art', 'Todos: T2 (terminado sin fila de inventario) aparece, en el rubro Art. Terminado — ' + JSON.stringify(t2));
  const t1 = (await filasDe('T1')).filter(f => f.cod === 'T1' && f.rub === 'art');
  ok(t1.length === 1 && /36/.test(t1[0].txt), 'Todos: T1 también entra por Art. Terminado, con sus 36 unidades — ' + JSON.stringify(t1));
  const b9 = (await filasDe('B9')).filter(f => f.cod === 'B9');
  ok(b9.some(f => f.rub === 'sc' && /\b40\b/.test(f.txt)), 'Todos: B9 sin fila de inventario sale en Stock SC con sus 40 — ' + JSON.stringify(b9));
  const y1 = (await filasDe('Y1')).filter(f => f.cod === 'Y1');
  ok(y1.length === 1 && y1[0].rub === 'afi', 'Todos: Y1 (Afilado, sin fila de inventario) aparece una sola vez — ' + JSON.stringify(y1));
  await page.fill('#q', '');

  // LA REGLA, rubro por rubro: cada fila que dibuja un rubro está en "Todos" con ese rubro.
  await page.waitForFunction(() => document.getElementById('status').textContent.indexOf('Todos los rubros') === 0);
  const rubrosBtn = await page.$$eval('#rubros .rubro-btn', bs => bs.map(b => [b.dataset.k, b.textContent.trim()]).filter(p => p[0] !== 'all'));
  const todosPorRubro = await page.evaluate(() => {
    const m = {};
    document.querySelectorAll('#tbody tr').forEach(tr => {
      const c = tr.querySelector('td.rub-cell'); if (!c) return;
      (m[c.dataset.rub] = m[c.dataset.rub] || []).push(tr.querySelector('.cod').textContent);
    });
    return m;
  });
  const faltan = [];
  for (const [k, nom] of rubrosBtn) {
    await page.click('#tabTodos');
    await page.click('#rubros .rubro-btn[data-k="' + k + '"]');
    await page.waitForFunction(n => document.getElementById('status').textContent.indexOf(n + ' · ') === 0, nom);
    const cods = await page.$$eval('#tbody tr .cod', es => es.map(e => e.textContent));
    const cuenta = (arr) => arr.reduce((m, c) => (m[c] = (m[c] || 0) + 1, m), {});
    const enTodos = cuenta(todosPorRubro[k] || []);
    Object.entries(cuenta(cods)).forEach(([c, n]) => { if ((enTodos[c] || 0) < n) faltan.push(nom + ': ' + c); });
  }
  ok(rubrosBtn.length >= 20, 'la guardia recorre los rubros de las 3 plantas (' + rubrosBtn.length + ')');
  ok(faltan.length === 0, 'Todos contiene TODAS las filas de CADA rubro' + (faltan.length ? ' — faltan: ' + faltan.join(', ') : ''));
  await page.click('#tabTodos');
  await page.waitForFunction(() => /Martin/.test(document.getElementById('tbody').innerText));

  // abriendo UN solo rubro (sin haber pasado por "Todos"), "También en…" completa los demás sectores
  // solo: T2 sólo vive en Art. Terminado, que no es de Stock SC.
  await page.evaluate(() => { CACHE = {}; GLOBAL = null; PRECARGA = null; });
  await page.click('#rubros .rubro-btn:has-text("Stock SC")');
  await page.waitForFunction(() => /Stock SC · /.test(document.getElementById('status').textContent));
  await page.fill('#q', 'T2');
  await page.waitForFunction(() => /Art\. Terminado/.test(document.getElementById('hintOtros').innerText));
  ok(true, 'dentro de SC (sin pasar por Todos), buscar T2 avisa que está en Art. Terminado');
  await page.fill('#q', '');
  await page.click('#tabTodos');
  await page.waitForFunction(() => /Martin/.test(document.getElementById('tbody').innerText));

  // el mismo código en dos lugares distintos, de un saque
  await page.fill('#q', 'B5');
  await page.waitForFunction(() => document.querySelectorAll('#tbody tr').length === 3);
  const b5 = await page.locator('#tbody').innerText();
  ok(/Martin/.test(b5) && /D1/.test(b5) && /Laboratorio FAAT/.test(b5),
     'Todos: B5 se ve de un saque en sus tres lugares (sector, tallerista y tránsito) — ' + b5.replace(/\s+/g, ' '));

  // desde adentro de un rubro, el renglón "También en: …" y el salto en un click
  await page.click('#rubros .rubro-btn:has-text("Stock SC")');
  await page.waitForFunction(() => !document.getElementById('hintOtros').classList.contains('hidden'));
  const hint = await page.locator('#hintOtros').innerText();
  ok(/También en otros rubros/i.test(hint) && /Talleristas/.test(hint),
     'dentro de SC, buscar B5 avisa en qué otros rubros está — ' + hint.replace(/\s+/g, ' '));
  ok(await page.locator('#tblEmpty').isVisible(), 'SC no tiene B5: antes la pantalla solo decía "Sin resultados"');
  await page.click('#hintOtros a:has-text("Talleristas")');
  await page.waitForFunction(() => /Martin/.test(document.getElementById('tbody').innerText));
  const salto = await page.evaluate(() => ({ q: document.getElementById('q').value, body: document.getElementById('tbody').innerText }));
  ok(salto.q === 'B5' && /B5/.test(salto.body), 'el salto conserva lo buscado y muestra la fila en el otro rubro');
  ok(await page.locator('#tbody td.max-cell').count() === 0, 'Máximo "—" (B5 en Martin, sin máximo): no se puede tocar');
  // v2.8.0: Talleristas es de la planta TERCEROS — el salto desde "También en…" (desde SC, Cervantes)
  // cambió de pestaña solo, sin que el usuario tocara el selector de planta.
  ok(await activoPill('tabTerceros'), 'el salto a Talleristas cambió la pestaña a Terceros sola');

  // en "Todos", la celda del rubro también lleva a esa pantalla
  await page.click('#tabTodos');
  await page.click('#rubros .rubro-btn:has-text("Todos los rubros")');
  await page.waitForFunction(() => document.querySelectorAll('#tbody td.rub-cell').length > 0);
  await page.click('#tbody td.rub-cell:has-text("Talleristas")');
  await page.waitForFunction(() => document.title.indexOf('Talleristas') >= 0);
  ok(true, 'Todos: click en el rubro de la fila abre ese rubro');
  // de nuevo saltó de pestaña: volver a "Todos" para seguir buscando en el índice completo
  await page.click('#tabTodos');
  await page.click('#rubros .rubro-btn:has-text("Todos los rubros")');
  await page.fill('#q', '2405');
  await page.waitForFunction(() => /2405/.test(document.getElementById('tbody').innerText));
  const r2405 = await page.evaluate(() => Array.from(document.querySelectorAll('#tbody tr')).map(t => t.innerText.replace(/\s+/g, ' ')));
  ok(r2405.length === 2 && r2405.every(t => /Inyectores/.test(t)),
     'Todos: la resina 2405 sale una vez por inyector, sin duplicar la fila de inventario — ' + r2405.join(' / '));
  await page.fill('#q', '');

  // ── ultimos movimientos (vista heredada de Registrar_Movimiento) ──
  await page.click('#grpMovs > summary');
  const movTxt = await page.locator('#tbodyMovs').innerText();
  ok(/Ajuste/i.test(movTxt) && /A10/.test(movTxt) && /D1/.test(movTxt), 'ultimos movimientos: fila con tipo, componente y destino');

  // ── AJUSTE: modal con teclado decimal y payload EXACTO ──
  await page.click('.hlink:has-text("Ajuste")');
  await page.waitForSelector('#modalBg.on');
  const accA = await page.evaluate(() => {
    const q = document.getElementById('f_qty');
    return {
      inputmode: q.getAttribute('inputmode'),
      fs: parseFloat(getComputedStyle(q).fontSize),
      fsSel: parseFloat(getComputedStyle(document.getElementById('f_comp')).fontSize),
    };
  });
  ok(accA.inputmode === 'decimal', 'ajuste: la cantidad abre teclado decimal (admite -/+ con coma)');
  ok(accA.fs >= 18 && accA.fsSel >= 18, 'ajuste: campos de carga >=18px (' + accA.fs + '/' + accA.fsSel + ')');
  await page.selectOption('#f_comp', '10');
  const ubicVal = await page.evaluate(() => document.getElementById('f_ubic').value);
  ok(ubicVal === '1', 'ajuste: la unica ubicacion del componente queda elegida sola (' + ubicVal + ')');
  await page.fill('#f_qty', '-5');
  await page.click('#btnSave');
  await page.waitForFunction(() => window.__rpc.some(c => c.n === 'registrar_movimientos'));
  const call1 = await page.evaluate(() => window.__rpc.find(c => c.n === 'registrar_movimientos'));
  const rowsA = call1.a.p_rows;
  ok(rowsA.length === 1, 'ajuste: 1 sola fila de movimiento');
  const rA = rowsA[0] || {};
  ok(rA.tipo_mov === 'ajuste' && rA.comp_id === 10 && rA.ubic_origen_id === null &&
     rA.ubic_destino_id === 1 && rA.cantidad === -5 && rA.unidad_origen === 'uni' &&
     rA.unidad_destino === 'uni' && rA.comp_transformado_id === null,
     'ajuste: payload identico al de Registrar_Movimiento — ' + JSON.stringify(rA));
  ok(/T12:00:00$/.test(rA.fecha || ''), 'ajuste: la fecha viaja con T12:00:00 como siempre (' + rA.fecha + ')');

  // el stock se recarga despues de cada registro (reload -> movimientos_bundle de nuevo)
  const nBundle = await page.evaluate(() => window.__rpc.filter(c => c.n === 'movimientos_bundle').length);
  ok(nBundle >= 2, 'despues de cada registro se recarga el bundle (' + nBundle + ' cargas)');

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
