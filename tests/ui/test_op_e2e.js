const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
// Raiz del repo (los tests viven en tests/ui/) y Chromium portable si existe.
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const BUNDLE = {
  empleados: { '19': { nombre: 'Eduardo B', activo: true, hora_entrada: '08:00' } },
  registro_en_golpes: true,
  // 28 saca 1 pieza por golpe (el caso normal), 348 saca 2 (Corte Cuch Untar Mgo Madera)
  matrices: [ { n: '28', d: 'Pinza Grande', ppk: 30, uxg: 1, maq: 'alimentador', act: true },
              { n: '348', d: 'Corte Cuch Untar Mgo Madera', ppk: 84, uxg: 2, maq: 'alimentador', act: true },
              { n: '62', d: 'Corte Pinza Fiambre Derecha', ppk: 40, uxg: 1, maq: 'alimentador', act: false } ],
  matriz_fleje: { '28': { comp_id: 176, codigo: 'A1', descripcion: 'Fleje 13' } },
  // La 28 corta de DOS flejes segun la pieza: A15 sale del 94 (inox), J2 del 13.
  matriz_fleje_pieza: { '28': {
    '29': { comp_id: 176, codigo: 'A1',  descripcion: 'Fleje 13' },
    '86': { comp_id: 217, codigo: 'F1A', descripcion: 'Fleje 94' } } },
  matriz_salidas: {},
  rollos_saldo: [ { comp_id: 176, codigo: 'A1',  kg_por_rollo: 50, rollos: 3 },
                  { comp_id: 217, codigo: 'F1A', kg_por_rollo: 67, rollos: 2 } ],
  rollos_abiertos: {},
};

const STUB = `
window.supabase = { createClient: function(url, key, opts){ window.__sbOpts = opts; return {
  rpc: async function(name, args){
    window.__calls = (window.__calls||[]); window.__calls.push({name:name, args:args});
    if(window.__falla === name) return { data: null, error: { code: window.__fallaCode, message: 'falla de prueba ' + name } };
    if(name==='registro_operarios_bundle') return { data: ${JSON.stringify(BUNDLE)}, error: null };
    if(name==='registrar_evento_prod') return { data: { ok:true, id: window.__calls.length }, error: null };
    if(name==='tomar_rollo') return { data: { ok:true, uso_id: 1 }, error: null };
    if(name==='anular_evento_prod') return { data: { ok:true, anulados: 1 }, error: null };
    return { data: { ok:true }, error: null };
  },
  from: function(){ throw new Error('DIRECT TABLE ACCESS: ' + 'la app no debe tocar tablas directo'); }
};}};
`;

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const page = await browser.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  const dialogos = [];   // se registran para vigilar que Enviar en C no pregunte nada
  page.on('dialog', d => { dialogos.push(d.type() + ': ' + d.message()); d.accept(); });

  await page.route('**/@supabase/supabase-js@2', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route(/Operarios_GP2\.html$/, r => r.continue()).catch(()=>{});

  await page.goto(ROOT + '/Produccion/RegistroApp/Operarios_GP2.html');
  await page.waitForFunction(() => (window.__calls||[]).some(c => c.name === 'registro_operarios_bundle'));

  const ok = (c, m) => { console.log((c?'OK  ':'FAIL')+' '+m); if(!c) process.exitCode = 1; };
  const calls = () => page.evaluate(() => window.__calls);

  // legajo -> opciones
  await page.fill('#legajoInput', '19');
  await page.click('#btnContinuar');
  await page.waitForSelector('.box[data-code="E"]');

  // E: matriz 28 + rollo
  await page.click('.box[data-code="E"]');
  await page.fill('#textInput', '28');
  await page.dispatchEvent('#textInput', 'input');
  await page.waitForSelector('#rolloGrid .rl');
  ok(await page.locator('#rolloGrid select').count() === 0, 'los rollos son BOTONES, no un desplegable');
  await page.locator('#rolloGrid .rl').first().click();   // A1 50 kg (primer boton)
  ok(await page.locator('#rolloGrid .rl.sel').count() === 1, 'el rollo elegido queda marcado');
  await page.click('#btnEnviar');
  await page.waitForFunction(() => (window.__calls||[]).some(c =>
    c.name === 'registrar_evento_prod' && c.args.p && c.args.p.matriz === '28' && c.args.p.uni === 0));
  let cs = await calls();
  const evE = cs.find(c => c.name === 'registrar_evento_prod' && c.args.p.matriz === '28');
  ok(evE.args.p.nombre_matriz === 'Pinza Grande' && evE.args.p.legajo === '19', 'evento E: matriz 28 Pinza Grande legajo 19');
  ok(cs.some(c => c.name === 'tomar_rollo' && c.args.p_comp_id === 176 && c.args.p_kg_por_rollo === 50 && c.args.p_matriz === '28'),
     'tomar_rollo A1 50kg matriz 28');

  // C: 500 GOLPES del contador (la app vuelve a la pantalla de legajo tras cada envio).
  // La app manda golpes crudos; multiplicar por uni_x_golpe es tarea de la RPC.
  await page.click('#btnContinuar');
  await page.waitForSelector('.box[data-code="C"]');
  await page.click('.box[data-code="C"]');
  ok((await page.textContent('#inputLabel')).toUpperCase().includes('GOLPES'), 'el cajon pide GOLPES, no unidades');
  await page.fill('#textInput', '500');
  await page.click('#btnEnviar');
  await page.waitForFunction(() => (window.__calls||[]).some(c =>
    c.name === 'registrar_evento_prod' && c.args.p && c.args.p.golpes === 500));
  cs = await calls();
  const evC = cs.find(c => c.name === 'registrar_evento_prod' && c.args.p.golpes === 500);
  ok(evC.args.p.matriz === '28' && evC.args.p.hora_inicio && evC.args.p.hora_fin, 'cajon 500 golpes con matriz y horas');
  ok(evC.args.p.uni === undefined, 'no manda uni: el factor lo aplica la base, no la app');

  // cartel de rollo: 500/30 = 16,7 kg usados -> quedan ~33,3
  await page.click('#btnContinuar');
  await page.waitForSelector('.box[data-code="C"]');
  await page.click('.box[data-code="C"]');
  await page.waitForSelector('#matrizInfo:not(.hidden)');
  const info = await page.textContent('#matrizInfo');
  ok(info.includes('Rollo de 50 kg') && info.includes('33,3'), 'rollo: quedan ~33,3 kg — ' + info.trim().slice(-60));

  // RM (volver de la seleccion C con la flecha; seguimos en la pantalla de opciones)
  await page.click('#btnResetSelection');
  await page.waitForSelector('.box[data-code="RM"]');
  await page.click('.box[data-code="RM"]');
  await page.click('#btnEnviar');
  await page.waitForFunction(() => (window.__calls||[]).some(c =>
    c.name === 'registrar_evento_prod' && c.args.p && c.args.p.nombre_matriz === 'Rotura Matriz'));
  cs = await calls();
  const evRM = cs.find(c => c.name === 'registrar_evento_prod' && c.args.p.nombre_matriz === 'Rotura Matriz');
  ok(evRM.args.p.matriz === '28' && evRM.args.p.uni === 0, 'RM sobre matriz 28');

  // borrar del historial (pantalla legajo) -> RPC anular_evento_prod (ya no update directo)
  await page.waitForFunction(() => document.querySelectorAll('#daySummary .hist-del').length === 3);
  // orden del historial: lo ultimo arriba, lo primero abajo [usuario 2026-10-06]; el idx del 🗑
  // sigue siendo el del registro real (last2 se guarda de mas viejo a mas nuevo)
  const orden = await page.$$eval('#daySummary .hist-del', els => els.map(e => ({
    op: e.parentElement.firstElementChild.textContent.trim().split(':')[0], idx: e.dataset.idx })));
  ok(orden.map(x => x.op).join(',') === 'RM,C,E', 'historial: lo ultimo arriba, lo primero abajo — ' + JSON.stringify(orden));
  ok(orden.map(x => x.idx).join(',') === '2,1,0', 'el 🗑 sigue apuntando al registro real (idx 2,1,0)');
  await page.click('.hist-del[data-idx="0"]');   // el E, el mas viejo: ya esta enviado -> baja por RPC
  await page.waitForFunction(() => (window.__calls||[]).some(c => c.name === 'anular_evento_prod'));
  cs = await calls();
  const evDel = cs.find(c => c.name === 'anular_evento_prod');
  ok(typeof evDel.args.p_id_ejecucion === 'string' && evDel.args.p_id_ejecucion.length > 10, 'baja logica via RPC con id_ejecucion');

  // Matriz que saca 2 piezas por golpe: la app avisa la cuenta y sigue mandando GOLPES
  await page.click('#btnContinuar');
  await page.waitForSelector('.box[data-code="E"]');
  await page.click('.box[data-code="E"]');
  await page.fill('#textInput', '348');
  await page.dispatchEvent('#textInput', 'input');
  await page.click('#btnEnviar');
  await page.waitForFunction(() => (window.__calls||[]).some(c =>
    c.name === 'registrar_evento_prod' && c.args.p && c.args.p.matriz === '348'));
  await page.click('#btnContinuar');
  await page.waitForSelector('.box[data-code="C"]');
  await page.click('.box[data-code="C"]');
  await page.fill('#textInput', '240');
  await page.dispatchEvent('#textInput', 'input');
  const hint = await page.textContent('#golpeHint');
  ok(hint.includes('2') && hint.includes('480'), 'avisa 240 golpes x 2 = 480 unidades — ' + hint.trim());
  await page.click('#btnEnviar');
  await page.waitForFunction(() => (window.__calls||[]).some(c =>
    c.name === 'registrar_evento_prod' && c.args.p && c.args.p.golpes === 240));
  cs = await calls();
  const evG = cs.find(c => c.name === 'registrar_evento_prod' && c.args.p.golpes === 240);
  ok(evG.args.p.matriz === '348' && evG.args.p.uni === undefined, 'matriz de 2 por golpe: manda 240 golpes, no 480 uni');
  // Enviar en Terminar cajon NO pide confirmacion [usuario 2026-10-06]
  ok(!dialogos.some(m => /GOLPES x|CAJAS x/.test(m)), 'Enviar en C no abre ningun confirm de la cuenta — ' + JSON.stringify(dialogos));

  // Matriz dada de baja: ni aparece en la lista ni se acepta tipeada
  await page.click('#btnContinuar');
  await page.waitForSelector('.box[data-code="E"]');
  await page.click('.box[data-code="E"]');
  // el buscador de abajo se saco (v1.9.0): el campo de arriba filtra numero Y nombre
  await page.fill('#textInput', '62');
  await page.dispatchEvent('#textInput', 'input');
  ok(!(await page.textContent('#matrizGrid')).includes('Fiambre'), 'la matriz de baja no se ofrece en la lista');
  // el campo de arriba tambien filtra por NOMBRE (por eso el buscador de abajo sobraba)
  await page.fill('#textInput', 'untar');
  await page.dispatchEvent('#textInput', 'input');
  const porNombre = await page.textContent('#matrizGrid');
  ok(porNombre.includes('348') && !porNombre.includes('Pinza Grande'),
     'escribiendo un NOMBRE arriba se filtra la lista (sin buscador aparte)');
  // match EXACTO de numero: la lista colapsa a esa sola matriz (usuario: "cuando elijo 1
  // no me muestres las demas"). '28' matchea exacto la 28 y NO debe mostrar 348 ni otras.
  await page.fill('#textInput', '28');
  await page.dispatchEvent('#textInput', 'input');
  ok(await page.locator('#matrizGrid .mz').count() === 1, 'match exacto de numero: la lista muestra SOLO esa matriz');
  ok((await page.textContent('#matrizGrid')).includes('28'), 'y es la matriz que se tipeo');
  const antes = (await calls()).length;
  await page.fill('#textInput', '62');
  await page.dispatchEvent('#textInput', 'input');
  await page.click('#btnEnviar');
  ok((await calls()).length === antes, 'la matriz de baja tampoco se acepta tipeada');
  await page.click('#btnResetSelection');

  // EL ROLLO DEPENDE DE LA PIEZA, no solo de la matriz (usuario 2026-08-31: "A15 usa un
  // tipo de rollo (inox) y J2/J5 usa otro"). Antes se ofrecia siempre el mismo fleje y el
  // stock se descontaba del equivocado.
  {
    const rollosDe = (compSalidaId) => page.evaluate(id => {
      piezaSel = id === null ? null : { comp_id: id };
      actualizarRolloPicker('28');
      const msg = document.querySelector('#rolloGrid .rl-msg');
      if (msg) return [msg.textContent];
      return [...document.querySelectorAll('#rolloGrid .rl')].map(o => o.textContent);
    }, compSalidaId);

    // sin selector de pieza en pantalla (matriz_salidas vacio en este stub) se ofrecen
    // los rollos de LOS DOS flejes, con el codigo a la vista: nunca deja sin opciones
    const sinPieza = (await rollosDe(null)).join(' | ');
    ok(/A1/.test(sinPieza) && /F1A/.test(sinPieza),
       'sin pieza elegida ofrece los rollos de los dos flejes — ' + sinPieza);

    const deJ2 = (await rollosDe(29)).join(' | ');
    ok(/A1/.test(deJ2) && !/F1A/.test(deJ2), 'J2 ofrece SOLO rollos del Fleje 13 — ' + deJ2);

    const deA15 = (await rollosDe(86)).join(' | ');
    ok(/F1A/.test(deA15) && !/A1/.test(deA15), 'A15 ofrece SOLO rollos del Fleje 94 (inox) — ' + deA15);

    await page.evaluate(() => { piezaSel = null; });
  }

  // NO TODAS LAS MATRICES LLEVAN FLEJE (usuario 2026-10-01: "no todas las matrices necesitan
  // rollos de flejes, que se vaya este cartel"). La 348 no corta de ningun fleje: el cartel
  // "¿De que kilaje es el rollo...?" no tiene que aparecer, ni siquiera con "Sin rollos".
  {
    const picker = () => page.evaluate(() => ({
      oculto: document.getElementById('rolloPicker').classList.contains('hidden'),
      texto: document.getElementById('rolloGrid').textContent.trim() }));
    const tipear = async (n) => { await page.fill('#textInput', n); await page.dispatchEvent('#textInput', 'input'); };

    await page.click('.box[data-code="E"]');
    await tipear('348');
    ok((await picker()).oculto, 'matriz SIN fleje (348): el cartel de rollo se oculta');
    await tipear('28');
    const conFleje = await picker();
    ok(!conFleje.oculto && /A1/.test(conFleje.texto), 'matriz CON fleje (28): el cartel vuelve con sus rollos');
    await tipear('348');
    ok((await picker()).oculto, 'y al volver a una matriz sin fleje se vuelve a ocultar');
    await tipear('9999');
    ok(!(await picker()).oculto, 'matriz que no existe: no se oculta (sigue "Elegí una matriz")');

    // matriz con fleje pero sin rollos en stock: el aviso sigue, eso si es informacion
    const sinStock = await page.evaluate(() => {
      const g = D.rollos_saldo; D.rollos_saldo = [];
      actualizarRolloPicker('28');
      const r = { oculto: $('rolloPicker').classList.contains('hidden'), texto: $('rolloGrid').textContent.trim() };
      D.rollos_saldo = g; return r;
    });
    ok(!sinStock.oculto && /Sin rollos disponibles/.test(sinStock.texto),
       'matriz CON fleje y sin rollos en stock: sigue diciendo "Sin rollos disponibles"');

    // bundle viejo (sin matriz_fleje): no se puede saber, no se oculta nada
    const viejo = await page.evaluate(() => {
      const a = D.matriz_fleje, b = D.matriz_fleje_pieza; D.matriz_fleje = undefined; D.matriz_fleje_pieza = undefined;
      actualizarRolloPicker('348');
      const r = !$('rolloPicker').classList.contains('hidden');
      D.matriz_fleje = a; D.matriz_fleje_pieza = b; return r;
    });
    ok(viejo, 'bundle viejo sin matriz_fleje: no se oculta el cartel');
    await page.click('#btnResetSelection');
  }

  // SELECTOR DE PIEZA CON LOS ARTICULOS (2026-10-05, usuario: "en la 237 no me aparecen las variantes
  // de que quiero producir"). La tablet pregunta que pieza fabricas cuando la matriz expulsa 2+
  // piezas, y cada tarjeta tiene que decir a que ARTICULOS corresponde, que es en lo que piensa
  // el operario. Fixture real: la matriz 12 saca G13 (101 y 501), I11 (701) e I6 (502, 512 y 66).
  {
    await page.evaluate(() => {
      D.matrices = D.matrices.concat([{ n: '12', d: 'Doblado Mango Plano', ppk: null, uxg: 1, maq: 'balancin', act: true }]);
      D.matriz_salidas = Object.assign({}, D.matriz_salidas, { '12': [
        { comp_id: 5,  codigo: 'G13', descripcion: 'Mgo Plano 501 Dobl p/Pintar',    arts: '101 · 501' },
        { comp_id: 17, codigo: 'I11', descripcion: 'Mgo Plano 701 Doblado c/Marca',  arts: '701' },
        { comp_id: 22, codigo: 'I6',  descripcion: 'Mango Plano 502 Doblado',        arts: '502 · 512 · 66' } ] });
    });
    await page.click('.box[data-code="E"]');
    await page.fill('#textInput', '12');
    await page.dispatchEvent('#textInput', 'input');
    const tiles = await page.locator('#piezaGrid .mz').allTextContents();
    ok(tiles.length === 3, 'la matriz 12 pregunta que pieza fabricas: 3 opciones — ' + tiles.length);
    const todos = tiles.join(' | ');
    ok(['101', '501', '701', '502', '512', '66'].every(a => todos.includes(a)),
       'se ven los 6 articulos 101, 501, 701, 502, 512 y 66 — ' + todos);
    ok(tiles.some(t => t.includes('I6') && t.includes('502 · 512 · 66')),
       'cada pieza muestra SUS articulos (I6 -> 502 · 512 · 66)');
    ok(await page.locator('#btnEnviar').isDisabled(), 'sin elegir pieza no se puede Enviar');
    await page.locator('#piezaGrid .mz', { hasText: 'I11' }).click();
    const linea = await page.textContent('#piezaGrid .pieza-cambiar');
    ok(linea.includes('I11') && linea.includes('art. 701'), 'elegida la pieza, la linea dice los articulos — ' + linea.trim());
    ok(!(await page.locator('#btnEnviar').isDisabled()), 'con la pieza elegida se habilita Enviar');
    // bundle viejo (cacheado en la tablet, sin "arts"): sigue funcionando, solo sin la linea
    await page.evaluate(() => { piezaSel = null; D.matriz_salidas['12'].forEach(s => { delete s.arts; }); renderPiezaPicker('12'); });
    const sinArts = await page.locator('#piezaGrid .mz').allTextContents();
    ok(sinArts.length === 3 && !sinArts.join('').includes('Art.'), 'bundle viejo sin arts: 3 piezas y sin linea de articulos');
    await page.click('#btnResetSelection');
  }

  // ETIQUETA CORTA EN EL SELECTOR DE PIEZA (2026-10-07, usuario: "en vez de esos nombres como variantes en el
  // recuadro amarillo quiero que solo le aparezca esto al operario"). Cuando matriz_salidas trae 'etiqueta'
  // (GP2.matriz_salida_etiqueta) la tarjeta dice SOLO la etiqueta — ni codigo, ni descripcion, ni articulos —,
  // en el orden que manda el bundle. Lo que viaja (comp_salida_id y pieza = codigo) NO cambia.
  {
    await page.evaluate(() => {
      // Orden REAL del bundle (2026-10-07: Loeke, Chef, c/Marca, s/Marca): I6 Loeke, I11 Chef, G13 S/Marca.
      D.matriz_salidas = Object.assign({}, D.matriz_salidas, { '12': [
        { comp_id: 22, codigo: 'I6',  descripcion: 'Mango Plano 502 Doblado',       arts: '066 · 502 · 512', etiqueta: 'Loeke' },
        { comp_id: 17, codigo: 'I11', descripcion: 'Mgo Plano 701 Doblado c/Marca', arts: '701',             etiqueta: 'Chef' },
        { comp_id: 5,  codigo: 'G13', descripcion: 'Mgo Plano 501 Dobl p/Pintar',   arts: '101 · 501',       etiqueta: 'S/Marca' } ] });
    });
    await page.click('.box[data-code="E"]');
    await page.fill('#textInput', '12');
    await page.dispatchEvent('#textInput', 'input');
    const et = (await page.locator('#piezaGrid .mz').allTextContents()).map(t => t.trim());
    ok(et.length === 3 && et[0] === 'Loeke' && et[1] === 'Chef' && et[2] === 'S/Marca',
       'con etiquetas la tarjeta dice SOLO la etiqueta y en el orden del bundle (Loeke, Chef, S/Marca) — ' + JSON.stringify(et));
    ok(!/G13|I11|I6|Art\.|\d/.test(et.join(' ')), 'sin codigo, sin descripcion y sin articulos en las tarjetas');
    ok((await page.locator('#piezaGrid .mz.mz-et').count()) === 3, 'las 3 tarjetas usan el estilo grande de etiqueta (mz-et)');
    await page.locator('#piezaGrid .mz', { hasText: 'Chef' }).click();
    const lin = (await page.textContent('#piezaGrid .pieza-cambiar')).replace(/\s+/g, ' ').trim();
    ok(lin.includes('Fabricás Chef') && !lin.includes('I11') && !lin.includes('701'),
       'elegida la pieza, la linea dice solo la etiqueta — ' + lin);
    const chip = (await page.textContent('#matrizGrid .mz-chip')).replace(/\s+/g, ' ').trim();
    ok(chip.includes('Chef') && !chip.includes('I11'), 'la card de la matriz muestra la etiqueta a la derecha — ' + chip);
    const datos = await page.evaluate(() => ({ id: piezaSel.comp_id, cod: piezaSel.codigo }));
    ok(datos.id === 17 && datos.cod === 'I11', 'lo que viaja no cambia: comp_salida_id 17 y pieza = I11 — ' + JSON.stringify(datos));
    ok(!(await page.locator('#btnEnviar').isDisabled()), 'con la pieza elegida se habilita Enviar');
    // salida SIN etiqueta en una matriz que si las tiene (matriz nueva): esa tarjeta cae al formato de siempre
    await page.evaluate(() => { piezaSel = null; D.matriz_salidas['12'][2] = { comp_id: 5, codigo: 'G13', descripcion: 'Mgo Plano 501 Dobl p/Pintar', arts: '101 · 501' }; renderPiezaPicker('12'); });
    const mixto = (await page.locator('#piezaGrid .mz').allTextContents()).map(t => t.trim());
    ok(mixto[0] === 'Loeke' && mixto[2].includes('G13') && mixto[2].includes('Art. 101 · 501'),
       'una salida sin etiqueta cae al formato de siempre sin romper las otras — ' + JSON.stringify(mixto));
    await page.click('#btnResetSelection');
  }

  // badge sync sin pendientes
  const badge = await page.textContent('#syncBadge');
  ok(badge.includes('✓'), 'cola sincronizada: ' + badge.trim());

  // 2026-10-05: el cliente tiene que ser el de GP2_SB() (manda la sesion del login). El que
  // tenia la pantalla iba "sin sesion" y desde la fase B la base rechazaba todo con 42501.
  const opts = await page.evaluate(() => window.__sbOpts);
  ok(!!(opts && opts.auth && opts.auth.persistSession === true && opts.db && opts.db.schema === 'GP2'),
     'el cliente usa la sesion del login (GP2_SB), no uno anonimo propio');

  // Cola de rollos: sin permiso (42501) NO es un rechazo definitivo -> se reintenta.
  // Un error de negocio con code (P0001) si es definitivo y se descarta, como antes.
  const rq = await page.evaluate(async () => {
    const flush = async () => { while (flushing) await new Promise(r => setTimeout(r, 20)); await flushQueue(); };
    const item = { fn: 'cerrar_rollo', args: { p_legajo: '19', p_quedo_resto: false, p_fecha: '2026-10-05T10:00:00-03:00' } };
    window.__falla = 'cerrar_rollo'; window.__fallaCode = '42501';
    writeRolloQueue([item]); await flush();
    const sinPermiso = readRolloQueue().length;
    window.__falla = null; await flush();
    const alVolver = readRolloQueue().length;
    window.__falla = 'cerrar_rollo'; window.__fallaCode = 'P0001';
    writeRolloQueue([item]); await flush();
    const definitivo = readRolloQueue().length;
    window.__falla = null;
    return { sinPermiso, alVolver, definitivo };
  });
  ok(rq.sinPermiso === 1, 'cerrar_rollo con "permission denied" queda en la cola (antes se tiraba)');
  ok(rq.alVolver === 0, 'con el permiso de vuelta, la cola de rollos se vacia');
  ok(rq.definitivo === 0, 'rechazo de negocio (P0001) se sigue descartando');

  // 2026-10-05 [usuario]: el cartel "Pendientes en cola" no va mas; con la cola llena el
  // unico aviso es el badge "⚠ N sin enviar".
  const cola = await page.evaluate(() => {
    writeQueue([{ id: 'x1', legajo: '19', opcion: 'E', texto: '505', ts_event: '2026-10-05T13:26:52-03:00' }]);
    renderSyncBadge();
    const r = { cartel: !!document.getElementById('pendingSection') || document.body.innerText.includes('Pendientes en cola'),
                badge: $('syncBadge').innerText };
    writeQueue([]); renderSyncBadge();
    return r;
  });
  ok(!cola.cartel, 'sin cartel "Pendientes en cola" en la pantalla de legajo');
  ok(cola.badge.includes('1 sin enviar'), 'con cola llena el badge avisa: ' + cola.badge);

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
