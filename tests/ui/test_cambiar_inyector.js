/* CambiarInyector/CambiarInyector_GP2.html (2026-10-09) — quién tiene la matriz de cada familia de plásticos.
   Fija: una tarjeta por familia (sin "Otros"), el inyector actual marcado, tocar otro pide confirmar, Confirmar
   manda cambiar_inyector_familia con la familia y el inyector, Cancelar no escribe, la O.C. abierta del
   inyector anterior se avisa, y la familia con piezas repartidas lo dice. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const BUNDLE = {
  iny: [ { id: 19, n: 'JL Matriceria' }, { id: 12, n: 'Kollplast' }, { id: 11, n: 'Pat Bet Plast' }, { id: 10, n: 'Pettofrezza Rafael' } ],
  fam: [
    { n: 'Cierra Bolsa', min: 10000, prov: 'JL Matriceria',
      partes: [ { id: 1, cod: 'PC4', d: 'Cierra bolsa', prov: 'JL Matriceria' } ],
      oc: [ { numero: 3, prov: 'JL Matriceria', pend: 10000 } ] },
    { n: 'Pirolos', min: 36000, prov: 'Pat Bet Plast',
      partes: [ { id: 2, cod: 'PA12', d: 'Pirolo rojo', prov: 'Pat Bet Plast' },
                { id: 3, cod: 'PA7A', d: 'Pirolo blanco', prov: 'Pat Bet Plast' },
                { id: 4, cod: 'PA7B', d: 'Pirolo negro', prov: 'Pat Bet Plast' } ],
      oc: [] },
    { n: 'Plaquitas', min: 6000, prov: null,
      partes: [ { id: 5, cod: 'PA1', d: 'Plaquita LK', prov: 'Pat Bet Plast' },
                { id: 6, cod: 'PA2', d: 'Plaquita blanca', prov: 'Kollplast' } ],
      oc: [] },
  ],
};

const STUB = `
window.supabase = { createClient: function(){ return {
  rpc: async function(name, args){
    window.__calls = window.__calls || [];
    window.__calls.push({ name: name, args: args });
    if (name === 'cambiar_inyector_bundle') return { data: ${JSON.stringify(BUNDLE)}, error: null };
    if (name === 'cambiar_inyector_familia') {
      if (args.p_familia === 'Plaquitas') return { data: null, error: { message: 'No autorizado' } };
      return { data: { ok: true, familia: args.p_familia, proveedor: args.p_proveedor, n: 3 }, error: null };
    }
    return { data: null, error: { message: 'rpc desconocida ' + name } };
  },
  from: function(t){ throw new Error('acceso directo a la tabla ' + t); }
};}};
`;

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });

  await page.route('**/@supabase/supabase-js@2', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/auth-guard.js*', r => r.fulfill({ contentType: 'application/javascript', body: 'window.GP2_AUTH_ON=false;' }));
  await page.route('**/GP2_favicon.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));

  await page.goto(ROOT + '/CambiarInyector/CambiarInyector_GP2.html');
  await page.waitForFunction(() => /familias/.test(document.getElementById('status').textContent));

  const ok = (c, msg) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + msg); if (!c) process.exitCode = 1; };
  const llamadas = () => page.evaluate(() => (window.__calls || []).filter(c => c.name === 'cambiar_inyector_familia'));

  ok(await page.$$eval('.ci-fam', x => x.length) === 3, '3 familias listadas');
  ok(!/Otros/.test(await page.textContent('#lista')), 'la familia Otros no aparece');
  const btns = await page.$$eval('[data-fam="Pirolos"] .prov-btn', xs => xs.map(x => x.textContent));
  ok(btns.join('|') === 'JL Matriceria|Kollplast|Pat Bet Plast|Pettofrezza Rafael', 'un botón por inyector: ' + btns.join('|'));
  ok(await page.$eval('[data-fam="Pirolos"] .prov-btn.active', b => b.textContent) === 'Pat Bet Plast', 'Pirolos marca Pat Bet Plast');
  ok(/PA7A/.test(await page.textContent('[data-fam="Pirolos"] .ci-partes')), 'muestra las piezas de la familia');
  ok(/repartidas/.test(await page.textContent('[data-fam="Plaquitas"] .ci-hoy')), 'la familia con piezas repartidas lo avisa');
  ok(/1 con piezas repartidas/.test(await page.textContent('#status')), 'status cuenta las repartidas');

  // tocar el inyector actual no hace nada
  await page.click('[data-fam="Pirolos"] .prov-btn.active');
  ok(!(await page.$('[data-fam="Pirolos"] .ci-conf')), 'tocar el que ya tiene la matriz no pide confirmar');

  // tocar otro pide confirmar; Cancelar no escribe
  await page.click('[data-fam="Pirolos"] .prov-btn:has-text("Kollplast")');
  ok(/Pat Bet Plast → Kollplast/.test(await page.textContent('[data-fam="Pirolos"] .ci-conf')), 'confirmación dice de quién a quién');
  ok(/PA12, PA7A, PA7B/.test(await page.textContent('[data-fam="Pirolos"] .ci-conf')), 'confirmación lista las 3 piezas');
  await page.click('[data-fam="Pirolos"] [data-cancel]');
  ok(!(await page.$('.ci-conf')) && (await llamadas()).length === 0, 'Cancelar no escribe');

  // Confirmar manda la familia entera
  await page.click('[data-fam="Pirolos"] .prov-btn:has-text("Kollplast")');
  await page.click('[data-fam="Pirolos"] [data-ok]');
  await page.waitForFunction(() => /✓ Pirolos → Kollplast/.test(document.getElementById('lista').textContent));
  const c = (await llamadas())[0].args;
  ok(c.p_familia === 'Pirolos' && c.p_proveedor === 'Kollplast', 'RPC con familia e inyector: ' + JSON.stringify(c));
  ok(await page.$eval('[data-fam="Pirolos"] .prov-btn.active', b => b.textContent) === 'Kollplast', 'queda marcado Kollplast');

  // O.C. abierta con el inyector anterior: se avisa antes de confirmar
  await page.click('[data-fam="Cierra Bolsa"] .prov-btn:has-text("Kollplast")');
  ok(/O\.C\. N° 3 de JL Matriceria/.test(await page.textContent('[data-fam="Cierra Bolsa"] .ci-conf')), 'avisa la O.C. abierta del inyector anterior');
  await page.click('[data-fam="Cierra Bolsa"] [data-cancel]');

  // error del server: se muestra en la tarjeta y no marca nada
  await page.click('[data-fam="Plaquitas"] .prov-btn:has-text("Kollplast")');
  await page.click('[data-fam="Plaquitas"] [data-ok]');
  await page.waitForFunction(() => /No se pudo cambiar/.test(document.getElementById('lista').textContent));
  ok(!(await page.$('[data-fam="Plaquitas"] .prov-btn.active')), 'si falla no marca ningún inyector');

  // buscar por pieza
  await page.fill('#q', 'pa7b');
  ok(await page.$$eval('.ci-fam', x => x.length) === 1, 'buscar por código de pieza encuentra su familia');

  // 390px: sin scroll horizontal y botones tocables
  await page.fill('#q', '');
  const m = await page.evaluate(() => ({
    h: document.documentElement.scrollWidth > window.innerWidth,
    alto: Math.min(...[...document.querySelectorAll('.prov-btn')].map(b => b.getBoundingClientRect().height)),
  }));
  ok(!m.h, '390px: sin scroll horizontal');
  ok(m.alto >= 44, '390px: botones de inyector ≥ 44px (' + Math.round(m.alto) + ')');

  await browser.close();
})();
