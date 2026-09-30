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
      remito: 20400, control: 20377, diff: -23, controlado_por: 'admin' },
    { origen: 'insumo', id: 17078, mov_id: 90000, fecha: '2026-09-30T11:00:00-03:00',
      cp_tipo: 'proveedor_insumo', cp_nombre: 'Importado', remito_nro: null,
      codigo: 'Z23A', descripcion: 'Importado Z23A', unidad: 'uni',
      remito: 21600, control: 21605, diff: 5, controlado_por: 'admin' },
    { origen: 'entrega', id: 8, mov_id: 85600, fecha: '2026-09-29T17:00:00-03:00',
      cp_tipo: 'proveedor_servicio', cp_nombre: 'Ester', remito_nro: null,
      codigo: 'PC12', descripcion: 'Mango pelapapa', unidad: 'uni',
      remito: 2500, control: 2513.1502045587376, diff: 13.15, controlado_por: null },
    // tallerista con diferencia FUERA de la tolerancia (10 %)
    { origen: 'entrega', id: 9, mov_id: 85601, fecha: '2026-09-28T17:00:00-03:00',
      cp_tipo: 'tallerista', cp_nombre: 'Martin Cornejo', remito_nro: null,
      codigo: 'X4', descripcion: 'Cuchilla Pelapapa Cerrada', unidad: 'kg',
      remito: 20, control: 18, diff: -2, controlado_por: 'naza' }
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
      return { data: JSON.parse(JSON.stringify(${JSON.stringify(BUNDLE)})), error: null };
    if(name==='validar_remito_control')
      return { data: { ok:true, validados: args.p_items.length,
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
  ok(fs0.length === 4, 'las 4 diferencias pendientes se listan (insumos, P.S. y tallerista) — ' + fs0.length);
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
  ok(act.length === 4 && act.every(v => v === 'control'), 'por default gana el CONTROL en todas — ' + act.join(','));
  ok((await page.$eval('#resumen', e => e.textContent)).includes('4 quedan con el control, 0 vuelven al remito'),
     'el resumen cuenta las decisiones');

  // ── elegir remito en Z23B y validar todo ──
  await page.click('#pendientes .li:first-child .pick button[data-v="remito"]');
  ok((await page.$eval('#resumen', e => e.textContent)).includes('3 quedan con el control, 1 vuelven al remito'),
     'elegir Remito se refleja en el resumen');
  await page.click('#btnValidar');
  await page.waitForFunction(() => (window.__calls || []).some(c => c.name === 'validar_remito_control'));
  const v1 = (await calls('validar_remito_control'))[0].args;
  ok(v1.p_usuario === 'thomas', 'viaja quien valida (gp2_usuario) — ' + v1.p_usuario);
  ok(v1.p_items.length === 4 &&
     JSON.stringify(v1.p_items[0]) === JSON.stringify({ origen: 'insumo', id: 17079, ingreso_real: 'remito' }) &&
     JSON.stringify(v1.p_items[2]) === JSON.stringify({ origen: 'entrega', id: 8, ingreso_real: 'control' }),
     'payload: origen + id + ingreso_real por fila — ' + JSON.stringify(v1.p_items));
  ok(dialogs.some(d => d.type === 'confirm' && d.msg.includes('1 vuelven al remito')),
     'antes de validar pregunta, y dice cuantas mueven el stock');
  await page.waitForFunction(() => /validada/.test(document.getElementById('status').textContent));
  ok((await page.$eval('#status', e => e.textContent)).includes('1 volvieron al remito'),
     'el mensaje de exito queda a la vista (no lo borra la recarga)');

  // ── filtro: valida SOLO lo visible ──
  await page.click('.filtros button[data-f="tallerista"]');
  ok((await filas()).length === 1 && (await filas())[0].includes('Martin Cornejo'),
     'el filtro Talleristas deja solo la del tallerista');
  await page.click('#btnValidar');
  await page.waitForFunction(() => (window.__calls || []).filter(c => c.name === 'validar_remito_control').length === 2);
  const v2 = (await calls('validar_remito_control'))[1].args;
  ok(v2.p_items.length === 1 && v2.p_items[0].id === 9, 'con filtro se valida solo lo que se ve — ' + JSON.stringify(v2.p_items));

  // ── ya validadas ──
  const h = await page.$$eval('#hechos tr', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  ok(h.length === 1 && h[0].includes('Remito') && h[0].includes('thomas'),
     'la tabla de ya validadas dice que quedo y quien valido — ' + h[0]);

  // ── reglas de pantalla ──
  const anchoOk = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  ok(anchoOk, '390px: la pagina no scrollea horizontal');
  const chicos = await page.$$eval('.pick button, .filtros button, .tabs a, #btnValidar',
    xs => xs.filter(x => x.offsetParent && x.getBoundingClientRect().height < 44).map(x => x.textContent.trim()));
  ok(chicos.length === 0, 'botones tocables (>= 44px) — ' + chicos.join(', '));

  // ── la otra pantalla tambien tiene la barra ──
  await page.goto(ROOT + '/Relevamiento/Validacion_Stock.html');
  await page.waitForSelector('.tabs a');
  const tabs2 = await page.$$eval('.tabs a', xs => xs.map(x => [x.getAttribute('href'), x.classList.contains('act')]));
  ok(tabs2.length === 2 && tabs2[0][1] === true && tabs2[1][0] === 'ValidacionRemitos_GP2.html',
     'Conteo vs Sistema tiene la misma barra y lleva al modulo nuevo — ' + JSON.stringify(tabs2));

  await browser.close();
})();
