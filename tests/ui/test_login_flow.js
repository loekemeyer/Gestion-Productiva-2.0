const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
// Raiz del repo (los tests viven en tests/ui/) y Chromium portable si existe.
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ok = (c,m)=>{ console.log((c?'OK  ':'FAIL')+' '+m); if(!c) process.exitCode=1; };

  const fakeJwt = () => {
    const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    return b64({alg:'none'})+'.'+b64({exp: Math.floor(Date.now()/1000)+3600})+'.x';
  };

  // 1) logueado: GP2_MODULOS renderiza el menu + Cerrar sesion
  let ctx = await browser.newContext();
  let page = await ctx.newPage();
  await page.addInitScript(jwt => {
    sessionStorage.setItem('gp_auth','ok'); sessionStorage.setItem('gp_role','admin');
    localStorage.setItem('sb-test-auth-token', JSON.stringify({access_token: jwt}));
  }, fakeJwt());
  await page.goto(ROOT + '/GP2_MODULOS.html');
  await page.waitForSelector('.card');
  ok(page.url().includes('GP2_MODULOS'), 'logueado se queda en el menu');
  ok(await page.$('a[href="login.html?logout=1"]') !== null, 'Cerrar sesion presente');
  ok((await page.$$eval('.card', x => x.length)) > 8, 'menu renderizado ('+(await page.$$eval('.card', x=>x.length))+' grupos)');
  await ctx.close();

  // 2) SIN login: GP2_MODULOS patea a login
  ctx = await browser.newContext();
  page = await ctx.newPage();
  await page.goto(ROOT + '/GP2_MODULOS.html');
  await page.waitForURL(/login\.html/);
  ok(page.url().includes('login.html'), 'sin login -> login.html');
  await ctx.close();

  // 3) Inicio/index.html logueado: redirige directo al menu
  ctx = await browser.newContext();
  page = await ctx.newPage();
  await page.addInitScript(jwt => {
    sessionStorage.setItem('gp_auth','ok'); sessionStorage.setItem('gp_role','admin');
    localStorage.setItem('sb-test-auth-token', JSON.stringify({access_token: jwt}));
  }, fakeJwt());
  await page.goto(ROOT + '/Inicio/index.html');
  await page.waitForURL(/GP2_MODULOS\.html/);
  ok(page.url().includes('GP2_MODULOS.html'), 'landing vieja redirige al menu');
  await ctx.close();

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
