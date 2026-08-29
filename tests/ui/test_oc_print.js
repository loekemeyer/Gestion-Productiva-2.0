const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
// Raiz del repo (los tests viven en tests/ui/) y Chromium portable si existe.
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const BUNDLE = {
  paq: 250, insumos: [],
  ocs: [ { id: 9, numero: 1, proveedor: 'Basconia', rubro: 'Fleje', estado: 'enviada', nota: 'urgente',
    creado_en: '2026-08-29T10:00:00Z',
    items: [ { codigo: 'A1', descripcion: 'Fleje N 13', cantidad: 500, unidad: 'kg', recibido: 0 } ] } ],
};
const STUB = `
window.supabase = { createClient: function(){ return {
  rpc: async function(name, args){
    if(name==='oc_bundle') return { data: ${JSON.stringify(BUNDLE)}, error: null };
    return { data: { ok: true }, error: null };
  }
};}};
`;
(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  await page.route('**/@supabase/supabase-js@2', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/gp2-modulo.css**', r => r.fulfill({ contentType: 'text/css', body: '.hidden{display:none!important}' }));
  await page.route('**/GP2_favicon.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
  await page.goto(ROOT + '/Compras/OC_GP2.html');
  await page.waitForFunction(() => document.getElementById('status').textContent === '');
  const ok = (c, m) => { console.log((c?'OK  ':'FAIL')+' '+m); if(!c) process.exitCode = 1; };
  await page.click('#tabOcs');
  ok(await page.$('.oc-acts button.imp') !== null, 'boton imprimir presente');
  // stub print en las ventanas nuevas para que no bloquee
  await ctx.addInitScript(() => { window.print = () => { window.__printed = true; }; });
  const [pop] = await Promise.all([ ctx.waitForEvent('page'), page.click('.oc-acts button.imp') ]);
  await pop.waitForFunction(() => document.body && document.body.textContent.includes('Orden de Compra'));
  const txt = await pop.textContent('body');
  ok(txt.includes('Orden de Compra N° 1') && txt.includes('Basconia') && txt.includes('A1') && txt.includes('500') && txt.includes('urgente'),
     'hoja de impresion completa');
  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
