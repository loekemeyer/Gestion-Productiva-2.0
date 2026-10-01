// v1.216.0 (2026-09-30): el aviso de Gestión Virgilio salió de la PORTADA y pasó a Recepción de Insumos >
// Importados [usuario: "El cartel amarillo de GP2 quiero que lo elimines de donde está ahora..."].
// v1.219.0 (2026-09-30): Importados se fue de Recepción de Insumos y el aviso con él: ahora vive en la
// TABLET, Recibir → Virgilio, arriba de las piezas [usuario: "Borra importados dentro de recepcion insumos y
// ponelo aca en recepción «Virgilio» (que no estén dentro del módulo «importados», que estén sueltos)"].
// Este test fija:
//   A. la portada no tiene el cartel ni lee ingreso_virgilio;
//   B. Recepción de Insumos ya no tiene el botón Importados ni lee ingreso_virgilio;
//   C. Tablet → Recibir: la baldosa Virgilio lleva 🔔 2; adentro, los dos avisos arriba de las piezas; el
//      que no tiene componente vinculado sale con el Sí apagado;
//   D. Sí llama resolver_ingreso_virgilio(p_acepta=true), el aviso desaparece y avisa que falta el control
//      en kg con el link a SU pantalla (GP2CI, desde la carpeta Tablet: ../StockFlejes/…);
//   E. No pide el motivo (opcional) y manda p_acepta=false con ese motivo;
//   F. en Enviar → Virgilio no hay avisos;
//   G. si la RPC de avisos falla, la tablet anda igual: sin 🔔 y sin errores.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };

const AVISOS = [
  { id: 10, creado_en: '2026-09-30T18:31:00Z', cod_importado: '323ES', cod_insumo: '323ES', descripcion: 'Rallador 4 Lados Mini Suelto',
    cantidad: 3000, unidad: 'unidades', unidades: 3000, proveedor: 'Hugo Wong', pedido_ref: '323ES suelto',
    componente_id: 949, codigo: 'GRJ31', sector_id: 9, comp_proveedor: 'Importado' },
  { id: 11, creado_en: '2026-09-30T18:40:00Z', cod_importado: 'XYZ9', cod_insumo: null, descripcion: 'algo sin vincular',
    cantidad: 5, unidad: 'cajas', unidades: 60, proveedor: 'Kangli', pedido_ref: null,
    componente_id: null, codigo: null, sector_id: null, comp_proveedor: null },
];
const TABLET = {
  generado_en: '2026-09-30T12:00:00Z', alertas_abiertas: 0,
  contrapartes: [
    { tipo: 'tallerista', ref: '6', nombre: 'Martin Cornejo', n_env: 1, n_rec: 0 },
    { tipo: 'virgilio', ref: 'virgilio', nombre: 'Virgilio', n_env: 1, n_rec: 1 },
  ],
  enviar: [
    { tipo: 'tallerista', ref: '6', comp_id: 70, cod: 'A10', desc: 'Cpo Una', sector: 'Sector Crudo', um: 'unidad', uxc: 1000, kg_x_uni: 0.01, online_sector: 120, saldo_dest: 0, maximo: 0, stock_dest: 0, sugerido: 0 },
    { tipo: 'virgilio', ref: 'virgilio', comp_id: 80, cod: 'A1', desc: 'Mgo Plano 501 Pint.', sector: 'Sector Procesado', sec_id: 2, grupo: 'SP', um: 'unidad', uxc: 756, kg_x_uni: 0.0397, online_sector: 500, saldo_dest: 0, maximo: null, stock_dest: null, sugerido: null },
  ],
  recibir: [
    { tipo: 'virgilio', ref: 'virgilio', comp_id: 949, comp_entrada_id: null, n_entradas: 0, tiene_bom: false, cod_art: null, cod: 'GRJ31', desc: 'Ralladores', sector: 'Sector Garage', um: 'unidad', uxc: null, kg_x_uni: null, por_caja: null, remito_unidad: 'uni', esperado: null, esperado_origen: null, importado: true, sector_id: 9, proveedor: 'Importado' },
  ],
};

const stub = (modo) => 'window.supabase={createClient:function(){return{'
  + 'rpc:async function(n,a){ if(window.__log) window.__log(n,a);'
  + ' if(n==="recepcion_bundle") return {data:{tara:{},proveedores:[],recepciones:[],pallets:[],rollos:[],insumos:[]},error:null};'
  + ' if(n==="tablet_bundle") return {data:' + JSON.stringify(TABLET) + ',error:null};'
  + ' if(n==="control_entrega_bundle") return {data:{pend:[],insumos_pend:[]},error:null};'
  + ' if(n==="ingreso_virgilio_pendientes") return ' + (modo === 'error' ? '{data:null,error:{message:"caida"}}' : '{data:' + JSON.stringify(AVISOS) + ',error:null}') + ';'
  + ' if(n==="resolver_ingreso_virgilio") return a.p_acepta'
  + '   ? {data:{ok:true,estado:"confirmado",recepcion_id:77,remito:"Virgilio #10",codigo:"GRJ31",sector_id:9,proveedor:"Importado",unidades:3000},error:null}'
  + '   : {data:{ok:true,estado:"denegado",virgilio_revertido:true,virgilio_error:null},error:null};'
  + ' return {data:{ok:true},error:null}; },'
  + 'from:function(t){ if(window.__log) window.__log("from:"+t,null); var q={select:function(){return q;},order:function(){return q;},'
  + 'eq:function(){return Promise.resolve({data:[],error:null});},in:function(){return Promise.resolve({data:[],error:null});},'
  + 'then:function(r){return Promise.resolve({data:[],error:null}).then(r);}}; return q; }'
  + '};}};';

async function nueva(browser, modo, rpcs) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  page.on('dialog', d => d.accept());
  await ctx.exposeFunction('__log', (n, a) => { if (rpcs) rpcs.push([n, a]); });
  await page.route(/supabase-js@2/, r => r.fulfill({ contentType: 'application/javascript', body: stub(modo) }));
  await page.route('**/supabase-config.js*', r => r.fulfill({ contentType: 'application/javascript', body: 'self.SB_URL="x";self.SB_ANON="y";self.GP2_SB=function(o){return self.supabase.createClient("x","y",o||{db:{schema:"GP2"}});};' }));
  await page.route('**/auth-guard.js*', r => r.fulfill({ contentType: 'application/javascript', body: 'window.GP2_AUTH_ON=false;' }));
  await page.route('**/*.png*', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
  return page;
}

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});

  // ── A) la portada ya no tiene el cartel ────────────────────────────────
  {
    const rpcs = [];
    const page = await nueva(browser, 'con', rpcs);
    await page.goto(ROOT + '/GP2_MODULOS.html');
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({ box: !!document.getElementById('avisoVirgilio'), t: document.body.textContent }));
    ok(!r.box && !/VIRGILIO DICE QUE TE LLEGÓ ESTO/.test(r.t), 'la portada no tiene el cartel amarillo');
    ok(!rpcs.some(x => /ingreso_virgilio/.test(x[0])), 'la portada no lee ingreso_virgilio');
    await page.close();
  }

  // ── B) Recepción de Insumos: sin Importados y sin avisos ──────────────
  {
    const rpcs = [];
    const page = await nueva(browser, 'con', rpcs);
    await page.goto(ROOT + '/StockFlejes/RecepcionInsumos_GP2.html');
    await page.waitForSelector('#rubroGrid .prov-btn');
    await page.waitForTimeout(300);
    ok(await page.locator('#rubroGrid button[data-rubro="Importados"]').count() === 0, 'Recepción de Insumos ya no tiene el botón Importados');
    ok(!rpcs.some(x => x[0] === 'ingreso_virgilio_pendientes'), 'Recepción de Insumos ya no lee los avisos de Virgilio');
    ok(await page.locator('.vir-badge, .vir-aviso').count() === 0, 'y no dibuja ningún aviso');
    await page.close();
  }

  // ── C/D/E/F) Tablet → Recibir → Virgilio ───────────────────────────────
  {
    const rpcs = [];
    const page = await nueva(browser, 'con', rpcs);
    await page.goto(ROOT + '/Tablet/Tablet_GP2.html?modo=recibir');
    await page.waitForFunction(() => document.querySelector('#tipoGrid .tipo-btn[data-tipo="virgilio"] .vir-badge'), null, { timeout: 5000 }).catch(() => {});
    const badge = await page.evaluate(() => { const b = document.querySelector('#tipoGrid .tipo-btn[data-tipo="virgilio"] .vir-badge'); return b ? b.textContent : null; });
    ok(badge === '🔔 2', 'la baldosa Virgilio de Recibir lleva 🔔 2 (salió: ' + badge + ')');

    await page.click('#tipoGrid .tipo-btn[data-tipo="virgilio"]');
    await page.waitForSelector('#virAvisos:not(.hidden) .vir-aviso');
    const av = await page.evaluate(() => [...document.querySelectorAll('#virLista .vir-aviso')].map(a => ({
      txt: a.textContent, si: a.querySelector('[data-vir-acc="si"]'), siOff: !!(a.querySelector('[data-vir-acc="si"]') || {}).disabled,
      no: !!a.querySelector('[data-vir-acc="no"]') })).map(x => ({ txt: x.txt, si: !!x.si, siOff: x.siOff, no: x.no })));
    ok(av.length === 2, 'adentro de Virgilio se ven los dos avisos (' + av.length + ')');
    const grj = av.find(a => /GRJ31/.test(a.txt)) || {}, suelto = av.find(a => /XYZ9/.test(a.txt)) || {};
    ok(/Gestión Virgilio notificó que recibiste 3\.000 unidades de GRJ31/.test(grj.txt) && grj.si && !grj.siOff && grj.no,
       'GRJ31: «Gestión Virgilio notificó que recibiste 3.000 unidades de GRJ31» con Sí y No');
    ok(/323ES/.test(grj.txt) && /Hugo Wong/.test(grj.txt), 'el aviso dice el código de Virgilio y el proveedor');
    ok(suelto.siOff && suelto.no && /no está vinculado/.test(suelto.txt), 'el aviso sin componente vinculado sale con el Sí apagado');
    // v1.40.0-R2 (2026-10-01): Recibir -> Virgilio pasó a tarjetas (mismo diseño que Enviar)
    ok(await page.locator('#cardsGrid .parte-card:has-text("GRJ31")').count() === 1, 'debajo de los avisos, las piezas (GRJ31 suelto, sin rubro Importados)');

    // D) Sí
    await page.click('#virLista .vir-aviso[data-vir="10"] [data-vir-acc="si"]');
    await page.waitForFunction(() => !document.querySelector('#virLista .vir-aviso[data-vir="10"]'));
    const si = rpcs.filter(x => x[0] === 'resolver_ingreso_virgilio').pop() || [];
    ok(si[1] && si[1].p_id === 10 && si[1].p_acepta === true, 'Sí llama resolver_ingreso_virgilio(10, true)');
    const msg = await page.evaluate(() => ({ t: document.getElementById('virMsg').textContent, href: (document.querySelector('#virMsg a') || {}).getAttribute && document.querySelector('#virMsg a').getAttribute('href') }));
    ok(/Entraron 3\.000 u de GRJ31/.test(msg.t) && /control en kg/.test(msg.t), 'avisa que entraron y que falta el control en kg (' + msg.t + ')');
    ok(msg.href === '../StockFlejes/control-remaches.html?sector=9', 'el link lleva al control del Garage desde la carpeta Tablet (' + msg.href + ')');
    const badge2 = await page.evaluate(() => document.querySelectorAll('#virLista .vir-aviso').length);
    ok(badge2 === 1, 'queda un solo aviso');

    // E) No, con motivo
    await page.click('#virLista .vir-aviso[data-vir="11"] [data-vir-acc="no"]');
    await page.waitForSelector('#virMot11');
    await page.fill('#virMot11', 'no vino en el camión');
    await page.click('#virLista .vir-aviso[data-vir="11"] [data-vir-acc="confirmar-no"]');
    await page.waitForFunction(() => !document.querySelector('#virLista .vir-aviso[data-vir="11"]'));
    const no = rpcs.filter(x => x[0] === 'resolver_ingreso_virgilio').pop() || [];
    ok(no[1] && no[1].p_id === 11 && no[1].p_acepta === false && no[1].p_motivo === 'no vino en el camión', 'No manda p_acepta=false con el motivo');
    ok(/Denegado por Cervantes/.test(await page.locator('#virMsg').textContent()), 'y dice que en Virgilio vuelve a figurar en viaje');

    // F) en Enviar no hay avisos
    await page.click('#modos .modo-btn[data-modo="enviar"]');
    await page.click('#tipoGrid .tipo-btn[data-tipo="virgilio"]');
    await page.waitForSelector('#cardsGrid .parte-card');
    ok(await page.$eval('#virAvisos', e => e.classList.contains('hidden')), 'en Enviar → Virgilio no se ven los avisos');
    await page.close();
  }

  // ── G) la RPC de avisos falla: la tablet anda igual ────────────────────
  {
    const page = await nueva(browser, 'error', null);
    await page.goto(ROOT + '/Tablet/Tablet_GP2.html?modo=recibir');
    await page.waitForSelector('#tipoGrid .tipo-btn[data-tipo="virgilio"]');
    await page.waitForTimeout(300);
    ok(await page.locator('.vir-badge').count() === 0, 'sin avisos: la baldosa no lleva 🔔');
    await page.click('#tipoGrid .tipo-btn[data-tipo="virgilio"]');
    await page.waitForSelector('#cardsGrid .parte-card');
    ok(await page.locator('#virLista .vir-aviso').count() === 0 && await page.locator('#cardsGrid .parte-card:has-text("GRJ31")').count() === 1,
       'y Recibir → Virgilio muestra las piezas igual');
    await page.close();
  }

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
