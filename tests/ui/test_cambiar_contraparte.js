/* Cambiar Tallerista / Prov. A.T. (2026-10-05): CambiarTallerista/CambiarTallerista_GP2.html
 *
 * Pedido del dueño: cambiar el tallerista o el prov. A.T. de un articulo y, cuando el articulo
 * lo arma y envasa Fabrica con matrices, mandar las partes al nuevo tallerista (la LINEA
 * IMAGINARIA, que sale de la base: aca se prueba lo que la pantalla muestra y manda).
 *
 * Con Supabase STUBEADO. Verifica:
 *   1. el articulo que hoy hace Fabrica muestra la matriz de la linea (y si es excepcion) y solo
 *      ofrece "Pasa al tallerista"; los que ya tienen tallerista / prov. A.T. ofrecen cambiarlo
 *   2. la lista de destinos NO repite a quien ya lo hace (la base lo bloquea igual)
 *   3. "Ver el cambio" llama a cambiar_contraparte_preview con (articulo, tipo, desde, hasta) correctos:
 *      desde = null cuando lo hace Fabrica, y muestra partes, matrices que dejan de hacerse y avisos
 *   4. una vista previa con bloqueo deja "Confirmar" apagado y muestra el motivo
 *   5. "Confirmar" llama a cambiar_contraparte_aplicar con el nombre escrito y muestra el resultado,
 *      con el atajo a Despiece x Art.
 *   6. en celular (390 px): sin scroll horizontal, campos >= 18 px, botones tocables >= 44 px
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const BUNDLE = {
  art: [
    { id: 45, cod: '542', d: 'Ahueca Papas', fam: 'Ahuecadores', mk: 'LOEKE', tall: [], pat: [], fab: true,
      linea: { n: '261', d: 'Colocar Mgo a Ahueca Papa', ex: true } },
    { id: 16, cod: '116', d: 'Corta Pizza Familiar', fam: 'Pizza', mk: 'LOEKE', fab: false, pat: [], linea: null,
      tall: [{ id: 6, n: 'Martin Cornejo', hace: ['116'], final: true }] },
    { id: 181, cod: '208', d: 'Cucharita 13cm Azucarera Madera', fam: 'Cucharitas', mk: 'LOEKE', fab: false, tall: [], linea: null,
      pat: [{ id: 10, n: 'Pintos' }] },
    { id: 120, cod: '115', d: 'Sacacorchos con subarmado', fam: 'Sacacorchos', mk: 'LOEKE', fab: false, pat: [], linea: null,
      tall: [{ id: 2, n: 'Alex Escalante', hace: ['GRJ10'], final: false },
             { id: 9, n: 'Carlos Aguirre', hace: ['115'], final: true }] },
  ],
  tall: [
    { id: 2, n: 'Alex Escalante', ub: true }, { id: 5, n: 'Lucho', ub: true },
    { id: 6, n: 'Martin Cornejo', ub: true }, { id: 9, n: 'Carlos Aguirre', ub: false },
  ],
  pat: [{ id: 6, n: 'Maspoli', ub: true }, { id: 10, n: 'Pintos', ub: true }],
};

const PREVIEW_FAB = {
  ok: true, tipo: 'fabrica_a_tallerista', articulo: { id: 45, cod: '542', d: 'Ahueca Papas' },
  desde: { id: null, n: 'Fabrica' }, hasta: { id: 5, n: 'Lucho' }, pasos: 6,
  partes: [
    { comp_id: 1, cod: 'A9', d: 'Caja N°22', cantidad: 0.0833 },
    { comp_id: 2, cod: 'D16B', d: 'Ahueca Papa Crom.', cantidad: 1 },
    { comp_id: 3, cod: 'G5A', d: 'Cartón 542', cantidad: 1 },
    { comp_id: 4, cod: 'PC10-M237', d: 'Mango LK Espatula c/Capuchon tras M237', cantidad: 1 },
  ],
  dejan: [{ n: '261', d: 'Colocar Mgo a Ahueca Papa' }, { n: '402', d: 'Env Ahueca Papa' }],
  avisos: [{ nivel: 'warn', txt: 'Lucho no tiene precio cargado para el 542: el costo va a salir SIN su mano de obra hasta que se cargue.' }],
  bloqueos: [],
};
const PREVIEW_BLOQ = Object.assign({}, PREVIEW_FAB, {
  ok: false, partes: [], dejan: [], avisos: [],
  bloqueos: ['Falta crear la funcion _cc_quitar_pasos: hay que correrla una vez en el SQL Editor.'],
});
const PREVIEW_TALL = {
  ok: true, tipo: 'tallerista', articulo: { id: 16, cod: '116', d: 'Corta Pizza Familiar' },
  desde: { id: 6, n: 'Martin Cornejo' }, hasta: { id: 5, n: 'Lucho' }, pasos: 8,
  partes: [{ comp_id: 9, cod: 'E12', d: 'Pieza', cantidad: 1 }, { comp_id: 10, cod: 'A8', d: 'Caja N°2', cantidad: 0.0833 }],
  dejan: [], avisos: [{ nivel: 'info', txt: 'Martin Cornejo todavia tiene en su casa: E12 (40). Ese stock no se mueve.' }], bloqueos: [],
};
const APLICADO = {
  ok: true, aplicado: true, tipo: 'tallerista', articulo: { id: 16, cod: '116', d: 'Corta Pizza Familiar' },
  desde: { id: 6, n: 'Martin Cornejo' }, hasta: { id: 5, n: 'Lucho' }, pasos: 8, inventario_nuevo: 5,
  partes: [], dejan: [], avisos: [], bloqueos: [], cambio_id: 7,
};

const STUB = `
window.supabase = { createClient: function(){ return {
  rpc: async function(name, args){
    window.__calls = window.__calls || [];
    window.__calls.push({ name: name, args: args });
    if (name === 'cambiar_contraparte_bundle') return { data: ${JSON.stringify(BUNDLE)}, error: null };
    if (name === 'cambiar_contraparte_preview') {
      if (args.p_tipo === 'tallerista' && args.p_desde === null && args.p_hasta === 9) return { data: ${JSON.stringify(PREVIEW_BLOQ)}, error: null };
      if (args.p_tipo === 'tallerista' && args.p_desde === null) return { data: ${JSON.stringify(PREVIEW_FAB)}, error: null };
      return { data: ${JSON.stringify(PREVIEW_TALL)}, error: null };
    }
    if (name === 'cambiar_contraparte_aplicar') return { data: ${JSON.stringify(APLICADO)}, error: null };
    return { data: null, error: { message: 'rpc desconocida ' + name } };
  }
};}};
`;

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  await page.route('**/@supabase/supabase-js@2', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/GP2_favicon.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
  await page.route('**/auth-guard.js*', r => r.fulfill({ contentType: 'application/javascript', body: 'window.GP2_AUTH_ON=false;' }));

  const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
  const llamadas = (n) => page.evaluate((n) => (window.__calls || []).filter(c => c.name === n).map(c => c.args), n);

  await page.goto(ROOT + '/CambiarTallerista/CambiarTallerista_GP2.html');
  await page.waitForSelector('#lista .ct-art');

  // ── lista y buscador ──
  ok((await page.$$eval('#lista .ct-art', x => x.length)) === 4, 'la lista muestra los 4 articulos');
  const chips542 = await page.$eval('#lista [data-id="45"]', e => e.innerText);
  ok(/Fábrica/.test(chips542), '542 figura como Fábrica (matrices)');
  ok(/Martin Cornejo/.test(await page.$eval('#lista [data-id="16"]', e => e.innerText)), '116 figura con su tallerista');
  ok(/Pintos/.test(await page.$eval('#lista [data-id="181"]', e => e.innerText)), '208 figura con su prov. A.T.');
  await page.fill('#q', 'ahueca');
  ok((await page.$$eval('#lista .ct-art', x => x.length)) === 1, 'buscar "ahueca" deja solo el 542');
  await page.fill('#q', 'AHUECA ');
  ok((await page.$$eval('#lista .ct-art', x => x.length)) === 1, 'la busqueda ignora mayusculas y espacios del final');
  await page.fill('#q', 'zzz');
  ok((await page.$$eval('#lista .ct-art', x => x.length)) === 0 && /Ningún artículo/.test(await page.$eval('#lista', e => e.innerText)), 'sin coincidencias: lo dice');
  await page.fill('#q', '');

  // ── 542: lo hace Fabrica -> pasa a tallerista (desde = null) ──
  await page.click('#lista [data-id="45"]');
  await page.waitForSelector('#fase1:not(.hidden)');
  const det = await page.$eval('#detalle', e => e.innerText);
  ok(/matriz N° 261/.test(det) && /Colocar Mgo a Ahueca Papa/.test(det), '542: muestra la matriz de la linea (261)');
  ok(/excepción/.test(det), '542: dice que es una excepción a la regla del envasado');
  ok(await page.$eval('#ver0', b => b.disabled), '542: "Ver el cambio" apagado hasta elegir tallerista');
  const ops542 = await page.$$eval('#sel0 option', o => o.map(x => x.textContent));
  ok(ops542.length === 5 && ops542.some(t => /Carlos Aguirre \(sin ubicación de stock\)/.test(t)), '542: ofrece los 4 talleristas y avisa el que no tiene ubicación');
  await page.selectOption('#sel0', '5');
  ok(!(await page.$eval('#ver0', b => b.disabled)), '542: elegido Lucho, "Ver el cambio" se prende');
  await page.click('#ver0');
  await page.waitForSelector('#btnConfirmar');
  let pv = (await llamadas('cambiar_contraparte_preview'))[0];
  ok(pv.p_articulo === 45 && pv.p_tipo === 'tallerista' && pv.p_desde === null && pv.p_hasta === 5,
     'vista previa del 542: ' + JSON.stringify(pv));
  const prev = await page.$eval('#prev', e => e.innerText);
  ok(/le mandás a lucho/i.test(prev) && /PC10-M237/.test(prev) && /D16B/.test(prev) && /G5A/.test(prev), 'muestra las partes que se le mandan');
  ok(/1 cada 12/.test(prev), 'la caja se lee "1 cada 12", no 0,08');
  ok(/N° 261/.test(prev) && /N° 402/.test(prev), 'muestra las matrices que dejan de hacerse acá');
  ok(/sin su mano de obra/i.test(prev), 'muestra el aviso de precio faltante');
  ok(!(await page.$eval('#btnConfirmar', b => b.disabled)), 'sin bloqueos: "Confirmar" prendido');

  // ── bloqueo: deja Confirmar apagado ──
  await page.selectOption('#sel0', '9');
  await page.click('#ver0');
  await page.waitForFunction(() => /_cc_quitar_pasos/.test(document.getElementById('prev').innerText));
  ok(await page.$eval('#btnConfirmar', b => b.disabled), 'con bloqueo: "Confirmar" apagado');
  ok(/⛔/.test(await page.$eval('#prev', e => e.innerText)), 'con bloqueo: se ve el motivo');
  await page.click('#btnCancelar');
  ok((await page.$eval('#prev', e => e.innerHTML)) === '', 'cancelar limpia la vista previa');

  // ── volver y 116: tallerista -> tallerista, confirmar ──
  await page.click('#btnVolver');
  await page.waitForSelector('#lista .ct-art');
  await page.click('#lista [data-id="16"]');
  await page.waitForSelector('#sel0');
  const ops116 = await page.$$eval('#sel0 option', o => o.map(x => x.textContent));
  ok(!ops116.some(t => /Martin Cornejo/.test(t)) && ops116.some(t => /^Lucho/.test(t)), '116: no se ofrece a Martin (ya lo hace) y sí a Lucho');
  ok(/hace: el artículo terminado/.test(await page.$eval('#detalle', e => e.innerText)), '116: dice que Martin hace el artículo terminado');
  await page.selectOption('#sel0', '5');
  await page.click('#ver0');
  await page.waitForSelector('#btnConfirmar');
  pv = (await llamadas('cambiar_contraparte_preview')).pop();
  ok(pv.p_articulo === 16 && pv.p_tipo === 'tallerista' && pv.p_desde === 6 && pv.p_hasta === 5, '116: preview con desde=Martin(6) hasta=Lucho(5): ' + JSON.stringify(pv));
  ok(/recibe las mismas partes/i.test(await page.$eval('#prev', e => e.innerText)), '116: "recibe las mismas partes"');
  await page.fill('#usuario', 'Nazareno');
  await page.click('#btnConfirmar');
  await page.waitForSelector('#fase2:not(.hidden)');
  const ap = (await llamadas('cambiar_contraparte_aplicar'))[0];
  ok(ap.p_articulo === 16 && ap.p_tipo === 'tallerista' && ap.p_desde === 6 && ap.p_hasta === 5 && ap.p_usuario === 'Nazareno',
     '116: aplicar con el nombre escrito: ' + JSON.stringify(ap));
  const fin = await page.$eval('#okDetail', e => e.innerText);
  ok(/116/.test(fin) && /Martin Cornejo/.test(fin) && /Lucho/.test(fin), 'resultado: de Martin a Lucho');
  ok((await page.$eval('#btnDespiece', a => a.getAttribute('href'))).endsWith('Programa/Programa.html'), 'atajo a Despiece x Art.');

  // ── 208: prov. A.T. ──
  await page.click('#btnOtro');
  await page.waitForSelector('#lista .ct-art');
  await page.click('#lista [data-id="181"]');
  await page.waitForSelector('#sel0');
  const ops208 = await page.$$eval('#sel0 option', o => o.map(x => x.textContent));
  ok(ops208.length === 2 && /Maspoli/.test(ops208[1]), '208: solo se ofrece Maspoli (Pintos ya lo entrega)');
  await page.selectOption('#sel0', '6');
  await page.click('#ver0');
  await page.waitForSelector('#btnConfirmar');
  pv = (await llamadas('cambiar_contraparte_preview')).pop();
  ok(pv.p_articulo === 181 && pv.p_tipo === 'prov_at' && pv.p_desde === 10 && pv.p_hasta === 6, '208: preview prov_at desde Pintos(10) hasta Maspoli(6): ' + JSON.stringify(pv));

  // ── 115: dos talleristas (sub-armado + final), cada uno con su fila ──
  await page.click('#btnVolver');
  await page.waitForSelector('#lista .ct-art');
  await page.click('#lista [data-id="120"]');
  await page.waitForSelector('#sel1');
  const t115 = await page.$eval('#detalle', e => e.innerText);
  ok(/arma GRJ10/.test(t115) && /el artículo terminado/.test(t115), '115: Alex arma GRJ10, Carlos hace el terminado');
  const ops115 = await page.$$eval('#sel0 option', o => o.map(x => x.textContent));
  ok(ops115.length === 3 && !ops115.some(t => /Alex|Carlos/.test(t)), '115: no ofrece a ninguno de los dos que ya lo hacen');

  // ── celular ──
  const m = await page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth > window.innerWidth,
    campos: [...document.querySelectorAll('input[type=text],select')].filter(e => e.offsetParent).map(e => parseFloat(getComputedStyle(e).fontSize)),
    botones: [...document.querySelectorAll('.btn,.ct-art,.hlink')].filter(e => e.offsetParent).map(e => e.getBoundingClientRect().height),
  }));
  ok(!m.horizontal, 'celular 390px: sin scroll horizontal');
  ok(m.campos.length > 0 && Math.min(...m.campos) >= 18, 'celular: campos de 18 px o mas (' + Math.min(...m.campos) + ')');
  ok(m.botones.length > 0 && Math.min(...m.botones) >= 44, 'celular: botones tocables de 44 px o mas (' + Math.round(Math.min(...m.botones)) + ')');

  await browser.close();
})();
