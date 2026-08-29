const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
// Raiz del repo (los tests viven en tests/ui/) y Chromium portable si existe.
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const BUNDLE = { filas: [
  { componente_id: 1, codigo: 'C3', descripcion: 'Fleje 30', sector: 'Sector Fleje', ubicacion_id: 5,
    ubicacion: 'Sector Fleje', ubicacion_tipo: 'sector', meses_stock: 6, consumo_uni_mes: 616.6,
    punto_stock_uni: 3700, maximo_fisico: 3700, online: 100, estado: 'ok', unidad: 'kg', maximo_origen: 'est_madre' },
  { componente_id: 2, codigo: 'A11', descripcion: 'Caja', sector: 'Sector Caja', ubicacion_id: 11,
    ubicacion: 'Sector Caja', ubicacion_tipo: 'sector', meses_stock: 6, consumo_uni_mes: 100,
    punto_stock_uni: 600, maximo_fisico: 900, online: 10, estado: 'ok', unidad: 'uni', maximo_origen: 'fisico' },
], generado_en: 'x' };
const STUB = `window.supabase={createClient:function(){return{rpc:async function(){return {data:${JSON.stringify(BUNDLE)},error:null};}}}};`;
(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const page = await browser.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  await page.route('**/@supabase/supabase-js@2', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/gp2-modulo.css**', r => r.fulfill({ contentType: 'text/css', body: '.hidden{display:none!important}' }));
  await page.route('**/*.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
  await page.goto(ROOT + '/Stocks%20General/PuntoStock_GP2.html');
  await page.waitForFunction(() => document.querySelectorAll('tbody tr').length > 0);
  const ok = (c,m)=>{ console.log((c?'OK  ':'FAIL')+' '+m); if(!c) process.exitCode=1; };
  const rows = await page.$$eval('tbody tr', xs => xs.map(x => x.innerHTML));
  const emRow = rows.find(r => r.includes('C3'));
  const fisRow = rows.find(r => r.includes('A11'));
  ok(emRow && emRow.includes('>EM<'), 'fila est_madre con tag EM');
  ok(fisRow && !fisRow.includes('>EM<'), 'fila fisica sin tag');
  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
