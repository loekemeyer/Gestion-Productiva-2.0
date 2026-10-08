/* Verificacion de cajones (Produccion/VerificacionCajones/VerificacionCajones_GP2.html + gp2-verif-cajones.js).
   Pedido de Elias, 2026-10-06, para Alan Gonzalez: a las 15:00 se sortean 2 cajones de Cervantes y "le tiene que
   aparecer: busca y revisa los siguientes cajones" con quien, a que hora, cuantas unidades, en que sector, el peso
   que deberia tener y el peso por unidad (todo en kg). Se registra CUANDO empezo y CUANDO termino (no quien).
   Supabase STUBEADO: no toca la base. Verifica:
   - la tarjeta muestra los seis datos, con la regla de numero de la casa (coma decimal, rango, carga en kg);
   - sin "Empezar" no se puede cargar peso; Empezar manda verif_cajones_empezar con la fecha;
   - neto en vivo = balanza - tara del cajon elegido, y la diferencia contra lo esperado;
   - Guardar manda verif_cajon_cargar con el cajon y el peso tipeado con coma;
   - "No lo encontre" exige la nota (sin nota no llama a la base);
   - el cartel del menu: sin el tilde de la PC no pide nada a la base; con el tilde aparece, Empezar registra el
     inicio y "Mas tarde" lo posterga; con el dia terminado no aparece. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const C1 = { id: 11, fecha: '2026-10-06', espejo_id: 900, legajo: '19', operario: 'Barrionuevo <b>Eduardo</b>', matriz: '12',
  nombre_matriz: 'Corte Arandela', uni: 840, carga_en: 'unidades', hora_inicio: '11:52:41', hora_fin: '13:00:01',
  piezas: [{ codigo: 'PC10', kg_x_uni: 0.0355, sector: 'Sector Crudo' }, { codigo: 'PC11', kg_x_uni: 0.0396, sector: 'Sector Crudo' }],
  kg_x_uni_min: 0.0355, kg_x_uni_max: 0.0396, kg_esperado_min: 29.82, kg_esperado_max: 33.264, sectores: 'Sector Crudo',
  resultado: null, cajon_numero: null, tara_kg: null, peso_bruto_kg: null, peso_neto_kg: null, cargado_en: null, nota: null };
const C2 = { id: 12, fecha: '2026-10-06', espejo_id: 901, legajo: '233', operario: 'David Ayala', matriz: '501',
  nombre_matriz: 'Afilado', uni: 5.6, carga_en: 'kg', hora_inicio: '08:26:43', hora_fin: '17:26:46', piezas: [],
  kg_x_uni_min: 0.0043, kg_x_uni_max: 0.0043, kg_esperado_min: 5.6, kg_esperado_max: 5.6, sectores: 'Sector Procesado',
  resultado: null, cajon_numero: null, tara_kg: null, peso_bruto_kg: null, peso_neto_kg: null, cargado_en: null, nota: null };
// Envasado: 250 uni / 12 por caja = 20 cajas + 10 sueltas (C3). C4: matriz sin ruta con terminado en GP2 (sin unidades por caja).
const ENV = { es_envasado: true, kg_x_uni_min: null, kg_x_uni_max: null, kg_esperado_min: null, kg_esperado_max: null, carga_en: 'unidades',
  resultado: null, cajon_numero: null, tara_kg: null, peso_bruto_kg: null, peso_neto_kg: null, cargado_en: null, nota: null,
  cajas_contadas: null, sueltas_contadas: null };
const C3 = Object.assign({ id: 31, fecha: '2026-10-06', espejo_id: 910, legajo: '74', operario: 'Franco Ortiz', matriz: '389', nombre_matriz: 'Env Ñoquera',
  uni: 250, hora_inicio: '09:53:30', hora_fin: '14:01:27', sectores: 'Terminado', uni_x_caja_min: 12, uni_x_caja_max: 12,
  cajas_esperadas_min: 20.833, cajas_esperadas_max: 20.833,
  piezas: [{ codigo: '207', uni_x_caja: 12 }, { codigo: '229', uni_x_caja: 12 }] }, ENV);
const C4 = Object.assign({ id: 32, fecha: '2026-10-06', espejo_id: 911, legajo: '233', operario: 'David Ayala', matriz: '514', nombre_matriz: 'Env Rallador Mini Imp.',
  uni: 228, hora_inicio: '08:41:58', hora_fin: '10:19:48', sectores: null, uni_x_caja_min: null, uni_x_caja_max: null,
  cajas_esperadas_min: null, cajas_esperadas_max: null, piezas: [] }, ENV);
const TARAS = [{ numero: 1, tara_kg: 1.7 }, { numero: 2, tara_kg: 1.97 }];
const bundle = (dia, cajones) => ({ fecha: '2026-10-06', hoy: '2026-10-06', dia, cajones, taras: TARAS,
  dias: dia ? [{ fecha: '2026-10-06', sorteado_en: dia.sorteado_en, empezado_en: dia.empezado_en, terminado_en: dia.terminado_en,
    cajones: cajones.length, resueltos: cajones.filter(c => c.resultado).length }] : [] });
const SORTEADO = { fecha: '2026-10-06', sorteado_en: '2026-10-06T15:00:02-03:00', empezado_en: null, terminado_en: null };

const STUB = `(function(){
  window.__rpcs = [];
  window.supabase = { createClient: function(){ return {
    auth: { onAuthStateChange: function(){} },
    from: function(){ throw new Error('esta pantalla no lee tablas'); },
    rpc: async function(n, a){
      window.__rpcs.push({ n: n, a: a });
      if (window.__registrarRpc) window.__registrarRpc(n, a);
      var r = (window.__resp || {})[n];
      if (typeof r === 'function') r = r(a);
      return r || { data: null, error: null };
    }
  }; } };
})();`;

(async () => {
  const ok = (c, msg) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + msg); if (!c) process.exitCode = 1; };
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});

  async function abrir(url, resp, init) {
    const page = await browser.newPage();
    page.__log = [];
    await page.exposeFunction('__registrarRpc', (n, a) => { page.__log.push({ n, a }); });
    page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
    await page.route('**/@supabase/supabase-js@2', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
    await page.route('**/pwa.js*', r => r.fulfill({ contentType: 'application/javascript', body: '' }));
    await page.route('**/GP2_favicon.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
    await page.addInitScript(([resp, init]) => {
      window.__resp = resp;
      window.__timers = []; var _si = window.setInterval; window.setInterval = function(f, t){ window.__timers.push(t); return _si.apply(window, arguments); };
      try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
    }, [resp, init || {}]);
    await page.goto(ROOT + '/' + url);
    return page;
  }
  const rpcs = (page, n) => page.evaluate((n) => (window.__rpcs || []).filter(x => !n || x.n === n), n);
  const texto = (page, sel) => page.$eval(sel, e => e.textContent.replace(/\s+/g, ' ').trim());

  // ── 1. La pantalla con el dia sorteado y sin empezar ───────────────────────
  const empezado = Object.assign({}, SORTEADO, { empezado_en: '2026-10-06T15:12:00-03:00' });
  let page = await abrir('Produccion/VerificacionCajones/VerificacionCajones_GP2.html', {
    verif_cajones_bundle: { data: bundle(SORTEADO, [C1, C2]), error: null },
    verif_cajones_empezar: { data: bundle(empezado, [C1, C2]), error: null },
  });
  await page.waitForSelector('#caj11');
  const t1 = await texto(page, '#caj11');
  ok(t1.includes('Barrionuevo <b>Eduardo</b> (leg. 19)') && !(await page.$('#caj11 .datos b')), 'quien lo hizo, con legajo y el nombre escapado');
  ok(t1.includes('11:52 a 13:00'), 'hora de inicio y fin (' + t1.match(/\d\d:\d\d a \d\d:\d\d/) + ')');
  ok(t1.includes('840 uni'), 'cuantas unidades');
  ok(t1.includes('Sector Crudo'), 'en que sector buscarlo');
  ok(t1.includes('entre 0,0355 kg y 0,0396 kg'), 'peso por unidad en kg, con rango si la matriz saca dos piezas');
  ok(t1.includes('entre 29,82 kg y 33,26 kg'), 'peso esperado en kg con coma decimal');
  ok(t1.includes('PC10 0,0355 kg · PC11 0,0396 kg'), 'lista las piezas cuando son mas de una');
  const t2 = await texto(page, '#caj12');
  ok(t2.includes('5,60 kg (se carga en kg)') && t2.includes('Unidades5,60 kg'), 'la 501 se carga en kg: lo cargado ES el peso esperado');
  ok(!(await page.$('#cn11')) && t1.includes('Apretá ▶ Empezar'), 'sin Empezar no hay formulario de peso');
  ok((await texto(page, '#dia')).includes('Sorteados15:00'), 'muestra la hora del sorteo');

  // ── 2. Empezar ─────────────────────────────────────────────────────────────
  await page.click('#btnEmpezar');
  await page.waitForSelector('#cn11');
  const emp = await rpcs(page, 'verif_cajones_empezar');
  ok(emp.length === 1 && emp[0].a.p_fecha === '2026-10-06', 'Empezar manda verif_cajones_empezar con la fecha del dia');
  ok((await texto(page, '#dia')).includes('Empezó15:12') && !(await page.$('#btnEmpezar')), 'queda la hora en que empezo y el boton desaparece');

  // ── 3. Neto en vivo ────────────────────────────────────────────────────────
  await page.selectOption('#cn11', '2');
  await page.fill('#pb11', '20,5');
  await page.dispatchEvent('#pb11', 'input');
  const vivo = await texto(page, '#vivo11');
  ok(vivo.includes('Neto: 18,53 kg'), 'neto = balanza - tara del cajon elegido (' + vivo + ')');
  ok(/diferencia -11,29 kg \(-37,9 %\)/.test(vivo), 'diferencia contra el borde mas cercano del rango esperado');
  await page.fill('#pb11', '1,5');
  await page.dispatchEvent('#pb11', 'input');
  ok((await texto(page, '#vivo11')).includes('mas que la tara') || (await texto(page, '#vivo11')).includes('más que la tara'), 'avisa si la balanza marca menos que la tara');

  // ── 4. Guardar ─────────────────────────────────────────────────────────────
  const C1p = Object.assign({}, C1, { resultado: 'pesado', cajon_numero: 2, tara_kg: 1.97, peso_bruto_kg: 20.5, peso_neto_kg: 18.53, planilla_coincide: true, cargado_en: '2026-10-06T15:20:00-03:00' });
  await page.evaluate((b) => { window.__resp.verif_cajon_cargar = { data: b, error: null }; }, bundle(empezado, [C1p, C2]));
  ok(!!(await page.$('#pl11')) && !(await page.isChecked('#pl11')), 'cada cajón tiene el tilde «Coincide con la Planilla de carga», sin tildar de entrada');
  const lp = await texto(page, 'label[for="pl11"]');
  ok(lp.includes('Planilla de carga') && lp.includes('840 uni'), 'el tilde dice qué tiene que decir el papel: las unidades del registro (' + lp + ')');
  await page.check('#pl11');
  await page.fill('#pb11', '20,5');
  await page.click('[data-guardar="11"]');
  await page.waitForFunction(() => !document.querySelector('#cn11'));
  const car = await rpcs(page, 'verif_cajon_cargar');
  ok(car.length === 1 && car[0].a.p_id === 11 && car[0].a.p_cajon === 2 && car[0].a.p_bruto_kg === 20.5 && car[0].a.p_no_encontrado === false && car[0].a.p_planilla_coincide === true,
     'Guardar manda el cajon y el peso tipeado con coma como numero (' + JSON.stringify(car[0] && car[0].a) + ')');
  const tr = await texto(page, '#caj11');
  ok(tr.includes('N° 2') && tr.includes('balanza 20,50 kg') && tr.includes('neto 18,53 kg'), 'muestra lo cargado: cajon, balanza y neto');
  ok(tr.includes('Planilla de carga: ✔ coincide'), 'el resultado dice que la planilla coincide');

  // ── 5. No lo encontre ──────────────────────────────────────────────────────
  await page.click('[data-noform="12"]');
  await page.click('[data-noenc="12"]');
  ok((await rpcs(page, 'verif_cajon_cargar')).length === 1 && (await texto(page, '#status')).includes('Escribí qué pasó'), 'sin nota no llama a la base');
  const C2n = Object.assign({}, C2, { resultado: 'no_encontrado', nota: 'no estaba en SP', cargado_en: '2026-10-06T15:30:00-03:00' });
  const terminado = Object.assign({}, empezado, { terminado_en: '2026-10-06T15:30:00-03:00' });
  await page.evaluate((b) => { window.__resp.verif_cajon_cargar = { data: b, error: null }; }, bundle(terminado, [C1p, C2n]));
  await page.fill('#nota12', 'no estaba en SP');
  await page.click('[data-noenc="12"]');
  await page.waitForFunction(() => !document.querySelector('#nota12'));
  const ne = (await rpcs(page, 'verif_cajon_cargar'))[1];
  ok(ne && ne.a.p_no_encontrado === true && ne.a.p_nota === 'no estaba en SP' && ne.a.p_cajon === null, 'no lo encontre manda la nota y sin cajon');
  ok(ne && !('p_planilla_coincide' in ne.a), 'y no manda el tilde de la planilla (no hay cajón que comparar)');
  ok((await texto(page, '#dia')).includes('Terminó15:30') && (await texto(page, '#dia')).includes('Tardó18 min'), 'al terminar el ultimo queda la hora de fin y cuanto tardo');
  ok((await texto(page, '#status')).includes('verificación terminada a las 15:30'), 'avisa que la verificacion termino');

  // ── 6. SIN tilde: el aviso es automático siempre [Elías 08/10: «el avisarme es automático siempre»] ─────
  ok(!(await page.$('#avisar')), 'ya no existe el tilde «Avisarme en esta PC»');
  ok(await page.evaluate(() => typeof GP2VC.avisoActivo === 'undefined' && typeof GP2VC.setAviso === 'undefined'), 'ni las funciones del aviso por PC');
  ok(!(await page.$('#vcCartel')), 'en la pantalla del modulo el aviso no aparece');
  await page.close();

  // ── 7. Dia sin sorteo ──────────────────────────────────────────────────────
  page = await abrir('Produccion/VerificacionCajones/VerificacionCajones_GP2.html', { verif_cajones_bundle: { data: bundle(null, []), error: null } });
  await page.waitForFunction(() => document.getElementById('dia').textContent.length > 0);
  ok((await texto(page, '#dia')).includes('se sortean solos a las 15:00'), 'sin sorteo dice que se sortean solos a las 15:00');
  await page.close();

  // ── 8. El AVISO automático (banda) ──────────────────────────────────────────
  const HOST = 'tests/ui/fixtures/cajones_host.html';
  const MENU = { verif_cajones_bundle: { data: bundle(SORTEADO, [C1, C2]), error: null },
                 verif_cajones_empezar: { data: bundle(empezado, [C1, C2]), error: null } };

  // 8a. donde NO va: el menú de GP2 y el envios-only de GP2 no lo cargan [Elías 08/10: «SOLO … dentro de la Tablet Logística»]
  for (const pagina of ['GP2_MODULOS.html', 'envios-only.html']) {
    page = await abrir(pagina, MENU);
    await page.waitForTimeout(700);
    ok(!(await page.$('#vcCartel')) && (await rpcs(page, 'verif_cajones_bundle')).length === 0, pagina + ': no muestra el aviso ni pide nada a la base');
    await page.close();
  }

  // 8b. donde SÍ va: aparece SOLO, sin tilde ni nada guardado en la PC
  page = await abrir(HOST, MENU);
  await page.waitForSelector('#vcCartel');
  const cartel = await texto(page, '#vcCartel');
  ok(cartel.includes('Hay 2 cajones para verificar'), 'aparece solo, sin tilde: "Hay 2 cajones para verificar"');
  ok(await page.evaluate(() => localStorage.getItem('gp2_verif_cajones_aviso') === null), 'y no depende de nada guardado en la PC');
  await page.click('#vcLuego');
  ok(!(await page.$('#vcCartel')) && await page.evaluate(() => Number(sessionStorage.getItem('gp2_verif_cajones_posponer')) > Date.now()), 'la ✕ lo saca y lo posterga');
  await page.evaluate(() => GP2VC.revisar());
  await page.waitForTimeout(300);
  ok(!(await page.$('#vcCartel')), 'postergado no vuelve a aparecer enseguida');
  await page.evaluate(() => { sessionStorage.clear(); return GP2VC.revisar(); });
  await page.waitForSelector('#vcCartel');
  await Promise.all([page.waitForURL(/VerificacionCajones_GP2\.html\?fecha=2026-10-06&volver=tablet/, { timeout: 5000 }).catch(() => {}), page.click('#vcIr')]);
  ok(/VerificacionCajones_GP2\.html\?fecha=2026-10-06&volver=tablet/.test(page.url()), 'Empezar lleva al modulo con la fecha del dia y su «Atrás» vuelve a la tablet');
  const e2 = page.__log.filter(x => x.n === 'verif_cajones_empezar');
  ok(e2.length === 1 && e2[0].a.p_fecha === '2026-10-06', 'y registra el inicio con la fecha, antes de navegar');
  await page.close();

  const fin = Object.assign({}, SORTEADO, { empezado_en: '2026-10-06T15:12:00-03:00', terminado_en: '2026-10-06T15:30:00-03:00' });
  page = await abrir(HOST, { verif_cajones_bundle: { data: bundle(fin, [C1, C2]), error: null } });
  await page.waitForTimeout(700);
  ok(!(await page.$('#vcCartel')) && (await rpcs(page, 'verif_cajones_bundle')).length >= 1, 'con el dia terminado consulta pero no muestra el aviso');
  await page.close();

  page = await abrir(HOST, { verif_cajones_bundle: { data: bundle(empezado, [C1, C2]), error: null } });
  await page.waitForSelector('#vcCartel');
  ok((await texto(page, '#vcIr')) === 'Seguir verificando', 'si ya empezo, el aviso ofrece seguir');
  await Promise.all([page.waitForURL(/VerificacionCajones_GP2/, { timeout: 5000 }).catch(() => {}), page.click('#vcIr')]);
  ok(/VerificacionCajones_GP2/.test(page.url()) && page.__log.filter(x => x.n === 'verif_cajones_empezar').length === 0, 'y seguir no vuelve a sellar el inicio');
  await page.close();

  // 8c. cuenta SOLO los pendientes (con 2 por operario hay muchos y se van resolviendo)
  const C1h = Object.assign({}, C1, { resultado: 'pesado', cajon_numero: 3, tara_kg: 1.5, peso_bruto_kg: 31, peso_neto_kg: 29.5, cargado_en: '2026-10-06T15:20:00-03:00' });
  page = await abrir(HOST, { verif_cajones_bundle: { data: bundle(empezado, [C1h, C2, C3, C4]), error: null } });
  await page.waitForSelector('#vcCartel');
  ok((await texto(page, '#vcCartel')).includes('Hay 3 cajones para verificar'), 'con 4 cajones y 1 ya pesado dice "Hay 3 cajones para verificar"');
  await page.close();

  // 8d. SÓLO en la pantalla principal [Elías 08/10: «si está en medio de algo en la tablet se espera a que termine»]
  page = await abrir(HOST, MENU, {});
  await page.waitForSelector('#vcCartel');
  await page.evaluate(() => { window.__libre = false; window.GP2VC_LIBRE = () => window.__libre; });
  await page.waitForFunction(() => !document.getElementById('vcCartel'), null, { timeout: 5000 });
  ok(await page.evaluate(() => sessionStorage.getItem('gp2_verif_cajones_posponer') === null), 'en medio de algo se ESCONDE la banda sin posponerla');
  ok(await page.evaluate(() => document.body.style.paddingBottom === ''), 'y la página recupera el espacio reservado');
  await page.waitForTimeout(2600);
  ok(!(await page.$('#vcCartel')), 'mientras sigue en medio de algo no aparece');
  await page.evaluate(() => { window.__libre = true; });
  await page.waitForSelector('#vcCartel', { timeout: 5000 });
  ok(true, 'al volver a la pantalla principal reaparece sola');
  await page.close();

  page = await abrir(HOST, MENU, {});
  await page.waitForSelector('#vcCartel');
  await page.evaluate(() => { window.GP2VC_LIBRE = () => false; });
  await page.waitForFunction(() => !document.getElementById('vcCartel'), null, { timeout: 5000 });
  await page.evaluate(() => { sessionStorage.clear(); return GP2VC.revisar(); });
  await page.waitForTimeout(500);
  ok(!(await page.$('#vcCartel')), 'si la base se vuelve a leer en medio de algo tampoco se muestra');
  await page.close();

  // ── 9. ENVASADO: no se pesa, se cuentan cajas ──────────────────────────────
  const C3c = Object.assign({}, C3, { resultado: 'contado', cajas_contadas: 19, sueltas_contadas: 0, planilla_coincide: false, cargado_en: '2026-10-06T15:20:00-03:00' });
  page = await abrir('Produccion/VerificacionCajones/VerificacionCajones_GP2.html', {
    verif_cajones_bundle: { data: bundle(empezado, [C3, C4]), error: null },
    verif_cajon_cargar: { data: bundle(empezado, [C3c, C4]), error: null },
  });
  await page.waitForSelector('#caj31');
  const e1 = await texto(page, '#caj31');
  ok(e1.includes('Envasado: se cuenta, no se pesa'), 'el envasado dice que se cuenta y no se pesa');
  ok(e1.includes('Total que hizo250 uni') && e1.includes('Unidades por caja12 uni'), 'muestra el total que hizo y las unidades por caja');
  ok(e1.includes('Cajas que debería haber20 cajas (+ 10 uni sueltas)'), 'cajas esperadas: 250 / 12 = 20 cajas enteras (+ 10 uni sueltas que no se cuentan)');
  ok(e1.includes('207 12 x caja · 229 12 x caja'), 'lista los artículos que cierra la matriz con su cantidad por caja');
  ok(!e1.includes('Debería pesar') && !e1.includes('Peso por unidad') && !(await page.$('#cn31')) && !(await page.$('#pb31')), 'el envasado no pide peso ni tara');
  ok(!!(await page.$('#cj31')) && !(await page.$('#su31')), 'pide SOLO las cajas contadas (sin unidades sueltas)');
  await page.click('[data-guardar-env="31"]');
  ok((await texto(page, '#status')).includes('Cargá cuántas cajas contaste') && (await rpcs(page, 'verif_cajon_cargar')).length === 0, 'sin cajas no llama a la base');
  await page.fill('#cj31', '19'); await page.dispatchEvent('#cj31', 'input');
  const v3 = await texto(page, '#vivo31');
  ok(v3.includes('Contaste 19 cajas') && v3.includes('diferencia -1 cajas (-5,0 %)'), 'en vivo: cajas contadas contra las esperadas (' + v3 + ')');
  await page.fill('#cj31', '20'); await page.dispatchEvent('#cj31', 'input');
  ok((await texto(page, '#vivo31')).includes('diferencia 0 cajas'), 'con las cajas justas la diferencia es 0');
  await page.fill('#cj31', '19'); await page.dispatchEvent('#cj31', 'input');
  ok(!!(await page.$('#pl31')) && !(await page.isChecked('#pl31')), 'el envasado también tiene el tilde de la planilla');
  await page.click('[data-guardar-env="31"]');
  await page.waitForFunction(() => !document.querySelector('#cj31'));
  const g3 = await rpcs(page, 'verif_cajon_cargar');
  ok(g3.length === 1 && g3[0].a.p_id === 31 && g3[0].a.p_cajas === 19 && g3[0].a.p_no_encontrado === false &&
     !('p_sueltas' in g3[0].a) && !('p_cajon' in g3[0].a) && !('p_bruto_kg' in g3[0].a) && g3[0].a.p_planilla_coincide === false, 'Guardar manda sólo las cajas y el tilde (sin tildar = NO coincide), sin sueltas, cajón ni peso (' + JSON.stringify(g3[0] && g3[0].a) + ')');
  const r3 = await texto(page, '#caj31');
  ok(r3.includes('Contado') && r3.includes('19 cajas') && r3.includes('diferencia -1 cajas'), 'muestra lo contado y la diferencia en cajas');
  ok(r3.includes('Planilla de carga: ✖ NO coincide'), 'si no se tildó, el resultado dice NO coincide');
  // C4: la matriz no tiene unidades por caja en GP2
  const e4 = await texto(page, '#caj32');
  ok(e4.includes('Total que hizo228 uni') && e4.includes('Unidades por cajasin cargar en GP2'), 'sin dato en GP2 lo dice y muestra igual el total que hizo');
  ok(e4.includes('sin unidades por caja en GP2: contá las cajas igual'), 'y pide contar las cajas igual');
  await page.fill('#cj32', '19'); await page.dispatchEvent('#cj32', 'input');
  ok((await texto(page, '#vivo32')) === '', 'sin unidades por caja no inventa una diferencia');
  await page.close();

  // ── 10. La pantalla se actualiza sola ───────────────────────────────────────
  page = await abrir('Produccion/VerificacionCajones/VerificacionCajones_GP2.html', { verif_cajones_bundle: { data: bundle(null, []), error: null } });
  await page.waitForFunction(() => document.getElementById('dia').textContent.length > 0);
  ok((await page.evaluate(() => window.__timers)).some(t => t > 0 && t <= 60000), 'tiene un temporizador que vuelve a leer (cada 60 s o menos)');
  ok((await texto(page, '#dia')).includes('se sortean solos a las 15:00') && !(await page.$('#caj11')), 'antes de las 15:00 no hay cajones');
  await page.evaluate((b) => { window.__resp.verif_cajones_bundle = { data: b, error: null }; }, bundle(SORTEADO, [C1, C2]));
  await page.evaluate(() => refrescar());
  await page.waitForSelector('#caj11');
  ok((await texto(page, '#dia')).includes('Sorteados15:00') && !!(await page.$('#caj12')), 'a las 15:00 aparecen los cajones sin recargar la página');
  ok((await texto(page, '#auto')).includes('se actualizó sola a las'), 'avisa que se actualizó sola');
  // lo que llega igual no repinta: el foco y el scroll quedan donde están
  await page.evaluate(() => { document.getElementById('caj11').__marca = 1; });
  await page.evaluate(() => refrescar());
  ok(await page.evaluate(() => document.getElementById('caj11').__marca === 1), 'si no cambió nada, no repinta las tarjetas');
  ok((await texto(page, '#auto')).includes('última lectura'), 'y lo dice: última lectura');
  // lo que cargó otra PC se ve solo (Empezar)
  await page.evaluate((b) => { window.__resp.verif_cajones_bundle = { data: b, error: null }; }, bundle(empezado, [C1, C2]));
  await page.evaluate(() => refrescar());
  await page.waitForSelector('#cn11');
  ok((await texto(page, '#dia')).includes('Empezó15:12'), 'lo que hizo otra PC (Empezar) aparece solo');
  // NO pisa lo que se está escribiendo
  await page.fill('#pb11', '20,5');
  const antes = (await rpcs(page, 'verif_cajones_bundle')).length;
  await page.evaluate((b) => { window.__resp.verif_cajones_bundle = { data: b, error: null }; }, bundle(terminado, [C1p, C2n]));
  await page.evaluate(() => refrescar());
  ok((await rpcs(page, 'verif_cajones_bundle')).length === antes && (await page.inputValue('#pb11')) === '20,5', 'con algo tipeado sin guardar no repinta ni pide nada: no se pierde lo escrito');
  await page.close();

  page = await abrir('Produccion/VerificacionCajones/VerificacionCajones_GP2.html', { verif_cajones_bundle: { data: bundle(SORTEADO, [C1, C2]), error: null } });
  await page.waitForSelector('#caj11');
  await page.evaluate(() => { window.__resp.verif_cajones_bundle = { data: null, error: { message: 'sin red' } }; });
  await page.evaluate(() => refrescar());
  ok(!!(await page.$('#caj11')) && (await texto(page, '#auto')).includes('sin conexión'), 'si falla la lectura deja los cajones en pantalla y lo dice');
  await page.close();

  // un día pasado no cambia: no vuelve a pedir nada
  const pasado = Object.assign({}, bundle(empezado, [C1, C2]), { fecha: '2026-10-05' });
  page = await abrir('Produccion/VerificacionCajones/VerificacionCajones_GP2.html?fecha=2026-10-05', { verif_cajones_bundle: { data: pasado, error: null } });
  await page.waitForSelector('#caj11');
  await page.evaluate(() => refrescar());
  ok((await rpcs(page, 'verif_cajones_bundle')).length === 1, 'un día pasado no se vuelve a leer solo');
  await page.close();

  // ── 10. SE PUEDE SACAR: ✕ y Esc (Elías 07/10: "que se pueda sacar para no interrumpir lo que se está haciendo") ──
  const BUN = { verif_cajones_bundle: { data: bundle(SORTEADO, [C1, C2]), error: null },
                verif_cajones_empezar: { data: bundle(empezado, [C1, C2]), error: null } };
  page = await abrir(HOST, BUN);
  await page.waitForSelector('#vcCartel');
  await page.keyboard.press('Escape');
  ok(!(await page.$('#vcCartel')) && await page.evaluate(() => Number(sessionStorage.getItem('gp2_verif_cajones_posponer')) > Date.now()), 'Esc también lo saca y lo posterga');
  await page.close();

  // ── 11. La BANDA: no tapa lo que se está haciendo ────────────────────────────
  page = await abrir(HOST, BUN);
  await page.waitForSelector('#vcCartel');
  const banda = await page.evaluate(() => {
    const o = document.getElementById('vcCartel'), r = o.getBoundingClientRect();
    const arriba = document.elementFromPoint(window.innerWidth / 2, 60);
    return { pos: getComputedStyle(o).position, alto: r.height, bottom: r.bottom, w: r.width, iw: window.innerWidth, ih: window.innerHeight,
             tapaArriba: !!(arriba && o.contains(arriba)), pad: parseFloat(document.body.style.paddingBottom) || 0, texto: o.textContent.replace(/\s+/g, ' ').trim() };
  });
  ok(banda.pos === 'fixed' && banda.alto < 160 && banda.bottom > banda.ih - 20, 'es una banda abajo (' + Math.round(banda.alto) + ' px de alto), no un cartel grande');
  ok(banda.w < banda.iw && !banda.tapaArriba, 'no hay fondo oscuro ni tapa lo de arriba: se puede seguir tocando la tablet');
  ok(banda.texto.includes('Hay 2 cajones para verificar'), 'dice cuántos cajones hay');
  ok(banda.pad >= banda.alto, 'la página reserva el alto de la banda para no tapar lo de abajo (' + banda.pad + ' px)');
  ok((await texto(page, '#vcIr')) === '▶ Empezar', 'la banda ofrece Empezar');
  await page.click('#vcLuego');
  ok(await page.evaluate(() => document.body.style.paddingBottom === ''), 'al sacarla la página recupera el espacio que había reservado');
  await page.close();

  // la Tablet Logística: define cuándo está «libre» (pantalla principal), carga el aviso y NO el viejo modo con tilde
  const tab = fs.readFileSync(path.resolve(__dirname, '..', '..', 'Tablet', 'Tablet_GP2.html'), 'utf8');
  const iL = tab.indexOf('window.GP2VC_LIBRE = function'), iS = tab.indexOf('../gp2-verif-cajones.js');
  ok(iL > 0 && iS > iL, 'la Tablet Logística define GP2VC_LIBRE y después carga gp2-verif-cajones.js');
  ok(!/GP2VC_BANDA/.test(tab), 'y ya no usa la marca GP2VC_BANDA (la banda es la única forma)');
  ok(/\$\("fase0"\)[\s\S]{0,200}\$\("tipoGrid"\)/.test(tab.slice(iL, iS)), 'la pantalla principal es «#fase0 y #tipoGrid a la vista» (sin tipo elegido)');
  for (const f of ['GP2_MODULOS.html', 'envios-only.html', 'login.html']) {
    ok(!/gp2-verif-cajones\.js/.test(fs.readFileSync(path.resolve(__dirname, '..', '..', f), 'utf8').replace(/<!--[\s\S]*?-->/g, '')), f + ' no carga el aviso');
  }

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
