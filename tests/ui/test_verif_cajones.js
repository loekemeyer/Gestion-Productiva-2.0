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
      try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
      if (init && init.aviso) try { localStorage.setItem('gp2_verif_cajones_aviso', '1'); } catch (e) {}
    }, [resp, init || {}]);
    await page.goto(ROOT + '/' + url);
    return page;
  }
  const rpcs = (page, n) => page.evaluate((n) => window.__rpcs.filter(x => !n || x.n === n), n);
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
  const C1p = Object.assign({}, C1, { resultado: 'pesado', cajon_numero: 2, tara_kg: 1.97, peso_bruto_kg: 20.5, peso_neto_kg: 18.53, cargado_en: '2026-10-06T15:20:00-03:00' });
  await page.evaluate((b) => { window.__resp.verif_cajon_cargar = { data: b, error: null }; }, bundle(empezado, [C1p, C2]));
  await page.fill('#pb11', '20,5');
  await page.click('[data-guardar="11"]');
  await page.waitForFunction(() => !document.querySelector('#cn11'));
  const car = await rpcs(page, 'verif_cajon_cargar');
  ok(car.length === 1 && car[0].a.p_id === 11 && car[0].a.p_cajon === 2 && car[0].a.p_bruto_kg === 20.5 && car[0].a.p_no_encontrado === false,
     'Guardar manda el cajon y el peso tipeado con coma como numero (' + JSON.stringify(car[0] && car[0].a) + ')');
  const tr = await texto(page, '#caj11');
  ok(tr.includes('N° 2') && tr.includes('balanza 20,50 kg') && tr.includes('neto 18,53 kg'), 'muestra lo cargado: cajon, balanza y neto');

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
  ok((await texto(page, '#dia')).includes('Terminó15:30') && (await texto(page, '#dia')).includes('Tardó18 min'), 'al terminar el ultimo queda la hora de fin y cuanto tardo');
  ok((await texto(page, '#status')).includes('verificación terminada a las 15:30'), 'avisa que la verificacion termino');

  // ── 6. El tilde de la PC ───────────────────────────────────────────────────
  ok(!(await page.isChecked('#avisar')), 'arranca sin avisar en esta PC');
  await page.check('#avisar');
  ok(await page.evaluate(() => localStorage.getItem('gp2_verif_cajones_aviso') === '1'), 'tildarlo deja la PC avisada');
  ok(!(await page.$('#vcCartel')), 'en la pantalla del modulo el cartel no aparece');
  await page.close();

  // ── 7. Dia sin sorteo ──────────────────────────────────────────────────────
  page = await abrir('Produccion/VerificacionCajones/VerificacionCajones_GP2.html', { verif_cajones_bundle: { data: bundle(null, []), error: null } });
  await page.waitForFunction(() => document.getElementById('dia').textContent.length > 0);
  ok((await texto(page, '#dia')).includes('se sortean solos a las 15:00'), 'sin sorteo dice que se sortean solos a las 15:00');
  await page.close();

  // ── 8. El cartel del menu ──────────────────────────────────────────────────
  const MENU = { verif_cajones_bundle: { data: bundle(SORTEADO, [C1, C2]), error: null },
                 verif_cajones_empezar: { data: bundle(empezado, [C1, C2]), error: null } };
  page = await abrir('GP2_MODULOS.html', MENU);
  await page.waitForTimeout(600);
  ok(!(await page.$('#vcCartel')) && (await rpcs(page, 'verif_cajones_bundle')).length === 0, 'sin el tilde de la PC no pide nada a la base ni muestra el cartel');
  await page.close();

  page = await abrir('GP2_MODULOS.html', MENU, { aviso: true });
  await page.waitForSelector('#vcCartel');
  const cartel = await texto(page, '#vcCartel');
  ok(cartel.includes('Buscá y revisá estos cajones'), 'con el tilde aparece "Busca y revisa estos cajones"');
  ok(cartel.includes('Cajón 1') && cartel.includes('Cajón 2') && cartel.includes('840 uni') && cartel.includes('Sector Crudo') &&
     cartel.includes('entre 29,82 kg y 33,26 kg') && cartel.includes('11:52 a 13:00'), 'el cartel trae quien, hora, unidades, sector y peso de los dos');
  ok(cartel.includes('Barrionuevo <b>Eduardo</b> (leg. 19)'), 'el nombre va escapado en el cartel (se lee el texto, no se interpreta)');
  await page.click('#vcLuego');
  ok(!(await page.$('#vcCartel')) && await page.evaluate(() => Number(sessionStorage.getItem('gp2_verif_cajones_posponer')) > Date.now()), 'Mas tarde lo cierra y lo posterga');
  await page.evaluate(() => GP2VC.revisar());
  await page.waitForTimeout(200);
  ok(!(await page.$('#vcCartel')), 'postergado no vuelve a aparecer enseguida');
  await page.evaluate(() => { sessionStorage.clear(); return GP2VC.revisar(); });
  await page.waitForSelector('#vcCartel');
  await Promise.all([page.waitForURL(/VerificacionCajones_GP2\.html\?fecha=2026-10-06/, { timeout: 5000 }).catch(() => {}), page.click('#vcIr')]);
  ok(/VerificacionCajones_GP2\.html\?fecha=2026-10-06/.test(page.url()), 'Empezar del cartel lleva al modulo con la fecha del dia');
  const e2 = page.__log.filter(x => x.n === 'verif_cajones_empezar');
  ok(e2.length === 1 && e2[0].a.p_fecha === '2026-10-06', 'el boton Empezar del cartel registra el inicio con la fecha, antes de navegar');
  await page.close();

  const fin = Object.assign({}, SORTEADO, { empezado_en: '2026-10-06T15:12:00-03:00', terminado_en: '2026-10-06T15:30:00-03:00' });
  page = await abrir('GP2_MODULOS.html', { verif_cajones_bundle: { data: bundle(fin, [C1, C2]), error: null } }, { aviso: true });
  await page.waitForTimeout(600);
  ok(!(await page.$('#vcCartel')) && (await rpcs(page, 'verif_cajones_bundle')).length === 1, 'con el dia terminado consulta pero no muestra el cartel');
  await page.close();

  page = await abrir('GP2_MODULOS.html', { verif_cajones_bundle: { data: bundle(empezado, [C1, C2]), error: null } }, { aviso: true });
  await page.waitForSelector('#vcCartel');
  ok((await texto(page, '#vcIr')) === 'Seguir verificando', 'si ya empezo, el cartel ofrece seguir');
  await Promise.all([page.waitForURL(/VerificacionCajones_GP2/, { timeout: 5000 }).catch(() => {}), page.click('#vcIr')]);
  ok(/VerificacionCajones_GP2/.test(page.url()) && page.__log.filter(x => x.n === 'verif_cajones_empezar').length === 0, 'y seguir no vuelve a sellar el inicio');
  await page.close();

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
