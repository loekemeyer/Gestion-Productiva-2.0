/* Guardia del SISTEMA DE DISEÑO (2026-10-08, DISENO_GP2.md).
 *
 * Existe porque GP2 llego a tener tres familias de estilo que no se parecian (gp2-modulo.css,
 * gp2-claro.css pisando con !important, y ~15 pantallas con CSS propio en Arial / "Inter" sin
 * cargar / fondo oscuro): cada modulo parecia de otro programa. El rediseño las unifico en UNA
 * hoja; este test impide que se vuelvan a separar sin que nadie lo note.
 *
 * Estatico (lee el repo):
 *   1. gp2-claro.css no existe y nadie lo carga.
 *   2. Toda pantalla carga gp2-modulo.css y la navegacion persistente (gp2-menu.js + gp2-nav.js).
 *   3. Ninguna pantalla escribe una familia tipografica propia (font-family / font: con nombre):
 *      la unica es Inter, via var(--font). Se permite monospace (codigos).
 *   4. Toda pantalla tiene la barra de la app (.header con un <h1>).
 *   5. El menu vive en UN lugar (gp2-menu.js), no copiado en GP2_MODULOS.html.
 *   6. La fuente auto-hospedada existe (no depende de Google).
 * En el navegador (Supabase stubeado, 1366 y 390 de ancho):
 *   7. El body se dibuja con Inter, la barra es la del sistema (pegada arriba, azul marino) y la
 *      pagina no scrollea de costado en el celular.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const RAIZ = path.resolve(__dirname, '..', '..');
const ROOT = 'file://' + RAIZ.replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
let fallas = 0;
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fallas++; };

// Fuera del sistema a proposito (ver DISENO_GP2.md): copia de Registro Produccion 3.0, pantallas
// muertas que miran public, y los redirects.
const FUERA = new Set([
  'Produccion/RegistroApp/Operarios_GP2.html', 'Produccion/InformesVirgilio/index.html',
  'Preavisos/index.html', 'Ventas Chat/index.html', 'index.html', 'Inicio/index.html',
]);
// Tienen su propia cabecera (portada y login): cargan el sistema pero no la barra ni el selector.
const SIN_BARRA = new Set(['GP2_MODULOS.html', 'login.html']);

const paginas = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (/(^|[\\/])(node_modules|\.git|tests)([\\/]|$)/.test(p)) continue;
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.html')) {
      const rel = path.relative(RAIZ, p).replace(/\\/g, '/');
      if (!FUERA.has(rel) && !f.startsWith('_backup')) paginas.push(rel);
    }
  }
})(RAIZ);
paginas.sort();

// 1) gp2-claro.css
ok(!fs.existsSync(path.join(RAIZ, 'gp2-claro.css')), 'gp2-claro.css no existe (una sola hoja: gp2-modulo.css)');
const conClaro = paginas.filter(p => /gp2-claro\.css/.test(fs.readFileSync(path.join(RAIZ, p), 'utf8').replace(/<!--[\s\S]*?-->|\/\*[\s\S]*?\*\//g, '')));
ok(conClaro.length === 0, 'ninguna pantalla carga gp2-claro.css' + (conClaro.length ? ' — ' + conClaro.join(', ') : ''));

// 2) hoja + navegacion
const sinHoja = [], sinNav = [];
for (const p of paginas) {
  const s = fs.readFileSync(path.join(RAIZ, p), 'utf8');
  if (!/<link[^>]+href="[^"]*gp2-modulo\.css\?v=[^"]+"/.test(s)) sinHoja.push(p);
  if (!SIN_BARRA.has(p) && !(/gp2-menu\.js\?v=/.test(s) && /gp2-nav\.js\?v=/.test(s) && s.indexOf('gp2-menu.js') < s.indexOf('gp2-nav.js'))) sinNav.push(p);
}
ok(sinHoja.length === 0, 'toda pantalla carga gp2-modulo.css (' + paginas.length + ')' + (sinHoja.length ? ' — faltan: ' + sinHoja.join(', ') : ''));
ok(sinNav.length === 0, 'toda pantalla carga gp2-menu.js y despues gp2-nav.js' + (sinNav.length ? ' — faltan: ' + sinNav.join(', ') : ''));

// 3) tipografia propia
const FAM = /font-family\s*:\s*([^;}"]+)/gi, SHORT = /(?:^|[;{\s"])font\s*:\s*([^;}"]+)/gi;
const NOMBRE = /(arial|helvetica|inter\b|segoe|roboto|system-ui|-apple-system|verdana|tahoma|georgia|times|sans-serif|serif\b)/i;
const tipos = [];
for (const p of paginas.concat(['OrdenProduccion/OrdenProduccion.css', 'tandas-popup.css'])) {
  const abs = path.join(RAIZ, p);
  if (!fs.existsSync(abs)) continue;
  let s = fs.readFileSync(abs, 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  if (p.endsWith('.html')) s = [...s.matchAll(/<style[^>]*>([\s\S]*?)<\/style>|style="([^"]*)"/gi)].map(m => m[1] || m[2] || '').join('\n');
  for (const re of [FAM, SHORT]) for (const m of s.matchAll(re)) {
    const v = m[1];
    if (/var\(--font\)|inherit|monospace/i.test(v)) continue;
    if (NOMBRE.test(v)) tipos.push(p + ' -> ' + m[0].trim().slice(0, 70));
  }
}
tipos.slice(0, 12).forEach(t => console.log('     ' + t));
ok(tipos.length === 0, 'ninguna pantalla escribe su propia tipografia: la unica es Inter (var(--font))');

// 4) barra
const sinBarra = paginas.filter(p => !SIN_BARRA.has(p) &&
  !/class="header[" ][\s\S]{0,600}?<h1/.test(fs.readFileSync(path.join(RAIZ, p), 'utf8')));
ok(sinBarra.length === 0, 'toda pantalla tiene la barra de la app (.header con <h1>)' + (sinBarra.length ? ' — faltan: ' + sinBarra.join(', ') : ''));

// 5) el menu en un lugar
const modulos = fs.readFileSync(path.join(RAIZ, 'GP2_MODULOS.html'), 'utf8');
const menuJs = fs.readFileSync(path.join(RAIZ, 'gp2-menu.js'), 'utf8');
ok(/GP2_MENU\s*=\s*\[/.test(menuJs) && !/\["Stock General",\s*"/.test(modulos) && /gp2-menu\.js\?v=/.test(modulos),
   'el menu vive solo en gp2-menu.js y GP2_MODULOS.html lo carga');

// 6) fuente local
const css = fs.readFileSync(path.join(RAIZ, 'gp2-modulo.css'), 'utf8');
const urls = [...css.matchAll(/url\((fonts\/[^)]+\.woff2)\)/g)].map(m => m[1]);
ok(urls.length >= 1 && urls.every(u => fs.existsSync(path.join(RAIZ, u))), 'Inter auto-hospedada en fonts/ (' + urls.join(', ') + ')');
ok(/--pri:/.test(css) && /--sel:/.test(css) && /--bar:/.test(css) && /--font:/.test(css), 'los tokens base estan en :root');

// 7) en el navegador
const STUB = `(function(){function c(){var p=new Proxy(function(){},{get:function(_,k){if(k==='then')return function(r){return Promise.resolve({data:[],error:null,count:0}).then(r)};return function(){return p}},apply:function(){return p}});return p}
window.supabase={createClient:function(){return{rpc:async function(n){return{data:null,error:{message:'stub: '+n}}},from:function(){return c()},schema:function(){return this},
auth:{getSession:async function(){return{data:{session:null}}},signOut:async function(){},onAuthStateChange:function(){}},channel:function(){return{on:function(){return this},subscribe:function(){return this}}}}}}})();`;
(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const malos = { fuente: [], barra: [], horizontal: [] };
  for (const vp of [{ w: 1366, h: 900 }, { w: 390, h: 844 }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    for (const rel of paginas) {
      const page = await ctx.newPage();
      await page.route('**/*', r => {
        const u = r.request().url();
        if (/@supabase\/supabase-js/.test(u)) return r.fulfill({ contentType: 'application/javascript', body: STUB });
        if (/auth-guard\.js/.test(u)) return r.fulfill({ contentType: 'application/javascript', body: 'window.GP2_AUTH_ON=false;' });
        if (/pwa\.js/.test(u)) return r.fulfill({ contentType: 'application/javascript', body: '' });
        if (u.startsWith('file://')) return r.continue();
        return r.abort();
      });
      try {
        await page.goto(ROOT + '/' + rel.split('/').map(encodeURIComponent).join('/'), { waitUntil: 'load', timeout: 15000 });
        await page.waitForTimeout(250);
        const m = await page.evaluate(() => {
          const h = document.querySelector('.header');
          const cs = h && getComputedStyle(h);
          return {
            fuente: getComputedStyle(document.body).fontFamily,
            barra: cs ? cs.position + ' ' + cs.backgroundColor : 'sin .header',
            horizontal: document.documentElement.scrollWidth - window.innerWidth,
          };
        });
        if (vp.w === 1366) {
          if (!/^"?Inter GP2/.test(m.fuente)) malos.fuente.push(rel + ' (' + m.fuente.slice(0, 40) + ')');
          if (!SIN_BARRA.has(rel) && m.barra !== 'sticky rgb(11, 24, 48)') malos.barra.push(rel + ' (' + m.barra + ')');
        } else if (m.horizontal > 1) malos.horizontal.push(rel + ' (+' + m.horizontal + 'px)');
      } catch (e) { malos.fuente.push(rel + ' (no abrio: ' + e.message.split('\n')[0] + ')'); }
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  ok(malos.fuente.length === 0, 'el body se dibuja con Inter en todas las pantallas' + (malos.fuente.length ? ' — ' + malos.fuente.join(', ') : ''));
  ok(malos.barra.length === 0, 'la barra es la del sistema (pegada arriba, azul marino)' + (malos.barra.length ? ' — ' + malos.barra.join(', ') : ''));
  ok(malos.horizontal.length === 0, 'a 390px ninguna pagina scrollea de costado' + (malos.horizontal.length ? ' — ' + malos.horizontal.join(', ') : ''));
  console.log(fallas ? 'HAY FALLOS' : 'TODO OK');
  if (fallas) process.exitCode = 1;
})();
