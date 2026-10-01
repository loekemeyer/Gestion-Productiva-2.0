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
    'window.supabase={createClient:()=>({rpc:async()=>({data:{insumos:[],proveedores:[],tara:{tara_pallet_min:4,tara_pallet_max:8,tara_estimada:5.0,tara_n:12,tara_por_proveedor:{}}}})})};' }));
  await page.goto('file://' + require('path').resolve(__dirname, '..', '..', 'StockFlejes', 'RecepcionInsumos_GP2.html'));
  await page.waitForTimeout(600);

  const items3 = [
    { recId: 1, codigo: 'A1', desc: 'Fleje N° 13', modo: 'rollos', remitoKg: 360, blocks: { 1: { peso: '200', rollos: [{ c: '2', k: '65' }, { c: '1', k: '60' }] }, 2: { peso: '', rollos: [{ c: '', k: '' }] } } },
    { recId: 2, codigo: 'F3', desc: 'Fleje N° 22', modo: 'rollos', remitoKg: 200, blocks: { 1: { peso: '', rollos: [{ c: '', k: '' }] } } },
    { recId: 3, codigo: 'D8', desc: 'Fleje N° 27', modo: 'rollos', remitoKg: 150, blocks: { 1: { peso: '', rollos: [{ c: '', k: '' }] } } },
  ];
  await page.evaluate(its => montarPesaje(its), items3);
  await page.waitForTimeout(200);

  let t = await page.locator('#pesajeWrap').innerText();
  ok(t.includes('Ítem 1 de 3') && t.includes('A1') && !t.includes('Fleje N° 22'), 'etapa 1: solo el primer item');
  ok(await page.locator('.pes-chip').count() === 3, 'chips de los 3 items');
  ok(await page.locator('#kgPesajeOk').isHidden(), 'Guardar oculto hasta el ultimo item');

  // Al pasar de item, si la balanza no llega al remito la pantalla pide una
  // confirmacion nativa antes de dejar seguir [usuario 2026-09-01: "cuando tenes 2
  // flejes en vez de guardar pasas al siguiente, que eso tambien te tire el mensaje
  // de guardar"]. El item 1 esta en ese caso (balanza 200 contra remito 360), asi
  // que el test la acepta — sin este handler Playwright la descarta sola y la
  // navegacion queda bloqueada.
  const confirms = [];
  page.on('dialog', async d => { confirms.push(d.message()); await d.accept(); });

  await page.click('.pes-nav .sig');
  t = await page.locator('#pesajeWrap').innerText();
  ok(t.includes('Ítem 2 de 3') && t.includes('Fleje N° 22'), 'Siguiente pasa al 2do item');
  ok(confirms.length === 1 && /no coincide con el remito/i.test(confirms[0]) && /A1: remito 360 kg/.test(confirms[0]),
     'lejos del remito avisa con la cuenta antes de pasar de item (' + (confirms[0] || 'sin aviso').split('\n')[0] + ')');

  // completar el 2do y seguir: el chip queda en verde
  await page.fill('.pes-pallet input[data-f="peso"]', '205');
  await page.fill('.pes-pallet input[data-f="c"]', '4');
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
  ok(await page.locator('.pes-pallet input[data-f="peso"]').inputValue() === '205', 'lo cargado sobrevive la navegacion');
  ok(await page.locator('.pes-pallet input[data-f="c"]').inputValue() === '4', 'los rollos tambien');

  // EL CONTROL DEL REMITO DESCUENTA EL PALLET (v3.18.0, pedido del usuario: "esto parece
  // que lo muestra como mal pero esta bien si descontas el pallet"). La balanza pesa
  // producto + pallet: compararla cruda contra el remito marcaba ROJO con la balanza dando
  // JUSTO, y encima decia "dio menos" cuando la diferencia era 0.
  {
    const linea = async (peso) => {
      await page.evaluate(p => montarPesaje([{ recId: 1, codigo: 'B1', desc: 'F', modo: 'rollos',
        remitoKg: 1200, blocks: { 1: { peso: p, rollos: [{ c: '5', k: '88,5' }] } } }]), peso);
      await page.waitForTimeout(80);
      const el = page.locator('[data-itemcalc]').first();
      return { txt: (await el.innerText()).replace(/\s+/g, ' '),
               ok: await el.evaluate(n => !!n.querySelector('.okc')) };
    };
    const justo = await linea('1200');
    ok(justo.ok, 'balanza JUSTO el remito da verde (el pallet explica la diferencia)');
    ok(!/dio menos/.test(justo.txt), 'con dif 0 ya no dice "dio menos", que era falso');
    ok(/neto 1\.195 kg/.test(justo.txt) && /-5 kg/.test(justo.txt) && justo.txt.length < 60,
       'una linea corta con el pallet descontado — ' + justo.txt);
    const tit = await page.locator('[data-itemcalc] span[title]').first().getAttribute('title');
    ok(/1 pallet/.test(tit || ''), 'la cuenta de la tara queda en el title — ' + tit);
    ok((await linea('1212')).ok, 'balanza +12 sigue en verde');
    const corto = await linea('1100');
    ok(!corto.ok && /⚠/.test(corto.txt), 'un faltante de verdad (-100) sigue avisando — ' + corto.txt);
    const sobra = await linea('1400');
    ok(!sobra.ok && /\+195 kg/.test(sobra.txt), 'un excedente de verdad (+200) ahora tambien avisa — ' + sobra.txt);
    // dejar el item de siempre para lo que sigue
    await page.evaluate(() => montarPesaje([{ recId: 1, codigo: 'B1', desc: 'F', modo: 'rollos',
      remitoKg: 1200, blocks: { 1: { peso: '450', rollos: [{ c: '5', k: '88,5' }] } } }]));
    await page.waitForTimeout(80);
  }

  // PALLET = KG + ROLLOS (v3.67.0) [usuario 2026-09-30: "Hay mucho texto. Que me pida kgs, rollos.
  // Y si hay mas de un pallet: +pallet y vuelvo a cargar kgs y rollos"]. Sin el campo de kg por
  // rollo, sin "+ rollos de otro peso", sin la linea de sobrante; los dos campos en un renglon a 390px.
  {
    const geo = await page.evaluate(() => {
      const bal = document.querySelector('.pes-pallet input[data-f="peso"]');
      const stp = document.querySelector('.pes-pallet .stp');
      const r = el => el.getBoundingClientRect();
      return { mismaFila: Math.abs(r(bal).top - r(stp).top) <= 2, balH: Math.round(r(bal).height),
               stpH: Math.round(r(stp).height), der: Math.round(r(stp).right),
               ancho: document.documentElement.clientWidth,
               inputs: document.querySelectorAll('.pes-pallet input').length,
               txt: document.querySelector('#pesajeWrap').innerText };
    });
    ok(geo.inputs === 2, 'un pallet pide solo 2 cosas: kg y rollos (inputs: ' + geo.inputs + ')');
    ok(geo.mismaFila && geo.der <= geo.ancho, `kg y rollos en el mismo renglon, sin desbordar (${geo.der}px de ${geo.ancho})`);
    ok(Math.abs(geo.stpH - geo.balH) <= 4, `kg y stepper a la misma altura (${geo.balH} vs ${geo.stpH})`);
    ok(!/otro peso|sobrante|esperado/i.test(geo.txt), 'sin "rollos de otro peso" ni linea de sobrante');
    // + Pallet agrega otra fila de kg y rollos, con su numero
    await page.click('[data-addp]');
    const n2 = await page.evaluate(() => ({ filas: document.querySelectorAll('.pes-pallet').length,
      pn: [...document.querySelectorAll('.pes-grid .pn')].map(e => e.textContent).join(','),
      inputs: document.querySelectorAll('.pes-pallet input').length }));
    ok(n2.filas === 2 && n2.pn === '1,2' && n2.inputs === 4, '+ Pallet agrega otra fila Kg + Rollos (' + JSON.stringify(n2) + ')');
    await page.evaluate(() => montarPesaje([{ recId: 1, codigo: 'B1', desc: 'F', modo: 'rollos',
      remitoKg: 1200, blocks: { 1: { peso: '450', rollos: [{ c: '5', k: '88,5' }] } } }]));
    await page.waitForTimeout(80);
  }

  // KG POR ROLLO (v3.67.0): ya no se pide; al guardar sale de (balanza - tara) / rollos, con la
  // tara APRENDIDA (5 en este stub): 450 y 5 rollos => (450-5)/5 = 89. Los pallets viejos con
  // varias lineas se suman en una sola cantidad.
  {
    const r = await page.evaluate(() => {
      const p = { peso: '450', rollos: [{ c: '3', k: '90' }, { c: '2', k: '85' }] };
      unaLinea(p);
      return { c: p.rollos.length + ':' + p.rollos[0].c, k: kgPorRollo(p) };
    });
    ok(r.c === '1:5', 'dos lineas viejas (3 + 2) quedan en una de 5 rollos (' + r.c + ')');
    ok(r.k === 89, 'kg por rollo = (450-5)/5 = 89 (dio ' + r.k + ')');
    const stp = await page.evaluate(() => {
      montarPesaje([{ recId: 9, codigo: 'A9', desc: 'Fleje demo', modo: 'rollos', remitoKg: 450,
        blocks: { 1: { peso: '', rollos: [{ c: '1', k: '' }] } } }]);
      return 0;
    });
    for (let i = 0; i < 4; i++) await page.click('[data-step="1"]');   // 1 -> 5 rollos
    ok(await page.locator('.pes-pallet input[data-f="c"]').inputValue() === '5', 'el + del stepper suma rollos');
  }

  // con UN item: sin chips, sin nav, Guardar visible
  await page.evaluate(its => montarPesaje(its), [items3[0]]);
  await page.waitForTimeout(200);
  ok(await page.locator('.pes-chip').count() === 0, 'un solo item: sin chips');
  ok(await page.locator('.pes-nav').count() === 0, 'un solo item: sin navegacion');
  ok(await page.locator('#kgPesajeOk').isVisible(), 'un solo item: Guardar directo');

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
