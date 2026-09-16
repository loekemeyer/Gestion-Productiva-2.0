/* Caracterizacion de Tablet/Tablet_GP2.html (2026-09-13, ideas 7342/7343; reescrito 2026-09-14
   con el flujo por TIPO), con Supabase STUBEADO (tablet_bundle devuelve un fixture chico con la
   forma REAL del bundle de la base; tablet_registrar anota lo que recibe y contesta como la base).
   Fija:
     1. primero el TIPO y despues la contraparte de ese tipo — en Enviar los tres tipos a los que
        se les manda desde Cervantes (Virgilio no), y adentro de un tipo solo sus contrapartes;
     2. en Recibir NO esta el prov. de art. terminado (entrega en Virgilio, no en Cervantes),
        SI esta "Prov. de insumos" y es un link a Recepcion Insumos, y un tipo con una sola
        contraparte (Virgilio) entra derecho a la carga;
     3. el Conteo no es un modo: es un link al modulo de Relevamientos;
     4. el buscador filtra la tabla;
     5. la trampa de unidad que queda: una pieza en kg se carga en kg (teclado decimal) y viaja
        'kg' (la carga en CAJAS se fue con el prov. AT);
     6. la alerta de "recibi de mas" AVISA pero NO BLOQUEA: la fila se marca, el boton sigue
        habilitado, el confirm lo dice, y el exito muestra lo que la base devolvio en alertas;
     7. a 390px no hay scroll horizontal y los campos son tocables (>= 44px). */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

// misma forma que "GP2".tablet_bundle() (claves reales, verificadas contra la base 2026-09-13)
const BUNDLE = {
  generado_en: '2026-09-13T12:00:00Z',
  alertas_abiertas: 0,
  contrapartes: [
    { tipo: 'tallerista', ref: '6', nombre: 'Martin Cornejo', n_env: 2, n_rec: 1 },
    { tipo: 'tallerista', ref: '9', nombre: 'Lucho', n_env: 1, n_rec: 0 },
    { tipo: 'proveedor_at', ref: '1', nombre: 'Cabral', n_env: 1, n_rec: 1 },
    { tipo: 'proveedor_servicio', ref: '5', nombre: 'Jade', n_env: 1, n_rec: 1 },
    { tipo: 'inyector', ref: 'Pat Bet Plast', nombre: 'Pat Bet Plast', n_env: 2, n_rec: 0 },
    { tipo: 'proveedor_insumo', ref: 'Corrugadora del Plata', nombre: 'Corrugadora del Plata', n_env: 0, n_rec: 3 },
    { tipo: 'virgilio', ref: 'virgilio', nombre: 'Virgilio', n_env: 0, n_rec: 1 },
  ],
  // PS y tallerista traen ademas maximo/stock_dest/sugerido de la pieza PROCESADA/ARMADA (la
  // salida): la tablet muestra esas 3 columnas y precarga el sugerido en Cantidad. Prov. AT e
  // inyector NO traen sugerido (van con esas claves nulas) y siguen mostrando "Online sector".
  enviar: [
    { tipo: 'tallerista', ref: '6', comp_id: 70, cod: 'A10', desc: 'Cpo Una', sector: 'Sector Crudo', um: 'unidad', uxc: 1000, kg_x_uni: 0.01, online_sector: 120, maximo: 200, stock_dest: 50, sugerido: 150 },
    { tipo: 'tallerista', ref: '6', comp_id: 75, cod: 'F7', desc: 'Fleje doblado', sector: 'Sector Fleje', um: 'kg', uxc: null, kg_x_uni: 0.0134, online_sector: 30.5, maximo: 40, stock_dest: 10, sugerido: 12.5 },
    { tipo: 'tallerista', ref: '9', comp_id: 70, cod: 'A10', desc: 'Cpo Una', sector: 'Sector Crudo', um: 'unidad', uxc: 1000, kg_x_uni: 0.01, online_sector: 120, maximo: 200, stock_dest: 0, sugerido: 200 },
    { tipo: 'proveedor_servicio', ref: '5', comp_id: 90, cod: 'D5', desc: 'Mitad rompenuez', sector: 'Sector Crudo', um: 'unidad', uxc: 500, kg_x_uni: 0.05, online_sector: 40, maximo: 100, stock_dest: 20, sugerido: 80 },
    { tipo: 'proveedor_at', ref: '1', comp_id: 456, cod: 'A1', desc: 'Caja N°1', sector: 'Sector Caja', um: 'unidad', uxc: null, kg_x_uni: null, online_sector: 988, maximo: null, stock_dest: null, sugerido: null },
    { tipo: 'inyector', ref: 'Pat Bet Plast', comp_id: 742, cod: '2405', desc: 'PP 2630', sector: 'Sector Bolsas Plásticas', um: 'kg', uxc: null, kg_x_uni: null, online_sector: 100, maximo: 300, stock_dest: 100, sugerido: 200 },
    { tipo: 'inyector', ref: 'Pat Bet Plast', comp_id: 743, cod: '2455', desc: 'ABS GP 22', sector: 'Sector Bolsas Plásticas', um: 'kg', uxc: null, kg_x_uni: null, online_sector: 50, maximo: 50, stock_dest: 20, sugerido: 30 },
  ],
  recibir: [
    { tipo: 'tallerista', ref: '6', comp_id: 71, comp_entrada_id: 70, n_entradas: 1, tiene_bom: false, cod_art: null, cod: 'A11', desc: 'Una Armada', sector: 'Sector Procesado', um: 'unidad', uxc: 500, kg_x_uni: 0.01, por_caja: null, ent_cod: 'A10', ent_desc: 'Cpo Una', esperado: 100, esperado_origen: 'online_tall' },
    { tipo: 'proveedor_at', ref: '1', comp_id: null, comp_entrada_id: null, n_entradas: 0, tiene_bom: false, cod_art: '026', cod: '026', desc: 'Colador N°8', sector: null, um: null, uxc: null, kg_x_uni: null, por_caja: 36, ent_cod: null, ent_desc: null, esperado: 72, esperado_origen: 'oc' },
    { tipo: 'proveedor_servicio', ref: '5', comp_id: 91, comp_entrada_id: 90, n_entradas: 1, tiene_bom: false, cod_art: null, cod: 'D5-P', desc: 'Mitad pintada', sector: 'Sector Procesado', um: 'unidad', uxc: 500, kg_x_uni: 0.05, por_caja: null, ent_cod: 'D5', ent_desc: 'Mitad rompenuez', esperado: 40, esperado_origen: 'online_ps' },
    { tipo: 'virgilio', ref: 'virgilio', comp_id: 373, comp_entrada_id: null, n_entradas: 0, tiene_bom: false, cod_art: null, cod: 'IC3V', desc: 'Fleje N° 90 LARGO', sector: 'Sector Fleje', um: 'kg', uxc: 24, kg_x_uni: 0.0134, por_caja: null, ent_cod: null, ent_desc: null, esperado: 20, esperado_origen: 'online_virgilio' },
  ],
};

const STUB = `
window.supabase = { createClient: function(){ return {
  rpc: async function(name, args){
    window.__calls = window.__calls || [];
    window.__calls.push({name:name, args:args});
    if(name==='tablet_bundle') return { data: JSON.parse(JSON.stringify(${JSON.stringify(BUNDLE)})), error: null };
    if(name==='tablet_registrar'){
      // igual que la base: alerta por item recibido con esperado y recibido > esperado
      var p = args.p, al = [];
      (p.items||[]).forEach(function(it){
        if(p.modo==='recibir' && it.esperado != null && it.cantidad > it.esperado)
          al.push({ id: 900+al.length, cod: it.cod_art || ('comp'+it.comp_id), esperado: it.esperado, recibido: it.cantidad, exceso: it.cantidad-it.esperado });
      });
      return { data: { ok:true, n:(p.items||[]).length, contraparte:'X', modo:p.modo, items:[], alertas: al }, error: null };
    }
    return { data: null, error: { message: 'rpc desconocida '+name } };
  }
};}};
`;

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  const dialogs = [];
  page.on('dialog', d => { dialogs.push({ type: d.type(), msg: d.message() }); d.accept(); });
  await page.route('**/@supabase/supabase-js@2**', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/GP2_favicon.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));

  const ok = (c, msg) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + msg); if (!c) process.exitCode = 1; };
  const calls = async (n) => page.evaluate(n => (window.__calls || []).filter(c => c.name === n), n);
  const tipos = () => page.$$eval('#tipoGrid .tipo-btn', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));

  await page.goto(ROOT + '/Tablet/Tablet_GP2.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);

  // ── 1) modo ENVIAR: primero el TIPO ──────────────────────────────────────
  ok(await page.$eval('#modos .modo-btn.active', b => b.dataset.modo) === 'enviar', 'arranca en Enviar');
  let ts = await tipos();
  ok(ts.length === 3 && !ts.join('|').includes('Virgilio'), 'Enviar: 3 tipos, Virgilio afuera — ' + ts.join(' | '));
  ok(ts[0].includes('Talleristas') && ts[0].includes('· 2') && !ts.join('|').includes('contraparte'),
     'el tipo dice cuántas hay sin la palabra "contraparte" — ' + ts[0]);
  ok(await page.$eval('#cpBox', e => e.classList.contains('hidden')), 'todavía no se listan las contrapartes');

  await page.click('#tipoGrid .tipo-btn[data-tipo="tallerista"]');
  let btns = await page.$$eval('#cpGrid .prov-btn', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ')));
  ok(btns.length === 2 && btns[0].startsWith('Martin Cornejo') && btns[1].startsWith('Lucho') && !btns.join('|').includes('tallerista'),
     'adentro de Talleristas solo talleristas (2) y sin repetir el tipo en cada chip — ' + btns.join(' | '));
  ok((await page.$eval('#fase0Title', e => e.textContent)) === 'Talleristas', 'el título dice el tipo elegido');

  // el "← Cambiar tipo" vuelve a los tipos sin recargar
  await page.click('#btnVolverTipo');
  ok((await tipos()).length === 3 && await page.$eval('#cpBox', e => e.classList.contains('hidden')), 'Cambiar tipo vuelve a los tipos');

  // Los INYECTORES aparecen DENTRO de "Prov. de servicio" (no en un tipo aparte): el usuario
  // los manda al mismo lugar. Su envio son las RESINAS (bolsas) en kg. [usuario 2026-09-15]
  await page.click('#tipoGrid .tipo-btn[data-tipo="proveedor_servicio"]');
  const psYiny = await page.$$eval('#cpGrid .prov-btn', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ')));
  ok(psYiny.some(b => b.startsWith('Jade')) && psYiny.some(b => b.startsWith('Pat Bet Plast')),
     'bajo "Prov. de servicio" salen el PS (Jade) y el inyector (Pat Bet Plast) — ' + psYiny.join(' | '));
  await page.click('#cpGrid .prov-btn:has-text("Pat Bet Plast")');
  const resinas = await page.$$eval('#tbody tr', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ')));
  ok(resinas.length === 2 && resinas.some(r => r.includes('2405')) && resinas.every(r => r.includes('kg')),
     'el inyector manda sus resinas (bolsas) en kg — ' + resinas.join(' | '));
  // el inyector ahora trae el sugerido de bolsas (kg) precargado: Σ deficit de partes × kg_x_uni
  const ivals = await page.$$eval('#tbody input.cell-in', xs => xs.map(x => x.value));
  ok(ivals[0] === '200' && ivals[1] === '30', 'inyector: sugerido de bolsas (kg) precargado — ' + ivals.join(' , '));
  await page.click('#btnVolver');        // vuelve a las contrapartes del tipo
  await page.click('#btnVolverTipo');    // y a los tipos, para seguir el flujo

  await page.click('#tipoGrid .tipo-btn[data-tipo="tallerista"]');
  await page.click('#cpGrid .prov-btn:has-text("Martin")');

  // Enviar a PS/tallerista: columnas Stock | Máximo | Sugerido, y el sugerido PRECARGADO en Cantidad
  const thEnv = await page.$$eval('#thead th', xs => xs.map(x => x.textContent.trim()));
  ok(thEnv.join('|') === 'Pieza|Stock|Máximo|Sugerido|Cantidad', 'Enviar a tallerista: columnas Stock/Máximo/Sugerido — ' + thEnv.join(' | '));
  let rows = await page.$$eval('#tbody tr', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ')));
  ok(rows.length === 2 && rows[0].includes('A10') && rows[0].includes('50') && rows[0].includes('200') && rows[0].includes('150'),
     'A10: stock 50, máximo 200, sugerido 150 — ' + rows[0]);
  ok(rows[1].includes('F7') && rows[1].includes('kg') && rows[1].includes('40') && rows[1].includes('12,5'),
     'F7 (kg): máximo 40, sugerido 12,5 — ' + rows[1]);
  // el sugerido queda precargado en el campo Cantidad (editable), con formato de la casa
  let vals = await page.$$eval('#tbody input.cell-in', xs => xs.map(x => x.value));
  ok(vals[0] === '150' && vals[1] === '12,5', 'la cantidad viene precargada con el sugerido — ' + vals.join(' , '));
  ok((await page.$eval('#btnEnviar', e => e.textContent)) === 'Enviar (2)', 'las 2 piezas con sugerido>0 quedan listas — botón Enviar (2)');
  // la pieza en kg se carga con teclado decimal; la de unidades con numerico
  const modos = await page.$$eval('#tbody input.cell-in', xs => xs.map(x => x.getAttribute('inputmode')));
  ok(modos[0] === 'numeric' && modos[1] === 'decimal', 'teclado: A10 numeric, F7 (kg) decimal — ' + modos.join(','));

  // ── 2) el buscador filtra ────────────────────────────────────────────────
  await page.fill('#q', 'fleje');
  rows = await page.$$eval('#tbody tr', xs => xs.map(x => x.textContent));
  ok(rows.length === 1 && rows[0].includes('F7'), 'buscador "fleje" deja solo F7');
  await page.fill('#q', '');
  await page.waitForFunction(() => document.querySelectorAll('#tbody tr').length === 2);

  // el sugerido ya viene precargado: se envían las dos piezas tal cual (el operario podría editar)
  const fecha = await page.$eval('#fFecha', e => e.value);
  await page.click('#btnEnviar');
  await page.waitForFunction(() => !document.getElementById('fase3').classList.contains('hidden'));
  let reg = await calls('tablet_registrar');
  ok(reg.length === 1, 'una llamada tablet_registrar');
  let p = reg[0].args.p;
  ok(p.modo === 'enviar' && p.tipo === 'tallerista' && p.ref === '6' && p.fecha === fecha + 'T12:00:00' && p.remito === null,
     'payload enviar: modo/tipo/ref/fecha — ' + JSON.stringify({ modo: p.modo, tipo: p.tipo, ref: p.ref, fecha: p.fecha }));
  ok(p.items.length === 2, 'se envían las 2 piezas precargadas');
  const itF7 = p.items.find(i => i.comp_id === 75), itA10 = p.items.find(i => i.comp_id === 70);
  ok(itF7 && itF7.cantidad === 12.5 && itF7.unidad === 'kg' && itF7.esperado === null, 'item F7: 12,5 kg viaja como kg — ' + JSON.stringify(itF7));
  ok(itA10 && itA10.cantidad === 150 && itA10.unidad === 'uni', 'item A10: 150 uni (sugerido precargado) — ' + JSON.stringify(itA10));
  ok(dialogs.some(d => d.type === 'confirm' && d.msg.includes('Enviar a Martin Cornejo') && d.msg.includes('12,5 kg')), 'confirm de envio con resumen');
  ok((await page.$eval('#successTitle', e => e.textContent)).includes('Enviado'), 'exito de envio');
  const buf = await page.evaluate(() => JSON.parse(localStorage.getItem('gp2_tablet_buffer') || '{}'));
  ok(!buf['enviar:tallerista:6'], 'buffer limpio tras enviar');

  // ── 3) modo RECIBIR: sin prov. AT, con Insumos que es un link ─────────────
  await page.click('#btnOtro');
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  await page.click('#modos .modo-btn[data-modo="recibir"]');
  ts = await tipos();
  ok(ts.length === 4 && !ts.join('|').includes('art. terminado'),
     'Recibir: 4 tipos y el prov. de art. terminado NO esta (entrega en Virgilio) — ' + ts.join(' | '));
  ok(ts.some(t => t.includes('Prov. de insumos')) && ts.some(t => t.includes('Virgilio')), 'Recibir: estan Insumos y Virgilio');
  const hrefInsumos = await page.$eval('#tipoGrid .tipo-btn[data-tipo="proveedor_insumo"]', a => a.getAttribute('href'));
  ok(hrefInsumos === '../StockFlejes/RecepcionInsumos_GP2.html?volver=tablet',
     'Insumos abre Recepcion Insumos (una sola copia del flujo) — ' + hrefInsumos);

  // Virgilio es una sola contraparte: se entra derecho a la carga
  await page.click('#tipoGrid .tipo-btn[data-tipo="virgilio"]');
  await page.waitForFunction(() => !document.getElementById('fase1').classList.contains('hidden'));
  ok((await page.$eval('#fase1Title', e => e.textContent)) === 'Virgilio', 'un tipo con una sola contraparte entra derecho');
  rows = await page.$$eval('#tbody tr', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ')));
  ok(rows.length === 1 && rows[0].includes('IC3V') && rows[0].includes('20 kg') && rows[0].includes('online Virgilio'),
     'Virgilio: IC3V con esperado 20 kg del online — ' + rows[0]);
  await page.click('#btnVolver');
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  ok(true, 'volver desde un tipo de una sola contraparte cae en los tipos');

  // tallerista: en Recibir solo entrega Martin (Lucho tiene n_rec 0), asi que se entra derecho
  await page.click('#tipoGrid .tipo-btn[data-tipo="tallerista"]');
  await page.waitForFunction(() => !document.getElementById('fase1').classList.contains('hidden'));
  ok((await page.$eval('#fase1Title', e => e.textContent)) === 'Martin Cornejo',
     'en Recibir solo el tallerista que entrega algo (Lucho no), y se entra derecho');
  ok(!(await page.$eval('#fRemito', e => e.classList.contains('hidden'))), 'en Recibir se pide el remito');
  rows = await page.$$eval('#tbody tr', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ')));
  ok(rows.length === 1 && rows[0].includes('A11') && rows[0].includes('consume A10') && rows[0].includes('100 uni'),
     'tallerista: A11 consume A10, esperado 100 — ' + rows[0]);

  await page.fill('#fRemito', 'R-0001');
  await page.fill('#tbody input.cell-in', '130');
  await page.waitForFunction(() => document.querySelector('#tbody tr').classList.contains('demas'));
  ok(await page.$eval('#tbody tr', tr => tr.textContent.includes('30 de más')), 'la fila avisa "30 de más" (130 contra 100)');
  ok(!(await page.$eval('#alertaBox', e => e.classList.contains('hidden'))) && (await page.$eval('#alertaBox', e => e.textContent)).includes('registrar igual'),
     'el cartel dice que se puede registrar igual');
  ok((await page.$eval('#btnEnviar', e => !e.disabled && e.textContent === 'Recibir (1)')), 'el boton Recibir sigue habilitado: la alerta NO bloquea');

  dialogs.length = 0;
  await page.click('#btnEnviar');
  await page.waitForFunction(() => !document.getElementById('fase3').classList.contains('hidden'));
  ok(dialogs.some(d => d.type === 'confirm' && d.msg.includes('Recibir de Martin Cornejo') && d.msg.includes('se registra igual')),
     'confirm de recepcion avisa el exceso y sigue');
  reg = await calls('tablet_registrar');
  p = reg[reg.length - 1].args.p;
  ok(p.modo === 'recibir' && p.tipo === 'tallerista' && p.ref === '6' && p.remito === 'R-0001', 'payload recibir con remito');
  const it = p.items[0];
  ok(it.comp_id === 71 && it.comp_entrada_id === 70 && it.cantidad === 130 && it.unidad === 'uni' && it.esperado === 100 && it.esperado_origen === 'online_tall',
     'item tallerista: comp 71 consume 70, esperado 100 online_tall — ' + JSON.stringify(it));
  ok((await page.$eval('#successAlertas', e => e.textContent)).includes('Quedó anotado para revisar'),
     'el exito muestra la alerta que devolvio la base');

  // ── 4) el CONTEO es el modulo de Relevamientos ───────────────────────────
  await page.click('#btnOtro');
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  ok(await page.$eval('#modos .modo-btn.active', b => b.dataset.modo) === 'recibir', 'el modo se recuerda al recargar');
  const hrefConteo = await page.$eval('#modoConteo', a => a.getAttribute('href'));
  ok(hrefConteo === '../Relevamiento/Relevamiento_GP2.html?volver=tablet', 'Conteo abre Relevamientos — ' + hrefConteo);
  ok((await page.$$('#modos .modo-btn')).length === 3, 'siguen los tres modos arriba');

  // las dos pantallas que se abren desde acá devuelven el "Atrás" a la tablet
  for (const [url, vuelve] of [['/StockFlejes/RecepcionInsumos_GP2.html?volver=tablet', '../Tablet/Tablet_GP2.html?modo=recibir'],
                               ['/Relevamiento/Relevamiento_GP2.html?volver=tablet', '../Tablet/Tablet_GP2.html']]) {
    await page.goto(ROOT + url);
    await page.waitForSelector('#btnAtrasHeader');
    ok((await page.$eval('#btnAtrasHeader', a => a.getAttribute('href'))) === vuelve, 'con ?volver=tablet el Atrás vuelve a la tablet — ' + url.split('/')[1]);
  }

  // ── 5) render a 390px ────────────────────────────────────────────────────
  await page.goto(ROOT + '/Tablet/Tablet_GP2.html?modo=enviar');
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  await page.click('#tipoGrid .tipo-btn[data-tipo="tallerista"]');
  await page.click('#cpGrid .prov-btn:has-text("Martin")');
  const m = await page.evaluate(() => {
    const ins = [...document.querySelectorAll('#tbody input.cell-in, #modos .modo-btn, #btnEnviar')];
    return {
      horizontal: document.documentElement.scrollWidth > window.innerWidth,
      altoMin: Math.min(...ins.map(i => i.getBoundingClientRect().height)),
      fuenteMin: Math.min(...[...document.querySelectorAll('#tbody input.cell-in')].map(i => parseFloat(getComputedStyle(i).fontSize))),
    };
  });
  ok(!m.horizontal, '390px: la pagina no scrollea horizontal');
  ok(m.altoMin >= 44, '390px: campos y botones tocables (' + Math.round(m.altoMin) + 'px, minimo 44)');
  ok(m.fuenteMin >= 19, '390px: letra grande en los campos de carga (' + m.fuenteMin + 'px)');

  // y los botones de TIPO tambien se tocan con el dedo
  await page.click('#btnVolver');       // vuelve a las contrapartes del tipo
  await page.click('#btnVolverTipo');   // y de ahi a los tipos
  await page.waitForFunction(() => !document.getElementById('tipoGrid').classList.contains('hidden'));
  const tMin = await page.$$eval('#tipoGrid .tipo-btn', xs => Math.min(...xs.map(x => x.getBoundingClientRect().height)));
  ok(tMin >= 44, '390px: los botones de tipo son tocables (' + Math.round(tMin) + 'px)');

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
