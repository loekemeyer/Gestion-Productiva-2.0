const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
// Raiz del repo (los tests viven en tests/ui/) y Chromium portable si existe.
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const BUNDLE = {
  paq: 250,
  insumos: [
    { comp_id: 1, codigo: 'A1', descripcion: 'Fleje N 13', sector: 'Sector Fleje', sector_id: 5,
      proveedor: 'Basconia', um: 'kg', unidad: 'kg', kg_x_uni: null,
      consumo: 424.9, meses: 6, online: 100, pendiente_oc: 0, sugerido: 2449,
      precio: 1, moneda: 'USD',
      carton_formato: null, pliegos_multiplo: null, codigo_multiplo: null, min_codigo_x_multiplo: null },
    { comp_id: 2, codigo: 'B1', descripcion: 'Fleje N 2', sector: 'Sector Fleje', sector_id: 5,
      proveedor: 'Hermac', um: 'kg', unidad: 'kg', kg_x_uni: null,
      consumo: 50, meses: 6, online: 0, pendiente_oc: 0, sugerido: 300,
      precio: 1, moneda: 'USD',
      carton_formato: null, pliegos_multiplo: null, codigo_multiplo: null, min_codigo_x_multiplo: null },
    { comp_id: 3, codigo: 'CART506', descripcion: 'Carton 506', sector: 'Sector Carton', sector_id: 10,
      proveedor: 'Cartonero', um: 'uni', unidad: 'uni', kg_x_uni: null,
      consumo: 3000, meses: 6, online: 2000, pendiente_oc: 0, sugerido: 16000,
      precio: 1, moneda: 'USD',
      carton_formato: 'C', pliegos_multiplo: 12000, codigo_multiplo: 1000, min_codigo_x_multiplo: 1000 },
    { comp_id: 4, codigo: 'CARTPP', descripcion: 'Carton Pelapapas', sector: 'Sector Carton', sector_id: 10,
      proveedor: 'Cartonero', um: 'uni', unidad: 'uni', kg_x_uni: null,
      consumo: 1000, meses: 6, online: 0, pendiente_oc: 0, sugerido: 6000,
      precio: 1000, moneda: 'ARS',
      carton_formato: 'C', pliegos_multiplo: 12000, codigo_multiplo: 1000, min_codigo_x_multiplo: 1000 },
    // Insumo cotizado POR KG pero comprado por unidad (el clavo PCP3). El bundle tiene que
    // mandar el precio YA CONVERTIDO a la unidad de pedido: 3,30 USD/kg x 6,53 g = 0,0215.
    // Si algun dia vuelve a llegar 3,30 crudo, la OC infla el precio 153x y sale asi en la
    // hoja al proveedor (bug real del 2026-08-31, ver AUDITORIA_GP2_2026-08-31.md).
    { comp_id: 5, codigo: 'PCP3', descripcion: 'Clavo 505', sector: 'Sector Plastico', sector_id: 6,
      proveedor: 'Altrak', um: 'unidad', unidad: 'uni', kg_x_uni: 0.00653,
      consumo: 5000, meses: 2, online: 0, pendiente_oc: 0, sugerido: 10000,
      precio: 0.021549, moneda: 'USD',
      carton_formato: null, pliegos_multiplo: null, codigo_multiplo: null, min_codigo_x_multiplo: null },
  ],
  ocs: [
    { id: 9, numero: 1, proveedor: 'Basconia', rubro: 'Fleje', estado: 'borrador', nota: 'prueba',
      creado_en: '2026-08-29T10:00:00Z',
      total_usd: 500, total_ars: 0,
      items: [ { codigo: 'A1', descripcion: 'Fleje N 13', cantidad: 500, unidad: 'kg', recibido: 0,
                 precio_uni: 1, moneda: 'USD', subtotal: 500 } ] },
  ],
  tc: 1535,
  generado_en: '2026-08-29T10:00:00Z',
};

const STUB = `
window.supabase = { createClient: function(){ return {
  rpc: async function(name, args){
    window.__calls = window.__calls || [];
    window.__calls.push({name:name, args:args});
    if(name==='oc_bundle') return { data: ${JSON.stringify(BUNDLE)}, error: null };
    if(name==='crear_oc') return { data: { ok:true, oc_id: 10, numero: 2, items: (args.p.items||[]).length }, error: null };
    if(name==='oc_marcar') return { data: { ok:true }, error: null };
    return { data: null, error: { message: 'rpc desconocida '+name } };
  }
};}};
`;

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const page = await browser.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE:', m.text()); });

  await page.route('**/@supabase/supabase-js@2', r =>
    r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/gp2-modulo.css**', r => r.fulfill({ contentType: 'text/css', body: '.hidden{display:none!important}' }));
  await page.route('**/GP2_favicon.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));

  await page.goto(ROOT + '/Compras/OC_GP2.html');
  await page.waitForFunction(() => document.getElementById('status').textContent === '');

  const ok = (c, msg) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + msg); if (!c) process.exitCode = 1; };

  // rubro chips
  const chips = await page.$$eval('#rubros .chip', xs => xs.map(x => x.textContent));
  ok(chips.join(',') === 'Fleje,Carton,Plastico', 'chips de rubro: ' + chips.join(','));

  // sin filtro: 4 filas
  ok(await page.$$eval('#tbody tr', x => x.length) === 5, '5 insumos sin filtro');

  // El clavo se cotiza POR KG pero se compra por unidad: el bundle tiene que mandar el
  // precio ya convertido (3,30 USD/kg x 6,53 g = 0,0215). Si vuelve a llegar 3,30 crudo,
  // la OC lo infla 153x y sale asi en la hoja al proveedor (bug real del 2026-08-31).
  const filaClavo = await page.textContent('tr[data-id="5"]');
  ok(!/US\$ 3[,.]3/.test(filaClavo), 'el clavo NO sale al precio por kilo (bug 153x)');
  ok(!filaClavo.includes('/kg'), 'el clavo se compra por unidad, no lleva /kg');

  // filtro Fleje -> 2 filas + chips proveedor
  await page.click('#rubros .chip:has-text("Fleje")');
  ok(await page.$$eval('#tbody tr', x => x.length) === 2, 'filtro rubro Fleje: 2 filas');
  const provChips = await page.$$eval('#provs .chip', xs => xs.map(x => x.textContent));
  ok(provChips.join(',') === 'Basconia,Hermac', 'chips proveedor: ' + provChips.join(','));

  // sugerido A1 = 424.9*6-100 = 2449 (redondeo servidor); click en sugerido llena Pedir
  await page.click('.sug[data-sug="1"]');
  ok(await page.$eval('.pedir-in[data-in="1"]', x => x.value) === '2449', 'click sugerido llena 2449');
  const tot1 = (await page.textContent('#tot')).trim();
  ok(tot1.startsWith('1 ítems'), 'barra: 1 items (' + tot1 + ')');
  // 2449 kg x US$ 1 = US$ 2.449; con el dolar del cron (1535) ~ $ 3.759.215
  ok(tot1.includes('US$ 2.449') && tot1.includes('3.759.215'), 'barra valorizada: ' + tot1);
  // columna de precio y subtotal por fila
  const filaA1 = await page.textContent('tr[data-id="1"]');
  ok(filaA1.includes('US$ 1/kg'), 'precio del fleje por kg visible');
  ok(filaA1.includes('US$ 2.449'), 'subtotal de la fila = pedir x precio');
  ok(!(await page.$eval('#btnCrear', b => b.disabled)), 'btnCrear habilitado');

  // filtro proveedor Basconia y crear OC
  await page.click('#provs .chip:has-text("Basconia")');
  ok(await page.$$eval('#tbody tr', x => x.length) === 1, 'filtro proveedor: 1 fila');
  await page.fill('#nota', 'nota test');
  await page.click('#btnCrear');
  await page.waitForFunction(() => (window.__calls || []).some(c => c.name === 'crear_oc'));
  const call = await page.evaluate(() => window.__calls.filter(c => c.name === 'crear_oc')[0].args.p);
  ok(call.proveedor === 'Basconia' && call.rubro === 'Fleje' && call.nota === 'nota test', 'payload cabecera OK');
  ok(call.items.length === 1 && call.items[0].comp_id === 1 && call.items[0].cantidad === 2449 && call.items[0].unidad === 'kg',
     'payload items OK: ' + JSON.stringify(call.items));

  // tras crear pasa a tab Ordenes
  ok(!(await page.$eval('#panOcs', x => x.classList.contains('hidden'))), 'muestra tab Ordenes tras crear');
  ok((await page.textContent('.oc-card .num-oc')).includes('OC N° 1'), 'OC listada');
  const cardTxt = await page.textContent('.oc-card');
  ok(cardTxt.includes('US$ 500'), 'OC listada con total y subtotal US$ 500');

  // volver a Generar y validar reglas de carton
  await page.click('#tabGen');
  await page.click('#rubros .chip:has-text("Carton")');
  // 1500 no es multiplo de 1000
  await page.fill('.pedir-in[data-in="3"]', '1500');
  await page.$eval('.pedir-in[data-in="3"]', x => x.dispatchEvent(new Event('change')));
  let regla = await page.textContent('#reglaCarton');
  ok(!(await page.$eval('#reglaCarton', x => x.classList.contains('hidden'))) && regla.includes('múltiplo de 12.000'),
     'total no multiplo de 12000 bloquea: ' + regla.trim().slice(0, 60));
  ok(await page.$eval('#btnCrear', b => b.disabled), 'btnCrear bloqueado con regla rota');

  // 11000 + 1000 = 12000 total, ambos multiplos de 1000, minimo 1000 -> valido
  await page.fill('.pedir-in[data-in="3"]', '11000');
  await page.$eval('.pedir-in[data-in="3"]', x => x.dispatchEvent(new Event('change')));
  await page.fill('.pedir-in[data-in="4"]', '1000');
  await page.$eval('.pedir-in[data-in="4"]', x => x.dispatchEvent(new Event('change')));
  ok(await page.$eval('#reglaCarton', x => x.classList.contains('hidden')), '12000 valido (11000+1000)');
  ok(!(await page.$eval('#btnCrear', b => b.disabled)), 'btnCrear habilitado con carton valido');
  // equivalencia en paquetes visible
  const paq = await page.textContent('tr[data-id="3"] .paq-eq');
  ok(paq.includes('44') && paq.includes('paq'), 'equivalencia paquetes: ' + paq.trim());

  // 24000 total: 23000+1000 -> minimo por codigo escala a 2000 -> error
  await page.fill('.pedir-in[data-in="3"]', '23000');
  await page.$eval('.pedir-in[data-in="3"]', x => x.dispatchEvent(new Event('change')));
  regla = await page.textContent('#reglaCarton');
  ok(regla.includes('mínimo 2.000'), 'minimo escala con multiplo: ' + regla.trim().slice(0, 80));

  // acciones de OC: marcar enviada
  await page.click('#tabOcs');
  await page.click('.oc-acts button.env');
  await page.waitForFunction(() => (window.__calls || []).some(c => c.name === 'oc_marcar'));
  const mc = await page.evaluate(() => window.__calls.filter(c => c.name === 'oc_marcar')[0].args);
  ok(mc.p_oc_id === 9 && mc.p_estado === 'enviada', 'oc_marcar enviada OK');

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
