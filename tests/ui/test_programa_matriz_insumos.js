// Regresion 2026-10-01 (94xE): una convergencia en MATRIZ armada solo con piezas compradas
// (PEST1 + Z47 + Z46 -> matriz 505D -> Z47-M505D -> Fabrica -> 942E) no se dibujaba: el
// detector de convergencias solo miraba rutas que arrancan en un fleje. El usuario: "No veo la
// convergencia de las tres partes en el despiece (con su respectiva matriz)".
// Fixture = el 942E real.
// 2026-10-08 (Nazareno): el armado de TALLERISTA con insumos (GRJ5/GRJ6 = BOM12 + BOM8 -> Martin
// Cornejo) tambien converge: "Ese subconjunto no tendria que aparecer asi. En las dos rutas de BOM8 y
// BOM12 hace la convergencia". Antes de ese dia este test exigia lo contrario (control 'sin cambios').
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const B = {
  art: [{ id: 164, cod: '942E', fam: 'Utensilios' }, { id: 900, cod: '777', fam: 'Control' }],
  sect: { '2': { t: 'procesado' }, '3': { t: 'movimiento' }, '6': { t: 'plástico' }, '9': { t: 'garage' },
          '11': { t: 'caja' }, '12': { t: 'terminado' } },
  comp: {
    '768': { cod: 'PEST1', d: 'Insertos Sonrisa', s: 6 }, '952': { cod: 'Z47', d: 'Cuchara Inox', s: 2 },
    '951': { cod: 'Z46', d: 'Mgo Madera', s: 2 }, '953': { cod: 'Z47-M505D', d: 'Cuchara Inox tras M505D', s: 3 },
    '604': { cod: 'A9B', d: 'Caja N°15', s: 11 }, '770': { cod: '942E', d: '942E Terminado', s: 12 },
    '801': { cod: 'GX1', d: 'Parte A', s: 9 }, '802': { cod: 'GX2', d: 'Parte B', s: 9 },
    '803': { cod: 'GRJX', d: 'Armado tallerista', s: 9 }, '804': { cod: '777', d: '777 Terminado', s: 12 },
  },
  mat: { '176': { n: '505D', d: 'Armado Cuchara Inox Imp', r: null } },
  prov: {},
  tall: { '3': 'Fábrica' },
  bom: [{ a: 164, c: 604, q: 0.0833 }, { a: 164, c: 768, q: 1 }, { a: 164, c: 952, q: 1 }, { a: 164, c: 951, q: 1 },
        { a: 900, c: 801, q: 1 }, { a: 900, c: 802, q: 1 }],
  children: { '953': [{ c: 768, q: 1 }, { c: 952, q: 1 }, { c: 951, q: 1 }],
              '803': [{ c: 801, q: 1 }, { c: 802, q: 1 }] },
  tall_art: { '164': ['Fábrica'], '900': ['Fábrica'] },
  rp: {
    '835': [{ o: 1, tp: 'insumo', ce: 768, cs: 768 }, { o: 2, tp: 'matriz', m: 176, ce: 768, cs: 953 },
            { o: 3, tp: 'tallerista', ta: 3, ce: 953, cs: 770 }, { o: 4, tp: 'virgilio', ce: 770, cs: null }],
    '901': [{ o: 1, tp: 'insumo', ce: 952, cs: 952 }, { o: 2, tp: 'matriz', m: 176, ce: 952, cs: 953 },
            { o: 3, tp: 'tallerista', ta: 3, ce: 953, cs: 770 }, { o: 4, tp: 'virgilio', ce: 770, cs: null }],
    '902': [{ o: 1, tp: 'insumo', ce: 951, cs: 951 }, { o: 2, tp: 'matriz', m: 176, ce: 951, cs: 953 },
            { o: 3, tp: 'tallerista', ta: 3, ce: 953, cs: 770 }, { o: 4, tp: 'virgilio', ce: 770, cs: null }],
    '777': [{ o: 1, tp: 'insumo', ce: 604, cs: 604 }, { o: 2, tp: 'tallerista', ta: 3, ce: 604, cs: 770 }, { o: 3, tp: 'virgilio', ce: 770, cs: null }],
    '950': [{ o: 1, tp: 'insumo', ce: 801, cs: 801 }, { o: 2, tp: 'tallerista', ta: 3, ce: 801, cs: 803 },
            { o: 3, tp: 'tallerista', ta: 3, ce: 803, cs: 804 }, { o: 4, tp: 'virgilio', ce: 804, cs: null }],
    '951': [{ o: 1, tp: 'insumo', ce: 802, cs: 802 }, { o: 2, tp: 'tallerista', ta: 3, ce: 802, cs: 803 },
            { o: 3, tp: 'tallerista', ta: 3, ce: 803, cs: 804 }, { o: 4, tp: 'virgilio', ce: 804, cs: null }],
  },
  rutas_by_art: {
    '164': [{ id: 777, nom: null, f: null, a: 164 }, { id: 835, nom: 'Insumo PEST1 -> Art 942E', f: null, a: 164 },
            { id: 901, nom: 'Insumo Z47 -> Art 942E', f: null, a: 164 }, { id: 902, nom: 'Insumo Z46 -> Art 942E', f: null, a: 164 }],
    '900': [{ id: 950, nom: 'Insumo GX1', f: null, a: 900 }, { id: 951, nom: 'Insumo GX2', f: null, a: 900 }],
  },
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
  const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };

  // el articulo elegido por defecto es el primero (942E)
  const txt = await page.$eval('#canvas', e => e.innerText);
  const conv = await page.$$eval('#canvas .lane.conv', ls => ls.map(l => l.innerText));
  ok(conv.length === 1, 'hay UNA convergencia en el 942E (hay ' + conv.length + ')');
  const c = conv[0] || '';
  ok(/Convergencia\s*·\s*Z47-M505D/i.test(c), 'la convergencia es el sub-conjunto Z47-M505D');
  ok(/MATRIZ N°505D/i.test(c), 'la convergencia la arma la MATRIZ 505D');
  ok(/Insumo PEST1/i.test(c) && /Insumo Z47/i.test(c) && /Insumo Z46/i.test(c), 'las tres ramas: PEST1, Z47 y Z46');
  ok(/×\s*1,00\s*u/.test(c) && !/×\s*0(,00)?\s*u/.test(c), 'la convergencia sale con cantidad (1 u), no 0');
  ok(/Fábrica/.test(c), 'despues de la matriz sigue Fabrica');
  const lanesNoConv = await page.$$eval('#canvas .lane:not(.conv)', ls => ls.map(l => l.innerText).join('\n---\n'));
  ok(!/PEST1|Z47 —|Z46 —/.test(lanesNoConv), 'las 3 piezas no se repiten como insumo suelto en el bloque 4');
  ok(/A9B/.test(lanesNoConv), 'la caja A9B sigue como insumo aparte');

  // armado de TALLERISTA con insumos (GRJ5/GRJ6) -> tambien es convergencia
  await page.evaluate(() => { var s = document.getElementById('art'); if (s) { s.value = '900'; s.dispatchEvent(new Event('change')); } else if (window.elegirArticulo) window.elegirArticulo(900); });
  await page.waitForTimeout(300);
  const conv2 = await page.$$eval('#canvas .lane.conv', ls => ls.map(l => l.innerText));
  ok(conv2.length === 1, 'un armado de TALLERISTA con insumos (GRJX = GX1 + GX2) se dibuja como convergencia (hay ' + conv2.length + ')');
  const c2 = conv2[0] || '';
  ok(/Convergencia\s*·\s*GRJX/i.test(c2), 'la convergencia es el sub-conjunto GRJX');
  ok(/Insumo GX1/i.test(c2) && /Insumo GX2/i.test(c2), 'las dos ramas: GX1 y GX2');
  ok(/TALLERISTA[\s\S]*Fábrica[\s\S]*GRJX/i.test(c2), 'la convergencia la arma el TALLERISTA');
  const txt2 = await page.$eval('#canvas', e => e.innerText);
  ok(!/BOM sin ruta/i.test(txt2), 'GRJX ya no sale en "Sub-conjuntos (BOM sin ruta explícita)"');
  const noConv2 = await page.$$eval('#canvas .lane:not(.conv)', ls => ls.map(l => l.innerText).join('\n---\n'));
  ok(!/GX1 —|GX2 —/.test(noConv2), 'GX1 y GX2 no se repiten como insumo suelto en el bloque 4');
  if (process.exitCode) console.log('\n---- render ----\n' + txt);
  await browser.close();
})();
