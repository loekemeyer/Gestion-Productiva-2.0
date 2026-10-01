const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

/* EL INYECTOR APARECE EN PLASTICOS AUNQUE TENGA 0 PIEZAS (2026-10-01, usuario: "Agrega a
   Kollplast como inyector aunque tenga 0 piezas que hoy nos entrega ... porque las matrices las
   podemos ir cambiando de proveedor y el dia de manana puede cambiar").

   recepcion_bundle manda proveedores[].es_inyector (= tiene ubicacion de inyector). Lo que fija:

     1. En Plasticos, el inyector sin piezas sale como chip con (0); los que tienen piezas, con
        su conteo de siempre.
     2. Un proveedor que NO es inyector y no tiene piezas sigue escondido (regla 2026-09-01:
        "todo lo que sea 0 no me aparezca como opcion").
     3. El inyector no se cuela en otro rubro (Cajas).
     4. Elegido el inyector con 0 piezas, la grilla queda vacia con el cartel que dice donde se
        le asignan las piezas. */

function plast(id, cod, prov) {
  return { comp_id: id, codigo: cod, descripcion: 'Pieza ' + cod, sector: 'Sector Plástico', sector_id: 6,
           um: 'unidad', proveedor: prov, proveedores_alt: [], kg_x_uni: 0.01, recibe_en_cajas: false,
           stock: 0, ultima: null, oc_pend: null };
}
const prov = (nombre, iny) => ({ nombre, modo_control: 'ninguno', informa_rollos: false, factura_uni: false, es_inyector: iny });

const BUNDLE = {
  tara: { tara_pallet: '20', tol_ctrl_pct: '5', carton_uni_x_paquete: '250' },
  sectores: [{ id: 6, nombre: 'Sector Plástico' }, { id: 11, nombre: 'Sector Caja' }],
  proveedores: [
    prov('Kollplast', true),            // inyector, 0 piezas hoy
    prov('Pat Bet Plast', true),        // inyector con piezas
    prov('Simco', false),               // no es inyector y no tiene piezas en Plasticos
    prov('Corrugadora del Plata', false),
  ],
  recepciones: [], pallets: [], rollos: [],
  insumos: [
    plast(1, 'PA7A', 'Pat Bet Plast'),
    plast(2, 'PA7B', 'Pat Bet Plast'),
    { comp_id: 3, codigo: 'A1', descripcion: 'Caja N°1', sector: 'Sector Caja', sector_id: 11, um: 'unidad',
      proveedor: 'Corrugadora del Plata', proveedores_alt: [], kg_x_uni: null, recibe_en_cajas: false,
      stock: 0, ultima: null, oc_pend: null },
  ],
};

const STUB = 'window.supabase={createClient:function(){return{'
  + 'rpc:async function(n,a){'
  + ' if(n==="recepcion_bundle") return {data:' + JSON.stringify(BUNDLE) + ',error:null};'
  + ' if(n==="control_recepcion_bundle") return {data:{},error:null};'
  + ' return {data:{ok:true},error:null}; },'
  + 'from:function(){ var q={select:function(){return q;},update:function(){return q;},'
  + 'eq:function(){return Promise.resolve({data:[],error:null});},'
  + 'in:function(){return Promise.resolve({data:[],error:null});}}; return q; }'
  + '};}};';

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };

  await page.route(/supabase-js@2/, r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/supabase-config.js*', r => r.fulfill({ contentType: 'application/javascript', body: 'self.SB_URL="x";self.SB_ANON="y";self.GP2_SB=function(o){return self.supabase.createClient("x","y",o||{db:{schema:"GP2"}});};' }));
  await page.route('**/auth-guard.js*', r => r.fulfill({ contentType: 'application/javascript', body: 'window.GP2_AUTH_ON=false;' }));
  await page.route('**/GP2_favicon.png*', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));

  // ── 1) y 2) chips de Plasticos ────────────────────────────────────────
  await page.goto(ROOT + '/StockFlejes/RecepcionInsumos_GP2.html');
  await page.click('#rubroGrid button:has-text("Plásticos")');
  await page.waitForSelector('#provGrid .prov-btn');
  let chips = (await page.locator('#provGrid .prov-btn').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
  ok(chips.some(t => /^Kollplast \(0\)$/.test(t)), 'Kollplast aparece con (0) (salió: ' + JSON.stringify(chips) + ')');
  ok(chips.some(t => /^Pat Bet Plast \(2\)$/.test(t)), 'Pat Bet Plast con sus 2 piezas');
  ok(!chips.some(t => /Simco/.test(t)), 'un proveedor que no es inyector y tiene 0 piezas sigue escondido');

  // ── 3) no se cuela en otro rubro ──────────────────────────────────────
  await page.click('#rubroGrid button:has-text("Cajas")');
  await page.waitForSelector('#provGrid .prov-btn');
  chips = (await page.locator('#provGrid .prov-btn').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
  ok(!chips.some(t => /Kollplast|Pat Bet/.test(t)), 'los inyectores no aparecen en Cajas (salió: ' + JSON.stringify(chips) + ')');

  // ── 4) elegido con 0 piezas: grilla vacia y el cartel dice donde se asignan ──
  await page.click('#rubroGrid button:has-text("Plásticos")');
  await page.click('#provGrid button:has-text("Kollplast")');
  ok(!(await page.locator('#btnContinuar').isDisabled()), 'con Kollplast elegido se puede continuar');
  await page.click('#btnContinuar');
  await page.waitForSelector('#itemsEmpty:not(.hidden)');
  ok((await page.locator('.item-btn').count()) === 0, 'Kollplast no muestra piezas');
  const cartel = await page.locator('#itemsEmpty').innerText();
  ok(/Kollplast no tiene piezas asignadas hoy/.test(cartel) && /Quién hace cada parte/.test(cartel),
     'el cartel explica que no tiene piezas y dónde se asignan (salió: ' + JSON.stringify(cartel) + ')');

  await browser.close();
})();
