// Despiece x Art. (Programa/Programa.html) despues de "Cambiar Tallerista / Prov. A.T." (2026-10-05).
//
// Pedido del dueño: "en el caso de cambiar en este modulo el tallerista o prov at tendrias que cambiar
// el modulo de despiece x Art". Programa lee la ruta EN VIVO (programa_bundle: rp, tall, provat, tall_art),
// asi que lo que cambia el modulo nuevo se ve ahi solo. Este test fija las dos formas que dejan los cambios:
//
//   A) Fabrica -> tallerista (542, la linea antes de la 261): la ruta de la caja y la del mango quedan
//      insumo (-> matriz 237) -> TALLERISTA -> virgilio. Antes de pasarlo, Programa dibujaba la "MATRIZ FINAL".
//      Ahora tiene que dibujar al tallerista, sin "(sin asignar)", sin "tabla incompleta" y sin matriz final,
//      y seguir mostrando la 237 que sigue haciendo Fabrica.
//   B) prov. A.T. -> otro prov. A.T.: el encabezado y el cierre nombran al NUEVO, no al anterior.
//
// Con programa_bundle STUBEADO (la forma de rp/tall/provat/tall_art es la del bundle real: se verifico
// el 05/10 con un cambio revertido en la base).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const SECT = { '4': { t: 'plastico' }, '11': { t: 'caja' }, '12': { t: 'terminado' }, '15': { t: 'movimiento' } };

// A) 542 ya pasado a Lucho: la linea esta antes de la 261, la 237 sigue en Fabrica
const BA = {
  art: [{ id: 45, cod: '542', fam: 'Ahuecadores', d: 'Ahueca Papas', mk: 'LOEKE', disc: false }],
  sect: SECT,
  comp: {
    '900': { cod: 'A9', d: 'Caja N°22', s: 11 },
    '901': { cod: '542', d: '542 Terminado', s: 12 },
    '902': { cod: 'PC10', d: 'Mango LK Espatula', s: 4 },
    '903': { cod: 'PC10-M237', d: 'Mango c/Capuchon tras M237', s: 15 },
  },
  mat: { '237': { n: '237', d: 'Poner Capuchon Mgo Espatula', t: null, r: null, p: false } },
  prov: {}, tall: { '5': 'Lucho' }, provat: {},
  bom: [{ a: 45, c: 900, q: 0.0833 }, { a: 45, c: 902, q: 1 }],
  children: {},
  tall_art: { '45': ['Lucho'] },
  rp: {
    '1': [
      { o: 1, tp: 'insumo', ce: 900, cs: 900 },
      { o: 2, tp: 'tallerista', ta: 5, ce: 900, cs: 901 },
      { o: 3, tp: 'virgilio', ce: 901, cs: null },
    ],
    '2': [
      { o: 1, tp: 'insumo', ce: 902, cs: 902 },
      { o: 2, tp: 'matriz', m: 237, ce: 902, cs: 903 },
      { o: 3, tp: 'tallerista', ta: 5, ce: 903, cs: 901 },
      { o: 4, tp: 'virgilio', ce: 901, cs: null },
    ],
  },
  rutas_by_art: { '45': [{ id: 1, nom: 'Insumo A9 -> Art 542', f: null, a: 45 }, { id: 2, nom: 'Insumo PC10 -> Art 542', f: null, a: 45 }] },
};

// B) 208 ya pasado de Pintos a Maspoli
const BB = {
  art: [{ id: 181, cod: '208', fam: 'Cucharitas', d: 'Cucharita 13cm Azucarera Madera', mk: 'LOEKE', disc: false }],
  sect: SECT,
  comp: {
    '900': { cod: 'A8', d: 'Caja N°2', s: 11 },
    '901': { cod: '208', d: '208 Terminado', s: 12 },
  },
  mat: {}, prov: {}, tall: {}, provat: { '6': 'Maspoli', '10': 'Pintos' },
  bom: [{ a: 181, c: 900, q: 0.0833 }],
  children: {},
  tall_art: {},
  rp: {
    '7': [
      { o: 1, tp: 'insumo', ce: 900, cs: 900 },
      { o: 2, tp: 'proveedor_at', pat: 6, ce: 900, cs: 901 },
      { o: 3, tp: 'virgilio', ce: 901, cs: null },
    ],
  },
  rutas_by_art: { '181': [{ id: 7, nom: 'Insumo A8 -> Art 208', f: null, a: 181 }] },
};

const stub = (B) => `
window.supabase = { createClient: function(){ return {
  rpc: async function(name){ if(name==='programa_bundle') return { data: ${JSON.stringify(B)}, error:null };
    return { data:null, error:{message:'rpc '+name} }; },
  from: function(){ var o={}; ['select','eq','order','single'].forEach(m=>o[m]=()=>o);
    o.then=(r)=>Promise.resolve({data:[],error:null}).then(r); return o; }
};}};`;

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };

  async function abrir(B) {
    const page = await browser.newPage();
    page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
    await page.route('**/@supabase/supabase-js@2', r => r.fulfill({ contentType: 'application/javascript', body: stub(B) }));
    await page.route('**/*.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
    await page.goto(ROOT + '/Programa/Programa.html');
    await page.waitForSelector('#canvas .lane');
    return page;
  }

  // A) Fabrica -> tallerista
  let page = await abrir(BA);
  let txt = await page.$eval('#canvas', e => e.innerText);
  let hero = await page.$eval('.hero', e => e.innerText);
  ok(/LUCHO/i.test(txt), 'A: el cierre y las rutas nombran al tallerista nuevo (Lucho)');
  ok(/LUCHO/i.test(hero) && /ensambla/i.test(hero), 'A: el encabezado dice que Lucho ensambla');
  ok(!/sin asignar/i.test(txt) && !/tabla incompleta/i.test(txt), 'A: no dice "(sin asignar)" ni "tabla incompleta"');
  ok(!/MATRIZ FINAL/i.test(txt), 'A: ya no dibuja la "MATRIZ FINAL" de Fabrica');
  ok(/237/.test(txt) && /Poner Capuchon/i.test(txt), 'A: la 237, que sigue haciendo Fabrica, sigue dibujada antes del tallerista');
  ok((txt.match(/TALLERISTA/g) || []).length >= 3, 'A: el tallerista aparece en las dos rutas y en el cierre');
  await page.close();

  // B) prov. A.T. -> otro prov. A.T.
  page = await abrir(BB);
  txt = await page.$eval('#canvas', e => e.innerText);
  hero = await page.$eval('.hero', e => e.innerText);
  ok(/MASPOLI/i.test(txt) && /MASPOLI/i.test(hero), 'B: ruta, cierre y encabezado nombran al prov. A.T. nuevo (Maspoli)');
  ok(!/PINTOS/i.test(txt) && !/PINTOS/i.test(hero), 'B: no queda rastro del anterior (Pintos)');
  ok(!/sin asignar/i.test(txt), 'B: no dice "(sin asignar)"');
  await page.close();

  await browser.close();
})();
