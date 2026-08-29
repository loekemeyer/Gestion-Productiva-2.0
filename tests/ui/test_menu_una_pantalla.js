const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

/* Requisito del usuario (2026-08-29): en el celular los grupos del menu tienen que
   entrar TODOS en una sola pantalla, con botones grandes y legibles, y sin texto que
   no sea un modulo. Este test lo fija: si manana alguien agrega un grupo o agranda
   algo y deja de entrar, salta aca en vez de descubrirlo en el telefono. */

const PANTALLAS = [
  { nom: 'iPhone 14 (app)', w: 390, h: 790 },   // instalada: sin barra del navegador
  { nom: 'pantalla baja',   w: 375, h: 600 },   // SE, o el navegador con su barra
];

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };

  for (const p of PANTALLAS) {
    const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
    // el login esta apagado y el service worker no hace falta para medir el layout
    await page.route('**/auth-guard.js*', r => r.fulfill({ contentType: 'application/javascript', body: 'window.GP2_AUTH_ON=false;' }));
    await page.route('**/pwa.js*', r => r.fulfill({ contentType: 'application/javascript', body: '' }));
    await page.goto(ROOT + '/GP2_MODULOS.html');
    await page.waitForSelector('.card');

    const m = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.card')];
      const titles = [...document.querySelectorAll('.card-head .title')];
      return {
        grupos: cards.length,
        fondo: Math.max(...cards.map(c => c.getBoundingClientRect().bottom)),
        alto_min: Math.min(...cards.map(c => c.getBoundingClientRect().height)),
        fuente_min: Math.min(...titles.map(t => parseFloat(getComputedStyle(t).fontSize))),
        horizontal: document.documentElement.scrollWidth > window.innerWidth,
        version: (document.getElementById('appVersion') || {}).textContent || '',
        foot: getComputedStyle(document.querySelector('.foot')).display,
        sub: (document.querySelector('.header-sub') || {}).textContent || '',
      };
    });

    ok(m.fondo <= p.h, `${p.nom}: los ${m.grupos} grupos entran en una pantalla (terminan en ${Math.round(m.fondo)} de ${p.h})`);
    ok(m.alto_min >= 44, `${p.nom}: cada grupo es tocable (${Math.round(m.alto_min)}px, minimo 44)`);
    ok(m.fuente_min >= 14, `${p.nom}: titulos legibles (${m.fuente_min}px)`);
    ok(!m.horizontal, `${p.nom}: sin scroll horizontal`);
    ok(/^v?\d+\.\d+\.\d+$/.test(m.version.trim()), `${p.nom}: muestra el numero de version (${m.version})`);
    ok(m.foot === 'none', `${p.nom}: el pie de pagina no ocupa lugar`);
    ok(!/pendientes de migraci/i.test(m.sub), `${p.nom}: sin el cartel viejo, solo la version`);

    // abrir un grupo: se ve SOLO ese, con sus botones anchos
    await page.click('.card-head:has-text("Producción")');
    await page.waitForTimeout(250);
    const abierto = await page.evaluate(() => {
      const ops = [...document.querySelectorAll('.card.open a.op')].map(a => a.getBoundingClientRect());
      return {
        solo: [...document.querySelectorAll('.card:not(.open)')].every(c => getComputedStyle(c).display === 'none'),
        n: ops.length,
        ancho: Math.min(...ops.map(r => r.width)),
        alto: Math.min(...ops.map(r => r.height)),
      };
    });
    ok(abierto.solo, `${p.nom}: al abrir un grupo se ve solo ese`);
    ok(abierto.ancho > p.w * 0.85, `${p.nom}: los botones del grupo ocupan el ancho (${Math.round(abierto.ancho)}px)`);
    ok(abierto.alto >= 44, `${p.nom}: botones del grupo tocables (${Math.round(abierto.alto)}px)`);
    await ctx.close();
  }

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
