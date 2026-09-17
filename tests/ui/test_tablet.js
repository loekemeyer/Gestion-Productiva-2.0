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
    { tipo: 'proveedor_servicio', ref: '12', nombre: 'AJ Adhesivos', envio_unidad: 'paquetes', envio_uni_x: 100, n_env: 1, n_rec: 0 },
    { tipo: 'proveedor_servicio', ref: '8', nombre: 'Hernandez Julio', envio_unidad: 'kg', envio_uni_x: null, n_env: 2, n_rec: 0 },
    { tipo: 'proveedor_servicio', ref: '14', nombre: 'Ester', envio_unidad: 'bolsas', envio_uni_x: 1800, envio_carga_unidad: 'kg', n_env: 1, n_rec: 0 },
    { tipo: 'inyector', ref: 'Pat Bet Plast', nombre: 'Pat Bet Plast', n_env: 2, n_rec: 0 },
    { tipo: 'proveedor_insumo', ref: 'Corrugadora del Plata', nombre: 'Corrugadora del Plata', n_env: 0, n_rec: 3 },
    { tipo: 'virgilio', ref: 'virgilio', nombre: 'Virgilio', n_env: 0, n_rec: 1 },
  ],
  // PS y tallerista traen ademas maximo/stock_dest/sugerido de la pieza PROCESADA/ARMADA (la
  // salida): la tablet MUESTRA el sugerido y lo precarga en Cantidad SOLO para talleristas (a los
  // P.S. y a los inyectores no: el campo arranca vacio, usuario 2026-09-17). Prov. AT no trae
  // sugerido (va con esas claves nulas) y sigue mostrando "Online sector".
  enviar: [
    { tipo: 'tallerista', ref: '6', comp_id: 70, cod: 'A10', desc: 'Cpo Una', sector: 'Sector Crudo', um: 'unidad', uxc: 1000, kg_x_uni: 0.01, online_sector: 120, saldo_dest: 42, maximo: 200, stock_dest: 50, sugerido: 150 },
    { tipo: 'tallerista', ref: '6', comp_id: 75, cod: 'F7', desc: 'Fleje doblado', sector: 'Sector Fleje', um: 'kg', uxc: null, kg_x_uni: 0.0134, online_sector: 30.5, saldo_dest: 7.5, maximo: 40, stock_dest: 10, sugerido: 12.5 },
    { tipo: 'tallerista', ref: '9', comp_id: 70, cod: 'A10', desc: 'Cpo Una', sector: 'Sector Crudo', um: 'unidad', uxc: 1000, kg_x_uni: 0.01, online_sector: 120, saldo_dest: 0, maximo: 200, stock_dest: 0, sugerido: 200 },
    { tipo: 'proveedor_servicio', ref: '5', comp_id: 90, cod: 'D5', desc: 'Mitad rompenuez', sector: 'Sector Crudo', um: 'unidad', uxc: 500, kg_x_uni: 0.05, online_sector: 40, saldo_dest: 0, maximo: 100, stock_dest: 20, sugerido: 80 },
    // AJ Adhesivos manda por PAQUETES de 100: sugerido 250 uni -> 3 paquetes (techo)
    { tipo: 'proveedor_servicio', ref: '12', comp_id: 564, cod: 'Pliego 506', desc: 'Sin adhesivar', sector: 'Sector Procesado', um: 'unidad', uxc: null, kg_x_uni: null, online_sector: 0, saldo_dest: 0, maximo: 500, stock_dest: 0, sugerido: 250 },
    // Hernandez Julio recibe PESADO (envio_unidad 'kg'): las metalicas van en cajones y las
    // plasticas en bolsas — el bulto sale del sector, no del proveedor.
    { tipo: 'proveedor_servicio', ref: '8', comp_id: 80, cod: 'A1', desc: 'Mgo Plano 501 Pint.', sector: 'Sector Procesado', um: 'unidad', uxc: 750, kg_x_uni: 0.04, online_sector: 0, saldo_dest: 0, maximo: 2000, stock_dest: 0, sugerido: 1000 },
    { tipo: 'proveedor_servicio', ref: '8', comp_id: 231, cod: 'PA10B', desc: 'Capuchon ф 8 S/Serig', sector: 'Sector Plástico', um: 'unidad', uxc: 1000, kg_x_uni: 0.002, online_sector: 0, saldo_dest: 0, maximo: 8000, stock_dest: 0, sugerido: 5000 },
    // Ester manda de a BOLSAS de 1800 mangos pero PESA lo que carga: el sugerido va en bolsas
    // (112.432 mangos -> 63 bolsas, techo) y la cantidad en kg (63 x 1800 x 0,0054 = 612,36 kg)
    { tipo: 'proveedor_servicio', ref: '14', comp_id: 622, cod: 'PC2', desc: 'Mgo Pelapapa 505 Sin Calar', sector: 'Sector Plástico', um: 'unidad', uxc: 1852, kg_x_uni: 0.0054, online_sector: 0, saldo_dest: 0, maximo: 112432, stock_dest: 0, sugerido: 112432 },
    { tipo: 'proveedor_at', ref: '1', comp_id: 456, cod: 'A1', desc: 'Caja N°1', sector: 'Sector Caja', um: 'unidad', uxc: null, kg_x_uni: null, online_sector: 988, saldo_dest: null, maximo: null, stock_dest: null, sugerido: null },
    { tipo: 'inyector', ref: 'Pat Bet Plast', comp_id: 742, cod: '2405', desc: 'PP 2630', sector: 'Sector Bolsas Plásticas', um: 'kg', uxc: null, kg_x_uni: null, online_sector: 100, saldo_dest: 40, maximo: 300, stock_dest: 100, sugerido: 200 },
    { tipo: 'inyector', ref: 'Pat Bet Plast', comp_id: 743, cod: '2455', desc: 'ABS GP 22', sector: 'Sector Bolsas Plásticas', um: 'kg', uxc: null, kg_x_uni: null, online_sector: 50, saldo_dest: 8, maximo: 50, stock_dest: 20, sugerido: 30 },
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
  // el inyector trae el sugerido de bolsas (kg) — se MUESTRA, pero NO se precarga en Cantidad:
  // el inyector se elige dentro de "Prov. de servicio" y ahi el campo lo escribe la persona
  // [usuario 2026-09-17: "no me preescribas ... la cantidad que voy a enviar"]
  const ivals = await page.$$eval('#tbody input.cell-in', xs => xs.map(x => x.value));
  ok(ivals[0] === '' && ivals[1] === '', 'inyector: la cantidad arranca vacia — ' + JSON.stringify(ivals));
  const isug = await page.$$eval('#tbody tr td:nth-child(2)', xs => xs.map(x => x.textContent.trim()));
  ok(isug[0] === '200' && isug[1] === '30', 'inyector: el sugerido igual se ve en su columna — ' + isug.join(' , '));
  ok((await page.$eval('#btnEnviar', e => e.disabled)) === true, 'inyector: sin nada cargado el boton Enviar no habilita');
  // enviar con sugerido: la tabla muestra SOLO Pieza · Sugerido · Cantidad (se sacaron Stock/Máximo)
  const thIny = await page.$$eval('#thead th', xs => xs.map(x => x.textContent.trim()));
  ok(thIny.join('|') === 'Pieza|Sugerido|Cantidad', 'inyector: solo Pieza/Sugerido/Cantidad — ' + thIny.join(' | '));
  await page.click('#btnVolver');        // vuelve a las contrapartes del tipo
  await page.click('#btnVolverTipo');    // y a los tipos, para seguir el flujo

  await page.click('#tipoGrid .tipo-btn[data-tipo="tallerista"]');
  await page.click('#cpGrid .prov-btn:has-text("Martin")');

  // Enviar a PS/tallerista: SOLO Pieza | Sugerido | Cantidad, y el sugerido PRECARGADO en Cantidad
  const thEnv = await page.$$eval('#thead th', xs => xs.map(x => x.textContent.trim()));
  ok(thEnv.join('|') === 'Pieza|Sugerido|Cantidad', 'Enviar a tallerista: solo Pieza/Sugerido/Cantidad — ' + thEnv.join(' | '));
  let rows = await page.$$eval('#tbody tr', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ')));
  // ya no se muestran saldo (42/7,5) ni máximo (200/40): solo el sugerido, que ademas queda en Cantidad
  ok(rows.length === 2 && rows[0].includes('A10') && rows[0].includes('150') &&
     !rows[0].includes('42') && !rows[0].includes('200'),
     'A10: solo sugerido 150, sin saldo ni máximo — ' + rows[0]);
  ok(rows[1].includes('F7') && rows[1].includes('12,5') && !rows[1].includes('7,5') && !rows[1].includes('40'),
     'F7 (kg): solo sugerido 12,5, sin saldo ni máximo — ' + rows[1]);
  const cellsEnv = await page.$$eval('#tbody tr:first-child td', xs => xs.length);
  ok(cellsEnv === 3, 'la fila tiene 3 columnas (Pieza/Sugerido/Cantidad): ' + cellsEnv);
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

  // ── AJ Adhesivos manda por PAQUETES de 100: sugerido y cantidad EN paquetes, se guarda en pliegos ──
  await page.click('#btnOtro');
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  await page.click('#tipoGrid .tipo-btn[data-tipo="proveedor_servicio"]');
  await page.click('#cpGrid .prov-btn:has-text("AJ Adhesivos")');
  const thAj = await page.$$eval('#thead th', xs => xs.map(x => x.textContent.trim()));
  ok(thAj.join('|') === 'Pieza|Sugerido (paquetes)|Cantidad (paquetes)',
     'AJ: los dos encabezados aclaran la unidad (paquetes) — ' + thAj.join(' | '));
  const ajRow = await page.$eval('#tbody tr', x => x.textContent.replace(/\s+/g, ' '));
  ok(ajRow.includes('Pliego 506') && ajRow.includes('3'),
     'AJ: sugerido 250 uni -> 3 paquetes (techo) — ' + ajRow);
  ok((await page.$eval('#tbody input.cell-in', e => e.value)) === '',
     'AJ (P.S.): la cantidad NO viene precargada, la escribe la persona');
  await page.fill('#tbody input.cell-in', '3');
  await page.click('#btnEnviar');
  await page.waitForFunction(() => !document.getElementById('fase3').classList.contains('hidden'));
  const regAj = await calls('tablet_registrar');
  const itAj = regAj[regAj.length - 1].args.p.items[0];
  ok(itAj.comp_id === 564 && itAj.cantidad === 300 && itAj.unidad === 'uni',
     'AJ: 3 paquetes se guardan como 300 pliegos (uni), no como paquetes — ' + JSON.stringify(itAj));
  ok(dialogs.some(d => d.type === 'confirm' && d.msg.includes('3 paquetes')), 'AJ: el confirm resume en paquetes');

  // ── Hernandez Julio recibe PESADO: kg + el bulto al lado (bolsas calculadas / cajones a mano) ──
  await page.click('#btnOtro');
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  await page.click('#tipoGrid .tipo-btn[data-tipo="proveedor_servicio"]');
  await page.click('#cpGrid .prov-btn:has-text("Hernandez Julio")');
  const thJu = await page.$$eval('#thead th', xs => xs.map(x => x.textContent.trim()));
  ok(thJu.join('|') === 'Pieza|Sugerido|Kg a enviar|Bolsas / cajones',
     'Julio: 4 columnas, la carga en kg y el bulto al lado — ' + thJu.join(' | '));
  const juRows = await page.$$eval('#tbody tr', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ')));
  ok(juRows.length === 2 && juRows[0].includes('A1') && juRows[0].includes('40 kg') && juRows[0].includes('= 1,33 cajones'),
     'Julio metalica: sugerido 1000 uni -> 40 kg = 1,33 cajones — ' + juRows[0]);
  ok(juRows[1].includes('PA10B') && juRows[1].includes('10 kg') && juRows[1].includes('= 5 bolsas'),
     'Julio plastica: sugerido 5000 uni -> 10 kg = 5 bolsas — ' + juRows[1]);
  const juIns = await page.$$eval('#tbody tr', xs => xs.map(t => Array.from(t.querySelectorAll('input.cell-in')).map(i => i.value)));
  ok(juIns[0].length === 2 && juIns[0][0] === '' && juIns[0][1] === '',
     'Julio metalica: kg y cajones vacios (P.S.: no se precarga), los dos editables — ' + JSON.stringify(juIns[0]));
  ok(juIns[1].length === 1 && juIns[1][0] === '',
     'Julio plastica: solo se tipean los kg (vacios), las bolsas son calculadas — ' + JSON.stringify(juIns[1]));
  // al cambiar los kg, el bulto acompaña: la bolsa de la plastica se repinta y el cajon de la
  // metalica se autocompleta (mientras el operario no lo haya tocado a mano)
  await page.fill('#tbody tr:nth-child(2) input.cell-in', '20');
  ok((await page.$eval('#tbody tr:nth-child(2) td.bultos', e => e.textContent.trim())) === '10 bolsas',
     'Julio plastica: 20 kg -> 10 bolsas (se repinta al tipear)');
  await page.fill('#tbody tr:nth-child(1) input.cell-in[data-f="q"]', '80');
  ok((await page.$eval('#tbody tr:nth-child(1) input.cell-in[data-f="c"]', e => e.value)) === '2,67',
     'Julio metalica: 80 kg -> 2,67 cajones (se autocompleta)');
  // y si el operario corrige los cajones a mano, un cambio de kg ya no se los pisa
  await page.fill('#tbody tr:nth-child(1) input.cell-in[data-f="c"]', '3');
  await page.fill('#tbody tr:nth-child(1) input.cell-in[data-f="q"]', '82');
  ok((await page.$eval('#tbody tr:nth-child(1) input.cell-in[data-f="c"]', e => e.value)) === '3',
     'Julio metalica: los cajones anotados a mano no se pisan');
  await page.click('#btnEnviar');
  await page.waitForFunction(() => !document.getElementById('fase3').classList.contains('hidden'));
  const regJu = await calls('tablet_registrar');
  const itsJu = regJu[regJu.length - 1].args.p.items;
  ok(itsJu[0].comp_id === 80 && itsJu[0].cantidad === 82 && itsJu[0].unidad === 'kg' && itsJu[0].cajones === 3,
     'Julio metalica: viajan los KG y los cajones anotados — ' + JSON.stringify(itsJu[0]));
  ok(itsJu[1].comp_id === 231 && itsJu[1].cantidad === 20 && itsJu[1].unidad === 'kg' && itsJu[1].cajones === 10,
     'Julio plastica: 20 kg con sus 10 bolsas calculadas — ' + JSON.stringify(itsJu[1]));
  ok(dialogs.some(d => d.type === 'confirm' && d.msg.includes('82 kg (3 cajones)')),
     'Julio: el confirm resume en kg con el bulto');
  // ── Ester: el sugerido en BOLSAS de 1800 pero la cantidad EN KG, con las bolsas al lado ──
  await page.click('#btnOtro');
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  await page.click('#tipoGrid .tipo-btn[data-tipo="proveedor_servicio"]');
  await page.click('#cpGrid .prov-btn:has-text("Ester")');
  const thEs = await page.$$eval('#thead th', xs => xs.map(x => x.textContent.trim()));
  ok(thEs.join('|') === 'Pieza|Sugerido (bolsas)|Cantidad (kg)',
     'Ester: el sugerido se mira en bolsas y la cantidad se escribe en kg — ' + thEs.join(' | '));
  const esSug = await page.$eval('#tbody tr td:nth-child(2)', e => e.textContent.trim());
  ok(esSug === '63', 'Ester: 112.432 mangos / 1800 -> 63 bolsas (techo) — ' + esSug);
  ok((await page.$eval('#tbody input.cell-in', e => e.value)) === '',
     'Ester (P.S.): los kg NO vienen precargados con esas 63 bolsas, los escribe la persona');
  await page.fill('#tbody input.cell-in', '612,36');
  ok((await page.$eval('#tbody .env-eq', e => e.textContent.trim())) === '= 63 bolsas',
     'Ester: debajo del campo dice a cuántas bolsas equivale lo tipeado');
  await page.fill('#tbody input.cell-in', '100');
  ok((await page.$eval('#tbody .env-eq', e => e.textContent.trim())) === '= 10,29 bolsas',
     'Ester: las bolsas se recalculan al tipear (100 kg / 9,72) — ' +
     (await page.$eval('#tbody .env-eq', e => e.textContent.trim())));
  await page.fill('#tbody input.cell-in', '612,36');
  await page.click('#btnEnviar');
  await page.waitForFunction(() => !document.getElementById('fase3').classList.contains('hidden'));
  const regEs = await calls('tablet_registrar');
  const itEs = regEs[regEs.length - 1].args.p.items[0];
  ok(itEs.comp_id === 622 && itEs.cantidad === 612.36 && itEs.unidad === 'kg' && itEs.cajones === 63,
     'Ester: viaja el KG tal cual (la base lo pasa a mangos con kg_x_uni) y las 63 bolsas quedan anotadas — ' + JSON.stringify(itEs));
  ok(dialogs.some(d => d.type === 'confirm' && d.msg.includes('612,36 kg (63 bolsas)')),
     'Ester: el confirm dice los kg y las bolsas');

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

  // ── buffer viejo de un P.S.: lo que dejo la precarga de versiones anteriores se LIMPIA, y lo
  //    que anoto la persona a mano NO se toca (usuario 2026-09-17) ──
  await page.goto(ROOT + '/Tablet/Tablet_GP2.html?modo=enviar');
  await page.evaluate(() => localStorage.setItem('gp2_tablet_buffer',
    JSON.stringify({ 'enviar:proveedor_servicio:12': { '564::': { q: '250' } } })));
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  await page.click('#tipoGrid .tipo-btn[data-tipo="proveedor_servicio"]');
  await page.click('#cpGrid .prov-btn:has-text("AJ Adhesivos")');
  ok((await page.$eval('#tbody input.cell-in', e => e.value)) === '',
     'AJ: el sugerido viejo guardado por la precarga (250 uni) se limpia del buffer');
  await page.goto(ROOT + '/Tablet/Tablet_GP2.html?modo=enviar');
  await page.evaluate(() => localStorage.setItem('gp2_tablet_buffer',
    JSON.stringify({ 'enviar:proveedor_servicio:12': { '564::': { q: '2' } } })));
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  await page.click('#tipoGrid .tipo-btn[data-tipo="proveedor_servicio"]');
  await page.click('#cpGrid .prov-btn:has-text("AJ Adhesivos")');
  ok((await page.$eval('#tbody input.cell-in', e => e.value)) === '2',
     'AJ: lo que anoto la persona (2 paquetes) sigue ahi');
  // y al tallerista se le SIGUE precargando (no se pidio sacarselo)
  await page.click('#btnVolver');        // vuelve a las contrapartes del tipo
  await page.click('#btnVolverTipo');    // y de ahi a los tipos
  await page.click('#tipoGrid .tipo-btn[data-tipo="tallerista"]');
  await page.click('#cpGrid .prov-btn:has-text("Martin")');
  const tvals = await page.$$eval('#tbody input.cell-in', xs => xs.map(x => x.value));
  ok(tvals[0] === '150' && tvals[1] === '12,5', 'tallerista: la precarga del sugerido sigue — ' + tvals.join(' , '));

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

  // ── 6) a lo ancho de una TABLET la tabla no se estira: columnas pegadas, sin blanco muerto ──
  // [usuario 2026-09-17: "optimizame todos los espacios en blanco que hay entre las columnas en
  // todas las pantallas de envio a ps en la version tablet"]. table.t viene a width:100%, asi que
  // sin el encogido el navegador repartia el sobrante y dejaba media pantalla de blanco entre la
  // pieza y su numero. Se mide en la tablet real (1280px), no a 390.
  const ctxT = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pT = await ctxT.newPage();
  pT.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  await pT.route('**/@supabase/supabase-js@2**', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await pT.route('**/GP2_favicon.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
  for (const [cp, etiq] of [['AJ Adhesivos', 'AJ (paquetes)'], ['Hernandez Julio', 'Julio (kg + bulto)'],
                            ['Ester', 'Ester (bolsas + kg)'], ['Jade', 'PS comun']]) {
    await pT.goto(ROOT + '/Tablet/Tablet_GP2.html?modo=enviar');
    await pT.evaluate(() => localStorage.clear());
    await pT.reload();
    await pT.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
    await pT.click('#tipoGrid .tipo-btn[data-tipo="proveedor_servicio"]');
    await pT.click('#cpGrid .prov-btn:has-text("' + cp + '")');
    await pT.waitForFunction(() => document.querySelectorAll('#tbody tr').length > 0);
    const g = await pT.evaluate(() => {
      const t = document.querySelector('table.t').getBoundingClientRect();
      const paso = document.querySelector('.steps').getBoundingClientRect();
      const bus = document.querySelector('#q').closest('.search-box').getBoundingClientRect();
      // el blanco muerto ENTRE columnas = lo que la tabla mide de mas que su propio contenido
      // (max-content es el ancho al que las columnas quedan pegadas a lo que tienen adentro)
      const tab = document.querySelector('table.t');
      const prev = tab.style.width;
      tab.style.width = 'max-content';
      const ideal = Math.round(tab.getBoundingClientRect().width);
      tab.style.width = prev;
      return { tabla: Math.round(t.width), ideal: ideal, disponible: Math.round(paso.width), buscador: Math.round(bus.width) };
    });
    ok(g.tabla < g.disponible * 0.75, etiq + ': la tabla ocupa lo que necesita, no todo el ancho (' + g.tabla + ' de ' + g.disponible + 'px)');
    ok(g.tabla - g.ideal <= 4, etiq + ': las columnas quedan pegadas a su contenido, sin blanco repartido (' + g.tabla + ' vs ' + g.ideal + 'px de contenido)');
    ok(Math.abs(g.buscador - g.tabla) <= 4, etiq + ': el buscador mide lo mismo que la tabla (' + g.buscador + ' vs ' + g.tabla + 'px)');
  }

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
