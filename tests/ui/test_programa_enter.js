// Enter en el buscador del selector de articulo de "¿Qué necesito para producir?" ENTRA al
// articulo (usuario 2026-10-01: "cuando le doy enter quiero que me entre al articulo").
// Gana el codigo EXACTO aunque no sea la primera fila; si no hay codigo exacto, la primera fila
// de la lista; sin filas, Enter no hace nada y el panel queda abierto.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const B = {
  art: [
    // 5010 va en una familia que ordena ANTES: con "501" es la primera fila y no es el exacto
    { id: 90, cod: '5010', fam: 'Abanicos',    d: 'Abanico Plegable',    mk: 'LOEKE', disc: false },
    { id: 25, cod: '501', fam: 'Abrelatas',   d: 'Abrelatas A Manija',  mk: 'LOEKE', disc: false },
    { id: 64, cod: '701', fam: 'Abrelatas',   d: 'Abrelatas A Manija',  mk: 'CHEF',  disc: false },
    { id: 40, cod: '520', fam: 'Sacacorchos', d: 'Sacacorcho Tipo Mozo Cromado', mk: 'LOEKE', disc: false },
    { id: 13, cod: '108', fam: 'Peladores',   d: 'Pelapapas Mango Metálico', mk: 'LOKE', disc: false },
  ],
  sect: { '12': { t: 'terminado' } },
  comp: { '412': { cod: '501', d: '501 Terminado', s: 12 } },
  mat: {}, prov: {}, tall: {}, bom: [], children: {}, tall_art: {},
  rp: {}, rutas: [], rutas_by_art: {},
};

const ok = [];
function check(cond, msg) { console.log((cond ? 'OK   ' : 'FALLA ') + msg); ok.push(!!cond); }

(async () => {
  const STUB = `
window.supabase = { createClient: function(){ return {
  rpc: async function(name){ if(name==='programa_bundle') return { data: ${JSON.stringify(B)}, error:null };
    return { data:null, error:{message:'rpc '+name} }; },
  from: function(){ var o={}; ['select','eq','order','single'].forEach(m=>o[m]=()=>o);
    o.then=(r)=>Promise.resolve({data:[],error:null}).then(r); return o; }
};}};`;

  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  await page.route('**/@supabase/supabase-js@2', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/*.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
  await page.goto(ROOT + '/Programa/Programa.html');
  await page.waitForSelector('#art option', { state: 'attached' });

  async function buscarYEnter(txt) {
    if (await page.isHidden('#pick')) await page.click('#artBtn');
    await page.fill('#buscar', txt);
    await page.press('#buscar', 'Enter');
  }
  const elegido = () => page.$eval('#art', s => s.value);
  const rotulo = () => page.$eval('#artBtn', b => b.textContent.trim());

  // A. el codigo exacto gana aunque NO sea la primera fila
  await page.click('#artBtn');
  await page.fill('#buscar', '501');
  const filas = await page.$$eval('#pickList button[data-id]', bs => bs.map(b => b.textContent.trim().split(' ')[0]));
  check(filas[0] === '5010' && filas.includes('501'), 'con "501" la primera fila es 5010 — ' + filas.join(','));
  await page.press('#buscar', 'Enter');
  check(await page.isHidden('#pick'), 'A: Enter cierra el panel');
  check(await elegido() === '25' && /^501\b/.test(await rotulo()),
    'A: Enter entra al codigo EXACTO 501, no a la primera fila — ' + await rotulo());

  // B. un solo resultado por descripcion
  await buscarYEnter('mozo');
  check(await page.isHidden('#pick') && await elegido() === '40',
    'B: un solo resultado ("mozo") entra al 520 — ' + await rotulo());

  // C. sin codigo exacto y varias filas: la primera de la lista
  await buscarYEnter('manija');
  check(await page.isHidden('#pick') && await elegido() === '25',
    'C: varias filas sin codigo exacto entra a la primera (501) — ' + await rotulo());

  // D. sin filas, Enter no hace nada
  const antes = await elegido();
  await buscarYEnter('zzzz');
  check(await page.isVisible('#pick'), 'D: sin resultados el panel queda abierto');
  check(await elegido() === antes, 'D: sin resultados el articulo no cambia');

  // E. el chip de marca se respeta: con Chef puesto, "701" entra al 701
  await page.fill('#buscar', '');
  await page.click('#pickMarcas button[data-mk="CHEF"]');
  await page.fill('#buscar', '701');
  await page.press('#buscar', 'Enter');
  check(await page.isHidden('#pick') && await elegido() === '64', 'E: con el chip Chef, "701" entra al 701 — ' + await rotulo());

  await browser.close();
  if (ok.every(Boolean) && !process.exitCode) { console.log('TODO OK'); process.exit(0); }
  process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
