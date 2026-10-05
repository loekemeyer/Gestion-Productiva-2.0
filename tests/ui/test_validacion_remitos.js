/* Relevamiento/ValidacionRemitos_GP2.html — Validacion de Stock, modulo REMITO VS CONTROL.
   Pedido del usuario el 2026-09-30: "otro modulo para validar lo que se anoto en el remito vs lo
   que se controlo (en todas las recepciones de version tablet) entonces todas las diferencias
   entre remito y control se define que queda como ingreso real en este modulo".
   Lo que fija este test:
     - la barra de los DOS modulos (Conteo vs Sistema / Remito vs Control) en las dos pantallas;
     - se listan las diferencias pendientes de P.S., talleristas e insumos, con remito, control y
       diferencia (y su %);
     - por DEFAULT gana el control (es lo que ya esta en el stock) y se puede elegir el remito;
     - el payload de validar_remito_control: origen + id + ingreso_real, y el usuario;
     - el filtro por tipo manda solo lo visible;
     - DE A UNA (v1.3.0): cada fila tiene su botón Validar que manda solo esa recepción, y no pisa
       lo elegido en las demás;
     - FLEJES (v1.1.0, "entran todas las recepciones xq todas tienen control"): el pesaje por pallet
       no pisa el stock, asi que ahi elegir Control es lo que CAMBIA el stock; la pantalla lo cuenta
       con en_stock en vez de suponerlo;
     - 390px sin scroll horizontal y botones tocables (>= 44px). */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const BUNDLE = {
  tol_pct: 5,
  // los tres casos reales del 2026-09-30
  pend: [
    { origen: 'insumo', id: 17079, mov_id: 90001, fecha: '2026-09-30T12:00:00-03:00',
      cp_tipo: 'proveedor_insumo', cp_nombre: 'Importado', remito_nro: 'R-0001',
      codigo: 'Z23B', descripcion: 'Importado Z23B', unidad: 'uni',
      remito: 20400, control: 20377, diff: -23, en_stock: 20377, controlado_por: 'admin' },
    { origen: 'insumo', id: 17078, mov_id: 90000, fecha: '2026-09-30T11:00:00-03:00',
      cp_tipo: 'proveedor_insumo', cp_nombre: 'Importado', remito_nro: null,
      codigo: 'Z23A', descripcion: 'Importado Z23A', unidad: 'uni',
      remito: 21600, control: 21605, diff: 5, en_stock: 21605, controlado_por: 'admin' },
    { origen: 'entrega', id: 8, mov_id: 85600, fecha: '2026-09-29T17:00:00-03:00',
      cp_tipo: 'proveedor_servicio', cp_nombre: 'Ester', remito_nro: null,
      codigo: 'PC12', descripcion: 'Mango pelapapa', unidad: 'uni',
      remito: 2500, control: 2513.1502045587376, diff: 13.15, en_stock: 2513.1502045587376, controlado_por: null },
    // tallerista con diferencia FUERA de la tolerancia (10 %)
    { origen: 'entrega', id: 9, mov_id: 85601, fecha: '2026-09-28T17:00:00-03:00',
      cp_tipo: 'tallerista', cp_nombre: 'Martin Cornejo', remito_nro: null,
      codigo: 'X4', descripcion: 'Cuchilla Pelapapa Cerrada', unidad: 'kg',
      remito: 20, control: 18, diff: -2, en_stock: 18, controlado_por: 'naza' },
    // FLEJE: el pesaje no piso el movimiento -> el stock todavia tiene los kg del remito
    { origen: 'pesaje', id: 17090, mov_id: 90010, fecha: '2026-09-27T10:00:00-03:00',
      cp_tipo: 'proveedor_insumo', cp_nombre: 'Altrak', remito_nro: 'A-77',
      codigo: 'IA2', descripcion: 'Fleje N° 1', unidad: 'kg',
      remito: 510, control: 500, diff: -10, en_stock: 510, controlado_por: 'naza' }
  ],
  hechos: [
    { origen: 'insumo', id: 17000, fecha: '2026-09-25T12:00:00-03:00', cp_tipo: 'proveedor_insumo',
      cp_nombre: 'Cartocor', codigo: 'C1', descripcion: 'Carton', unidad: 'uni',
      remito: 1000, control: 990, diff: -10, ingreso_real: 'remito',
      validado_en: '2026-09-26T09:00:00-03:00', validado_por: 'thomas' }
  ],
  sin_diferencia: 4,
  sin_controlar: 2
};

const STUB = `
window.supabase = { createClient: function(){ return {
  auth: { getSession: async function(){ return { data: { session: null } }; },
          onAuthStateChange: function(){ return { data: { subscription: { unsubscribe: function(){} } } }; } },
  rpc: async function(name, args){
    window.__calls = window.__calls || [];
    window.__calls.push({name:name, args:args});
    if(name==='validacion_remito_bundle')
      return { data: JSON.parse(JSON.stringify(window.__BUNDLE__ || ${JSON.stringify(BUNDLE)})), error: null };
    if(name==='validar_remito_control')
      return { data: { ok:true, validados: args.p_items.length, movimientos_ajustados: 2,
                       al_remito: args.p_items.filter(function(i){ return i.ingreso_real==='remito'; }).length }, error: null };
    if(name==='validacion_bundle') return { data: { pendientes: [], aplicados: [] }, error: null };
    return { data: null, error: { message: 'rpc desconocida '+name } };
  }
};}};
`;

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('gp2_usuario', 'thomas'); } catch (e) {} });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  const dialogs = [];
  page.on('dialog', d => { dialogs.push({ type: d.type(), msg: d.message() }); d.accept(); });
  await page.route('**/@supabase/supabase-js@2**', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/GP2_favicon.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));

  const ok = (c, msg) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + msg); if (!c) process.exitCode = 1; };
  const calls = async (n) => page.evaluate(n => (window.__calls || []).filter(c => c.name === n), n);
  const filas = () => page.$$eval('#pendientes .li', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));

  await page.goto(ROOT + '/Relevamiento/ValidacionRemitos_GP2.html');
  await page.waitForFunction(() => document.querySelectorAll('#pendientes .li').length > 0);

  // ── los dos modulos ──
  const tabs = await page.$$eval('.tabs a', xs => xs.map(x => [x.textContent.trim(), x.getAttribute('href'), x.classList.contains('act')]));
  ok(tabs.length === 2 && tabs[0][1] === 'Validacion_Stock.html' && tabs[1][2] === true,
     'barra de los dos modulos, con Remito vs Control activo — ' + JSON.stringify(tabs));

  // ── la lista ──
  const fs0 = await filas();
  ok(fs0.length === 5, 'las 5 diferencias pendientes se listan (insumos, P.S., tallerista y fleje) — ' + fs0.length);
  ok(fs0[4].includes('IA2') && fs0[4].includes('pesaje por pallet') && fs0[4].includes('Remito 510') &&
     fs0[4].includes('Control 500'), 'el fleje entra, marcado como pesaje por pallet — ' + fs0[4]);
  ok(fs0[0].includes('Z23B') && fs0[0].includes('Importado') && fs0[0].includes('Remito 20.400') &&
     fs0[0].includes('Control 20.377') && fs0[0].includes('-23'),
     'la fila dice parte, proveedor, remito, control y diferencia — ' + fs0[0]);
  ok(fs0[0].includes('remito R-0001'), 'el numero de remito del insumo se ve — ' + fs0[0]);
  ok(fs0[2].includes('PC12') && fs0[2].includes('2.513,15') && fs0[2].includes('+13,15'),
     'P.S.: control con decimales, coma decimal y punto de miles — ' + fs0[2]);
  const clases = await page.$$eval('#pendientes .li', xs => xs.map(x => x.className));
  ok(/dentro/.test(clases[0]) && /fuera/.test(clases[3]),
     'la diferencia fuera de la tolerancia (5 %) se marca distinto — ' + clases.join(' | '));
  const ctx0 = await page.$eval('#contexto', e => e.textContent);
  ok(ctx0.includes('4 controles coincidieron') && ctx0.includes('2 recepciones todavía sin controlar'),
     'contexto: cuantos coincidieron y cuantos faltan controlar — ' + ctx0);

  // ── default: control ──
  const act = await page.$$eval('#pendientes .pick button.act', xs => xs.map(x => x.dataset.v));
  ok(act.length === 5 && act.every(v => v === 'control'), 'por default gana el CONTROL en todas — ' + act.join(','));
  const res0 = await page.$eval('#resumen', e => e.textContent);
  ok(res0.includes('5 quedan con el control, 0 con el remito') && res0.includes('1 cambia el stock'),
     'el resumen cuenta las decisiones, y que con todo en Control solo el fleje mueve el stock — ' + res0);

  // ── elegir remito en Z23B y validar todo ──
  await page.click('#pendientes .li:first-child .pick button[data-v="remito"]');
  const res1 = await page.$eval('#resumen', e => e.textContent);
  ok(res1.includes('4 quedan con el control, 1 con el remito') && res1.includes('2 cambian el stock'),
     'elegir Remito en Z23B se refleja: ahora cambian el stock Z23B y el fleje — ' + res1);
  await page.click('#pendientes .li:nth-child(5) .pick button[data-v="remito"]');
  ok((await page.$eval('#resumen', e => e.textContent)).includes('1 cambia el stock'),
     'fleje con Remito: no mueve nada (el stock ya tiene el remito)');
  await page.click('#pendientes .li:nth-child(5) .pick button[data-v="control"]');
  await page.click('#btnValidar');
  await page.waitForFunction(() => (window.__calls || []).some(c => c.name === 'validar_remito_control'));
  const v1 = (await calls('validar_remito_control'))[0].args;
  ok(v1.p_usuario === 'thomas', 'viaja quien valida (gp2_usuario) — ' + v1.p_usuario);
  ok(v1.p_items.length === 5 &&
     JSON.stringify(v1.p_items[0]) === JSON.stringify({ origen: 'insumo', id: 17079, ingreso_real: 'remito' }) &&
     JSON.stringify(v1.p_items[2]) === JSON.stringify({ origen: 'entrega', id: 8, ingreso_real: 'control' }) &&
     JSON.stringify(v1.p_items[4]) === JSON.stringify({ origen: 'pesaje', id: 17090, ingreso_real: 'control' }),
     'payload: origen + id + ingreso_real por fila — ' + JSON.stringify(v1.p_items));
  ok(dialogs.some(d => d.type === 'confirm' && d.msg.includes('1 quedan con el remito') && d.msg.includes('2 cambian el stock')),
     'antes de validar pregunta, y dice cuantas mueven el stock — ' + (dialogs[0] || {}).msg);
  await page.waitForFunction(() => /validada/.test(document.getElementById('status').textContent));
  ok((await page.$eval('#status', e => e.textContent)).includes('1 con el remito, 2 cambiaron el stock'),
     'el mensaje de exito queda a la vista (no lo borra la recarga)');

  // ── filtro: valida SOLO lo visible ──
  await page.click('.filtros button[data-f="tallerista"]');
  ok((await filas()).length === 1 && (await filas())[0].includes('Martin Cornejo'),
     'el filtro Talleristas deja solo la del tallerista');
  await page.click('#btnValidar');
  await page.waitForFunction(() => (window.__calls || []).filter(c => c.name === 'validar_remito_control').length === 2);
  const v2 = (await calls('validar_remito_control'))[1].args;
  ok(v2.p_items.length === 1 && v2.p_items[0].id === 9, 'con filtro se valida solo lo que se ve — ' + JSON.stringify(v2.p_items));

  // ── validar DE A UNA (v1.3.0, "validar una por una en vez de tener que validar todas juntas") ──
  await page.click('.filtros button[data-f="todos"]');
  const unas = await page.$$eval('#pendientes .li .li-acts [data-una]', xs => xs.map(x => x.textContent.trim()));
  ok(unas.length === 5 && unas.every(t => t === 'Validar'), 'cada fila tiene su propio botón Validar — ' + unas.join(','));
  ok((await page.$eval('#btnValidar', e => e.textContent)).includes('Validar todas (5)'),
     'el de abajo queda como "Validar todas (N)"');
  await page.click('#pendientes .li:nth-child(2) .pick button[data-v="remito"]');
  const nDlg = dialogs.length;
  await page.click('#pendientes .li:nth-child(2) [data-una]');
  await page.waitForFunction(() => (window.__calls || []).filter(c => c.name === 'validar_remito_control').length === 3);
  const v3 = (await calls('validar_remito_control'))[2].args;
  ok(v3.p_items.length === 1 &&
     JSON.stringify(v3.p_items[0]) === JSON.stringify({ origen: 'insumo', id: 17078, ingreso_real: 'remito' }) &&
     v3.p_usuario === 'thomas',
     'la fila manda SOLO esa recepción, con lo elegido y quién valida — ' + JSON.stringify(v3));
  const d3 = (dialogs[nDlg] || {}).msg || '';
  ok(d3.includes('Z23A') && d3.includes('REMITO') && d3.includes('21.600') && d3.includes('cambia el stock'),
     'antes de validar la fila pregunta qué queda y si mueve el stock — ' + d3);
  await page.waitForFunction(() => /Z23A validada/.test(document.getElementById('status').textContent));
  const elegidos = await page.$$eval('#pendientes .pick button.act', xs => xs.map(x => x.dataset.v));
  ok(elegidos[0] === 'remito', 'validar una fila no pisa lo elegido en las otras (Z23B sigue en Remito) — ' + elegidos.join(','));

  // ── ya validadas ──
  const h = await page.$$eval('#hechos tr', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  ok(h.length === 1 && h[0].includes('Remito') && h[0].includes('thomas'),
     'la tabla de ya validadas dice que quedo y quien valido — ' + h[0]);

  // ── reglas de pantalla ──
  const anchoOk = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  ok(anchoOk, '390px: la pagina no scrollea horizontal');
  const chicos = await page.$$eval('.pick button, .filtros button, .tabs a, #btnValidar, [data-una]',
    xs => xs.filter(x => x.offsetParent && x.getBoundingClientRect().height < 44).map(x => x.textContent.trim()));
  ok(chicos.length === 0, 'botones tocables (>= 44px) — ' + chicos.join(', '));

  // ── la otra pantalla tambien tiene la barra ──
  await page.goto(ROOT + '/Relevamiento/Validacion_Stock.html');
  await page.waitForSelector('.tabs a');
  const tabs2 = await page.$$eval('.tabs a', xs => xs.map(x => [x.getAttribute('href'), x.classList.contains('act')]));
  ok(tabs2.length === 2 && tabs2[0][1] === true && tabs2[1][0] === 'ValidacionRemitos_GP2.html',
     'Conteo vs Sistema tiene la misma barra y lleva al modulo nuevo — ' + JSON.stringify(tabs2));

  // ── FLEJE con una parte mandada a Virgilio (2026-10-02): NO es faltante. El control se compara
  //    contra el ESPERADO = remito − Virgilio, y la fila aclara cuanto se fue a Virgilio. ──
  const VIRB = { tol_pct: 5, sin_diferencia: 0, sin_controlar: 0, hechos: [], pend: [
    { origen: 'pesaje', id: 17095, mov_id: 85602, fecha: '2026-10-02T13:34:12-03:00',
      cp_tipo: 'proveedor_insumo', cp_nombre: 'Aperam', remito_nro: 's/n 13:34:12',
      codigo: 'ID5', descripcion: 'Fleje N° 38', unidad: 'kg',
      remito: 10, virgilio: 3, esperado: 7, control: 6, diff: -1, en_stock: 7, controlado_por: 'naza' }
  ]};
  const page2 = await ctx.newPage();
  page2.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  page2.on('dialog', d => d.accept());
  await page2.addInitScript(b => { window.__BUNDLE__ = b; }, VIRB);
  await page2.route('**/@supabase/supabase-js@2**', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page2.route('**/GP2_favicon.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
  await page2.goto(ROOT + '/Relevamiento/ValidacionRemitos_GP2.html');
  await page2.waitForFunction(() => document.querySelectorAll('#pendientes .li').length > 0);
  const vf = (await page2.$$eval('#pendientes .li', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim())))[0];
  ok(vf.includes('ID5') && vf.includes('Remito 10') && vf.includes('Virgilio') && vf.includes('espera') &&
     vf.includes('Control 6'),
     'fleje con parte a Virgilio: la fila aclara los kg a Virgilio y el esperado — ' + vf);
  const vres0 = await page2.$eval('#resumen', e => e.textContent);
  ok(vres0.includes('1 cambia el stock'),
     'control (6) ≠ esperado (7): por default (Control) mueve el stock — ' + vres0);
  await page2.click('#pendientes .li:first-child .pick button[data-v="remito"]');
  ok((await page2.$eval('#resumen', e => e.textContent)).includes('0 cambian el stock'),
     'con Remito el fleje queda en el esperado (7) = lo que ya hay: no mueve');

  await browser.close();
})();
