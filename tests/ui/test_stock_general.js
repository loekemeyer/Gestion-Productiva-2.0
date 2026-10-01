/* Stocks General v2.0.0 (2026-09-15): la pantalla se rediseñó de un árbol plano
   (Cód/Descripción/Cantidad SIN unidad) al mismo diseño de "Stock por Sector":
   arriba un SELECTOR DE RUBROS y abajo la tabla rica Base | Online (Kg/Caj/Uni) |
   Movimientos | Info, con las columnas adaptadas a cada rubro. Este test fija:
     - que el stock se separe por Kg / Caj / Uni (el pedido central del usuario),
     - que Flejes NO tenga Caj ni Uni×Cajón (y sí N° Fleje),
     - que los rubros que no son sector (Prov AT, Tránsito) rendericen su tabla,
     - el PAYLOAD EXACTO del Ajuste +/- (heredado, contrato que no cambia),
     - los últimos movimientos, y el render celular (390px, tocable, 18px).
   v2.8.0 (2026-10-01): las 3 pestañas se ven IGUAL — Cervantes ya no tiene el botón "Todos los
   rubros" ni rótulos de grupo; la vista transversal sigue, pero se abre desde "ver todo junto →".
   v2.7.0 (2026-10-01): las 3 cajas DE VERDAD (Cervantes / Virgilio / Terceros — Prov. Servicio,
   Talleristas, Prov. Art. Term. e Inyectores se mudan a su propia pestaña, ya no "Otros" adentro
   de Cervantes) y, en Virgilio, SC/SP/Fleje/Plástico/Caja muestran TODO el universo del sector
   (con stock 0 si todavía no se mandó nada), no sólo lo que ya tiene movimiento.
   v2.6.0 (2026-10-01): Virgilio con contenido — Bolsas Plásticas (se mudó de Cervantes) +
   SC/SP/Fleje/Plástico/Caja en el depósito virgilio_sector (D.inv, sin RPC nueva); Cervantes
   suma el rubro Art. Terminado (lo que Fábrica produjo y no mandó, stock_general_extra_bundle).
   v2.5.0 (2026-10-01): pestañas Cervantes (abre ahí) / Virgilio.
   v2.4.0 (2026-10-01): tocar el Máximo abre su desglose (maximo_desglose por comp + ubic). */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const BUNDLE = {
  sect: { '1': { nom: 'Sector Crudo', tipo: 'crudo' }, '2': { nom: 'D1', tipo: 'crudo' }, '12': { nom: 'Terminado', tipo: 'terminado' } },
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
  },
  tall: { '3': { nom: 'Fabrica' }, '6': { nom: 'Martin' } },
  prov_serv: { '9': { nom: 'Pedernera Ilario', proceso: 'Cromado' } },
  comp: {
    '10': { cod: 'A10', d: 'Cpo Una', s: 2, um: 'uni', kg_x_uni: 0.05, uxc: 100 },
    '20': { cod: 'T1', d: 'Terminado uno', s: 12, um: 'uni' },
    '30': { cod: 'B5', d: 'Parte be', s: 2, um: 'uni' },
    '50': { cod: 'CAJ1', d: 'Caja 510', s: 11, um: 'uni' }, // sector Caja = insumo de empaque
    '60': { cod: '2405', d: 'PP 2630 (Polipropileno)', s: 14, um: 'kg' }, // MP plastica, kg sin factor
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
  art_terminado: { ubic: 5, filas: [{ cid: 20, uxc: 12, cant: 36 }] },
};
/* stock_sector_bundle por sector: SC (1) es el rubro por defecto; Flejes (5) prueba
   que NO salen las columnas de cajones (pedido del usuario, textual). */
const SECTOR = {
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
  // el rubro por defecto (SC) tiene que haber renderizado su fila
  await page.waitForFunction(() => document.querySelectorAll('#tbody tr').length > 0);

  // ── selector de rubros (foto 1) + tabla rica (foto 2) ──
  const base = await page.evaluate(() => ({
    rubros: document.querySelectorAll('.rubro-btn').length,
    horizontal: document.documentElement.scrollWidth > window.innerWidth,
    hAj: document.querySelector('.hlink') ? document.querySelector('.hlink').getBoundingClientRect().height : 0,
    thead: document.getElementById('thead').innerText,
    row: document.querySelector('#tbody tr').innerText,
  }));
  ok(base.rubros >= 12, 'la grilla de rubros renderiza sus botones (' + base.rubros + ')');
  ok(!base.horizontal, 'celular 390px: sin scroll horizontal');
  ok(base.hAj >= 44, 'boton Ajuste tocable (' + Math.round(base.hAj) + 'px, minimo 44)');

  // ── v2.6.0: pestañas de planta. Abre en Cervantes; Virgilio con SU contenido (SC/SP/Fleje/
  // Plástico/Caja en virgilio_sector + Bolsas Plásticas), nada de ± Ajuste ahí ──
  const vis = (id) => page.evaluate(i => { const e = document.getElementById(i); return !!e && e.offsetParent !== null; }, id);
  ok(await vis('paneCervantes') && !(await vis('paneVirgilio')), 'abre en la pestaña Cervantes');
  ok(await page.evaluate(() => document.getElementById('tabCervantes').classList.contains('active')), 'pestaña Cervantes marcada al abrir');
  // Cervantes YA NO tiene Bolsas Plásticas (se mudó a Virgilio) y SÍ tiene Art. Terminado (nuevo)
  ok(!(await page.locator('#paneCervantes .rubro-btn:has-text("Bolsas Plásticas")').count()), 'Cervantes: sin Bolsas Plásticas (ahora vive en Virgilio)');
  ok(await page.locator('#paneCervantes .rubro-btn:has-text("Art. Terminado")').count() === 1, 'Cervantes: tiene el rubro Art. Terminado');
  await page.click('#tabVirgilio');
  ok(!(await vis('paneCervantes')) && await vis('paneVirgilio'), 'Virgilio: oculta lo de Cervantes y muestra su pestaña');
  await page.waitForSelector('#rubrosVir .rubro-btn');
  const rubrosVir = await page.$$eval('#rubrosVir .rubro-btn', xs => xs.map(x => x.textContent.trim()));
  ok(JSON.stringify(rubrosVir) === JSON.stringify(['Bolsas Plásticas', 'SC en Virgilio', 'SP en Virgilio', 'Flejes en Virgilio', 'Plásticos en Virgilio', 'Cajas en Virgilio']),
     'Virgilio: sus 6 rubros — ' + rubrosVir.join(' | '));
  await page.waitForFunction(() => /Bolsas Plásticas/.test(document.getElementById('statusVir').textContent));
  await page.click('#rubrosVir .rubro-btn:has-text("SC en Virgilio")');
  await page.waitForFunction(() => document.querySelectorAll('#tbodyVir tr').length > 0);
  // v2.7.0: el universo entero del sector (A10 CON stock + B9 en 0), no sólo lo que ya se mandó
  // [Thomas 2026-10-01: "tienen que aparecerme los componentes con stock cero"]. Se lee celda por
  // celda (no el textContent crudo de la fila, que pega los números sin separador).
  const filasSC = await page.$$eval('#tbodyVir tr', es => es.map(e => Array.from(e.cells).map(td => td.textContent.trim())));
  ok(filasSC.length === 2, 'SC en Virgilio: TODO el universo del sector (A10 + B9), no sólo lo que ya tiene stock — ' + filasSC.length);
  const filaA10 = filasSC.filter(c => c[0] === 'A10')[0] || [];
  const filaB9 = filasSC.filter(c => c[0] === 'B9')[0] || [];
  ok(filaA10[filaA10.length - 1] === '25', 'SC en Virgilio: A10 con 25 (lo enviado y no recibido de vuelta) — ' + filaA10.join(' | '));
  ok(filaB9[filaB9.length - 1] === '0', 'SC en Virgilio: B9 en 0 TAMBIÉN aparece (todavía no se le mandó nada) — ' + filaB9.join(' | '));
  ok(!(await vis('btnAjuste')), 'Virgilio: no muestra ± Ajuste (ajusta el stock de GP2)');
  const hTab = await page.evaluate(() => document.getElementById('tabVirgilio').getBoundingClientRect().height);
  ok(hTab >= 44, 'pestaña tocable (' + Math.round(hTab) + 'px)');
  const horizVir = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  ok(!horizVir, 'Virgilio a 390px: sin scroll horizontal');
  await page.click('#tabCervantes');
  ok(await vis('paneCervantes') && await vis('btnAjuste'), 'vuelve a Cervantes con su Ajuste');

  // ── v2.7.0: la caja TERCEROS (Prov. Servicio / Talleristas / Prov. Art. Term. / Inyectores) ──
  // [Thomas 2026-10-01: "no me hiciste la división en stock general de cervantes, virgilio y
  // TERCEROS: acá aparece lo que hay bajo la descripción OTROS"]. Antes vivían adentro de
  // Cervantes agrupados "Otros"; ahora son su propia pestaña.
  for (const nom of ['Prov. Servicio', 'Talleristas', 'Prov. Art. Term.', 'Inyectores']) {
    ok(!(await page.locator('#rubros .rubro-btn:has-text("' + nom + '")').count()),
       'Cervantes: ya NO tiene "' + nom + '" en su selector (se mudó a Terceros)');
  }
  await page.click('#tabTerceros');
  ok(await page.evaluate(() => document.getElementById('tabTerceros').classList.contains('active')), 'pestaña Terceros marcada al elegirla');
  // Terceros comparte el MISMO motor que Cervantes (mismo pane, mismo Ajuste) — no es Virgilio
  ok(await vis('paneCervantes') && !(await vis('paneVirgilio')) && await vis('btnAjuste'),
     'Terceros: usa el mismo pane que Cervantes, con su Ajuste');
  const rubrosTerc = await page.$$eval('#rubros .rubro-btn', xs => xs.map(x => x.textContent.trim()));
  ok(JSON.stringify(rubrosTerc) === JSON.stringify(['Prov. Servicio', 'Talleristas', 'Prov. Art. Term.', 'Inyectores']),
     'Terceros: exactamente sus 4 rubros, sin ninguno de Cervantes — ' + rubrosTerc.join(' | '));
  ok(!(await page.locator('#rubros .rubro-grp').count()), 'Terceros: sin encabezado de grupo repetido (ya lo dice la pestaña)');

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

  await page.click('#tabCervantes');
  ok(await page.evaluate(() => document.getElementById('tabCervantes').classList.contains('active')) &&
     !(await page.locator('#rubros .rubro-btn:has-text("Prov. Servicio")').count()),
     'vuelve a Cervantes y su selector ya no tiene los rubros de Terceros');

  // el pedido central: el stock separado por Kg / Caj / Uni + Info con Uni×Cajón
  ok(/ONLINE/i.test(base.thead) && /\bKG\b/i.test(base.thead) && /\bCAJ\b/i.test(base.thead) && /\bUNI\b/i.test(base.thead),
     'SC: el stock se separa en Kg / Caj / Uni (no una "cantidad" cruda)');
  ok(/KG × UNI/i.test(base.thead) && /UNI × CAJÓN/i.test(base.thead) && /MÁXIMO/i.test(base.thead),
     'SC: bloque Info con Kg×Uni, Uni×Cajón y Máximo');
  ok(/FABRICACIÓN/i.test(base.thead), 'SC: columnas de movimiento propias del sector (Fabricación)');
  // A10: 100 uni, kg_x_uni 0.05 -> 5 kg, uni_x_cajon 100 -> 1 caj
  ok(/A10/.test(base.row) && /\b100\b/.test(base.row) && /\b5\b/.test(base.row),
     'SC: la fila A10 muestra sus Kg/Caj/Uni — ' + base.row.replace(/\s+/g, ' '));

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

  // ── Tránsito PS y Art. Terminado: rubros de Cervantes (NO se mudaron a Terceros) ──
  // v2.8.0: Cervantes arranca igual que Virgilio y Terceros — "Rubro" + botones, sin "🔎 Todos los
  // rubros" ni rótulos de grupo [usuario: "Solo en Cervantes me aparece buscar todos los rubros.
  // Eliminá así quedan todos los módulos igual"].
  const rubrosCerv = await page.$$eval('#rubros .rubro-btn', xs => xs.map(x => x.textContent.trim()));
  ok(rubrosCerv.indexOf('Tránsito PS') >= 0 && rubrosCerv.indexOf('Art. Terminado') >= 0,
     'Tránsito PS y Art. Terminado siguen en el selector de Cervantes — ' + rubrosCerv.join(' | '));
  ok(rubrosCerv.indexOf('Inyectores') < 0, 'Inyectores ya no vive en el selector de Cervantes (se mudó a Terceros)');
  ok(!rubrosCerv.some(t => /Todos los rubros/i.test(t)), 'Cervantes: SIN el botón "Todos los rubros"');
  ok(!(await page.locator('#rubros .rubro-grp').count()), 'Cervantes: sin rótulos de grupo ("Buscar" / "Sectores"), igual que Terceros y Virgilio');

  await page.click('#rubros .rubro-btn:has-text("Tránsito PS")');
  await page.waitForFunction(() => /Laboratorio FAAT → Guazzaroni Patricio/.test(document.getElementById('tbody').innerText));
  ok(true, 'Tránsito PS: aparece el par PS origen → PS siguiente');

  // ── v2.6.0: Art. Terminado — lo que Fábrica produjo y todavía no mandó a Virgilio ──
  await page.click('#rubros .rubro-btn:has-text("Art. Terminado")');
  await page.waitForFunction(() => /T1/.test(document.getElementById('tbody').innerText));
  const artRow = await page.$eval('#tbody tr', e => e.textContent.replace(/\s+/g, ' ').trim());
  ok(/T1/.test(artRow) && /36/.test(artRow), 'Art. Terminado: T1 con 36 unidades (3 cajas de 12) — ' + artRow);

  // ── BUSCAR SIN SABER EL RUBRO (v2.1.0; v2.8.0: sin botón, se entra por "ver todo junto →") ──
  // 1) adentro de un rubro, lo que NO tiene botón propio igual se encuentra: T1 vive en el sector
  //    Terminado (sin rubro) y "ver todo junto →" abre la tabla transversal con Rubro + Dónde
  await page.click('#rubros .rubro-btn:has-text("Stock SC")');
  await page.fill('#q', 'T1');
  await page.waitForFunction(() => /ver todo junto/.test(document.getElementById('hintOtros').innerText));
  await page.click('#hintOtros a:has-text("ver todo junto")');
  await page.waitForFunction(() => document.getElementById('thead').innerText.toUpperCase().indexOf('DÓNDE') >= 0);
  const glo = await page.evaluate(() => ({
    thead: document.getElementById('thead').innerText,
    body: document.getElementById('tbody').innerText,
    horizontal: document.documentElement.scrollWidth > window.innerWidth,
    activos: document.querySelectorAll('#rubros .rubro-btn.active').length,
    cerv: document.getElementById('tabCervantes').classList.contains('active'),
  }));
  ok(/RUBRO/i.test(glo.thead) && /DÓNDE/i.test(glo.thead), 'Todos: la tabla dice en qué rubro y en qué lugar está cada fila');
  ok(!/FABRICACIÓN/i.test(glo.thead), 'Todos: sin columnas de movimiento (cada rubro tiene las suyas)');
  ok(!glo.horizontal, 'Todos: celular 390px sin scroll horizontal');
  ok(/T1/.test(glo.body) && /Terminado/.test(glo.body),
     'Todos: aparece lo que NO tiene botón propio (T1 en el sector Terminado), antes invisible');
  ok(glo.activos === 0 && glo.cerv, 'Todos: queda en Cervantes y no marca ningún botón (no tiene botón propio)');

  // 2) el mismo código en dos lugares distintos, de un saque
  await page.fill('#q', 'B5');
  await page.waitForFunction(() => document.querySelectorAll('#tbody tr').length === 3);
  const b5 = await page.locator('#tbody').innerText();
  ok(/Martin/.test(b5) && /D1/.test(b5) && /Laboratorio FAAT/.test(b5),
     'Todos: B5 se ve de un saque en sus tres lugares (sector, tallerista y tránsito) — ' + b5.replace(/\s+/g, ' '));

  // 3) desde adentro de un rubro, el renglón "También en: …" y el salto en un click
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
  // v2.7.0: Talleristas es de la caja TERCEROS — el salto desde "También en…" (Cervantes) cambió
  // de pestaña solo, sin que el usuario tocara el selector de planta.
  ok(await page.evaluate(() => document.getElementById('tabTerceros').classList.contains('active')),
     'el salto a Talleristas cambió la pestaña a Terceros sola');

  // 4) en "Todos", la celda del rubro también lleva a esa pantalla
  //    v2.8.0: volver a Cervantes abre el último rubro CON botón (SC), no la vista sin botón
  await page.click('#tabCervantes');
  await page.waitForFunction(() => document.title.indexOf('Stock SC') >= 0);
  ok(await page.locator('#rubros .rubro-btn.active:has-text("Stock SC")').count() === 1,
     'volver a Cervantes abre Stock SC (el último rubro con botón), no "Todos"');
  await page.click('#hintOtros a:has-text("ver todo junto")');
  await page.waitForFunction(() => document.querySelectorAll('#tbody td.rub-cell').length > 0);
  await page.click('#tbody td.rub-cell:has-text("Talleristas")');
  await page.waitForFunction(() => document.title.indexOf('Talleristas') >= 0);
  ok(true, 'Todos: click en el rubro de la fila abre ese rubro');
  // de nuevo saltó a Terceros: volver a Cervantes y entrar a "Todos" buscando la resina
  await page.click('#tabCervantes');
  await page.fill('#q', '2405');
  await page.waitForFunction(() => /ver todo junto/.test(document.getElementById('hintOtros').innerText));
  await page.click('#hintOtros a:has-text("ver todo junto")');
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
