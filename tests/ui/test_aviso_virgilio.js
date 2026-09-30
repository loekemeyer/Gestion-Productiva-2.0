// v1.216.0 (2026-09-30): el aviso de Gestión Virgilio sale de la PORTADA y pasa a Recepción de Insumos >
// Importados, en la tarjeta del componente, con Sí / No [usuario: "El cartel amarillo de GP2 quiero que lo
// elimines de donde está ahora y que en el módulo de recepción de insumos (dentro de importados) me aparezca
// una notificación en el sector correspondiente diciendo «Gestión Virgilio notificó que recibiste 3000
// unidades de GRJ31: Sí/No»"].
// Este test fija:
//   A. la portada ya no tiene el cartel ni lee ingreso_virgilio;
//   B. el botón Importados lleva 🔔 N; el aviso sale en la tarjeta de SU componente (GRJ31) y en ninguna otra;
//      un aviso sin componente vinculado sale arriba de la grilla con el Sí apagado;
//   C. Sí llama resolver_ingreso_virgilio(p_acepta=true), NO abre el popup de cantidad, avisa que falta el
//      control en kg con el link a su pantalla (GP2CI) y el aviso desaparece;
//   D. No pide el motivo (opcional) y manda p_acepta=false con ese motivo;
//   E. si la RPC de avisos falla, la pantalla anda igual: sin 🔔 y sin errores.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };

function imp(id, cod, desc, sector) {
  return { comp_id: id, codigo: cod, descripcion: desc, sector_id: sector, um: 'unidad', proveedor: 'Importado',
           proveedores_alt: [], estado_compra: 'importado', remito_unidad: 'uni', kg_x_uni: null,
           recibe_en_cajas: false, stock: 0, ultima: null, oc_pend: null };
}
const BUNDLE = {
  tara: { tara_pallet: '20', tol_ctrl_pct: '5', carton_uni_x_paquete: '250' },
  proveedores: [{ nombre: 'Importado', modo_control: 'ninguno', informa_rollos: false, factura_uni: false }],
  recepciones: [], pallets: [], rollos: [],
  insumos: [imp(949, 'GRJ31', 'Ralladores', 9), imp(163, 'D1', 'Espiral Sacacorcho', 2)],
};
const AVISOS = [
  { id: 10, creado_en: '2026-09-30T18:31:00Z', cod_importado: '323ES', cod_insumo: '323ES', descripcion: 'Rallador 4 Lados Mini Suelto',
    cantidad: 3000, unidad: 'unidades', unidades: 3000, proveedor: 'Hugo Wong', pedido_ref: '323ES suelto',
    componente_id: 949, codigo: 'GRJ31', sector_id: 9, comp_proveedor: 'Importado' },
  { id: 11, creado_en: '2026-09-30T18:40:00Z', cod_importado: 'XYZ9', cod_insumo: null, descripcion: 'algo sin vincular',
    cantidad: 5, unidad: 'cajas', unidades: 60, proveedor: 'Kangli', pedido_ref: null,
    componente_id: null, codigo: null, sector_id: null, comp_proveedor: null },
];

const stub = (modo) => 'window.supabase={createClient:function(){return{'
  + 'rpc:async function(n,a){ if(window.__log) window.__log(n,a);'
  + ' if(n==="recepcion_bundle") return {data:' + JSON.stringify(BUNDLE) + ',error:null};'
  + ' if(n==="ingreso_virgilio_pendientes") return ' + (modo === 'error' ? '{data:null,error:{message:"caida"}}' : '{data:' + JSON.stringify(AVISOS) + ',error:null}') + ';'
  + ' if(n==="resolver_ingreso_virgilio") return a.p_acepta'
  + '   ? {data:{ok:true,estado:"confirmado",recepcion_id:77,remito:"Virgilio #10",codigo:"GRJ31",sector_id:9,proveedor:"Importado",unidades:3000},error:null}'
  + '   : {data:{ok:true,estado:"denegado",virgilio_revertido:true,virgilio_error:null},error:null};'
  + ' return {data:{ok:true},error:null}; },'
  + 'from:function(t){ if(window.__log) window.__log("from:"+t,null); var q={select:function(){return q;},order:function(){return q;},'
  + 'eq:function(){return Promise.resolve({data:[],error:null});},in:function(){return Promise.resolve({data:[],error:null});},'
  + 'then:function(r){return Promise.resolve({data:[],error:null}).then(r);}}; return q; }'
  + '};}};';

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});

  // ── A) la portada ya no tiene el cartel ────────────────────────────────
  {
    const page = await browser.newPage();
    const llamadas = [];
    page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
    await page.exposeFunction('__log', (n) => { llamadas.push(n); });
    await page.route('**/@supabase/supabase-js@2', r => r.fulfill({ contentType: 'application/javascript', body: stub('con') }));
    await page.route('**/auth-guard.js*', r => r.fulfill({ contentType: 'application/javascript', body: '' }));
    await page.route('**/*.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
    await page.goto(ROOT + '/GP2_MODULOS.html');
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({ box: !!document.getElementById('avisoVirgilio'), t: document.body.textContent }));
    ok(!r.box && !/VIRGILIO DICE QUE TE LLEGÓ ESTO/.test(r.t), 'la portada ya no tiene el cartel amarillo');
    ok(!llamadas.some(n => /ingreso_virgilio/.test(n)), 'la portada ya no lee ingreso_virgilio (' + llamadas.join(',') + ')');
    await page.close();
  }

  // ── B/C/D) Recepción de Insumos > Importados ───────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
    const rpcs = [];
    await ctx.exposeFunction('__log', (n, a) => { rpcs.push([n, a]); });
    await page.route(/supabase-js@2/, r => r.fulfill({ contentType: 'application/javascript', body: stub('con') }));
    await page.route('**/supabase-config.js*', r => r.fulfill({ contentType: 'application/javascript', body: 'self.SB_URL="x";self.SB_ANON="y";self.GP2_SB=function(o){return self.supabase.createClient("x","y",o||{db:{schema:"GP2"}});};' }));
    await page.route('**/auth-guard.js*', r => r.fulfill({ contentType: 'application/javascript', body: 'window.GP2_AUTH_ON=false;' }));
    await page.route('**/GP2_favicon.png*', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
    await page.goto(ROOT + '/StockFlejes/RecepcionInsumos_GP2.html');
    await page.waitForFunction(() => document.querySelector('#rubroGrid .vir-badge'), null, { timeout: 5000 }).catch(() => {});
    const badge = await page.evaluate(() => { const b = document.querySelector('#rubroGrid .prov-btn[data-rubro="Importados"] .vir-badge'); return b ? b.textContent : null; });
    ok(badge === '🔔 2', 'el botón Importados lleva 🔔 2 (salió: ' + badge + ')');

    await page.click('#rubroGrid button[data-rubro="Importados"]');
    await page.click('#btnContinuar');
    await page.waitForSelector('#itemsGrid .item-btn');
    const tarjetas = await page.evaluate(() => [...document.querySelectorAll('#itemsGrid .item-btn')].map(b => ({
      cod: b.querySelector('.code').textContent, aviso: (b.querySelector('.vir-aviso') || {}).textContent || '',
      si: !!b.querySelector('[data-vir-acc="si"]'), no: !!b.querySelector('[data-vir-acc="no"]') })));
    const grj = tarjetas.find(t => t.cod === 'GRJ31') || {}, d1 = tarjetas.find(t => t.cod === 'D1') || {};
    ok(/Gestión Virgilio notificó que recibiste 3\.000 unidades de GRJ31/.test(grj.aviso) && grj.si && grj.no,
       'GRJ31 dice «Gestión Virgilio notificó que recibiste 3.000 unidades de GRJ31» con Sí y No (' + grj.aviso.slice(0, 120) + ')');
    ok(/323ES/.test(grj.aviso) && /Hugo Wong/.test(grj.aviso), 'el aviso dice el código de Virgilio y el proveedor');
    ok(!d1.aviso, 'D1 no tiene aviso (no es suyo)');
    const suelto = await page.evaluate(() => { const a = document.querySelector('#virSueltos .vir-aviso'); return a ? { t: a.textContent, siOff: a.querySelector('[data-vir-acc="si"]').disabled } : null; });
    ok(suelto && /XYZ9/.test(suelto.t) && /60 unidades/.test(suelto.t) && suelto.siOff,
       'el aviso sin componente sale arriba de la grilla, en unidades y con el Sí apagado');

    // C) Sí
    await page.click('#itemsGrid .item-btn:has(.code:text-is("GRJ31")) [data-vir-acc="si"]');
    await page.waitForFunction(() => !document.getElementById('virMsg').hidden, null, { timeout: 5000 }).catch(() => {});
    const siArgs = (rpcs.filter(r => r[0] === 'resolver_ingreso_virgilio').pop() || [])[1];
    ok(siArgs && siArgs.p_id === 10 && siArgs.p_acepta === true && siArgs.p_motivo === null, 'Sí manda p_id=10, p_acepta=true (' + JSON.stringify(siArgs) + ')');
    const trasSi = await page.evaluate(() => ({
      popup: document.getElementById('kgPopup').classList.contains('open'),
      msg: document.getElementById('virMsg').textContent, link: (document.querySelector('#virMsg a.vir-ctrl') || {}).getAttribute ? document.querySelector('#virMsg a.vir-ctrl').getAttribute('href') : null,
      grjAviso: !!document.querySelector('#itemsGrid .item-btn.con-aviso-vir'),
      badge: (document.querySelector('#rubroGrid .vir-badge') || {}).textContent || null }));
    ok(!trasSi.popup, 'tocar Sí NO abre el popup de cantidad');
    ok(/Entraron 3\.000 u de GRJ31/.test(trasSi.msg) && /control en kg/.test(trasSi.msg), 'dice que entró y que falta el control en kg (' + trasSi.msg + ')');
    ok(trasSi.link === 'control-remaches.html?sector=9', 'el link va al control del Garage (' + trasSi.link + ')');
    ok(!trasSi.grjAviso && trasSi.badge === '🔔 1', 'el aviso de GRJ31 desaparece y el botón queda en 🔔 1');

    // la tarjeta sigue abriendo su popup como siempre
    await page.click('#itemsGrid .item-btn:has(.code:text-is("GRJ31")) .desc');
    ok(await page.evaluate(() => document.getElementById('kgPopup').classList.contains('open')), 'tocar la tarjeta (fuera del aviso) sigue abriendo el popup');
    await page.evaluate(() => cerrarPopup());

    // D) No, con motivo
    await page.click('#virSueltos [data-vir-acc="no"]');
    const lbl = await page.evaluate(() => { const l = document.querySelector('#virSueltos .vir-lbl'); return l ? l.textContent : null; });
    ok(/¿Por qué no llegó\? \(opcional\)/.test(lbl || ''), 'No pide el motivo con etiqueta visible');
    await page.fill('#virSueltos .vir-mot', 'no vino nada');
    await page.click('#virSueltos [data-vir-acc="confirmar-no"]');
    await page.waitForFunction(() => /Denegado por Cervantes/.test(document.getElementById('virMsg').textContent), null, { timeout: 5000 }).catch(() => {});
    const noArgs = (rpcs.filter(r => r[0] === 'resolver_ingreso_virgilio').pop() || [])[1];
    ok(noArgs && noArgs.p_id === 11 && noArgs.p_acepta === false && noArgs.p_motivo === 'no vino nada', 'No manda p_acepta=false con el motivo (' + JSON.stringify(noArgs) + ')');
    const fin = await page.evaluate(() => ({ msg: document.getElementById('virMsg').textContent, sueltos: document.getElementById('virSueltos').children.length,
      badge: !!document.querySelector('#rubroGrid .vir-badge') }));
    ok(/vuelven a figurar en viaje, con «Denegado por Cervantes»/.test(fin.msg), 'confirma que en Virgilio vuelve a figurar en viaje (' + fin.msg + ')');
    ok(fin.sueltos === 0 && !fin.badge, 'sin avisos pendientes: sin sueltos y sin 🔔');
    await ctx.close();
  }

  // ── E) la RPC de avisos falla: la pantalla anda igual ─────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
    await ctx.exposeFunction('__log', () => {});
    await page.route(/supabase-js@2/, r => r.fulfill({ contentType: 'application/javascript', body: stub('error') }));
    await page.route('**/supabase-config.js*', r => r.fulfill({ contentType: 'application/javascript', body: 'self.SB_URL="x";self.SB_ANON="y";self.GP2_SB=function(o){return self.supabase.createClient("x","y",o||{db:{schema:"GP2"}});};' }));
    await page.route('**/auth-guard.js*', r => r.fulfill({ contentType: 'application/javascript', body: 'window.GP2_AUTH_ON=false;' }));
    await page.route('**/GP2_favicon.png*', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
    await page.goto(ROOT + '/StockFlejes/RecepcionInsumos_GP2.html');
    await page.waitForTimeout(500);
    await page.click('#rubroGrid button[data-rubro="Importados"]');
    await page.click('#btnContinuar');
    await page.waitForSelector('#itemsGrid .item-btn');
    const r = await page.evaluate(() => ({ badge: !!document.querySelector('.vir-badge'), avisos: document.querySelectorAll('.vir-aviso').length,
      cards: document.querySelectorAll('#itemsGrid .item-btn').length }));
    ok(!r.badge && r.avisos === 0 && r.cards === 2, 'con la RPC de avisos caída: sin 🔔, sin avisos y las tarjetas igual');
    await ctx.close();
  }

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
