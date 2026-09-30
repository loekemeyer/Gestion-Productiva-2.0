/* v1.49.0 [Thomas 2026-09-30: "En las ordenes de compra de cajas quiero que me ordenes primero todo lo de
   corrugadora y despues todo lo de recicor. y ademas que me deje pedir en recicor"]:
   (1) sin proveedor elegido, la tabla va ordenada por el proveedor DE LA FILA: todas las de Corrugadora y
       despues todas las de Recicor (la fila repetida ya no va pegada a la del principal);
   (2) la fila de Recicor tiene campo Pedir, arranca vacia (el sugerido va solo al principal) y lo que se
       escribe ahi NO pisa lo de Corrugadora;
   (3) Crear OC sin proveedor elegido crea UNA OC POR PROVEEDOR, cada una con el precio de SU proveedor.
   Historia: v1.45.1 boton con precio; v1.48.0 fila repetida sin campo que al tocarla elegia el proveedor. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const caja = (id, cod, desc, max, alt) => ({ comp_id: id, codigo: cod, descripcion: desc, sector: 'Sector Caja', sector_id: 11,
  proveedor: 'Corrugadora del Plata', proveedores_alt: alt ? ['Recicor'] : [], um: 'unidad', unidad: 'uni', kg_x_uni: null,
  stock: 0, maximo: max, sugerido: max, pendiente_oc: 0, precio: 245.53, moneda: 'ARS', maximo_origen: 'est_madre',
  precios_prov: Object.assign({ 'Corrugadora del Plata': { moneda: 'ARS', precio: 245.53 } }, alt ? { Recicor: { moneda: 'ARS', precio: 199 } } : {}),
  carton_formato: null, pliegos_multiplo: null, codigo_multiplo: null, min_codigo_x_multiplo: null });
const BUNDLE = { paq: 250, ocs: [], pliego_uni_x_paquete: 100, tc: 1500, generado_en: '2026-09-29T10:00:00Z',
  proveedores: [
    { nombre: 'Corrugadora del Plata', rubro: 'Sector Caja', activo: true, dias_entrega: 7 },
    { nombre: 'Recicor', rubro: 'Sector Caja', activo: true, dias_entrega: 3 } ],
  insumos: [caja(456, 'A1', 'Caja N°1', 12738, true), caja(605, 'A7B', 'Caja N°16', 12, false), caja(470, 'A2', 'Caja N°12', 10626, true)] };
const STUB = `window.supabase = { createClient: function(){ return {
  rpc: async function(name, args){
    window.__calls = window.__calls || []; window.__calls.push({ name: name, args: args });
    if(name==='oc_bundle') return { data: ${JSON.stringify(BUNDLE)}, error: null };
    if(name==='crear_oc'){ var n=window.__calls.filter(function(c){ return c.name==='crear_oc'; }).length;
      return { data: { ok: true, oc_id: 100+n, numero: n, items: (args.p.items||[]).length, oc_gemela: null }, error: null }; }
    return { data: {}, error: null }; } };}};`;

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const page = await browser.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  await page.route('**/@supabase/supabase-js@2', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/GP2_favicon.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
  await page.goto(ROOT + '/Compras/OC_GP2.html');
  await page.waitForFunction(() => document.getElementById('status').textContent === '');
  const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };

  await page.click('#rubros .chip:has-text("Caja")');
  // (1) primero todo Corrugadora, despues todo Recicor
  const filas = await page.$$eval('#tbody tr[data-id]', t => t.map(r => r.cells[0].querySelector('b').textContent + '|' + r.cells[1].textContent));
  ok(JSON.stringify(filas) === JSON.stringify(['A1|Corrugadora del Plata', 'A2|Corrugadora del Plata', 'A7B|Corrugadora del Plata', 'A1|Recicor', 'A2|Recicor']),
     'primero todo Corrugadora y despues todo Recicor: ' + JSON.stringify(filas));
  ok(!/\$/.test(await page.textContent('#tbody')), 'la tabla no muestra precios');

  // (2) Recicor con campo Pedir, vacio
  const inRec = await page.$$eval('tr.fila-alt input.pedir-in', xs => xs.map(x => x.value));
  ok(inRec.length === 2 && inRec.every(v => v === ''), 'las filas de Recicor tienen Pedir y arrancan vacias: ' + JSON.stringify(inRec));
  const vCorr = () => page.$eval('tr[data-id="456"][data-prov="Corrugadora del Plata"] input', x => x.value);
  ok((await vCorr()) === '12738', 'Corrugadora trae el sugerido (' + (await vCorr()) + ')');
  await page.fill('tr[data-id="456"][data-prov="Recicor"] input', '4000');
  await page.press('tr[data-id="456"][data-prov="Recicor"] input', 'Tab');
  ok((await page.$eval('tr[data-id="456"][data-prov="Recicor"] input', x => x.value)) === '4000', 'lo escrito en Recicor queda');
  ok((await vCorr()) === '12738', 'escribir en Recicor no pisa a Corrugadora');
  ok((await page.$$('#provs .chip.active')).length === 0, 'tocar la fila de Recicor ya no elige el proveedor');
  ok(/Crear 2 OC/.test(await page.textContent('#btnCrear')), 'el boton avisa que salen 2 OC');

  // (3) una OC por proveedor, cada una con su precio
  await page.click('#btnCrear');
  await page.waitForFunction(() => (window.__calls || []).filter(c => c.name === 'crear_oc').length === 2);
  const ocs = await page.evaluate(() => window.__calls.filter(c => c.name === 'crear_oc').map(c => c.args.p));
  const corr = ocs.find(p => p.proveedor === 'Corrugadora del Plata'), rec = ocs.find(p => p.proveedor === 'Recicor');
  ok(!!corr && corr.items.length === 3 && corr.items.every(x => x.precio === 245.53), 'OC a Corrugadora: sus 3 cajas a su precio');
  ok(!!rec && rec.items.length === 1 && rec.items[0].comp_id === 456 && rec.items[0].cantidad === 4000 && rec.items[0].precio === 199,
     'OC a Recicor: la A1 × 4.000 a $ 199: ' + JSON.stringify(rec && rec.items));
  ok(ocs.every(p => p.proveedor), 'ninguna OC sale con proveedor vacio');

  // Con Recicor elegido: solo lo suyo, una sola OC
  await page.goto(ROOT + '/Compras/OC_GP2.html');
  await page.waitForFunction(() => document.getElementById('status').textContent === '');
  await page.click('#rubros .chip:has-text("Caja")');
  await page.click('#provs .chip:has-text("Recicor")');
  ok((await page.$$('tr.fila-alt')).length === 0, 'con proveedor elegido no se repite nada');
  const provCol = await page.$$eval('#tbody tr[data-id] td:nth-child(2)', xs => xs.map(x => x.textContent));
  ok(provCol.length === 2 && provCol.every(t => t === 'Recicor'), 'Recicor muestra sus 2 cajas a su nombre');

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
