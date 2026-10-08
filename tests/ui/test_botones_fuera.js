const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
// Raiz del repo (los tests viven en tests/ui/) y Chromium portable si existe.
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
// 2026-10-08: la tablet es COPIA de Registro Producción 3.0 (código de la TV + pase + reg_prod_3_0). Supabase simulado:
// el código de la TV da el pase y el catálogo trae rollos_activos (sin eso Eduardo no tiene CT, igual que en 3.0).
const BUNDLE = { empleados: { '19': { nombre: 'Eduardo B', activo: true } }, matrices: [], matriz_fleje: {}, matriz_salidas: {},
                 rollos_saldo: [], rollos_abiertos: {}, rollos_activos: true, rollos_antiduplicado: true };
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };
const mockBase = r => {
  const req = r.request();
  if (req.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
  const fn = (req.url().match(/\/rpc\/(\w+)/) || [])[1] || '';
  const body = fn === 'reg_prod_3_0_cerv_ingresar' ? { ok: true, pase: 'PASE.T', vence: new Date(Date.now() + 3600e3).toISOString() }
             : fn === 'reg_prod_3_0_bundle' ? BUNDLE : { ok: true };
  return r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(body) });
};
(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ok = (c,m)=>{ console.log((c?'OK  ':'FAIL')+' '+m); if(!c) process.exitCode=1; };

  // 1) app operarios: RD/CM/REM fuera, el resto sigue
  let page = await browser.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  await page.route('**/*.supabase.co/**', mockBase);
  await page.goto(ROOT + '/Produccion/RegistroApp/Operarios_GP2.html');
  await page.waitForSelector('#tvClaveModal', { state: 'visible' });        // primero el código de la TV
  await page.fill('#tvClaveInput', '1234');
  await page.click('#tvClaveOk');
  await page.waitForSelector('#tvClaveModal', { state: 'detached' });
  await page.waitForFunction(() => typeof D !== 'undefined' && !!(D.empleados && D.empleados['19']));
  await page.fill('#legajoInput', '19');
  await page.click('#btnContinuar');
  await page.waitForSelector('.box[data-code="E"]');
  const codes = await page.$$eval('.box', xs => xs.map(x => x.dataset.code));
  ok(!codes.includes('RD') && !codes.includes('CM') && !codes.includes('REM'), 'RD/CM/REM fuera: ' + codes.join(','));
  ['E','C','PB','BC','MOV','LIMP','Perm','AL','PR','PC','MOV P','PM','RM','CT'].forEach(c =>
    ok(codes.includes(c), 'sigue ' + c));
  await page.close();

  // 2) menu: sin Stock Online / Informes Virgilio / Prov AT candados
  const fakeJwt = () => {
    const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    return b64({alg:'none'})+'.'+b64({exp: Math.floor(Date.now()/1000)+3600})+'.x';
  };
  const ctx = await browser.newContext();
  page = await ctx.newPage();
  await page.addInitScript(jwt => {
    sessionStorage.setItem('gp_auth','ok'); sessionStorage.setItem('gp_role','admin');
    localStorage.setItem('sb-hrxfctzncixxqmpfhskv-auth-token', JSON.stringify({access_token: jwt, refresh_token: 'r-test'}));
  }, fakeJwt());
  // v1.196.0: Prov AT quedo oculto del menu normal; se mira en la vista completa (?todos=1)
  await page.goto(ROOT + '/GP2_MODULOS.html?todos=1');
  await page.waitForSelector('.card');
  const t = await page.textContent('body');
  ok(!t.includes('Stock Online'), 'sin Stock Online duplicado');
  ok(!t.includes('Informes Virgilio'), 'sin Informes Virgilio');
  ok(!t.includes('Entrega Art. Terminado'), 'sin Entrega Art. Terminado');
  const provAT = await page.$$eval('.card', cards => {
    const c = cards.find(x => x.textContent.includes('Prov. Art. Terminado'));
    return c ? c.textContent : '';
  });
  // El grupo arranco con un candado "Control" a la app vieja, que se saco en
  // v1.23.0 ("el online ya esta en Stocks General"). Desde 2026-08-30 hay un
  // modulo GP2 propio (ControlAT_GP2.html), asi que Control vuelve — pero como
  // pantalla GP2, no como candado. Lo que el test cuida es eso ultimo.
  ok(provAT.includes('Envío Cartón/Cajas'), 'Prov AT conserva Envío Cartón/Cajas');
  ok(!/🔒/.test(provAT), 'Prov AT sin candados a la app vieja: ' + provAT.replace(/\s+/g,' ').trim());
  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
