// Despiece x Art. (Programa/Programa.html) con DOS talleristas en el mismo paso (2026-10-08).
//
// Pedido [Nazareno]: "todos los artículos que tienen 2 talleristas (modelado en Proporciones) quiero que
// me aparezca en el módulo de Despiece x Art. Por ejemplo: en la imagen aparece solo Alex Escalante como
// tallerista que ensambla y también entrega Martín Cornejo".
//
// La casa DUPLICA la ruta por tallerista (misma cadena, distinto tallerista). Hasta ese día un selector
// elegía uno y dibujaba sólo sus rutas. Este test fija lo nuevo, con la forma real del 510 (5 rutas de Alex
// + sus 5 copias para Martin, reparto 50/50 en programa_bundle.reparto):
//   - el encabezado nombra a LOS DOS con su % ("ensamblan"), y no hay selector de tallerista;
//   - cada ruta se dibuja UNA vez (2 rutas de fleje, no 4) y los kg de fleje no se duplican;
//   - cada tarjeta de tallerista nombra a los dos, con su %;
//   - el cierre reparte las unidades (100 u -> 50 + 50);
//   - un % que nadie dictó dice "(sin dictar)";
//   - un artículo con UN tallerista queda como antes (sin %).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const SECT = { '2': { t: 'procesado' }, '5': { t: 'fleje' }, '8': { t: 'remache' }, '10': { t: 'cartón' },
               '11': { t: 'caja' }, '12': { t: 'terminado' }, '15': { t: 'movimiento' } };

// las 5 rutas del 510 con el tallerista como parámetro (forma real de rp en programa_bundle)
function rutas510(ta) {
  return [
    [{ o: 1, tp: 'ingreso', ce: 101, cs: 101 }, { o: 2, tp: 'matriz', m: 24, ce: 101, cs: 102 },
     { o: 3, tp: 'proveedor_servicio', pr: 4, ce: 102, cs: 103 }, { o: 4, tp: 'tallerista', ta, ce: 103, cs: 403 },
     { o: 5, tp: 'virgilio', ce: 403, cs: null }],
    [{ o: 1, tp: 'ingreso', ce: 104, cs: 104 }, { o: 2, tp: 'matriz', m: 23, ce: 104, cs: 86 },
     { o: 3, tp: 'tallerista', ta, ce: 86, cs: 403 }, { o: 4, tp: 'virgilio', ce: 403, cs: null }],
    [{ o: 1, tp: 'insumo', ce: 314, cs: 314 }, { o: 2, tp: 'tallerista', ta, ce: 314, cs: 403 },
     { o: 3, tp: 'virgilio', ce: 403, cs: null }],
    [{ o: 1, tp: 'ingreso', ce: 105, cs: 105 }, { o: 2, tp: 'proveedor_servicio', pr: 4, ce: 105, cs: 267 },
     { o: 3, tp: 'tallerista', ta, ce: 267, cs: 403 }, { o: 4, tp: 'virgilio', ce: 403, cs: null }],
    [{ o: 1, tp: 'insumo', ce: 464, cs: 464 }, { o: 2, tp: 'tallerista', ta, ce: 464, cs: 403 },
     { o: 3, tp: 'virgilio', ce: 403, cs: null }],
  ];
}

function bundle(opts) {
  const conMartin = opts.conMartin;
  const rp = {}, porArt = [];
  const noms = ['Fleje 57 -> Art 510', 'Fleje 94 -> Art 510', 'Insumo CART510 -> Art 510', 'Insumo CV9 -> Art 510', 'Insumo A11 -> Art 510'];
  const fl = [101, 104, null, null, null];
  rutas510(2).forEach((r, i) => { rp[String(10 + i)] = r; porArt.push({ id: 10 + i, nom: noms[i] + ' (Alex Escalante)', f: fl[i], a: 32 }); });
  if (conMartin) rutas510(6).forEach((r, i) => { rp[String(20 + i)] = r; porArt.push({ id: 20 + i, nom: noms[i] + ' (Martin Cornejo)', f: fl[i], a: 32 }); });
  return {
    art: [{ id: 32, cod: '510', fam: 'Abrelatas', d: 'Abrelata Uña Inox', mk: 'LOEKE', disc: false }],
    sect: SECT,
    comp: {
      '101': { cod: 'IB4', d: 'Fleje N° 57', s: 5 }, '102': { cod: 'L13', d: 'Uña cruda', s: 15 },
      '103': { cod: 'C10', d: 'Uñas Zinc.', s: 2 }, '104': { cod: 'IF1A', d: 'Fleje N° 94', s: 5 },
      '86': { cod: 'A15', d: 'Cpo Uña Inox LK C/M', s: 2 }, '314': { cod: 'A2B', d: 'Cartón 510', s: 10 },
      '105': { cod: 'CV9', d: 'Remache crudo', s: 8 }, '267': { cod: 'V9', d: 'Remache uña niq.', s: 8 },
      '464': { cod: 'A11', d: 'Caja N°29', s: 11 }, '403': { cod: '510', d: '510 Terminado', s: 12 },
    },
    mat: { '23': { n: '23', d: 'Corte Cuerpo', t: null, r: 50, p: true }, '24': { n: '24', d: 'Corte Uña', t: null, r: 100, p: true } },
    prov: { '4': { n: 'Daniel', p: 'Zincado' } },
    tall: { '2': 'Alex Escalante', '6': 'Martin Cornejo' }, provat: {},
    bom: [{ a: 32, c: 86, q: 1 }, { a: 32, c: 103, q: 1 }, { a: 32, c: 267, q: 1 }, { a: 32, c: 314, q: 1 }, { a: 32, c: 464, q: 0.0833 }],
    children: {},
    tall_art: { '32': conMartin ? ['Alex Escalante', 'Martin Cornejo'] : ['Alex Escalante'] },
    reparto: conMartin ? { '32': { '403': { '2': { p: 50, s: !!opts.supuesto }, '6': { p: 50, s: !!opts.supuesto } } } } : null,
    rp,
    rutas_by_art: { '32': porArt },
  };
}

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

  async function abrir(B, uni) {
    const page = await browser.newPage();
    page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
    await page.route('**/@supabase/supabase-js@2', r => r.fulfill({ contentType: 'application/javascript', body: stub(B) }));
    await page.route('**/*.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
    await page.goto(ROOT + '/Programa/Programa.html');
    await page.waitForSelector('#canvas .lane');
    if (uni) { await page.fill('#uni', String(uni)); await page.dispatchEvent('#uni', 'input'); }
    return page;
  }
  const kgFleje = (t) => (t.match(/[\d.,]+ kg fleje/g) || []);

  // 1) el 510 con Alex y Martin, 50/50
  let page = await abrir(bundle({ conMartin: true }), 100);
  let hero = await page.$eval('.hero', e => e.innerText);
  let txt = await page.$eval('#canvas', e => e.innerText);
  ok(/Alex Escalante 50%/.test(hero) && /Martin Cornejo 50%/.test(hero), 'el encabezado nombra a los dos con su 50%');
  ok(/ensamblan/i.test(hero), 'el encabezado dice "ensamblan" (son dos)');
  ok(!(await page.$('#tallAlt')), 'no hay selector de tallerista: no se elige uno');
  ok(/\b2\s*rutas de producción/i.test(hero), 'las 2 rutas de fleje cuentan una vez (no 4)');
  ok(/2 rutas simples/i.test(txt), 'el bloque 1 dibuja 2 rutas, no 4');
  const kg = kgFleje(txt);
  ok(kg.length === 2, 'un badge de kg de fleje por ruta (' + kg.length + ')');
  // las tarjetas de los PASOS (las del cierre, "ensambla", van una por tallerista a propósito)
  const tarjetas = await page.$$eval('.node.n-tall', ns => ns.filter(n => !/ensambla/i.test(n.innerText))
    .map(n => n.querySelector('.nm').innerText));
  const conLosDos = tarjetas.filter(t => /Alex Escalante 50%/.test(t) && /Martin Cornejo 50%/.test(t));
  ok(conLosDos.length === 5, 'cada paso de tallerista (5 rutas) nombra a los dos con su % (' + conLosDos.length + ')');
  ok(tarjetas.length === 5, 'y no hay tarjetas de paso con uno solo (' + tarjetas.length + ')');
  const cierre = await page.$$eval('.node.n-tall', ns => ns.filter(n => /ensambla/i.test(n.innerText)).map(n => n.innerText));
  ok(cierre.length === 2, 'el cierre tiene una tarjeta por tallerista (' + cierre.length + ')');
  ok(cierre.every(t => /50%/.test(t) && /× 50\b/.test(t)), 'cada uno ensambla 50% = 50 de las 100 u');
  await page.close();

  // 2) el % por default (nadie lo dictó) no se muestra como un dato
  page = await abrir(bundle({ conMartin: true, supuesto: true }));
  hero = await page.$eval('.hero', e => e.innerText);
  ok(/sin dictar/i.test(hero), 'un reparto supuesto dice "(sin dictar)"');
  await page.close();

  // 3) un solo tallerista: como antes, sin % y "ensambla"
  page = await abrir(bundle({ conMartin: false }));
  hero = await page.$eval('.hero', e => e.innerText);
  txt = await page.$eval('#canvas', e => e.innerText);
  ok(/Alex Escalante/.test(hero) && /ensambla\b/i.test(hero) && !/ensamblan/i.test(hero), 'un tallerista: "Alex Escalante ensambla"');
  ok(!/%/.test(hero) && !/Martin/.test(txt), 'un tallerista: sin % y sin Martin');
  ok(/\b2\s*rutas de producción/i.test(hero), 'un tallerista: las mismas 2 rutas de fleje');
  await page.close();

  await browser.close();
})();
