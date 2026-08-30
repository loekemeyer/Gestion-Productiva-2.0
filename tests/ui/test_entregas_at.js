/* Caracterizacion de Prov Art Terminado/Entregas (EntregasAT.js, escribe en
   public."Entregas Prov AT"): fija seleccion de proveedor, sanitizado del input,
   payload del insert (Cantidad = CAJAS) y comprobante impreso. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const ARTS = [
  { Proveedor: 'Pintos', Activo: true, Cod_Art: '225', Descripcion: 'Pava 1L' },
  { Proveedor: 'Pintos', Activo: true, Cod_Art: '230', Descripcion: 'Pava 2L' },
  { Proveedor: 'Maspoli', Activo: true, Cod_Art: '300', Descripcion: 'Olla' },
];

const STUB = `
window.__inserts = [];
function chain(tabla){
  var filtros = [];
  var api = {
    select: function(){ return api; },
    order: function(){ return api; },
    eq: function(c, v){ filtros.push([c, v]); return api; },
    insert: function(payload){
      window.__inserts.push({ tabla: tabla, payload: payload });
      return Promise.resolve({ data: null, error: null });
    },
    then: function(res){
      var rows = ${JSON.stringify(ARTS)}.filter(function(r){
        return filtros.every(function(f){ return r[f[0].replace(/"/g,'')] === f[1]; });
      });
      return Promise.resolve({ data: rows, error: null }).then(res);
    }
  };
  return api;
}
window.supabase = { createClient: function(){ return { from: chain }; } };
`;

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const page = await browser.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  const dialogs = [];
  page.on('dialog', d => { dialogs.push({ type: d.type(), msg: d.message() }); d.accept(); });

  await page.route('**/@supabase/supabase-js@2**', r =>
    r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/EntregasAT.css*', r => r.fulfill({ contentType: 'text/css', body: '.hidden{display:none!important}' }));
  // window.open del comprobante: capturar en vez de abrir ventana real
  await page.addInitScript(() => {
    window.__opens = [];
    window.open = function () {
      const fake = { document: { open() {}, write(html) { window.__opens.push(html); }, close() {} } };
      return fake;
    };
  });

  await page.goto(ROOT + '/Prov%20Art%20Terminado/Entregas/EntregasAT.html');
  await page.waitForFunction(() => document.querySelectorAll('#provGrid .ps-pill').length > 0);

  const ok = (c, msg) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + msg); if (!c) process.exitCode = 1; };

  // proveedores unicos ordenados
  const provs = await page.$$eval('#provGrid .ps-pill', xs => xs.map(x => x.textContent));
  ok(provs.join(',') === 'Maspoli,Pintos', 'proveedores unicos ordenados: ' + provs.join(','));

  await page.click('#provGrid .ps-pill:has-text("Pintos")');
  await page.waitForFunction(() => document.querySelectorAll('#resultBody tr').length > 0);
  ok(await page.$eval('#detailWrap', e => !e.classList.contains('hidden')), 'vista detalle visible');
  ok((await page.$eval('#tableTitle', e => e.textContent)) === 'Pintos', 'titulo tabla Pintos');
  const rows = await page.$$eval('#resultBody tr', xs => xs.map(x => x.textContent));
  ok(rows.length === 2 && rows[0].includes('225') && rows[1].includes('230'), 'solo articulos de Pintos');

  // el input solo acepta digitos
  await page.fill('#resultBody input[data-idx="0"]', '4a03');
  ok((await page.$eval('#resultBody input[data-idx="0"]', e => e.value)) === '403', 'input sanitizado a 403');
  ok(await page.$eval('#btnEnviar', e => e.classList.contains('enabled')), 'Registrar habilitado');

  await page.click('#btnEnviar');
  await page.waitForFunction(() => window.__inserts.length > 0);
  ok(dialogs.some(d => d.type === 'confirm' && d.msg.includes('225') && d.msg.includes('Cajas: 403')),
     'confirm con detalle en cajas');

  const ins = await page.evaluate(() => window.__inserts);
  ok(ins.length === 1 && ins[0].tabla === 'Entregas Prov AT', 'insert en Entregas Prov AT');
  const p = ins[0].payload;
  ok(Array.isArray(p) && p.length === 1 && p[0].Proveedor === 'Pintos' && p[0].Cod_Art === '225' &&
     p[0].Descripcion === 'Pava 1L' && p[0].Cantidad === 403 && /^\d{4}-\d{2}-\d{2}$/.test(p[0].Dia_mes),
     'payload insert (Cantidad = cajas): ' + JSON.stringify(p));

  // success + comprobante impreso con codigo de 4 digitos
  await page.waitForFunction(() => document.getElementById('successBox').style.display === 'block');
  const code = await page.$eval('#successCode', e => e.textContent);
  ok(/^\d{4,5}$/.test(code), 'codigo generado: ' + code);
  const compr = await page.evaluate(() => window.__opens.join(''));
  ok(compr.includes('Comprobante de Entrega') && compr.includes('Pintos') && compr.includes('403'),
     'comprobante con proveedor y cantidad');

  // resetAll a los 500ms vuelve a la seleccion
  await page.waitForFunction(() => !document.getElementById('provGridWrap').classList.contains('hidden'));
  ok(true, 'vuelve a la vista de seleccion');

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
