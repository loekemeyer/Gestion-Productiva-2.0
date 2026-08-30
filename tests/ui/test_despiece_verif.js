const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

/* Despiece x Articulo v2.0.0 = fusion de Verificacion + VerifMadres (pedido del
   usuario: "Que funcione mergeado todo en despiece x articulo"). Este test fija:
   al elegir un articulo se ven receta + ruta trazada + avisos; Confirmar dispara
   la RPC ruta_confirmar con la MISMA firma de deduplicacion de siempre; el
   resumen global cuenta pendientes y el filtro "solo con pendientes" filtra.
   Corre tambien en viewport de celular (390px): sin scroll horizontal y botones
   tocables. */

// firma esperada: F:<fleje>|tp:(actor||cs||ce)|...  (identica a la de Verificacion_GP2)
const FIRMA_101 = 'F:F1|ingreso:F1|matriz:62|tallerista:Carlos|virgilio:';
const FIRMA_202 = 'F:F2|ingreso:F2|tallerista:Martin|virgilio:';

const BUNDLE = {
  sect: { '1': { tipo: 'Fleje', nom: 'Sector Fleje' }, '2': { tipo: 'Crudo', nom: 'Sector Crudo' } },
  art: [
    { id: 1, cod: '101', fam: 'Cuchillos', por: 12, comp: [
      { cod: 'F1', d: 'Fleje uno', s: 1, um: 'kg', q: 1, kg: 0.05, uxc: 100, fkg: false, fuxc: false },
      { cod: 'C9', d: 'Resorte U Crom', s: 2, um: 'uni', q: 2, kg: null, uxc: null, fkg: true, fuxc: true },
    ] },
    { id: 2, cod: '202', fam: 'Tenedores', por: 24, comp: [
      { cod: 'F2', d: 'Fleje dos', s: 1, um: 'kg', q: 1, kg: 0.03, uxc: 50, fkg: false, fuxc: false },
    ] },
  ],
  rutas: [
    { id: 10, nom: 'r1', art: '101', fam: 'Cuchillos', fleje: 'F1', fleje_desc: 'Fleje uno', pasos: [
      { o: 1, tp: 'ingreso', ce: 'F1' },
      { o: 2, tp: 'matriz', actor: '62', actor_desc: 'Corte', ce: 'F1', cs: 'C1', cs_d: 'Cuchilla cortada' },
      { o: 3, tp: 'tallerista', actor: 'Carlos', ce: 'C1', cs: 'Z1' },
      { o: 4, tp: 'virgilio', art: '101' },
    ] },
    { id: 11, nom: 'r2', art: '202', fam: 'Tenedores', fleje: 'F2', fleje_desc: 'Fleje dos', pasos: [
      { o: 1, tp: 'ingreso', ce: 'F2' },
      { o: 2, tp: 'tallerista', actor: 'Martin', ce: 'F2', cs: 'Z2' },
      { o: 3, tp: 'virgilio', art: '202' },
    ] },
  ],
  // la ruta del 202 ya esta confirmada -> el 202 queda "al dia" (sin pendientes)
  confirmadas: [{ firma: FIRMA_202, articulo: '202', fleje: 'F2', por: 'test', en: '2026-08-30T10:00:00Z' }],
  problemas: [],
  madres: { total_comp: 10, sin_kg: 3, sin_uxc: 4 },
};

const STUB = 'window.__rpc=[];window.supabase={createClient:function(){return{rpc:async function(n,a){' +
  'window.__rpc.push({n:n,a:a||null});' +
  'if(n==="despiece_verif_bundle")return{data:' + JSON.stringify(BUNDLE) + ',error:null};' +
  'return{data:99,error:null};}}}};';

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  page.on('dialog', d => d.accept());
  await page.route('**/@supabase/supabase-js@2', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/gp2-claro.css**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await page.route('**/*.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
  await page.goto(ROOT + '/Despiece%20x%20Articulo/Despiece_GP2.html');
  await page.waitForSelector('.art-section');

  // ── resumen global: cuenta pendientes ──
  let kpis = await page.locator('#kpis').innerText();
  ok((await page.locator('#kpiSinConf').innerText()).trim() === '1', 'KPI: 1 ruta sin confirmar (de 2)');
  ok(/3/.test(kpis) && /Comp\. sin Kg x Uni/i.test(kpis), 'KPI: comp sin Kg x Uni (global, viene de madres)');
  ok(/4/.test(kpis) && /Comp\. sin Uni x Caj/i.test(kpis), 'KPI: comp sin Uni x Cajon (global)');

  // ── filtro "solo articulos con pendientes": el 202 (confirmado y sin faltas) se oculta ──
  await page.check('#chkPend');
  let cods = await page.$$eval('.art-head .cod', xs => xs.map(x => x.textContent.trim()));
  ok(cods.length === 1 && cods[0] === '101', 'filtro pendientes: queda solo el 101 (' + cods.join(',') + ')');
  await page.uncheck('#chkPend');

  // ── elegir un articulo: receta + ruta + avisos en la misma pantalla ──
  await page.selectOption('#selArt', '101');
  await page.waitForSelector('.art-section.open');
  const sec = page.locator('.art-section.open');
  const txt = await sec.innerText();
  ok(/Receta/i.test(txt) && /C9/.test(txt) && /Resorte U Crom/.test(txt), 'receta: componentes del articulo');
  ok((await sec.locator('td.falta').count()) === 2, 'receta: kg y uxc faltantes marcados FALTA');
  ok((await sec.locator('.ruta-card').count()) === 1, 'ruta trazada del articulo presente');
  ok(/Carlos/.test(txt) && /Matriz|62/.test(txt), 'la ruta muestra sus pasos (matriz 62, Carlos)');
  ok(/Avisos/i.test(txt) && /falta Kg x Uni y Uni x Caj/i.test(txt), 'avisos: el C9 sin datos maestros aparece');

  // ── sin scroll horizontal y botones tocables en celular ──
  const mob = await page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth > window.innerWidth,
    hBtn: Math.min(...[...document.querySelectorAll('.art-section.open .btn-conf')].map(b => b.getBoundingClientRect().height)),
  }));
  ok(!mob.horizontal, 'celular 390px: sin scroll horizontal');
  ok(mob.hBtn >= 44, 'celular: botones de confirmar tocables (' + Math.round(mob.hBtn) + 'px, minimo 44)');

  // ── confirmar dispara la RPC correcta con la MISMA firma de siempre ──
  await page.fill('#inpUsuario', 'tester');
  await page.click('.art-section.open .btn-conf.ok');
  await page.waitForFunction(() => window.__rpc.some(c => c.n === 'ruta_confirmar'));
  const call = await page.evaluate(() => window.__rpc.find(c => c.n === 'ruta_confirmar'));
  ok(call.a.p_firma === FIRMA_101, 'ruta_confirmar con la firma de deduplicacion (' + call.a.p_firma + ')');
  ok(call.a.p_articulo === '101' && call.a.p_fleje === 'F1' && call.a.p_usuario === 'tester', 'ruta_confirmar con articulo, fleje y usuario');
  await page.waitForFunction(() => document.getElementById('kpiSinConf').textContent.trim() === '0');
  ok(true, 'el resumen global baja a 0 rutas sin confirmar');
  ok(/Confirmada/.test(await page.locator('.art-section.open').innerText()), 'la ruta queda marcada Confirmada');

  // ── reportar problema: modal + RPC ruta_reportar ──
  await page.click('.art-section.open .btn-conf.warn');
  await page.fill('#modalTxt', 'falta un paso de niquelado');
  await page.click('.modal-ok');
  await page.waitForFunction(() => window.__rpc.some(c => c.n === 'ruta_reportar'));
  const rep = await page.evaluate(() => window.__rpc.find(c => c.n === 'ruta_reportar'));
  ok(rep.a.p_firma === FIRMA_101 && rep.a.p_problema === 'falta un paso de niquelado', 'ruta_reportar con firma y problema');
  ok(/falta un paso de niquelado/.test(await page.locator('.art-section.open').innerText()), 'el problema queda visible en la ruta');

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
