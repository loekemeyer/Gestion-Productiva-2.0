/* Tablet/Tablet_GP2.html: las baldosas de Enviar/Recibir aparecen TODAS JUNTAS (v1.40.1, 2026-10-08).
   [Nazareno: "Siempre que entro me carga primero el módulo de prov de insumo" — "quiero que me carguen
   todos los módulos a la vez"]. tablet_bundle tarda (1,45 s en la base + ~580 KB al 2026-10-08) y los
   botones Enviar/Recibir ya se pueden tocar antes; "Prov. de insumos" es un link que no necesita datos,
   así que se dibujaba sola y además borraba el "Cargando…". Fija, con Supabase STUBEADO:
     1. antes de que llegue el bundle, tocar Recibir NO dibuja ninguna baldosa y sigue "Cargando…";
     2. cuando llega, aparecen todas a la vez y en el modo que se tocó;
     3. si el bundle falla, tocar un modo no dibuja nada ni tapa el error. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const BUNDLE = {
  contrapartes: [
    { tipo: 'tallerista', ref: '6', nombre: 'Martin Cornejo', n_env: 1, n_rec: 1 },
    { tipo: 'proveedor_servicio', ref: '20', nombre: 'Blist-Pack', n_env: 1, n_rec: 1 },
    { tipo: 'virgilio', ref: 'virgilio', nombre: 'Virgilio', n_env: 0, n_rec: 1 },
  ],
  enviar: [], recibir: [],
};

// la demora del bundle se libera a mano (window.__soltar) para no depender de tiempos
const stub = (falla) => `
window.supabase = { createClient: function(){ return {
  rpc: async function(name){
    if (name === 'tablet_bundle') {
      await new Promise(function(r){ window.__soltar = r; });
      return ${falla} ? { data: null, error: { message: 'se cortó la red' } }
                      : { data: ${JSON.stringify(BUNDLE)}, error: null };
    }
    return { data: [], error: null };
  }
};}};`;

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ok = (c, msg) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + msg); if (!c) process.exitCode = 1; };
  const baldosas = (pg) => pg.$$eval('#tipoGrid .tipo-btn', e => e.map(x => x.dataset.tipo));

  async function abrir(falla) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const pg = await ctx.newPage();
    pg.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
    await pg.route('**/@supabase/supabase-js@2**', r => r.fulfill({ contentType: 'application/javascript', body: stub(falla) }));
    await pg.route('**/GP2_favicon.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
    await pg.goto(ROOT + '/Tablet/Tablet_GP2.html');
    await pg.waitForFunction(() => typeof window.__soltar === 'function');
    await pg.click('button.modo-btn[data-modo="recibir"]');
    return { ctx, pg };
  }

  // 1 y 2: el bundle llega bien
  {
    const { ctx, pg } = await abrir(false);
    ok((await baldosas(pg)).length === 0, 'antes del bundle: Recibir no dibuja ninguna baldosa (tampoco Prov. de insumos)');
    ok((await pg.$eval('#status', e => e.textContent)) === 'Cargando…', 'antes del bundle: sigue diciendo "Cargando…"');
    await pg.evaluate(() => window.__soltar());
    await pg.waitForSelector('#tipoGrid .tipo-btn');
    const ts = await baldosas(pg);
    ok(['tallerista', 'proveedor_servicio', 'proveedor_insumo', 'virgilio'].every(t => ts.includes(t)) && ts.length === 4,
       'con el bundle: las 4 baldosas de Recibir aparecen juntas (' + ts.join(', ') + ')');
    ok(await pg.$eval('button.modo-btn[data-modo="recibir"]', e => e.classList.contains('active')),
       'con el bundle: queda en Recibir, el modo que se tocó mientras cargaba');
    await ctx.close();
  }

  // 3: el bundle falla
  {
    const { ctx, pg } = await abrir(true);
    await pg.evaluate(() => window.__soltar());
    await pg.waitForFunction(() => /Error/.test(document.getElementById('status').textContent));
    await pg.click('button.modo-btn[data-modo="enviar"]');
    ok((await baldosas(pg)).length === 0, 'bundle con error: tocar un modo no dibuja baldosas sueltas');
    ok(/se cortó la red/.test(await pg.$eval('#status', e => e.textContent)), 'bundle con error: el mensaje de error no se tapa');
    await ctx.close();
  }

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
