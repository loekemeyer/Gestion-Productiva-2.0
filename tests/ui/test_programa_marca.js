// El combo de "¿Qué necesito para producir?" agrupa por familia, muestra la DESCRIPCION
// (no la familia repetida) y el filtro de marca deja solo LOEKE o solo CHEF.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const B = {
  art: [
    { id: 25, cod: '501', fam: 'Abrelatas',   d: 'Abrelatas A Manija',  mk: 'LOEKE', disc: false },
    { id: 64, cod: '701', fam: 'Abrelatas',   d: 'Abrelatas A Manija',  mk: 'CHEF',  disc: false },
    { id: 40, cod: '520', fam: 'Sacacorchos', d: 'Sacacorcho Tipo Mozo Cromado', mk: 'LOEKE', disc: false },
    { id: 13, cod: '108', fam: 'Peladores',   d: 'Pelapapas Mango Metálico', mk: 'LOKE', disc: false },
    { id: 77, cod: '809', fam: 'Cortadores',  d: null,                  mk: null,    disc: true },
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

  const grupos = await page.$$eval('#art optgroup', gs => gs.map(g => g.label));
  check(JSON.stringify(grupos) === JSON.stringify(['Abrelatas', 'Cortadores', 'Peladores', 'Sacacorchos']),
    'el combo se agrupa por familia — ' + grupos.join(' / '));

  const txt501 = await page.$eval('#art option[value="25"]', o => o.textContent);
  check(/Abrelatas A Manija/.test(txt501) && !/—\s*Abrelatas\s*$/.test(txt501),
    'la opcion muestra la descripcion, no la familia — ' + txt501.trim());

  const txt809 = await page.$eval('#art option[value="77"]', o => o.textContent);
  check(/discontinuado/.test(txt809), 'el discontinuado se avisa en la opcion — ' + txt809.trim());

  await page.selectOption('#marca', 'CHEF');
  const cods = await page.$$eval('#art option', os => os.map(o => o.textContent.trim().split(' ')[0]));
  check(JSON.stringify(cods) === JSON.stringify(['701']), 'filtrando por CHEF queda solo el 701 — ' + cods.join(','));

  await page.selectOption('#marca', 'LOEKE');
  const cods2 = await page.$$eval('#art option', os => os.map(o => o.textContent.trim().split(' ')[0]));
  check(JSON.stringify(cods2) === JSON.stringify(['501', '520']), 'filtrando por LOEKE quedan 501 y 520 — ' + cods2.join(','));

  await page.selectOption('#marca', 'LOKE');
  const cods3 = await page.$$eval('#art option', os => os.map(o => o.textContent.trim().split(' ')[0]));
  check(JSON.stringify(cods3) === JSON.stringify(['108']), 'LOKE es una marca propia, no se mezcla con LOEKE — ' + cods3.join(','));

  await page.selectOption('#marca', '');
  const n = await page.$$eval('#art option', os => os.length);
  check(n === 5, 'Todas vuelve a los 5 — ' + n);

  // buscador: por descripcion, por codigo, sin acentos, y combinado con la marca
  await page.fill('#buscar', 'pelapapas');
  const b1 = await page.$$eval('#art option', os => os.map(o => o.textContent.trim().split(' ')[0]));
  check(JSON.stringify(b1) === JSON.stringify(['108']), 'busca por descripcion — ' + b1.join(','));

  await page.fill('#buscar', 'sacacorcho');
  const b2 = await page.$$eval('#art option', os => os.map(o => o.textContent.trim().split(' ')[0]));
  check(JSON.stringify(b2) === JSON.stringify(['520']), 'busca sin acentos ni mayusculas — ' + b2.join(','));

  await page.fill('#buscar', '70');
  const b3 = await page.$$eval('#art option', os => os.map(o => o.textContent.trim().split(' ')[0]));
  check(JSON.stringify(b3) === JSON.stringify(['701']), 'busca por codigo — ' + b3.join(','));

  await page.selectOption('#marca', 'LOEKE');
  const b4 = await page.$$eval('#art option', os => os.map(o => o.textContent.trim()));
  check(b4.length === 1 && /ningún artículo/.test(b4[0]), 'buscador y marca se combinan — ' + b4.join(','));

  await page.fill('#buscar', '');
  await page.selectOption('#marca', '');
  await page.selectOption('#art', '25');
  const hero = await page.$eval('.hero .fam', e => e.textContent);
  check(/Abrelatas A Manija/.test(hero) && /LOEKE/.test(hero),
    'el encabezado muestra descripcion, familia y marca — ' + hero.trim());

  const ovf = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(ovf <= 0, 'sin scroll horizontal en 390px (overflow=' + ovf + ')');

  await browser.close();
  if (ok.every(Boolean)) { console.log('TODO OK'); process.exit(0); }
  process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
