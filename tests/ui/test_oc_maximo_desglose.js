/* Al tocar el Máximo en Generar OC se abre el desglose (RPC oc_maximo_desglose): la tabla de lo
   que lo arma, con Consume · kg/mes · Máximo (v1.50.0). [usuario 2026-09-14: "al tocar en
   maximo, pueda ver de que se compone... que articulos y que venta... primero en unidades
   para despues pasarse a kilos"]. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const base = { sector: 'Sector Fleje', sector_id: 5, proveedor: 'Basconia', um: 'kg', unidad: 'kg',
  kg_x_uni: 0.02, precio: 1, moneda: 'USD', maximo_origen: 'est_madre',
  carton_formato: null, pliegos_multiplo: null, codigo_multiplo: null, min_codigo_x_multiplo: null };

const BUNDLE = { paq: 250, ocs: [], pliego_uni_x_paquete: 100, tc: 1500, generado_en: '2026-09-14T10:00:00Z',
  insumos: [ Object.assign({ comp_id: 7, codigo: 'IF11', descripcion: 'Fleje N° 19',
      stock: 100, maximo: 1769, pendiente_oc: 0, sugerido: 1669 }, base) ] };

// Lo que devuelve la RPC del desglose para IF11 (fleje -> por articulo, con kg). Desde v1.50.0 la RPC
// delega en maximo_desglose (la de Stock General): unidad + meses + filas con uni y kg.
const DESGLOSE = {
  comp: { id: 7, cod: 'IF11', desc: 'Fleje N° 19', sector_id: 5, um: 'kg', kg_x_uni: 0.02, uni_x_cajon: null },
  ubic: { id: 5, tipo: 'sector', nom: 'Sector Fleje' },
  maximo: 1769, maximo_origen: 'est_madre', meses: 6, unidad: 'kg',
  consumo_mes: 294.9, consumo_x_meses: 1769.4, base: 'articulos',
  filas: [ { cod: '513', desc: 'Pelador Mgo Metálico', venta_uni_mes: 13586, aporte_uni_mes: 13658, aporte_kg: 93.44 },
           { cod: '505', desc: 'Pelador Mgo Plástico', venta_uni_mes: 27854, aporte_uni_mes: 27875, aporte_kg: 201.46 } ] };
const STUB = `
window.supabase = { createClient: function(){ return {
  rpc: async function(name){
    if(name==='oc_bundle') return { data: ${JSON.stringify(BUNDLE)}, error: null };
    if(name==='oc_maximo_desglose') return { data: ${JSON.stringify(DESGLOSE)}, error: null };
    return { data: { ok:true }, error: null };
  }
};}};
`;

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const page = await browser.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  await page.route('**/@supabase/supabase-js@2', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/gp2-modulo.css**', r => r.fulfill({ contentType: 'text/css', body: '.hidden{display:none!important} [hidden]{display:none!important}' }));
  await page.route('**/GP2_favicon.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
  await page.goto(ROOT + '/Compras/OC_GP2.html');
  await page.waitForFunction(() => document.getElementById('status').textContent === '');
  const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };

  await page.click('#rubros .chip:has-text("Fleje")');
  ok(await page.$('td.max-cell') !== null, 'la celda Máximo tiene desglose (max-cell)');
  ok(await page.$eval('#dsgPop', x => x.hidden), 'la ventanita arranca oculta');

  // v1.36.0 [Thomas: "que me aparezca cuando me pongo arriba, sin tener que clickear"]
  await page.hover('td.max-cell');
  await page.waitForFunction(() => { const p = document.getElementById('dsgPop'); return !p.hidden && p.querySelector('table'); });
  const cuerpo = await page.textContent('#dsgPop');
  ok(/505/.test(cuerpo) && /Pelador Mgo Plástico/.test(cuerpo), 'al pasar el mouse lista el artículo que consume el insumo');
  // v1.50.0 [usuario 2026-10-01: "Venta y consume aparece con los mismos valores. Tendria que ser consume,
  // kg/mes y la tercera columna nueva que sea máximo (multiplica kg/mes con la cantidad de meses...)"]
  const cols = await page.$$eval('#dsgPop thead th', ths => ths.map(t => t.textContent.trim()));
  ok(cols.length === 4 && /^Artículo/.test(cols[0]) && /^Consume/.test(cols[1]) && /^kg\/mes/.test(cols[2]) && /^Máximo/.test(cols[3]),
     'columnas Artículo · Consume · kg/mes · Máximo: ' + cols.join(' | '));
  ok(!/Venta/.test(cuerpo) && !/27\.854/.test(cuerpo), 'sin la columna Venta');
  ok(/kg, 6 meses/.test(cols[3]), 'el Máximo dice su unidad y los meses del sector: ' + cols[3]);
  const fila1 = await page.$$eval('#dsgPop tbody tr:first-child td', tds => tds.map(t => t.textContent.trim()));
  ok(/505/.test(fila1[0]), 'ordenado mayor → menor (505 primero)');
  ok(fila1[1] === '27.875' && fila1[2] === '201,46', 'consume uni/mes y kg/mes de la fila: ' + fila1.join(' | '));
  ok(fila1[3] === '1.209', 'Máximo de la fila = kg/mes × meses (201,46 × 6 = 1.209): ' + fila1[3]);
  const tot = await page.$$eval('#dsgPop tfoot td', tds => tds.map(t => t.textContent.trim()));
  ok(tot[3] === '1.769', 'el Total del Máximo cierra con la celda (1.769): ' + tot.join(' | '));
  // "solo esos datos. El resto no lo quiero": sin líneas de Origen ni de cuenta fuera de la tabla
  ok(!/Origen|Consumo ×/.test(cuerpo), 'sin Origen ni Consumo × meses: ' + cuerpo.slice(0, 80));
  ok((await page.$$('#dsgPop table')).length === 1, 'una sola tabla');

  // Cada caso con su unidad: insumo en uni (sin kg) y resina por pieza (en kg).
  const uni = await page.evaluate(() => htmlDesglose({ unidad: 'uni', meses: 3, base: 'articulos',
    filas: [ { cod: '401', desc: 'X', venta_uni_mes: 100, aporte_uni_mes: 200, aporte_kg: null } ] }));
  ok(/Máximo<br>\(uni, 3 meses\)/.test(uni) && !/kg\/mes/.test(uni) && />600</.test(uni), 'insumo en uni: Máximo = uni/mes × meses, sin kg/mes');
  const res = await page.evaluate(() => htmlDesglose({ unidad: 'kg', meses: 2.5, base: 'piezas',
    filas: [ { cod: 'P1', desc: 'Pieza', aporte_uni_mes: 1000, aporte_kg: 10 } ] }));
  ok(/<th class="l">Pieza/.test(res) && /Máximo<br>\(kg, 2,5 meses\)/.test(res) && />25</.test(res), 'resina por pieza: Máximo = kg/mes × 2,5 meses');

  await page.mouse.move(5, 5);
  ok(await page.$eval('#dsgPop', x => x.hidden), 'al salir de la celda se cierra');

  // v1.45.1 [Thomas: "que si hago click me quede fijo y lo saco haciendo un click afuera"]
  await page.click('td.max-cell');
  await page.waitForFunction(() => !document.getElementById('dsgPop').hidden);
  ok(await page.$eval('#dsgPop', x => x.classList.contains('fija') && getComputedStyle(x).pointerEvents === 'auto'), 'con mouse, el clic la fija y recibe el mouse');
  await page.mouse.move(5, 5);
  ok(!(await page.$eval('#dsgPop', x => x.hidden)), 'fijada, salir de la celda NO la cierra');
  await page.$eval('#dsgPop', x => { x.scrollTop = 20; x.dispatchEvent(new Event('scroll')); });
  ok(!(await page.$eval('#dsgPop', x => x.hidden)), 'scrollear adentro NO la cierra');
  await page.click('#dsgPop');
  ok(!(await page.$eval('#dsgPop', x => x.hidden)), 'clic adentro NO la cierra');
  await page.mouse.click(5, 5);
  ok(await page.$eval('#dsgPop', x => x.hidden && !x.classList.contains('fija')), 'clic afuera la cierra');

  // Tablet: sin hover, un toque la abre, otro la cierra, y tocar afuera tambien.
  await page.evaluate(() => document.querySelector('td.max-cell').click());
  await page.waitForFunction(() => { const p = document.getElementById('dsgPop'); return !p.hidden && p.querySelector('table'); });
  ok(true, 'tablet: el toque la abre');
  await page.evaluate(() => document.querySelector('td.max-cell').click());
  ok(await page.$eval('#dsgPop', x => x.hidden), 'tablet: el segundo toque la cierra');
  await page.evaluate(() => document.querySelector('td.max-cell').click());
  await page.evaluate(() => document.body.click());
  ok(await page.$eval('#dsgPop', x => x.hidden), 'tablet: tocar afuera la cierra');

  // v1.45.1 [Thomas: "hay mas blanco de un lado que de otro"]: con la tabla a la vista, lo que la rodea la abraza.
  // Desde el Sistema de Diseño v2 (08/10/2026) la página va a lo ancho como todo GP2 (la .card ya no es una caja
  // blanca de ancho fit-content): la caja que tiene que abrazar el dato es la de la tabla (.table-wrap).
  const anchos = await page.evaluate(() => [document.querySelector('#panGen .table-wrap').getBoundingClientRect().width,
    document.querySelector('#panGen .table-wrap table').getBoundingClientRect().width]);
  ok(anchos[0] - anchos[1] < 60, 'la caja de la tabla abraza la tabla (sin blanco de un solo lado): ' + anchos.map(Math.round).join(' vs '));

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
