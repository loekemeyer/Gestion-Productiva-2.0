/* test_monitor_ingreso.js — Monitor · Código de ingreso (copia la forma del Monitor de GT Admin)
 *
 * Lo que vigila (offline, Supabase stubeado):
 *  1. Pide el código con GP2.monitor_clave_actual (una RPC, nada de tablas) y lo muestra TAL CUAL:
 *     los ceros de adelante se conservan ("0042", no "42") y no lleva separador de miles ("1234").
 *  2. La rueda muestra los segundos que faltan y el arco acompaña (sobre 60).
 *  3. Cuando se cumple el minuto vuelve a pedir y cambia el código solo.
 *  4. Si la base falla: avisa, reintenta, y el código queda en «····» (no muestra uno viejo de memoria).
 *  5. Cuenta no habilitada (42501 con HTTP 403): lo dice y NO reintenta (reintentar no lo arregla).
 *  5b/5c. Pedido sin sesión (42501 con HTTP 401): NO dice «no habilitada»; reintenta 3 veces y pide entrar de nuevo.
 *  6. Está en el menú (Producción) y la RPC existe en db/funciones_GP2.sql.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const ROOT = 'file://' + ROOT_DIR.replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const PANTALLA = '/Produccion/MonitorIngreso/MonitorIngreso_GP2.html';

// El stub lee window.__modo (lo fija cada escenario antes de cargar la página).
const STUB = `
window.supabase = { createClient: function(){ return {
  from: function(){ throw new Error('esta pantalla NO lee tablas sueltas, va por la RPC'); },
  auth: { getSession: async function(){ window.__gs = (window.__gs || 0) + 1; return { data: { session: null } }; },
          refreshSession: async function(){ window.__rs = (window.__rs || 0) + 1; return { data: {}, error: null }; }, onAuthStateChange: function(){} },
  rpc: async function(n, args){
    window.__llamadas = (window.__llamadas || 0) + 1;
    window.__rpc = [n, args];
    var m = window.__modo;
    if (m === 'cae')   return { data: null, error: { message: 'boom' } };
    if (m === 'sinpermiso') return { data: null, error: { code: '42501', message: 'No autorizado' }, status: 403 };
    if (m === 'sinsesion')  return { data: null, error: { code: '42501', message: 'permission denied for function monitor_clave_actual' }, status: 401 };
    if (m === 'sesionvuelve') return window.__llamadas < 3 ? { data: null, error: { code: '42501', message: 'permission denied' }, status: 401 } : { data: { clave: '0042', cambia_en_s: 30 }, error: null };
    if (m === 'cambia') return { data: { clave: window.__llamadas === 1 ? '0042' : '1234', cambia_en_s: 1 }, error: null };
    return { data: { clave: '0042', cambia_en_s: 21 }, error: null };
  }
};}};
`;

let fallas = 0;
const ok = (c, msg) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + msg); if (!c) { fallas++; process.exitCode = 1; } };

async function abrir(browser, modo) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); fallas++; process.exitCode = 1; });
  await page.addInitScript(m => { window.__modo = m; window.GP2_ESPERA_SIN_SESION = 150; window.GP2_ESPERA_LARGA = 300; window.GP2_LATIDO_MS = 400;
    window.__wl = []; Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: async function(t){ window.__wl.push(t); return { release: function(){} }; } } }); }, modo);
  await page.route('**/@supabase/supabase-js@2', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/auth-guard.js**', r => r.fulfill({ contentType: 'application/javascript', body: 'window.GP2_AUTH_ON=false;' }));
  await page.route('**/GP2_favicon.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
  await page.goto(ROOT + PANTALLA);
  return page;
}

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});

  // 1 y 2) código, rueda
  let page = await abrir(browser, 'ok');
  await page.waitForFunction(() => document.getElementById('clave').textContent !== '····');
  ok((await page.textContent('#clave')) === '0042', 'el código se muestra tal cual, con el cero de adelante: ' + (await page.textContent('#clave')));
  const rpc = await page.evaluate(() => window.__rpc);
  ok(rpc[0] === 'monitor_clave_actual', 'llama a la RPC del schema GP2: ' + rpc[0]);
  await page.waitForTimeout(400);                       // la rueda se redibuja cada 250 ms
  const seg = Number(await page.textContent('#seg'));
  ok(seg >= 19 && seg <= 21, 'la rueda muestra los segundos que faltan: ' + seg);
  const off = Number(await page.evaluate(() => document.getElementById('arco').style.strokeDashoffset));
  ok(Math.abs(off - 263.9 * (1 - seg / 60)) < 0.5, 'el arco acompaña a los segundos (offset ' + off.toFixed(1) + ')');
  ok((await page.textContent('#estado')) === '', 'sin avisos cuando anda');
  await page.close();

  // 3) cada minuto pide de nuevo y cambia solo
  page = await abrir(browser, 'cambia');
  await page.waitForFunction(() => document.getElementById('clave').textContent === '0042');
  await page.waitForFunction(() => document.getElementById('clave').textContent === '1234', null, { timeout: 8000 });
  ok(true, 'al cumplirse el minuto pide de nuevo y cambia solo: 0042 -> ' + (await page.textContent('#clave')));
  ok((await page.evaluate(() => window.__llamadas)) >= 2, 'segunda llamada hecha');
  await page.close();

  // 4) la base falla
  page = await abrir(browser, 'cae');
  await page.waitForFunction(() => /No pude leer/.test(document.getElementById('estado').textContent));
  ok(/boom/.test(await page.textContent('#estado')), 'avisa y muestra el motivo: ' + (await page.textContent('#estado')));
  ok((await page.textContent('#clave')) === '····', 'sin código no muestra uno inventado');
  ok(await page.evaluate(() => document.getElementById('estado').classList.contains('err')), 'el aviso va en rojo');
  await page.close();

  // 5) cuenta no habilitada
  page = await abrir(browser, 'sinpermiso');
  await page.waitForFunction(() => /no está habilitada/.test(document.getElementById('estado').textContent));
  ok(true, 'cuenta no habilitada: lo dice');
  await page.waitForTimeout(1500);
  ok((await page.evaluate(() => window.__llamadas)) === 1, 'y no reintenta (una sola llamada)');
  ok((await page.textContent('#clave')) === '····', 'sin código a la vista');
  await page.close();

  // 5b) pedido SIN sesión (401): NO es «cuenta no habilitada»; reintenta 3 veces rápido, avisa, y SIGUE intentando (no se rinde)
  page = await abrir(browser, 'sinsesion');
  await page.waitForFunction(() => /Entrá de nuevo|entrá de nuevo/.test(document.getElementById('estado').textContent));
  const est = await page.textContent('#estado');
  ok(!/no está habilitada/.test(est) && /Se perdió la sesión/.test(est), 'sin sesión (401): no dice «cuenta no habilitada»: ' + est);
  ok(/login\.html\?next=/.test(await page.getAttribute('#estado a', 'href')), 'y el enlace lleva al login con ?next=');
  const l1 = await page.evaluate(() => window.__llamadas);
  await page.waitForTimeout(1200);
  const l2 = await page.evaluate(() => window.__llamadas);
  ok(l2 > l1, 'NO se rinde: sigue pidiendo aunque ya mostró el aviso (' + l1 + ' → ' + l2 + ' llamadas)');
  ok((await page.evaluate(() => window.__rs)) >= 3, 'intenta renovar la sesión en cada reintento (refreshSession ×' + (await page.evaluate(() => window.__rs)) + ')');
  await page.close();

  // 5c) la sesión vuelve en el 2.º reintento: se recupera sola y muestra el código
  page = await abrir(browser, 'sesionvuelve');
  await page.waitForFunction(() => document.getElementById('clave').textContent === '0042');
  ok((await page.textContent('#estado')) === '' && (await page.evaluate(() => window.__llamadas)) === 3, 'si la sesión vuelve, se recupera sola y limpia el aviso');
  await page.close();

  // 5d) ESTÁ TODO EL DÍA PRENDIDA [Elías 08/10]: guardián, latido de sesión, pantalla prendida
  page = await abrir(browser, 'ok');
  await page.waitForFunction(() => document.getElementById('clave').textContent === '0042');
  ok((await page.evaluate(() => window.__wl)).join() === 'screen', 'pide que la pantalla no se apague (Wake Lock «screen»)');
  const antesG = await page.evaluate(() => window.__llamadas);
  await page.evaluate(() => { clearTimeout(timer); proximo = Date.now() - 20000; });      // el navegador «perdió» el temporizador
  await page.waitForFunction(n => window.__llamadas > n, antesG, { timeout: 3000 });
  ok(true, 'el guardián relanza el pedido si el temporizador se perdió (' + antesG + ' → ' + (await page.evaluate(() => window.__llamadas)) + ' llamadas)');
  const gs1 = await page.evaluate(() => window.__gs || 0);
  await page.waitForTimeout(1300);
  ok((await page.evaluate(() => window.__gs || 0)) > gs1, 'el latido toca la sesión cada tanto para que el token se renueve');
  const antesO = await page.evaluate(() => window.__llamadas);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForFunction(n => window.__llamadas > n, antesO, { timeout: 3000 });
  ok(true, 'al volver la red pide de nuevo');
  await page.close();

  // 5e) cuenta no habilitada (403): el guardián tampoco insiste cada 15 s
  page = await abrir(browser, 'sinpermiso');
  await page.waitForFunction(() => /no está habilitada/.test(document.getElementById('estado').textContent));
  await page.evaluate(() => { window.GP2_GUARDIAN_MS = 100; });
  await page.waitForTimeout(1200);
  ok((await page.evaluate(() => window.__llamadas)) === 1, 'cuenta no habilitada: ni el guardián ni nada reintenta (1 llamada)');
  await page.close();

  await browser.close();

  // 6) menú y base
  const menu = fs.readFileSync(path.join(ROOT_DIR, 'GP2_MODULOS.html'), 'utf8');
  // va como pastilla del header (junto a las dos Tablet): una baldosa más en Herramientas hacía que
  // los 2 grupos dejaran de entrar en 375x600 (644 de 600), y en MENU_OCULTO sólo se vería con ?todos=1
  // v1.258.0 (sistema de diseño): la pastilla pasó a baldosa de acceso rápido con ícono y bajada aparte
  ok(/<a class="tablet-link" href="Produccion\/MonitorIngreso\/MonitorIngreso_GP2\.html">(?:(?!<\/a>).)*🔑(?:(?!<\/a>).)*Monitor/.test(menu), 'está en el menú: acceso «🔑 Monitor»');
  const fn = fs.readFileSync(path.join(ROOT_DIR, 'db', 'funciones_GP2.sql'), 'utf8');
  ok(/FUNCTION "GP2"\.monitor_clave_actual\(\)/.test(fn), 'db/funciones_GP2.sql tiene monitor_clave_actual');
  ok(/FUNCTION "GP2"\.monitor_clave_validar\(p_clave text\)/.test(fn), 'db/funciones_GP2.sql tiene monitor_clave_validar');
  const act = (fn.match(/FUNCTION "GP2"\.monitor_clave_actual\(\)[\s\S]*?end \$function\$/) || [''])[0];
  ok(/_exigir_autorizado\(\)/.test(act), 'monitor_clave_actual exige mail habilitado (no hay clave compartida)');

  console.log(fallas ? '\n' + fallas + ' falla(s)' : '\nTodo OK');
})().catch(e => { console.error(e); process.exit(1); });
