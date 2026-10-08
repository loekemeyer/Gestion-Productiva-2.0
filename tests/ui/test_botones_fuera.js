const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
// Raiz del repo (los tests viven en tests/ui/) y Chromium portable si existe.
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
// 2026-10-08: la tablet es COPIA de Registro Producción 3.0 (código de la TV + pase + reg_prod_3_0). Supabase simulado:
// el código de la TV da el pase y el catálogo trae rollos_activos (sin eso el alimentador no tiene CT, igual que en 3.0).
// Desde 3.0 v3.1.9 cada operario ve los botones de SU TIPO, como Registro Producción 2.0 (capsDe + botonVisible con los permisos de
// public."Empleados") [Elías, 08/10: «12: 2.0, pensé que ya se había integrado completo, y no sólo para Eduardo»]. Reemplaza al
// «RD/CM/REM fuera, todos ven lo mismo» del 2026-08-29: RD y CM son del alimentador, REM de matricería, MOV P de piedra.
const BUNDLE = { empleados: {
                   '19': { nombre: 'Eduardo B', activo: true, es_alimentador: true, ve_cm: true },
                   '999': { nombre: 'Operario Base', activo: true },
                   '92': { nombre: 'Piedra', activo: true, es_piedra: true },
                   '91': { nombre: 'Matricero', activo: true, es_matriceria: true, ve_cm: true, ve_trm: true, ve_tl: true, ve_rem: true } },
                 matrices: [], matriz_fleje: {}, matriz_salidas: {},
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

  // 1) app operarios: cada tipo de operario ve SUS botones (como 2.0)
  let page = await browser.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  await page.route('**/*.supabase.co/**', mockBase);
  await page.goto(ROOT + '/Produccion/RegistroApp/Operarios_GP2.html');
  await page.waitForSelector('#tvClaveModal', { state: 'visible' });        // primero el código de la TV
  await page.fill('#tvClaveInput', '1234');
  await page.click('#tvClaveOk');
  await page.waitForSelector('#tvClaveModal', { state: 'detached' });
  await page.waitForFunction(() => typeof D !== 'undefined' && !!(D.empleados && D.empleados['19']));
  const botonesDe = async (leg) => {
    await page.fill('#legajoInput', leg);
    await page.click('#btnContinuar');
    await page.waitForSelector('#optionsScreen:not(.hidden)');
    const v = await page.$$eval('.box', xs => xs.map(x => x.dataset.code));
    await page.click('#btnBackTop');
    return v.sort().join(',');
  };
  const igual = (lista) => lista.slice().sort().join(',');
  const TIPOS = [
    ['999', 'operario base', ['E','C','PB','BC','MOV','LIMP','Perm','AL','PC','PM','RM','PCM']],
    ['19', 'alimentador (+ PR, RD, CM y CT del rollo)', ['E','C','PB','BC','MOV','LIMP','Perm','AL','PR','PC','RD','CM','PM','RM','PCM','CT']],
    ['92', 'piedra (MOV P en lugar de MOV)', ['E','C','PB','BC','LIMP','Perm','AL','PC','MOV P','PM','RM','PCM']],
    ['91', 'matricería (sólo TRM, TL, CM y REM)', ['TRM','TL','CM','REM']],
  ];
  for (const [leg, tipo, esperado] of TIPOS) {
    const v = await botonesDe(leg);
    ok(v === igual(esperado), tipo + ': ' + v);
  }
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
