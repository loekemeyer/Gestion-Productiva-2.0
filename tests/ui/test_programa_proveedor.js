// v1.216.0 [usuario 2026-09-30]: en Despiece x Art (Programa.html) el PRIMER paso de cada ruta es el
// proveedor que compra la pieza: "Basconia provee el fleje ID6". Sale de componente.proveedor
// (comp.pv) + los alternativos (comp.pva). Sin proveedor cargado no se dibuja tarjeta: no se inventa.
// Cubre los tres lugares donde arranca una ruta: bloque 1 (fleje), bloque 2 (rama de convergencia)
// y bloque 4 (insumo comprado).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const B = {
  art: [{ id: 1, cod: '501', fam: 'Abrelatas', d: 'Abrelatas prueba' }],
  sect: { '2': { t: 'procesado' }, '5': { t: 'fleje' }, '7': { t: 'bombilla' }, '10': { t: 'cartón' },
          '11': { t: 'caja' }, '12': { t: 'terminado' } },
  comp: {
    '171': { cod: 'ID6', d: 'Fleje N° 5', s: 5, pv: 'Basconia' },
    '180': { cod: 'IF11', d: 'Fleje N° 19', s: 5, pv: 'Hermac' },
    '151': { cod: 'W1', d: 'Hoja', s: 2 },
    '152': { cod: 'W2', d: 'Grampa', s: 2 },
    '262': { cod: 'C1', d: 'Conjunto', s: 7 },
    '318': { cod: 'A1C1', d: 'Carton 501', s: 10, pv: 'Talleres Gráficos Pol' },
    '457': { cod: 'A8', d: 'Caja N°2', s: 11, pv: 'Corrugadora del Plata', pva: ['Recicor'] },
    '500': { cod: 'X9', d: 'Pieza sin proveedor', s: 7 },
    '399': { cod: '501', d: '501 Terminado', s: 12 },
  },
  mat: { '70': { n: '138', d: '', r: 658.1 }, '71': { n: '140', d: '', r: 40 } },
  prov: {}, tall: { '2': 'Alex Escalante' },
  bom: [{ a: 1, c: 151, q: 1 }, { a: 1, c: 262, q: 1 }, { a: 1, c: 318, q: 1 }, { a: 1, c: 457, q: 0.1 }, { a: 1, c: 500, q: 1 }],
  children: { '262': [{ c: 152, q: 1 }, { c: 500, q: 1 }] },
  tall_art: { '1': ['Alex Escalante'] },
  rp: {
    // bloque 1: ruta simple ID6 -> Matriz -> W1
    '10': [{ o: 1, tp: 'ingreso', ce: 171, cs: 171 }, { o: 2, tp: 'matriz', m: 70, ce: 171, cs: 151 },
           { o: 3, tp: 'tallerista', ta: 2, ce: 151, cs: 399 }, { o: 4, tp: 'virgilio', ce: 399, cs: null }],
    // bloque 2: IF11 -> Matriz -> W2 -> tallerista arma C1 (convergencia con X9)
    '11': [{ o: 1, tp: 'ingreso', ce: 180, cs: 180 }, { o: 2, tp: 'matriz', m: 71, ce: 180, cs: 152 },
           { o: 3, tp: 'tallerista', ta: 2, ce: 152, cs: 262 }, { o: 4, tp: 'tallerista', ta: 2, ce: 262, cs: 399 },
           { o: 5, tp: 'virgilio', ce: 399, cs: null }],
    // bloque 4: insumos comprados
    '20': [{ o: 1, tp: 'insumo', ce: 318, cs: 318 }, { o: 2, tp: 'tallerista', ta: 2, ce: 318, cs: 399 }, { o: 3, tp: 'virgilio', ce: 399, cs: null }],
    '21': [{ o: 1, tp: 'insumo', ce: 457, cs: 457 }, { o: 2, tp: 'tallerista', ta: 2, ce: 457, cs: 399 }, { o: 3, tp: 'virgilio', ce: 399, cs: null }],
  },
  rutas_by_art: { '1': [
    { id: 10, nom: 'Fleje 5 -> 501', f: 171, a: 1 }, { id: 11, nom: 'Fleje 19 -> 501', f: 180, a: 1 },
    { id: 20, nom: 'Insumo carton', f: null, a: 1 }, { id: 21, nom: 'Insumo caja', f: null, a: 1 }] },
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
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  await page.route('**/@supabase/supabase-js@2', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/*.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
  await page.goto(ROOT + '/Programa/Programa.html');
  await page.waitForSelector('#canvas .lane');
  const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };

  // cada fila de ruta: los tipos de sus tarjetas en orden
  const filas = await page.$$eval('#canvas .flow', fs => fs.map(f => Array.from(f.querySelectorAll('.node')).map(n => ({
    tp: n.querySelector('.tp').innerText.trim().toUpperCase(),
    nm: n.querySelector('.nm').innerText.trim(),
    ex: (n.querySelector('.ex') || { innerText: '' }).innerText.trim(),
    prov: n.classList.contains('n-prov'),
  }))));
  const fila = cod => filas.find(f => f.some(n => n.tp === 'INSUMO' && n.nm === cod)) || [];

  const f1 = fila('ID6');
  ok(f1.length && f1[0].tp === 'PROVEEDOR' && f1[0].nm === 'Basconia', 'bloque 1: la ruta del ID6 arranca con PROVEEDOR Basconia');
  ok(f1[1] && f1[1].tp === 'INSUMO' && f1[1].nm === 'ID6', 'bloque 1: despues del proveedor viene el INSUMO ID6');
  ok(f1[0] && f1[0].prov, 'la tarjeta del proveedor va en celeste (n-prov), como lo de afuera');

  const f2 = fila('IF11');
  ok(f2.length && f2[0].tp === 'PROVEEDOR' && f2[0].nm === 'Hermac', 'bloque 2 (rama de convergencia): IF11 arranca con PROVEEDOR Hermac');

  const f3 = fila('A1C1');
  ok(f3.length && f3[0].tp === 'PROVEEDOR' && f3[0].nm === 'Talleres Gráficos Pol', 'bloque 4: el carton arranca con su proveedor');

  const f4 = fila('A8');
  ok(f4.length && f4[0].nm === 'Corrugadora del Plata' && /o Recicor/.test(f4[0].ex), 'bloque 4: la caja muestra el principal y el alternativo (o Recicor)');

  const f5 = fila('X9');
  ok(f5.length && f5[0].tp === 'INSUMO', 'sin proveedor cargado no se inventa: X9 arranca con el INSUMO');

  const nProv = filas.flat().filter(n => n.tp === 'PROVEEDOR').length;
  ok(nProv === 4, 'exactamente 4 tarjetas PROVEEDOR (ID6, IF11, A1C1, A8) · hay ' + nProv);

  if (process.exitCode) console.log(JSON.stringify(filas, null, 1));
  await browser.close();
})();
