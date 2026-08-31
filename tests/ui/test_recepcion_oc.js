const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
// Raiz del repo (los tests viven en tests/ui/) y Chromium portable si existe.
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

/* Fija el formato de la tarjeta de insumo en Recepcion: el numero verde es el
   STOCK ACTUAL del insumo (pedido del usuario 2026-08-31: la tarjeta mostraba
   la ultima carga y "esta mostrando lo ultimo que recibi, esta mal"), solo el
   numero sin fecha/pallets/rollos (2026-08-29), y la OC abierta se resume como
   "OC: <lo que falta> <unidad>". La 'ultima' sigue en el bundle pero NO se
   muestra. */
const BUNDLE = {
  tara: { tara_pallet: '20', tol_ctrl_peso_pct: '5', carton_uni_x_paquete: '250' },
  sectores: [{ id: 5, nombre: 'Sector Fleje' }],
  proveedores: [{ nombre: 'Basconia', modo_control: 'rollos_remito', informa_rollos: true, factura_uni: false }],
  recepciones: [], pallets: [], rollos: [],
  insumos: [
    { comp_id: 1, codigo: 'A1', descripcion: 'Fleje N° 13', sector: 'Sector Fleje', sector_id: 5, um: 'kg',
      proveedor: 'Basconia', n_fleje: 13, medida: '84 x 1,75', stock: 959,
      ultima: { fecha: '2026-08-29T12:00:00Z', cantidad: 360, unidad: 'kg', rollos: 7, pallets: 2 },
      oc_pend: { ocs: '4', n_ocs: 1, pendiente: 640, unidad: 'kg', unidades_mezcladas: false } },
    { comp_id: 2, codigo: 'A10', descripcion: 'Fleje N° 8', sector: 'Sector Fleje', sector_id: 5, um: 'kg',
      proveedor: 'Basconia', n_fleje: 8, medida: '33 x 2', stock: 0, ultima: null, oc_pend: null },
    { comp_id: 3, codigo: 'A11', descripcion: 'Fleje N° 23', sector: 'Sector Fleje', sector_id: 5, um: 'kg',
      proveedor: 'Basconia', n_fleje: 23, medida: '20 x 2,8', stock: 500, ultima: null,
      oc_pend: { ocs: '4, 5', n_ocs: 2, pendiente: 1200, unidad: 'kg', unidades_mezcladas: false } },
    { comp_id: 4, codigo: 'A12', descripcion: 'Fleje N° 5', sector: 'Sector Fleje', sector_id: 5, um: 'kg',
      proveedor: 'Basconia', n_fleje: 5, medida: '15 x 1', stock: 0, ultima: null,
      oc_pend: { ocs: '6', n_ocs: 1, pendiente: 50, unidad: 'kg', unidades_mezcladas: true } },
  ],
};

const STUB = 'window.supabase={createClient:function(){return{'
  + 'rpc:async function(n,a){ if(n==="recepcion_bundle") return {data:' + JSON.stringify(BUNDLE) + ',error:null};'
  + ' return {data:{ok:true},error:null}; },'
  + 'from:function(){ var q={select:function(){return q;},in:function(){return Promise.resolve({data:[],error:null});}}; return q; }'
  + '};}};';

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  // viewport de celular: es donde se usa la pantalla, con el remito en la mano
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });

  await page.route('**/@supabase/supabase-js@2', r =>
    r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/auth-guard.js*', r =>
    r.fulfill({ contentType: 'application/javascript', body: 'window.GP2_AUTH_ON=false;' }));
  await page.route('**/GP2_favicon.png*', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));

  const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };

  await page.goto(ROOT + '/StockFlejes/RecepcionInsumos_GP2.html');
  // paso 1: rubro -> proveedor -> Cargar
  await page.click('button:has-text("Flejes")');
  await page.click('button:has-text("Basconia")');
  await page.click('#btnContinuar');
  await page.waitForSelector('.item-btn');

  const cards = await page.$$eval('.item-btn', bs => bs.map(b => b.innerText.replace(/\n/g, ' | ')));
  ok(cards.length === 4, '4 insumos del proveedor');

  // el numero verde es el STOCK actual, no la ultima carga (v3.19.0)
  ok(/\| 959 kg \|/.test(cards[0]) && !/últ\./.test(cards[0]), 'stock = "959 kg" (sin etiqueta): ' + cards[0]);
  ok(!/360 kg/.test(cards[0]), 'la ultima carga (360 kg) ya NO se muestra: ' + cards[0]);
  ok(!/29\/8|2 pallets|7 rollo/.test(cards[0]), 'sin fecha, sin pallets, sin rollos');

  // la OC abierta: "OC: <lo que falta> <unidad>" (640 = 1000 pedidos - 360 recibidos)
  ok(/OC: 640 kg/.test(cards[0]), 'OC pendiente = "OC: 640 kg": ' + cards[0]);
  ok(await page.$('.item-btn .oc-pend') !== null, 'la OC va resaltada en su propio span');

  // sin OC abierta no se muestra nada
  ok(!/OC/.test(cards[1]), 'sin OC no aparece la linea: ' + cards[1]);
  ok(/sin stock/.test(cards[1]) && !/sin cargas/.test(cards[1]), 'stock 0 = "sin stock" en gris');

  // varias OC: se suma lo que falta de todas (y el stock convive con la OC)
  ok(/\| 500 kg \|/.test(cards[2]), 'stock y OC conviven en la tarjeta: ' + cards[2]);
  ok(/OC: 1\.200 kg/.test(cards[2]), 'dos OC suman lo pendiente: ' + cards[2]);

  // misma parte pedida en dos unidades: se muestra el numero SIN unidad, no se inventa
  ok(/OC: 50(\s|$)/.test(cards[3]) && !/OC: 50 kg/.test(cards[3]),
     'con unidades mezcladas no pone unidad: ' + cards[3]);

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
