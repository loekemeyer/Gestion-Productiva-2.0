/* Relevamiento/Relevamiento_GP2.html y Validacion_Stock.html — orden y envases (2026-10-08).
   Pedidos del usuario el 2026-10-08:
     - "Ordename alfanumericamente" + "Todos los relevamientos": los insumos van en orden
       alfanumerico NATURAL (GRJ2 antes que GRJ10), en la carga y en la validacion. La base los
       manda ordenados como texto (GRJ10, GRJ10A, GRJ2…), asi que el orden lo pone la pantalla.
     - Sector Remache: "Dividí en 2. 1) Bolsas … 2) Cajones para todo el resto". El envase lo decide
       la base (relev_factor + componente.relev_envase); la pantalla, con 2+ envases, parte la tabla
       en un bloque por envase con su propio encabezado. Con un solo envase queda como siempre.
   Tambien: 390px sin scroll horizontal de la pagina. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

let n = 0;
const it = (codigo, envase, factor) => ({
  item_id: ++n, comp_id: n, codigo, descripcion: 'Pieza ' + codigo, unidad: 'unidad',
  factor, envase, cuenta_kg: false, kg_x_uni: 0.001, envases: null, sueltas: null, kg: null,
  total_uni: null, contado: false, stock_programa: 0
});
// Como los manda la base: ordenados como TEXTO.
const REMACHE = [it('CV1', 'Cajones', 71428), it('CV11', 'Cajones', 34106), it('CV2', 'Cajones', 48355),
                 it('V1', 'Bolsas', 5714), it('V10', 'Bolsas', 5000), it('V1SE', 'Cajones', 71428),
                 it('V2', 'Bolsas', 3868), it('W1', 'Cajones', 1644), it('W1P', 'Bolsas', 1667)];
const GARAGE = [it('GRJ10', 'Cajones', 50), it('GRJ10A', 'Cajones', 40), it('GRJ12', null, null),
                it('GRJ2', 'Cajones', 30), it('GRJ9', 'Cajones', 20)];

const STUB = `
window.supabase = { createClient: function(){ return {
  auth: { getSession: async function(){ return { data: { session: null } }; },
          onAuthStateChange: function(){ return { data: { subscription: { unsubscribe: function(){} } } }; } },
  rpc: async function(name, args){
    var R = ${JSON.stringify({ REMACHE, GARAGE })};
    if(name==='relevamiento_bundle') return { data: { cronograma: [
      { crono_id: 1, sector_id: 8, tipo: 'Sector Remache', fecha: '2026-10-29', dias: 21, componentes: 9, relevamiento: null },
      { crono_id: 2, sector_id: 4, tipo: 'Sector Garage',  fecha: '2026-10-09', dias: 1,  componentes: 5, relevamiento: null } ] }, error: null };
    if(name==='relevamiento_abrir') return { data: args.p_sector_id, error: null };
    if(name==='relevamiento_detalle') return { data: {
      relevamiento: { id: args.p_id, fecha: '2026-10-08', estado: 'en_curso' },
      sector: args.p_id===8 ? 'Sector Remache' : 'Sector Garage',
      items: args.p_id===8 ? R.REMACHE : R.GARAGE }, error: null };
    if(name==='relevamiento_descartar_si_vacio') return { data: true, error: null };
    if(name==='validacion_bundle') return { data: { pendientes: [
      { id: 8, sector: 'Sector Remache', fecha: '2026-10-08', contados: 9, items: 9, difieren: 0 } ], aplicados: [] }, error: null };
    if(name==='relevamiento_comparar') return { data: {
      relevamiento: { id: 8, fecha: '2026-10-08', estado: 'contado', sector: 'Sector Remache' },
      items: R.REMACHE.map(function(i){ return { item_id: i.item_id, codigo: i.codigo, descripcion: i.descripcion,
        programa: 0, conteo: 0, diferencia: 0, contado: true, decision: 'conteo' }; }) }, error: null };
    return { data: null, error: { message: 'rpc desconocida '+name } };
  }
};}};
`;

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  page.on('dialog', d => d.accept());
  await page.route('**/@supabase/supabase-js@2**', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/GP2_favicon.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));

  const ok = (c, msg) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + msg); if (!c) process.exitCode = 1; };
  const codigos = () => page.$$eval('#cargaBody tr[data-row] .cod', xs => xs.map(x => x.textContent));
  const abrir = async (sector) => {
    await page.click('[data-abrir="' + sector + '"]');
    await page.waitForFunction(() => document.querySelectorAll('#cargaBody tr[data-row]').length > 0);
  };

  await page.goto(ROOT + '/Relevamiento/Relevamiento_GP2.html');
  await page.waitForSelector('[data-abrir]');

  // ── Garage: un solo envase → una sola tabla, en orden natural ──
  await abrir(4);
  const g = await codigos();
  ok(g.join(' ') === 'GRJ2 GRJ9 GRJ10 GRJ10A GRJ12', 'Garage en orden alfanumerico natural — ' + g.join(' '));
  ok(await page.$$eval('#cargaBody tr.grupo', xs => xs.length) === 0, 'Garage: un solo envase, la tabla no se parte');
  const hg = await page.$eval('#cargaHead', e => e.textContent);
  ok(/Cajones/.test(hg) && /Sueltas/.test(hg), 'Garage: el encabezado de siempre — ' + hg);
  await page.click('#btnVolver');
  await page.waitForSelector('[data-abrir="8"]', { state: 'visible' });

  // ── Remache: Bolsas y Cajones → dos bloques, cada uno ordenado ──
  await abrir(8);
  const tit = await page.$$eval('#cargaBody tr.grupo', xs => xs.map(x => x.textContent.trim()));
  ok(tit.length === 2 && tit[0] === 'Bolsas · 4' && tit[1] === 'Cajones · 5',
     'Remache partido en 2: primero Bolsas, despues Cajones — ' + JSON.stringify(tit));
  const subs = await page.$$eval('#cargaBody tr.sub', xs => xs.map(x => x.textContent));
  ok(subs.length === 2 && /Bolsas/.test(subs[0]) && /Cajones/.test(subs[1]),
     'cada bloque tiene su encabezado con su envase — ' + JSON.stringify(subs));
  ok((await page.$eval('#cargaHead', e => e.textContent)) === '', 'partida en bloques, el encabezado de arriba no se repite');
  const filas = await page.$$eval('#cargaBody tr', xs => xs.map(x => x.classList.contains('grupo') ? '|' :
    (x.querySelector('.cod') ? x.querySelector('.cod').textContent : null)).filter(Boolean));
  ok(filas.join(' ') === '| V1 V2 V10 W1P | CV1 CV2 CV11 V1SE W1',
     'dentro de cada bloque, orden natural — ' + filas.join(' '));
  const ayuda = await page.$eval('#cargaAyuda', e => e.textContent);
  ok(/bolsas o cajones/.test(ayuda), 'la ayuda nombra los dos envases — ' + ayuda);

  // el total sigue usando el factor de SU envase
  await page.fill('input[data-k="envases"][data-id="4"]', '2');      // V1: 2 bolsas × 5.714
  await page.dispatchEvent('input[data-k="envases"][data-id="4"]', 'input');
  ok((await page.$eval('[data-tot="4"]', e => e.textContent)) === '11.428', 'V1: 2 bolsas = 11.428 uni');
  ok((await page.$eval('#cargaProg', e => e.textContent)).startsWith('1 de 9'), 'el progreso cuenta las filas de los dos bloques');

  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= 390, '390px: la pagina no scrollea horizontal — ' + sw);

  // ── Validacion de Stock: mismo orden natural ──
  await page.goto(ROOT + '/Relevamiento/Validacion_Stock.html');
  await page.click('[data-ver="8"]');
  await page.waitForFunction(() => document.querySelectorAll('#compBody tr').length > 0);
  const v = await page.$$eval('#compBody .cod', xs => xs.map(x => x.textContent));
  ok(v.join(' ') === 'CV1 CV2 CV11 V1 V1SE V2 V10 W1 W1P', 'Validacion en orden alfanumerico natural — ' + v.join(' '));

  await browser.close();
  if (process.exitCode) console.log('\nHAY FALLOS'); else console.log('\nTODO OK');
})();
