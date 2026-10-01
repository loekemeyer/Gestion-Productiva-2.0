// 570 Pala de Canelones: la ruta del vastago (ID1 -> M375 -> L8 -> F2 -> Fabrica -> 570) se dibuja
// como Rama 2 de la convergencia E6-M194 y NO se repite en el bloque 1 como "ruta simple".
// Antes salia en los dos lados porque el bloque 1 solo miraba el ULTIMO paso de la ruta (570),
// no el F2 que consume la Matriz 194. Recorte real de programa_bundle (01/10/2026).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const B = {
  art: [{ id: 53, cod: '570', d: 'Pala De Canelones', fam: 'Utensilios', mk: 'LOEKE', disc: false }],
  sect: { '1': { t: 'crudo' }, '2': { t: 'procesado' }, '3': { t: 'movimiento' }, '5': { t: 'fleje' }, '6': { t: 'plástico' },
          '8': { t: 'remache' }, '10': { t: 'cartón' }, '11': { t: 'caja' }, '12': { t: 'terminado' } },
  comp: {
    '46': { cod: 'L8', d: 'Vastagos Cortos', s: 1 },
    '117': { cod: 'E6', d: 'Pala Canelon Inox.', s: 2 },
    '124': { cod: 'F2', d: 'Vastago Canelon', s: 2 },
    '189': { cod: 'ID1', d: 'Fleje N° 28', s: 5, pv: 'Hermac' },
    '198': { cod: 'ID9', d: 'Fleje N° 42', s: 5, pv: 'Aperam' },
    '279': { cod: 'V10', d: 'Rem. Alum Canel', s: 8, pv: 'Bella Vista' },
    '424': { cod: '570', d: '570 Terminado', s: 12 },
    '497': { cod: 'ID1-M375', d: 'Fleje N° 28 tras M375', s: 3 },
    '505': { cod: 'ID9-M355', d: 'Fleje N° 42 tras M355', s: 3 },
    '506': { cod: 'E6-M194', d: 'Pala Canelon Inox. tras M194', s: 3 },
  },
  mat: {
    '74': { n: '165', d: 'Calado Pala Canelon', r: null }, '76': { n: '169', d: 'Doblado de vastago pala canelon', r: null },
    '82': { n: '194', d: 'Remachado Pala Canelones', r: null }, '97': { n: '355', d: 'Corte Pala Canelon', r: 19.87 },
    '116': { n: '375', d: 'Corte Vastago Pala Canelon', r: 63.61 },
  },
  prov: { '6': { n: 'Pedernera Ilario', p: 'Cromado' } },
  tall: { '3': 'Fábrica' },
  bom: [{ a: 53, c: 506, q: 1 }],
  children: { '506': [{ c: 117, q: 1 }, { c: 124, q: 1 }, { c: 279, q: 2 }] },
  tall_art: { '53': ['Fábrica'] },
  rp: {
    '96': [
      { o: 1, tp: 'ingreso', ce: 189, cs: 189, fl: 189 },
      { o: 2, tp: 'matriz', m: 116, ce: 189, cs: 497 },
      { o: 3, tp: 'matriz', m: 76, ce: 497, cs: 46 },
      { o: 4, tp: 'proveedor_servicio', pr: 6, ce: 46, cs: 124 },
      { o: 5, tp: 'tallerista', ta: 3, ce: 124, cs: 424 },
      { o: 6, tp: 'virgilio', a: 53, ce: 424, cs: null },
    ],
    '141': [
      { o: 1, tp: 'ingreso', ce: 198, cs: 198, fl: 198 },
      { o: 2, tp: 'matriz', m: 97, ce: 198, cs: 505 },
      { o: 3, tp: 'matriz', m: 74, ce: 505, cs: 117 },
      { o: 4, tp: 'matriz', m: 82, ce: 117, cs: 506 },
      { o: 5, tp: 'tallerista', ta: 3, ce: 506, cs: 424 },
      { o: 6, tp: 'virgilio', a: 53, ce: 424, cs: null },
    ],
    '373': [
      { o: 1, tp: 'insumo', ce: 279, cs: 279 },
      { o: 2, tp: 'tallerista', ta: 3, ce: 279, cs: 424 },
      { o: 3, tp: 'virgilio', a: 53, ce: 424, cs: null },
    ],
  },
  rutas_by_art: { '53': [
    { id: 96, nom: 'Fleje 28 -> Art 570', f: 189, a: 53 },
    { id: 141, nom: 'Fleje 42 -> Art 570', f: 198, a: 53 },
    { id: 373, nom: 'Insumo V10 -> Art 570', f: null, a: 53 },
  ] },
};

const STUB = `
window.supabase = { createClient: function(){ return {
  rpc: async function(name){ if(name==='programa_bundle') return { data: ${JSON.stringify(B)}, error:null };
    return { data:null, error:{message:'rpc '+name} }; },
  from: function(){ var o={}; ['select','eq','order','single'].forEach(m=>o[m]=()=>o);
    o.then=(r)=>Promise.resolve({data:[],error:null}).then(r); return o; }
};}};`;

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const page = await browser.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  await page.route('**/@supabase/supabase-js@2', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/*.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
  await page.goto(ROOT + '/Programa/Programa.html');
  await page.waitForSelector('#canvas .lane');

  const txt = await page.$eval('#canvas', e => e.innerText);
  const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };

  ok(/Rama\s*2\s*—\s*ID1 produce F2/i.test(txt), 'el vastago es la Rama 2 de la convergencia');
  ok(/MATRIZ N°194/.test(txt), 'converge en la Matriz 194');
  ok(!/Partes que se fabrican en Cervantes/i.test(txt), 'la ruta del vastago NO se repite como ruta simple');
  ok((txt.match(/Fleje N° 28 tras M375/g) || []).length === 1, 'el paso M375 del vastago se dibuja una sola vez (era 2)');
  if (process.exitCode) console.log('\n---- render ----\n' + txt);
  await browser.close();
})();
