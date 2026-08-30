const { chromium } = require('playwright');
const fs = require('fs');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

/* Pesaje POR ETAPAS (pedido del usuario, 2026-08-30): con varios items el paso 2
   muestra UNO por vez (1ro -> 2do -> 3ro) con chips de progreso y navegacion,
   y "Guardar pesaje" recien en el ultimo. Con un solo item, sin chips ni nav.
   Este test lo fija para que un rediseno no vuelva al chorizo hacia abajo. */

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
  const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
  page.on('pageerror', e => { if (!/SB\.from/.test(e.message)) { console.log('PAGEERROR:', e.message); process.exitCode = 1; } });

  await page.route('**/auth-guard.js*', r => r.fulfill({ contentType: 'application/javascript', body: 'window.GP2_AUTH_ON=false;' }));
  await page.route('**/pwa.js*', r => r.fulfill({ contentType: 'application/javascript', body: '' }));
  // stub minimo: la pagina carga (el cargar() inicial falla silencioso, no importa aca)
  await page.route('**/@supabase/supabase-js@2', r => r.fulfill({ contentType: 'application/javascript', body:
    'window.supabase={createClient:()=>({rpc:async()=>({data:{insumos:[],proveedores:[],tara:{}}})})};' }));
  await page.goto('file://' + require('path').resolve(__dirname, '..', '..', 'StockFlejes', 'RecepcionInsumos_GP2.html'));
  await page.waitForTimeout(600);

  const items3 = [
    { recId: 1, codigo: 'A1', desc: 'Fleje N° 13', modo: 'rollos', remitoKg: 360, blocks: { 1: { peso: '200', rollos: [{ c: '3', k: '65' }] }, 2: { peso: '', rollos: [{ c: '', k: '' }] } } },
    { recId: 2, codigo: 'F3', desc: 'Fleje N° 22', modo: 'rollos', remitoKg: 200, blocks: { 1: { peso: '', rollos: [{ c: '', k: '' }] } } },
    { recId: 3, codigo: 'D8', desc: 'Fleje N° 27', modo: 'rollos', remitoKg: 150, blocks: { 1: { peso: '', rollos: [{ c: '', k: '' }] } } },
  ];
  await page.evaluate(its => montarPesaje(its), items3);
  await page.waitForTimeout(200);

  let t = await page.locator('#pesajeWrap').innerText();
  ok(t.includes('Ítem 1 de 3') && t.includes('A1') && !t.includes('Fleje N° 22'), 'etapa 1: solo el primer item');
  ok(await page.locator('.pes-chip').count() === 3, 'chips de los 3 items');
  ok(await page.locator('#kgPesajeOk').isHidden(), 'Guardar oculto hasta el ultimo item');

  await page.click('.pes-nav .sig');
  t = await page.locator('#pesajeWrap').innerText();
  ok(t.includes('Ítem 2 de 3') && t.includes('Fleje N° 22'), 'Siguiente pasa al 2do item');

  // completar el 2do y seguir: el chip queda en verde
  await page.fill('.pes-pallet input[data-f="peso"]', '230');
  await page.fill('.pes-linea input[data-f="c"]', '4');
  await page.fill('.pes-linea input[data-f="k"]', '55');
  await page.click('.pes-nav .sig');
  t = await page.locator('#pesajeWrap').innerText();
  ok(t.includes('Ítem 3 de 3') && t.includes('Fleje N° 27'), 'llega al 3er item');
  ok(await page.locator('#kgPesajeOk').isVisible(), 'Guardar aparece en el ultimo');
  ok(await page.locator('.pes-chip.done', { hasText: 'F3' }).count() === 1, 'el item completo marca su chip en verde');
  ok((await page.locator('.pes-nav .ant').innerText()).includes('F3'), 'Anterior vuelve al que corresponde');

  await page.click('.pes-chip >> nth=0');
  t = await page.locator('#pesajeWrap').innerText();
  ok(t.includes('Ítem 1 de 3'), 'el chip salta directo a ese item');

  // lo escrito no se pierde al navegar
  await page.click('.pes-chip >> nth=1');
  ok(await page.locator('.pes-pallet input[data-f="peso"]').inputValue() === '230', 'lo cargado sobrevive la navegacion');

  // AUTO-CALCULO (v3.14.0): balanza 450 y 5 rollos => kg c/u = (450-6)/5 = 88,8 solo;
  // corregirlo a mano lo fija y el auto no lo pisa mas
  await page.evaluate(its => montarPesaje(its), [
    { recId: 9, codigo: 'A9', desc: 'Fleje demo', modo: 'rollos', remitoKg: 450,
      blocks: { 1: { peso: '', rollos: [{ c: '1', k: '' }] } } }]);
  await page.waitForTimeout(200);
  await page.fill('.pes-pallet input[data-f="peso"]', '450');
  for (let i = 0; i < 4; i++) await page.click('[data-step="1"]');   // 1 -> 5 rollos
  let kAuto = await page.locator('.kgw input').inputValue();
  ok(kAuto === '88,8', 'kg por rollo se calcula solo: (450-6)/5 = 88,8 (dio ' + kAuto + ')');
  ok(await page.locator('.kgw input.auto').count() === 1, 'el valor automatico se distingue (azul)');
  await page.fill('.kgw input', '88,5');                              // correccion manual
  await page.click('[data-step="1"]');                                // 5 -> 6 rollos
  kAuto = await page.locator('.kgw input').inputValue();
  ok(kAuto === '88,5', 'corregido a mano, el auto no lo pisa mas (quedo ' + kAuto + ')');

  // con UN item: sin chips, sin nav, Guardar visible
  await page.evaluate(its => montarPesaje(its), [items3[0]]);
  await page.waitForTimeout(200);
  ok(await page.locator('.pes-chip').count() === 0, 'un solo item: sin chips');
  ok(await page.locator('.pes-nav').count() === 0, 'un solo item: sin navegacion');
  ok(await page.locator('#kgPesajeOk').isVisible(), 'un solo item: Guardar directo');

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
