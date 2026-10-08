/* Proporciones v2 (2026-09-30). Fija los cuatro pedidos del usuario sobre la pantalla:
     1. sin la etiqueta que repetía el código del artículo ("355 355 Terminado"): el paso sólo se
        nombra cuando NO es el mismo artículo;
     2. una caja DEBAJO de la otra (no al lado), cada una del ancho de su tabla;
     3. el % se cambia ESCRIBIENDO: con dos talleristas el otro se completa solo (100 - x), los
        números se recalculan a la vista y se graba con Guardar -> rpc('reparto_guardar');
     4. los números son de ESTE artículo (demanda x % x meses), con el máximo total de la casa en
        gris cuando es distinto, y un aviso cuando la parte no figura en el stock del tallerista.
   Y lo que evita el incidente del 15-09 (un Guardar grabó un 50/50 que era default): Guardar arranca
   APAGADO y no se prende sin que alguien haya escrito, ni con una suma distinta de 100. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const T = (id, nom, pct, extra) => Object.assign({ tall_id: id, tallerista: nom, pct, meses: 1, es_supuesto: false }, extra || {});
const X = (id, maximo, tiene_fila) => ({ tall_id: id, maximo, stock: 0, origen: 'est_madre_x_reparto', tiene_fila });
const BUNDLE = { pasos: [
  { articulo_id: 20, art_codigo: '123', familia: 'Peladores', comp_salida_id: 391, paso_cod: '123', paso_desc: '123 Terminado',
    talleristas: [T(5, 'Danica Garcia', 50), T(7, 'Lucho', 50)],
    partes: [
      // A11 la usan otros articulos: la casa (1.224 / 1.508) es mucho mas que lo del 123 (96)
      { comp_id: 1, cod: 'A11', desc: 'Caja N°29', dem_mes: 191.3, por_tall: [X(5, 1224, true), X(7, 1508, true)] },
      // Danica recibe I42 pero no la tiene en su stock (ruta nueva sin fila de inventario)
      { comp_id: 2, cod: 'I42', desc: 'Cartón 123', dem_mes: 2296, por_tall: [X(5, null, false), X(7, 1148, true)] },
    ] },
  { articulo_id: 29, art_codigo: '506', familia: 'Abrelatas', comp_salida_id: 400, paso_cod: 'GRJ7', paso_desc: 'Garaje 7',
    talleristas: [T(8, 'Alex Escalante', 70), T(9, 'Martin Cornejo', 20), T(10, 'Gentile', 10)],
    partes: [{ comp_id: 3, cod: 'A10', desc: 'Cpo Uña', dem_mes: 16928, por_tall: [X(8, 11850, true), X(9, 3386, true), X(10, 1693, true)] }] },
] };

const STUB = `
window.__rpc = [];
window.supabase = { createClient: function(){ return {
  rpc: async function(name, args){
    window.__rpc.push({ n: name, a: args || null });
    if (name === 'proporciones_bundle') return { data: JSON.parse(JSON.stringify(${JSON.stringify(BUNDLE)})), error: null };
    if (name === 'reparto_guardar') return { data: { ok: true, filas: 2, maximos: { actualizados: 4 } }, error: null };
    return { data: null, error: { message: 'rpc desconocida ' + name } };
  },
  auth: { onAuthStateChange: function(){} }
};}};
`;

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
  const dialogs = [];
  const abrir = async (vp) => {
    const ctx = await browser.newContext(vp);
    const page = await ctx.newPage();
    page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
    page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
    await page.route('**/@supabase/supabase-js@2', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
    await page.route('**/auth-guard.js*', r => r.fulfill({ contentType: 'application/javascript', body: 'window.GP2_AUTH_ON=false;' }));
    await page.route('**/*.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
    await page.goto(ROOT + '/Talleristas/Proporciones/Proporciones_GP2.html');
    await page.waitForSelector('.paso');
    return page;
  };

  // ── escritorio ──
  const page = await abrir({ viewport: { width: 1300, height: 900 } });
  const cajas = await page.evaluate(() => [...document.querySelectorAll('.paso')].map(c => {
    const r = c.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, width: r.width, tags: c.querySelectorAll('.tag').length, head: c.querySelector('.paso-head').innerText };
  }));
  ok(cajas.length === 2, 'dos pasos compartidos, dos cajas');
  ok(cajas[1].top >= cajas[0].bottom && Math.abs(cajas[1].left - cajas[0].left) < 1, 'las cajas van una DEBAJO de la otra, no al lado');
  ok(cajas[0].width < 900, 'la caja no se estira a todo el ancho (' + Math.round(cajas[0].width) + 'px)');
  ok(cajas[0].tags === 0 && !/123 Terminado/.test(cajas[0].head), '123: sin la etiqueta que repite el código ("123 123 Terminado")');
  ok(cajas[1].tags === 1 && /GRJ7/.test(cajas[1].head), '506: el paso GRJ7 SÍ se nombra, porque no es el artículo');

  const fila = (i, j) => page.evaluate(([i, j]) => [...document.querySelectorAll('.paso')[i].querySelectorAll('tbody tr')[j].cells].map(c => c.innerText.replace(/\s+/g, ' ').trim()), [i, j]);
  let a11 = await fila(0, 0);
  ok(a11[1].startsWith('96') && a11[2].startsWith('96'), 'A11 al 50/50: 96 y 96, lo del 123 y no el total de la casa (' + a11.slice(1).join(' | ') + ')');
  ok(/casa 1\.224/.test(a11[1]) && /casa 1\.508/.test(a11[2]), 'el máximo total de la casa va aparte, en gris');
  ok(a11[3] === '192', 'Total = suma de las columnas (' + a11[3] + ')');
  const i42 = await fila(0, 1);
  ok(/1\.148/.test(i42[1]) && !/no figura en su stock/.test(i42[1]), 'I42 de Danica: su parte (1.148) y SIN el cartel "no figura en su stock" (usuario 08/10: la tablet se lo manda igual)');
  ok(!/casa/.test(i42[2]), 'I42 de Lucho: la casa es igual a lo del artículo, no se repite');

  // ── Guardar apagado de entrada: el default no se graba con un clic ──
  const gDis = () => page.evaluate(i => document.querySelectorAll('button[data-guardar]')[i].disabled, 0);
  ok(await gDis(), 'Guardar arranca APAGADO (incidente del 15-09)');

  // ── escribir 30 en Danica -> Lucho 70, números a la vista ──
  const inp = page.locator('.paso').nth(0).locator('input.pct-in').nth(0);
  await inp.fill('30');
  const otro = await page.locator('.paso').nth(0).locator('input.pct-in').nth(1).inputValue();
  ok(otro === '70', 'con dos talleristas el otro se completa solo: 100 - 30 = ' + otro);
  a11 = await fila(0, 0);
  ok(a11[1].startsWith('57') && a11[2].startsWith('134'), 'los números se recalculan mientras se escribe (57 / 134)');
  ok(/casa 1\.185/.test(a11[1]), 'la casa se mueve con lo que se escribe (1.224 - 96 + 57 = 1.185)');
  ok(!(await gDis()), 'escrito y sumando 100: Guardar se prende');

  // ── Cancelar vuelve a lo guardado ──
  await page.locator('button[data-cancelar]').click();
  ok((await page.locator('.paso').nth(0).locator('input.pct-in').nth(0).inputValue()) === '50' && await gDis(), 'Cancelar vuelve al 50 y apaga Guardar');

  // ── tres talleristas: no se completa solo, y con suma != 100 no se graba ──
  const inp3 = page.locator('.paso').nth(1).locator('input.pct-in').nth(0);
  await inp3.fill('60');
  const pie3 = await page.locator('.paso').nth(1).locator('.pie').innerText();
  const g3 = await page.evaluate(() => document.querySelectorAll('button[data-guardar]')[1].disabled);
  ok(/Suman 90/.test(pie3) && g3, 'tres talleristas con 60+20+10: "Suman 90 %" y Guardar apagado');
  await page.locator('.paso').nth(1).locator('button[data-cancelar]').click();

  // ── grabar: confirmación + payload exacto + recarga ──
  await inp.fill('40');
  await page.locator('button[data-guardar]').nth(0).click();
  await page.waitForFunction(() => /guardado/.test(document.querySelector('.kpis').innerText));
  const rpc = await page.evaluate(() => window.__rpc);
  const g = rpc.filter(r => r.n === 'reparto_guardar');
  ok(g.length === 1, 'Guardar llama UNA vez a reparto_guardar');
  ok(g[0] && g[0].a.p_articulo_id === 20 && g[0].a.p_comp_salida_id === 391 &&
     JSON.stringify(g[0].a.p_filas) === JSON.stringify([{ tallerista_id: 5, pct: 40 }, { tallerista_id: 7, pct: 60 }]),
     'payload: artículo, paso y el % de TODOS los que hacen el paso (' + JSON.stringify(g[0] && g[0].a) + ')');
  ok(dialogs.some(d => /Grabar el reparto del 123/.test(d) && /Danica Garcia 40 %/.test(d) && /Lucho 60 %/.test(d)), 'pide confirmación diciendo qué graba');
  ok(rpc.filter(r => r.n === 'proporciones_bundle').length === 2, 'después de grabar vuelve a leer la base');
  ok(/4 máximos recalculados/.test(await page.locator('.kpis').innerText()), 'avisa cuántos máximos se recalcularon');
  await page.context().close();

  // ── celular 390px ──
  const m = await abrir({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  const cel = await m.evaluate(() => {
    const i = document.querySelector('input.pct-in'), b = document.querySelector('button[data-guardar]');
    return { horiz: document.documentElement.scrollWidth > window.innerWidth,
             hIn: i.getBoundingClientRect().height, fIn: parseFloat(getComputedStyle(i).fontSize),
             hBtn: b.getBoundingClientRect().height, im: i.getAttribute('inputmode') };
  });
  ok(!cel.horiz, 'celular 390px: sin scroll horizontal de la página');
  ok(cel.hIn >= 44 && cel.hBtn >= 44, 'campo del % y Guardar tocables (' + Math.round(cel.hIn) + ' / ' + Math.round(cel.hBtn) + 'px)');
  ok(cel.fIn >= 18 && cel.im === 'decimal', 'el % con letra grande (' + cel.fIn + 'px) y teclado numérico con coma');
  await browser.close();
})();
