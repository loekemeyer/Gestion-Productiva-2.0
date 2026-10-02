/* Botón "→ Virgilio" en el control de cajas y en el pesaje de flejes [Thomas 2026-10-01]:
   lo que no entra en Cervantes por espacio se baja directo a Virgilio. El control tiene que:
   (1) dejar mandar una cantidad a Virgilio (RPC recepcion_a_virgilio), y
   (2) comparar contra el ESPERADO = remito − lo de Virgilio, no contra el remito, así lo
       que no entró deja de leerse como faltante.
   Dos frentes: cajas (control-cajas.html, en unidades) y flejes (RecepcionInsumos, pesaje en kg). */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

// Una caja: remito 10.000 uni, 3.000 ya mandadas a Virgilio, sin controlar todavía.
const CAJA = {
  id: 50, fecha: '2026-10-01', componente_id: 456, proveedor: 'Prov X', remito: 'R1',
  codigo: 'A1', descripcion: 'Caja A1', cantidad: 10000, unidad: 'uni',
  controlado: false, cantidad_declarada: null, virgilio: 3000,
  base: null, pisos: null, sueltas: null, paquetes: null, uni_x_paq: null,
};
const BUNDLE_CAJAS = { tol_pct: 5, sector: 'Sector Caja', sector_id: 11, uni_x_paq_default: 25, recepciones: [CAJA] };

const STUB = `
window.__calls = [];
window.supabase = { createClient: function(){ return {
  rpc: async function(name, args){
    window.__calls.push({name:name, args:args});
    if(name==='control_recepcion_bundle') return { data: ${JSON.stringify(BUNDLE_CAJAS)}, error: null };
    if(name==='recepcion_a_virgilio')     return { data: { ok:true, virgilio: args.p_cantidad }, error: null };
    if(name==='controlar_recepcion_cajas')return { data: { total: 7000, virgilio: 3000 }, error: null };
    return { data: null, error: { message: 'rpc desconocida '+name } };
  }
};}};
`;

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
  const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
  page.on('pageerror', e => { if (!/SB\.from/.test(e.message)) { console.log('PAGEERROR:', e.message); process.exitCode = 1; } });

  await page.route('**/auth-guard.js*', r => r.fulfill({ contentType: 'application/javascript', body: 'window.GP2_AUTH_ON=false;' }));
  await page.route('**/pwa.js*', r => r.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.route('**/@supabase/supabase-js@2**', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/gp2-modulo.css**', r => r.fulfill({ contentType: 'text/css', body: '.hidden{display:none!important}' }));
  await page.route('**/GP2_favicon.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));

  // ================= CAJAS =================
  await page.goto(ROOT + '/StockFlejes/control-cajas.html');
  await page.waitForFunction(() => (window.__calls || []).some(c => c.name === 'control_recepcion_bundle'));
  await page.waitForSelector('.item-btn');

  const card = await page.locator('.item-btn').first().innerText();
  ok(/Virgilio/.test(card) && /3\.000/.test(card), 'cajas: la tarjeta muestra lo mandado a Virgilio (3.000) — ' + card.replace(/\n/g, ' '));
  ok(/7\.000/.test(card), 'cajas: y el esperado en Cervantes (10.000 − 3.000 = 7.000)');

  await page.click('.item-btn');
  await page.waitForSelector('#ovCtrl.open');
  ok(await page.locator('#btnVirgilio').isVisible(), 'cajas: el botón "→ Virgilio" está en el popup');
  ok(/7\.000/.test(await page.locator('#virgLine').innerText()), 'cajas: el popup dice el esperado en Cervantes');

  // Contar 7.000 (280 × 1 × 25) tiene que COINCIDIR con lo esperado (no con el remito).
  await page.fill('#inBase', '280');
  await page.fill('#inPisos', '1');
  await page.waitForTimeout(100);
  const diff = await page.locator('#lblDiff').innerText();
  ok(/[Cc]oincide/.test(diff) && /7\.000/.test(diff), 'cajas: contar 7.000 coincide con lo esperado — ' + diff);

  // El botón "→ Virgilio" abre el cajón y Guardar llama a la RPC con la cantidad.
  await page.click('#btnVirgilio');
  await page.waitForTimeout(80);
  ok(await page.locator('#virgBox').isVisible(), 'cajas: "→ Virgilio" abre el cajón de carga');
  await page.fill('#inVirg', '2000');
  await page.click('#btnVirgSave');
  await page.waitForTimeout(200);
  const vcall = await page.evaluate(() => (window.__calls || []).filter(c => c.name === 'recepcion_a_virgilio').pop());
  ok(vcall && vcall.args.p_recepcion_id === 50 && Number(vcall.args.p_cantidad) === 2000,
     'cajas: Guardar envío llama recepcion_a_virgilio(50, 2000) — ' + JSON.stringify(vcall && vcall.args));

  // ================= FLEJES (pesaje) =================
  await page.goto(ROOT + '/StockFlejes/RecepcionInsumos_GP2.html');
  await page.waitForTimeout(500);
  await page.evaluate(() => { window.__calls = []; });

  // Fleje: remito 10.000 kg, 3.000 a Virgilio → esperado 7.000. En modo peso total (tara 0)
  // la balanza de 7.000 tiene que dar "coincide" contra el esperado, no faltar 3.000.
  await page.evaluate(() => montarPesaje([{
    recId: 77, codigo: 'IA2', desc: 'Fleje N° 1', modo: 'peso', remitoKg: 10000, virgilio: 3000,
    blocks: { 1: { peso: '7000', rollos: [] } },
  }]));
  await page.waitForTimeout(150);

  const calcLinea = await page.locator('[data-itemcalc="0"]').innerText();
  ok(/Virgilio/.test(calcLinea) && /7\.000/.test(calcLinea), 'flejes: la línea muestra Virgilio y el esperado — ' + calcLinea.replace(/\n/g, ' '));
  const dif = await page.evaluate(() => itemDif(PES.items[0]));
  ok(dif && dif.esperado === 7000 && Math.abs(dif.dif) < 0.5 && dif.ok,
     'flejes: pesar 7.000 coincide con el esperado (dif≈0) — ' + JSON.stringify({ esp: dif && dif.esperado, dif: dif && dif.dif, ok: dif && dif.ok }));

  // El envío a Virgilio ahora es un BOTÓN arriba que despliega el input [Thomas 2026-10-02].
  ok(await page.locator('[data-virgtoggle="0"]').isVisible(), 'flejes: el "→ Virgilio" es un botón arriba');
  ok(/3\.000/.test(await page.locator('[data-virgtoggle="0"]').innerText()), 'flejes: el botón muestra lo ya mandado (3.000)');
  ok((await page.locator('[data-virg="0"]').count()) === 0, 'flejes: el input NO está a la vista hasta tocar el botón');
  await page.click('[data-virgtoggle="0"]');
  await page.waitForSelector('[data-virg="0"]');
  ok((await page.locator('[data-virg="0"]').inputValue()) === '3000', 'flejes: al abrir, el input viene precargado');

  // Cambiar el envío a 2.500 llama a la RPC con la cantidad nueva.
  await page.fill('[data-virg="0"]', '2500');
  await page.click('[data-virgsave="0"]');
  await page.waitForTimeout(200);
  const fcall = await page.evaluate(() => (window.__calls || []).filter(c => c.name === 'recepcion_a_virgilio').pop());
  ok(fcall && fcall.args.p_recepcion_id === 77 && Number(fcall.args.p_cantidad) === 2500,
     'flejes: Guardar envío llama recepcion_a_virgilio(77, 2500) — ' + JSON.stringify(fcall && fcall.args));

  // ── Kg por rollo al lado de Rollos = (balanza − tara 6) / rollos [Thomas 2026-10-02] ──
  // tara por defecto (4+8)/2 = 6; 76 − 6 = 70 / 2 rollos = 35 kg/rollo (el ejemplo del pedido).
  await page.evaluate(() => montarPesaje([{
    recId: 88, codigo: 'ID5', desc: 'Fleje N° 38', modo: 'rollos', remitoKg: 100, virgilio: 0,
    blocks: { 1: { peso: '76', rollos: [{ c: '2', k: '' }] } },
  }]));
  await page.waitForTimeout(150);
  const kgr = await page.locator('[data-kgr="0-1"]').innerText();
  ok(/35/.test(kgr) && /kg\/rollo/.test(kgr), 'flejes: muestra 35 kg/rollo = (76 − 6) / 2 — ' + kgr);
  // y se recalcula en vivo al cambiar la balanza: (146 − 6) / 2 = 70
  await page.fill('.pes-pallet[data-p="1"] input[data-f="peso"]', '146');
  await page.waitForTimeout(120);
  const kgr2 = await page.locator('[data-kgr="0-1"]').innerText();
  ok(/70/.test(kgr2), 'flejes: el kg/rollo se recalcula en vivo (146 − 6)/2 = 70 — ' + kgr2);

  await browser.close();
})();
