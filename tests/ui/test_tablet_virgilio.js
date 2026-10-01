/* Tablet v1.40.0-R (2026-10-01) — REARMADO tras el revert de Luis del 01/10 [Thomas: "quiero que vuelvas
   a hacer lo que te había pedido… la única corrección es que se aumente el stock si hay un envío a
   Virgilio… y se disminuya si hay una recepción de Plásticos, Flejes, Cajas, SC y SP"].
   Con Supabase STUBEADO (la forma de tablet_bundle es la de la base). Fija:
     1. Enviar tiene la baldosa Virgilio;
     2. Talleristas → Fábrica: se MANDA A PRODUCIR en cajas — el título lo dice, la referencia es el
        stock de Art. Terminado en cajas, no hay "Otro cartón", y registrar manda tipo tallerista ref 3
        con las UNIDADES (cajas × artículos por caja);
     3. Enviar → Virgilio: tres bloques en el orden del pedido (Art. Terminados, Insumos por sector, SC,
        SP); el terminado se carga en cajas y viaja en unidades, el fleje en kg;
     4. Recibir → Virgilio: el importado sale suelto junto a lo que vuelve (SC/SP/insumos); si el remito
        del importado viene en envases (C13 en cajas de 144) se carga en cajas y viaja en unidades, y al
        registrar va DIRECTO a su control en kg; lo que vuelve (no importado) registra tipo virgilio sin
        tocar ningún botón de Cervantes;
     5. a 390px no hay scroll horizontal;
     6. NO queda nada del aviso Sí/No cruzado con Gestión Virgilio (D4/v1.41.0: eso pedía tocar GV y
        Thomas pidió no tocar GV en este pedido) — ni vir_pend ni vir_deneg se muestran en pantalla. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };

const T = (o) => Object.assign({ tipo: 'virgilio', ref: 'virgilio', uxc: null, kg_x_uni: null, saldo_dest: 0, maximo: null, stock_dest: null, sugerido: null }, o);
const BUNDLE = {
  generado_en: '2026-10-01T12:00:00Z', alertas_abiertas: 0,
  contrapartes: [
    { tipo: 'tallerista', ref: '6', nombre: 'Martin Cornejo', n_env: 1, n_rec: 0 },
    { tipo: 'tallerista', ref: '3', nombre: 'Fábrica', n_env: 2, n_rec: 0 },
    { tipo: 'virgilio', ref: 'virgilio', nombre: 'Virgilio', n_env: 6, n_rec: 3 },
  ],
  enviar: [
    { tipo: 'tallerista', ref: '6', comp_id: 70, cod: 'A10', desc: 'Cpo Una', sector: 'Sector Crudo', sec_id: 1, um: 'unidad', uxc: 1000, kg_x_uni: 0.01, online_sector: 120, saldo_dest: 0, maximo: 200, stock_dest: 0, sugerido: 150, env_unidad: 'cajones', env_factor: 1000, env_carga: 'kg' },
    // FÁBRICA: sus artículos terminados, en cajas (articulos_por_caja), sin sugerido
    { tipo: 'tallerista', ref: '3', comp_id: 762, cod: '058', desc: 'Cierra Bolsa x2', sector: 'Terminado', sec_id: 12, um: 'unidad', uxc: 12, kg_x_uni: null, online_sector: 24, saldo_dest: 0, maximo: null, stock_dest: null, sugerido: null, env_unidad: 'cajas', env_factor: 12, env_carga: 'envase' },
    { tipo: 'tallerista', ref: '3', comp_id: 660, cod: '390', desc: 'Cuchara Calada Nylon 1 Pza', sector: 'Terminado', sec_id: 12, um: 'unidad', uxc: 24, kg_x_uni: null, online_sector: 0, saldo_dest: 0, maximo: null, stock_dest: null, sugerido: null, env_unidad: 'cajas', env_factor: 24, env_carga: 'envase' },
    // VIRGILIO: desordenado a propósito para fijar el orden de los bloques
    T({ comp_id: 80, cod: 'A1', desc: 'Mgo Plano 501 Pint.', sector: 'Sector Procesado', sec_id: 2, grupo: 'SP', um: 'unidad', uxc: 756, online_sector: 500 }),
    T({ comp_id: 5, cod: 'A10', desc: 'Cpo Una', sector: 'Sector Crudo', sec_id: 1, grupo: 'SC', um: 'unidad', online_sector: 100 }),
    T({ comp_id: 640, cod: 'PV6', desc: 'Pala Cuchara', sector: 'Sector Plástico', sec_id: 6, grupo: 'Insumos', um: 'unidad', online_sector: 2000 }),
    T({ comp_id: 762, cod: '058', desc: 'Cierra Bolsa x2', sector: 'Terminado', sec_id: 12, grupo: 'Art. Terminados', um: 'unidad', online_sector: 24, env_unidad: 'cajas', env_factor: 12, env_carga: 'envase' }),
    T({ comp_id: 900, cod: 'F12', desc: 'Fleje 12', sector: 'Sector Fleje', sec_id: 5, grupo: 'Insumos', um: 'kg', online_sector: 150.5 }),
    T({ comp_id: 463, cod: 'A9', desc: 'Caja N°9', sector: 'Sector Caja', sec_id: 11, grupo: 'Insumos', um: 'unidad', online_sector: 30 }),
  ],
  recibir: [
    { tipo: 'virgilio', ref: 'virgilio', comp_id: 547, comp_entrada_id: null, n_entradas: 0, tiene_bom: false, cod_art: null, cod: 'C13', desc: 'Corta Queso Bastidor c/Cilindro', sector: 'Sector Procesado', um: 'unidad', uxc: null, kg_x_uni: 0.0305, por_caja: null, remito_unidad: 'envase', env_unidad: 'cajas', env_factor: 144, esperado: null, esperado_origen: null, importado: true, sector_id: 2, proveedor: 'Importado' },
    { tipo: 'virgilio', ref: 'virgilio', comp_id: 949, comp_entrada_id: null, n_entradas: 0, tiene_bom: false, cod_art: null, cod: 'GRJ31', desc: 'Ralladores', sector: 'Sector Garage', um: 'unidad', uxc: null, kg_x_uni: null, por_caja: null, remito_unidad: 'uni', esperado: null, esperado_origen: null, importado: true, sector_id: 9, proveedor: 'Importado' },
    // NO importado: SC/SP/insumos que VUELVEN de Virgilio (el "recepción de Plásticos, Flejes,
    // Cajas, SC y SP" que Thomas pidió mantener) — mismo tipo "virgilio", importado:false.
    { tipo: 'virgilio', ref: 'virgilio', comp_id: 373, comp_entrada_id: null, n_entradas: 0, tiene_bom: false, cod_art: null, cod: 'IC3V', desc: 'Fleje N° 90 LARGO', sector: 'Sector Fleje', um: 'kg', uxc: 24, kg_x_uni: 0.0134, por_caja: null, esperado: 20, esperado_origen: 'online_virgilio', importado: false, sector_id: 5, proveedor: null },
  ],
};

const STUB = `
window.supabase = { createClient: function(){ return {
  rpc: async function(name, args){
    try { var L = JSON.parse(sessionStorage.getItem('__calls') || '[]'); L.push({ name: name, args: args }); sessionStorage.setItem('__calls', JSON.stringify(L)); } catch(e){}
    if (name === 'tablet_bundle') return { data: JSON.parse(JSON.stringify(${JSON.stringify(BUNDLE)})), error: null };
    if (name === 'ingreso_virgilio_pendientes') return { data: [], error: null };
    if (name === 'control_entrega_bundle') return { data: { pend: [], insumos_pend: [] }, error: null };
    if (name === 'tablet_registrar') return { data: { ok: true, n: (args.p.items || []).length, contraparte: args.p.tipo === 'virgilio' ? 'Virgilio' : 'Fábrica', modo: args.p.modo, items: [], alertas: [] }, error: null };
    return { data: null, error: { message: 'rpc desconocida ' + name } };
  },
  from: function(){ var q = { select: function(){ return q; }, eq: function(){ return q; }, order: function(){ return q; },
    then: function(r){ return Promise.resolve({ data: [], error: null }).then(r); } }; return q; }
};}};
`;

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  const dialogs = [];
  page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  await page.route('**/@supabase/supabase-js@2**', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/*.png*', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
  const calls = (n) => page.evaluate(n => { try { return JSON.parse(sessionStorage.getItem('__calls') || '[]').filter(c => c.name === n); } catch (e) { return []; } }, n);
  const cards = () => page.$$eval('#cardsGrid .parte-card:not(.otro)', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  const abrir = async (cod) => { await page.click('#cardsGrid .parte-card[data-k^="' + cod + ':"]'); await page.waitForSelector('#detCard input[data-f="q"]'); };

  await page.goto(ROOT + '/Tablet/Tablet_GP2.html?modo=enviar');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);

  // ── 1) Enviar tiene Virgilio ──
  const vt = await page.$('#tipoGrid .tipo-btn[data-tipo="virgilio"]');
  ok(!!vt && /art\. terminados, insumos, SC y SP/.test(await vt.textContent()), 'Enviar: está la baldosa Virgilio');

  // ── 2) Talleristas → Fábrica: mandar a producir en cajas ──
  await page.click('#tipoGrid .tipo-btn[data-tipo="tallerista"]');
  await page.click('#cpGrid .prov-btn:has-text("Fábrica")');
  await page.waitForSelector('#cardsGrid .parte-card');
  ok(/Fábrica · mandar a producir \(cajas\)/.test(await page.$eval('#fase1Title', e => e.textContent)), 'el título dice que a Fábrica se le manda a producir en cajas');
  let cs = await cards();
  const c058 = cs.find(c => c.startsWith('058')) || '';
  ok(/Cierra Bolsa x2/.test(c058) && /Stock Art\. Terminado 2 cajas/.test(c058), 'la tarjeta muestra el artículo y su stock de Art. Terminado en cajas — ' + c058);
  ok(await page.locator('#cardsGrid .parte-card.otro').count() === 0, 'a Fábrica no se le ofrece "Otro cartón"');
  await abrir('762');
  const det = await page.$eval('#detCard', e => e.textContent.replace(/\s+/g, ' '));
  ok(/Cantidad a producir/.test(det) && /cajas/.test(det), 'la vista de la parte pide la "Cantidad a producir" en cajas — ' + det.slice(0, 160));
  await page.fill('#detCard input[data-f="q"]', '3');
  await page.click('#btnVolverPartes');
  await page.click('#btnEnviar');
  await page.waitForSelector('#fase3:not(.hidden)');
  ok(dialogs.some(d => /^Producir en Fábrica/.test(d) && /058: 3 cajas/.test(d)), 'el confirm dice "Producir en Fábrica … 058: 3 cajas"');
  let reg = (await calls('tablet_registrar')).pop();
  ok(reg && reg.args.p.tipo === 'tallerista' && reg.args.p.ref === '3' && reg.args.p.modo === 'enviar',
     'registra a la Fábrica (tallerista ref 3)');
  const it0 = reg && reg.args.p.items[0];
  ok(it0 && it0.comp_id === 762 && it0.cantidad === 36 && it0.unidad === 'uni', '3 cajas de 12 viajan como 36 unidades — ' + JSON.stringify(it0));
  ok((await page.$eval('#successTitle', e => e.textContent)) === '✓ Producido', 'el éxito dice "Producido"');

  // ── 3) Enviar → Virgilio: tres bloques, y SIN el aviso cruzado con GV (D4 no entra acá) ──
  await page.goto(ROOT + '/Tablet/Tablet_GP2.html?modo=enviar');
  await page.waitForSelector('#tipoGrid .tipo-btn[data-tipo="virgilio"]');
  await page.click('#tipoGrid .tipo-btn[data-tipo="virgilio"]');
  await page.waitForSelector('#cardsGrid .parte-card');
  const bloques = await page.$$eval('#cardsGrid .pc-rubro', xs => xs.map(x => x.textContent.trim()));
  ok(JSON.stringify(bloques) === JSON.stringify(['Art. Terminados', 'Insumos · Caja', 'Insumos · Fleje', 'Insumos · Plástico', 'SC', 'SP']),
     'Virgilio: Art. Terminados, Insumos (por sector), SC y SP, en ese orden — ' + bloques.join(' | '));
  cs = await cards();
  ok(/Stock Art\. Terminado 2 cajas/.test(cs[0] || ''), 'el terminado dice su stock en cajas — ' + cs[0]);
  ok(cs.some(c => /^A1uni/.test(c) && /Stock Cervantes 500 uni/.test(c)), 'el SP dice el stock de Cervantes — ' + cs.find(c => /^A1uni/.test(c)));
  ok(!cs.some(c => /Virgilio no confirmó|Denegado por Virgilio/.test(c)), 'NADA de aviso cruzado con GV (D4 no se tocó en este pedido)');
  const horiz = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  ok(!horiz, '390px: sin scroll horizontal');
  await abrir('762'); await page.fill('#detCard input[data-f="q"]', '1'); await page.click('#btnVolverPartes');
  await abrir('900'); await page.fill('#detCard input[data-f="q"]', '10,5'); await page.click('#btnVolverPartes');
  await page.click('#btnEnviar');
  await page.waitForSelector('#fase3:not(.hidden)');
  reg = (await calls('tablet_registrar')).pop();
  const its = (reg && reg.args.p.items) || [];
  const i762 = its.find(i => i.comp_id === 762) || {}, i900 = its.find(i => i.comp_id === 900) || {};
  ok(reg && reg.args.p.tipo === 'virgilio' && reg.args.p.ref === 'virgilio', 'registra a Virgilio');
  ok(i762.cantidad === 12 && i762.unidad === 'uni', '1 caja del terminado viaja como 12 unidades — ' + JSON.stringify(i762));
  ok(i900.cantidad === 10.5 && i900.unidad === 'kg', 'el fleje viaja en kg (10,5) — ' + JSON.stringify(i900));

  // ── 4) Recibir → Virgilio: importado suelto + lo que vuelve (SC/SP/insumos), C13 en cajas de 144 ──
  await page.goto(ROOT + '/Tablet/Tablet_GP2.html?modo=recibir');
  await page.waitForSelector('#tipoGrid .tipo-btn[data-tipo="virgilio"]');
  await page.click('#tipoGrid .tipo-btn[data-tipo="virgilio"]');
  await page.waitForSelector('#tbody tr');
  const filas = await page.$$eval('#tbody tr', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  ok(filas.some(f => /^C13/.test(f)) && filas.some(f => /^GRJ31/.test(f)) && filas.some(f => /^IC3V/.test(f)),
     'los importados salen sueltos junto a lo que vuelve (SC/SP/insumos) — ' + filas.map(f => f.split(' ')[0]).join(', '));
  ok(/C13\s*cajas/.test(filas.find(f => /^C13/.test(f)) || ''), 'C13 se carga en cajas (remito en envases)');
  const inp = page.locator('#tbody tr:has-text("C13") input.cell-in');
  await inp.fill('3');
  await inp.dispatchEvent('input');
  ok(/= 432 unidades/.test(await page.locator('#tbody tr:has-text("C13") .env-eq').textContent()), 'debajo: 3 cajas = 432 unidades');
  await page.fill('#fRemito', 'R-7');
  await Promise.all([
    page.waitForURL(/StockFlejes\/control-remaches\.html\?sector=2&prov=Importado/, { timeout: 8000 }).catch(() => {}),
    page.click('#btnEnviar'),
  ]);
  ok(/StockFlejes\/control-remaches\.html\?sector=2&prov=Importado/.test(page.url()), 'después del remito va directo al control en kg del Importado — ' + page.url());
  reg = (await calls('tablet_registrar')).pop();
  const ic = reg && reg.args.p.items[0];
  ok(reg && reg.args.p.modo === 'recibir' && reg.args.p.tipo === 'virgilio' && reg.args.p.remito === 'R-7', 'registra la recepción de Virgilio con el remito');
  ok(ic && ic.comp_id === 547 && ic.cantidad === 432 && ic.unidad === 'uni', 'C13: 3 cajas viajan como 432 unidades — ' + JSON.stringify(ic));

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
