/* Tiempos Matrices GP2 (Produccion/tiempos_GP2.html): Gauss automatico, variantes, boton de fuente de
   la produccion (GP2 / Gestion Productiva Entero) y anular. Supabase STUBEADO: no toca la base.
   Pedido de Elias, 2026-10-05. Verifica:
   - por defecto la produccion sale de GP2.produccion y NO se toca public;
   - el boton "Gestion Productiva Entero" lee public.db_n8n_espejo (solo con .schema('public'), por paginas
     de 1000) y nunca escribe;
   - el Gauss: un punto por operario y dia, sin Uni 0 / Seg<=1, fuera de 1/3..3x mediana, ni mu+-2 sigma;
   - variantes (3 y 3B juntas; 325 / 325B separadas), avisos "revisar" y "pocos datos";
   - ventana de registros (columna Var solo con variantes, excluidos tachados) y campana;
   - anular: en GP2 manda anular_produccion con lo que el registro ya tenia; en Entero esta apagado. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

let _id = 0;
// Registro de GP2.produccion. Cada uno con su propio legajo => cada uno es su propio punto operario-dia.
const G = (mat, leg, dia, uni, seg, toma, extra) => Object.assign({ id: ++_id, fecha: dia + 'T12:00:00-03:00', legajo: leg, matriz_raw: mat,
  nombre_matriz: '', uni, segundos_trabajados: seg, tiempo_toma: toma, anular_tiempo: false, premio: 0, hora_inicio: '08:00:00',
  hora_fin: '09:00:00', segundos_tiempo_muerto: 0, segundos_historico: 0, eliminar: null }, extra || {});
// El mismo registro como lo devuelve public.db_n8n_espejo (columnas con mayuscula)
const aEntero = (g) => ({ id: g.id, Fecha: g.fecha, Legajo: g.legajo, Matriz: g.matriz_raw, Nombre_Matriz: g.nombre_matriz, Uni: g.uni,
  Segundos_Trabajados: g.segundos_trabajados, Tiempo_Toma: g.tiempo_toma, Anular_Tiempo: g.anular_tiempo, Premio: g.premio, Eliminar: g.eliminar });

const MATRIZ = [
  { n_matriz: '3',   descripcion: 'Corte y Estampado Mango pela', tiempo_historico: 2,    tiempo_unidad: 'uni', uni_x_golpe: 1, activa: true },
  { n_matriz: '3B',  descripcion: 'Corte y Estampado Mango Sin Marca', tiempo_historico: 2, tiempo_unidad: 'uni', uni_x_golpe: 1, activa: true },
  { n_matriz: '207', descripcion: 'Afilado disco Chico', tiempo_historico: 13.6, tiempo_unidad: 'uni', uni_x_golpe: 1, activa: true },
  { n_matriz: '325', descripcion: 'ReEnv Colador 10', tiempo_historico: null, tiempo_unidad: 'uni', uni_x_golpe: 1, activa: true },
  { n_matriz: '325B', descripcion: 'Reenvasado Colador 20', tiempo_historico: 27.6, tiempo_unidad: 'uni', uni_x_golpe: 1, activa: true },
  { n_matriz: '900', descripcion: 'Con tiempo mal cargado', tiempo_historico: 100, tiempo_unidad: 'uni', uni_x_golpe: 1, activa: true },
  { n_matriz: '901', descripcion: 'Pocos datos', tiempo_historico: 10, tiempo_unidad: 'uni', uni_x_golpe: 1, activa: true },
];
const EMPLEADO = [{ legajo: '19', nombre: 'Eduardo B', activo: true }, { legajo: '74', nombre: 'Omar Banchur', activo: true }];

const D = '2026-10-0';
const PROD = [
  // 3 y 3B: puntos 2,6 / 2,6 (el de 19 junta 2 registros del mismo dia: 5200/2000) / 2,4 / 2,8  => Gauss 2,6
  G('3', '19', D + '1', 1000, 2500, 2.5), G('3', '19', D + '1', 1000, 2700, 2.7), G('3', '95', D + '2', 1000, 2600, 2.6),
  G('3B', '74', D + '3', 1000, 2400, 2.4), G('3B', '94', D + '3', 1000, 2800, 2.8),
  // 325 y 325B NO son variantes
  G('325', '19', D + '1', 100, 1600, 16), G('325B', '74', D + '1', 100, 2760, 27.6),
  // 207: 18 registros, 15 buenos (Gauss 16,8): uno Uni 0, uno muy bajo, uno fuera de la campana
  ...[[1040, 6983, 6.71], [589, 9170, 15.57], [852, 19502, 22.89], [700, 13892, 19.85], [948, 16360, 17.26], [224, 5729, 25.58], [960, 19841, 20.67],
      [680, 10702, 15.74], [975, 16042, 16.45], [1207, 1483, 1.23], [539, 7558, 14.02], [322, 6855, 21.29], [555, 7410, 13.35], [0, 944, 0],
      [1155, 19043, 16.49], [831, 12979, 15.62], [174, 1770, 10.17], [450, 21902, 48.67]].map((a, i) => G('207', 'L' + i, D + '4', a[0], a[1], a[2])),
  // 900: mediana ~10 contra tiempo cargado 100 => aviso "revisar"
  G('900', '19', D + '1', 100, 1000, 10), G('900', '74', D + '2', 100, 1000, 10), G('900', '95', D + '3', 100, 1100, 11), G('900', '94', D + '4', 100, 900, 9),
  // 901: 2 puntos => "pocos datos"
  G('901', '19', D + '1', 100, 1000, 10), G('901', '74', D + '2', 100, 1100, 11),
];
// Gestion Productiva Entero tiene mas: 2300 registros de la 900 ademas de los de arriba (para probar el paginado de a 1000)
const MASIVOS = [...Array(2300)].map((_, i) => G('900', 'M' + (i % 50), '2026-09-' + String(1 + (i % 28)).padStart(2, '0'), 100, 1000, 10));
const ENTERO = PROD.map(aEntero).concat(MASIVOS.map(aEntero));

const STUB = `
(function(){
  window.__consultas = []; window.__rpcs = [];
  var DATOS = { 'GP2.matriz': ${JSON.stringify(MATRIZ)}, 'GP2.empleado': ${JSON.stringify(EMPLEADO)},
                'GP2.produccion': ${JSON.stringify(PROD)}, 'public.db_n8n_espejo': ${JSON.stringify(ENTERO)} };
  function mk(tabla, esquema){
    var q = { f: [] };
    ['select','gt','neq','gte','lte','eq','order','range'].forEach(function(m){
      q[m] = function(){ q.f.push([m].concat([].slice.call(arguments))); return q; };
    });
    q.then = function(res, rej){
      window.__consultas.push({ tabla: tabla, esquema: esquema, filtros: q.f });
      var datos = DATOS[esquema + '.' + tabla] || [];
      var rg = q.f.filter(function(x){ return x[0] === 'range'; })[0];
      return Promise.resolve({ data: rg ? datos.slice(rg[1], rg[2] + 1) : datos, error: null }).then(res, rej);
    };
    return q;
  }
  window.supabase = { createClient: function(){ return {
    auth: { onAuthStateChange: function(){} },
    from: function(t){ return mk(t, 'GP2'); },
    schema: function(s){ return { from: function(t){ return mk(t, s); } }; },
    rpc: async function(n, a){ window.__rpcs.push({ n: n, a: a }); return { data: null, error: null }; }
  }; } };
  window.Chart = function(ctx, cfg){ window.__chart = cfg; this.destroy = function(){}; };
})();`;

(async () => {
  const ok = (c, msg) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + msg); if (!c) process.exitCode = 1; };
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const page = await browser.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  page.on('dialog', d => d.accept());
  await page.route('**/@supabase/supabase-js@2', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/chart.umd.min.js', r => r.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.route('**/GP2_favicon.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
  await page.addInitScript(() => { try { localStorage.removeItem('gp2_tiempos_fuente'); } catch (e) {} });

  // el rango por defecto es "este mes": se amplia para que entren las fechas de prueba (octubre y septiembre 2026)
  const cargarRango = async () => {
    await page.fill('#fDesde', '2026-09-01'); await page.fill('#fHasta', '2026-10-31');
    await page.click('#btnCargar');
    await page.waitForFunction(() => !document.querySelector('#tbody .msg'));
  };
  const fila = (mat) => page.evaluate((m) => {
    const tr = [...document.querySelectorAll('#tbody tr')].find(x => x.querySelector('td.mz-tag') && x.querySelector('td.mz-tag').getAttribute('data-reg') === m);
    return tr ? [...tr.cells].map(c => c.textContent.replace(/\s+/g, ' ').trim()) : null;
  }, mat);
  const consultas = () => page.evaluate(() => window.__consultas);
  const rpcs = () => page.evaluate(() => window.__rpcs);

  await page.goto(ROOT + '/Produccion/tiempos_GP2.html');
  await page.waitForFunction(() => document.querySelectorAll('#tbody tr').length > 0 && !document.querySelector('#tbody .msg'));
  await cargarRango();

  // ===== 1) fuente por defecto: GP2, sin tocar public =====
  let cs = await consultas();
  ok(cs.some(c => c.tabla === 'produccion' && c.esquema === 'GP2'), 'por defecto la produccion sale de GP2.produccion');
  ok(!cs.some(c => c.esquema === 'public' || c.tabla === 'db_n8n_espejo'), 'por defecto no se toca public');
  ok((await page.textContent('#pillFuente')).trim() === 'GP2', 'la etiqueta de la tarjeta dice GP2');
  ok(await page.$eval('#segFuente [data-fuente="gp2"]', b => !b.classList.contains('ghost')), 'el boton GP2 queda marcado');

  // ===== 2) Gauss y columnas =====
  let f207 = await fila('207');
  ok(f207 && f207[8] === '16,8', '207: Gauss 16,8 (era el promedio simple 69,2 con los registros irreales): ' + (f207 && f207[8]));
  ok(f207 && f207[10] === '15 / 18', '207: Reg 15 usados de 18: ' + (f207 && f207[10]));
  ok(f207 && f207[9].startsWith('+'), '207: el desvio se mide contra el Gauss (16,8 contra 13,6 = +): ' + (f207 && f207[9]));
  const f3 = await fila('3'), f3b = await fila('3B');
  ok(f3 && f3[8] === '2,6' && f3b && f3b[8] === '2,6', '3 y 3B: el mismo Gauss 2,6, calculado con los tiempos de las dos: ' + (f3 && f3[8]) + ' / ' + (f3b && f3b[8]));
  ok(f3 && f3[10] === '5 / 5' && f3b && f3b[10] === '5 / 5', '3 y 3B: Reg 5 / 5 (los registros de las dos juntos)');
  ok(f3 && f3[0].includes('+1') && f3b && f3b[0].includes('+1'), '3 y 3B llevan el +1 de variantes');
  const f325 = await fila('325'), f325b = await fila('325B');
  ok(f325 && f325[8] === '16,0' && f325b && f325b[8] === '27,6', '325 y 325B NO se juntan (16,0 y 27,6): ' + (f325 && f325[8]) + ' / ' + (f325b && f325b[8]));
  ok(f325 && !f325[0].includes('+1'), '325 no lleva +1');
  const f900 = await fila('900'), f901 = await fila('901');
  ok(f900 && f900[8].includes('⚠'), '900: mediana ~10 contra tiempo cargado 100 => ⚠ revisar: ' + (f900 && f900[8]));
  ok(await page.$eval('td.gauss-cell[data-gra="901"]', td => td.classList.contains('pocos')), '901: 2 operario-dia => numero en gris (pocos datos)');
  ok(await page.$eval('td.gauss-cell[data-gra="901"]', td => !td.textContent.includes('⚠')), '901: pocos datos no lleva ⚠');

  // ===== 3) ventana de registros =====
  await page.click('td.mz-tag[data-reg="207"]');
  ok(await page.$eval('#ovReg', e => e.classList.contains('on')), 'click en el numero de matriz abre la ventana de registros');
  ok(await page.$eval('#thVar', e => getComputedStyle(e).display === 'none'), '207 no tiene variantes: sin columna Var');
  ok((await page.$$('#regBody tr.excluido')).length === 3, '207: 3 registros excluidos automaticos, tachados en gris');
  const motivos = await page.$$eval('#regBody tr.excluido', trs => trs.map(t => t.title));
  ok(motivos.some(m => m.includes('Uni 0')) && motivos.some(m => m.includes('mediana')) && motivos.some(m => m.includes('campana')), 'cada excluido dice su motivo: ' + motivos.map(m => m.replace('Excluido automáticamente del Gauss: ', '')).join(' | '));
  ok((await page.textContent('#regStats')).includes('15 / 18'), 'la cabecera dice 15 / 18 usados');
  await page.click('#regCerrar');
  await page.click('td.mz-tag[data-reg="3B"]');
  ok(await page.$eval('#thVar', e => getComputedStyle(e).display !== 'none'), '3B tiene variantes: aparece la columna Var');
  const vars = await page.$$eval('#regBody tr', trs => trs.map(t => t.cells[0].textContent));
  ok(vars.length === 5 && vars.filter(v => v === '3').length === 3 && vars.filter(v => v === '3B').length === 2, 'la ventana de 3B trae los 5 registros de 3 y 3B: ' + vars.join(','));

  // ===== 4) anular ACTIVADO en GP2: manda lo que el registro ya tenia y cambia solo p_anular =====
  ok((await page.$$('#regBody .eye-btn:not([disabled])')).length === 5, 'anular activado: los 5 botones habilitados en GP2');
  await page.click('#regBody tr:first-child .eye-btn');
  await page.waitForFunction(() => window.__rpcs.length === 1);
  const rp = (await rpcs())[0];
  ok(rp.n === 'anular_produccion' && rp.a.p_anular === true, 'anular llama a anular_produccion con p_anular=true');
  ok(rp.a.p_hora_inicio === '08:00:00' && rp.a.p_hora_fin === '09:00:00' && rp.a.p_seg_tiempo_muerto === 0 && rp.a.p_seg_historico === 0 && rp.a.p_premio === 0 &&
     typeof rp.a.row_id === 'number' && rp.a.p_uni === 1000, 'no pisa los otros campos del registro (los manda como estaban): ' + JSON.stringify(rp.a));
  ok((await page.$$('#regBody tr.anulado')).length === 1, 'el registro anulado se ve tachado');
  ok(!(await page.textContent('#regStats')).includes('5 / 5'), 'el anulado sale del Gauss (ya no dice 5 / 5)');
  await page.click('#regBody tr.anulado .eye-btn');
  await page.waitForFunction(() => window.__rpcs.length === 2);
  ok((await rpcs())[1].a.p_anular === false, 'reactivar manda p_anular=false');
  await page.click('#regCerrar');

  // ===== 5) campana =====
  await page.click('td.gauss-cell[data-gra="207"]');
  await page.waitForFunction(() => window.__chart);
  const ch = await page.evaluate(() => ({ puntos: window.__chart.data.datasets[1].data.length, excl: window.__chart.data.datasets[1].data.filter(p => p.excluido).length, curva: window.__chart.data.datasets[0].data.length }));
  ok(ch.puntos === 18 && ch.excl === 3 && ch.curva === 161, 'campana de 207: 18 puntos, 3 excluidos en gris, curva de 161 puntos: ' + JSON.stringify(ch));
  ok((await page.textContent('#graStats')).includes('16,78'), 'la campana muestra el Gauss 16,78');
  await page.click('#graCerrar');

  // ===== 6) boton de fuente: Gestion Productiva Entero (solo lectura) =====
  const antes = (await consultas()).length;
  await page.click('#segFuente [data-fuente="entero"]');
  await page.waitForFunction((n) => window.__consultas.length > n && !document.querySelector('#tbody .msg'), antes);
  await page.waitForFunction(() => document.querySelector('#notaFuente').textContent.includes('db_n8n_espejo'));
  cs = (await consultas()).slice(antes);
  const ent = cs.filter(c => c.tabla === 'db_n8n_espejo');
  ok(ent.length === 3 && ent.every(c => c.esquema === 'public'), 'Entero: lee public.db_n8n_espejo con .schema(public), en 3 paginas de 1000 (2.340 registros): ' + ent.length + ' pedidos');
  ok(!cs.some(c => c.tabla === 'produccion'), 'Entero: ya no lee GP2.produccion');
  ok(ent.every(c => c.filtros.some(x => x[0] === 'neq' && x[1] === 'Legajo' && x[2] === '1') && c.filtros.some(x => x[0] === 'gt' && x[1] === 'Uni')), 'Entero: sin el legajo 1 (Pruebas) y con Uni > 0');
  ok((await page.textContent('#pillFuente')).includes('ENTERO'), 'la etiqueta dice ENTERO · solo lectura');
  ok(await page.evaluate(() => localStorage.getItem('gp2_tiempos_fuente')) === 'entero', 'la eleccion queda guardada');
  f207 = await fila('207');
  ok(f207 && f207[8] === '16,8' && f207[10] === '15 / 18', 'Entero: los mismos datos dan el mismo Gauss 16,8 (columnas con mayuscula normalizadas)');
  const f900e = await fila('900');
  ok(f900e && f900e[4] === '2.304', 'Entero: 900 tiene 2.304 producciones (4 + 2.300 masivas): ' + (f900e && f900e[4]));
  // anular apagado en Entero
  await page.click('td.mz-tag[data-reg="207"]');
  ok((await page.$$('#regBody .eye-btn:not([disabled])')).length === 0, 'Entero: todos los botones de anular deshabilitados (solo lectura)');
  await page.$eval('#regBody .eye-btn', b => { b.disabled = false; b.click(); });
  await page.waitForTimeout(200);
  ok((await rpcs()).length === 2, 'Entero: aunque se fuerce el click no se llama a ninguna RPC (siguen las 2 de GP2)');
  ok((await page.textContent('#toast')).includes('Solo lectura'), 'Entero: el click forzado avisa "Solo lectura" en vez de anular');
  await page.click('#regCerrar');

  // ===== 7) volver a GP2 =====
  const antes2 = (await consultas()).length;
  await page.click('#segFuente [data-fuente="gp2"]');
  await page.waitForFunction((n) => window.__consultas.slice(n).some(c => c.tabla === 'produccion'), antes2);
  ok((await page.textContent('#pillFuente')).trim() === 'GP2', 'volver a GP2: la etiqueta vuelve a GP2');

  // ===== 8) la eleccion guardada se respeta al reabrir =====
  await page.evaluate(() => localStorage.setItem('gp2_tiempos_fuente', 'entero'));
  await page.addInitScript(() => { try { localStorage.setItem('gp2_tiempos_fuente', 'entero'); } catch (e) {} });
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#pillFuente').textContent.includes('ENTERO'));
  ok(true, 'al reabrir, la pantalla arranca en la fuente que se eligio');

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
