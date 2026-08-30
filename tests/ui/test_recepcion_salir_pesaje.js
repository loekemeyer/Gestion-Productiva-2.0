const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

/* Del paso 2 (pesaje) NO habia forma de salir: se ocultaba Cancelar y el click en
   el fondo estaba bloqueado, asi que quien lo abria por error quedaba encerrado
   (screenshot del usuario, 2026-08-30). Salir es seguro: los items ya estan
   guardados en la BD desde el paso 1 y la recepcion sin pesar reaparece en la
   barra de arriba. Este test fija las tres salidas y que el popup se pueda
   scrollear hasta arriba, que era el otro motivo por el que no se veia la salida. */
const BUNDLE = {
  tara: { tara_pallet: '20', tol_ctrl_peso_pct: '5', carton_uni_x_paquete: '250' },
  sectores: [{ id: 5, nombre: 'Sector Fleje' }],
  proveedores: [{ nombre: 'Basconia', modo_control: 'rollos_remito', informa_rollos: true, factura_uni: false }],
  recepciones: [], pallets: [], rollos: [],
  insumos: [
    { comp_id: 1, codigo: 'A1', descripcion: 'Fleje N° 13', sector: 'Sector Fleje', sector_id: 5, um: 'kg',
      proveedor: 'Basconia', n_fleje: 13, medida: '84 x 1,75', ultima: null, oc_pend: null },
  ],
};

const STUB = 'window.supabase={createClient:function(){return{'
  + 'rpc:async function(n,a){ if(n==="recepcion_bundle") return {data:' + JSON.stringify(BUNDLE) + ',error:null};'
  + ' if(n==="cargar_recepcion") return {data:{recepcion_id:77,movimiento_id:1,oc_cruzada:[]},error:null};'
  + ' return {data:{ok:true},error:null}; },'
  + 'from:function(){ var q={select:function(){return q;},in:function(){return Promise.resolve({data:[],error:null});}}; return q; }'
  + '};}};';

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  await page.route('**/@supabase/supabase-js@2', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/auth-guard.js*', r => r.fulfill({ contentType: 'application/javascript', body: 'window.GP2_AUTH_ON=false;' }));
  await page.route('**/GP2_favicon.png*', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
  // el popup cerrado sigue en el DOM pero oculto: waitForSelector lo espera VISIBLE
  const cerrado = () => page.waitForFunction(() => !document.getElementById('kgPopup').classList.contains('open'));
  const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };

  // deja pasar los confirm (el de salir del pesaje)
  page.on('dialog', d => d.accept());

  // Llegar al paso 2 como en la vida real: rubro -> proveedor -> item -> remito -> "Termine"
  async function llegarAlPesaje() {
    await page.goto(ROOT + '/StockFlejes/RecepcionInsumos_GP2.html');
    await page.click('button:has-text("Flejes")');
    await page.click('button:has-text("Basconia")');
    await page.click('#btnContinuar');
    await page.waitForSelector('.item-btn');
    // cargar() re-renderiza la lista al terminar (limpia statusMsg): clickear antes
    // agarra un boton que se reemplaza y el popup abre sin item -> flaky
    await page.waitForFunction(() => document.getElementById('statusMsg').textContent === '');
    await page.click('.item-btn');
    await page.waitForSelector('#kgPopup.open');
    await page.fill('#kgValue', '360');
    await page.fill('#kgRollos', '7');
    await page.fill('#kgPallets', '2');
    await page.click('#kgConfirm');
    await page.waitForSelector('#btnFinRemito');
    await page.click('#btnFinRemito');
    await page.waitForSelector('#pesajeWrap:not(.hidden)');
  }

  await llegarAlPesaje();

  // 1) el paso 2 ofrece salida visible
  const pie = await page.evaluate(() => {
    const vis = id => { const e = document.getElementById(id); return !!e && !e.classList.contains('hidden'); };
    const x = document.getElementById('kgX').getBoundingClientRect();
    return { salir: vis('kgPesajeSalir'), guardar: vis('kgPesajeOk'), cancelar: vis('kgCancel'),
             xEnPantalla: x.top >= 0 && x.bottom <= window.innerHeight && x.width >= 40,
             arriba: document.getElementById('kgPopup').scrollTop };
  });
  ok(pie.salir, 'el paso 2 muestra "Salir sin pesar"');
  ok(pie.guardar, 'sigue estando "Guardar pesaje"');
  ok(!pie.cancelar, 'el "Cancelar" del paso 1 no se mezcla');
  ok(pie.xEnPantalla, 'la X esta visible y es tocable (>=40px)');
  ok(pie.arriba === 0, 'el pesaje abre arriba de todo, no scrolleado');

  // 2) el popup se puede scrollear hasta el final Y volver arriba (antes el tope
  //    quedaba fuera de alcance por el align-items:center)
  const scroll = await page.evaluate(() => {
    const p = document.getElementById('kgPopup');
    p.scrollTop = 99999; const abajo = p.scrollTop;
    p.scrollTop = 0;
    const t = document.getElementById('kgTitle').getBoundingClientRect();
    return { pudoBajar: abajo > 0 || p.scrollHeight <= p.clientHeight, tituloVisible: t.top >= 0 };
  });
  ok(scroll.pudoBajar, 'el popup scrollea (no queda contenido inalcanzable)');
  ok(scroll.tituloVisible, 'volviendo arriba se ve el titulo');

  // 3) el boton sale, y lo anotado del remito NO se pierde: queda pendiente
  await page.click('#kgPesajeSalir');
  await cerrado();
  // el aviso llega despues del recargar, que limpia statusMsg
  await page.waitForFunction(() => /sin pesar/i.test(document.getElementById('statusMsg').textContent));
  const tras = await page.evaluate(() => ({
    cerrado: !document.getElementById('kgPopup').classList.contains('open'),
    msg: document.getElementById('statusMsg').textContent,
  }));
  ok(tras.cerrado, 'el boton "Salir sin pesar" cierra el popup');
  ok(/sin pesar/i.test(tras.msg), 'avisa que quedo sin pesar: ' + tras.msg);

  // 4) la X tambien sale del pesaje
  await llegarAlPesaje();
  await page.click('#kgX');
  await cerrado();
  ok(true, 'la X sale del pesaje');

  // 5) Escape tambien
  await llegarAlPesaje();
  await page.keyboard.press('Escape');
  await cerrado();
  ok(true, 'Escape sale del pesaje');

  // 6) el click en el fondo sigue SIN cerrar en el paso 2 (se scrollea con el dedo)
  await llegarAlPesaje();
  await page.evaluate(() => document.getElementById('kgPopup').click());
  await page.waitForTimeout(150);
  ok(await page.$('#kgPopup.open') !== null, 'el click en el fondo NO cierra el pesaje');

  // 7) en el paso 1 la X cierra directo, sin preguntar
  await page.click('#kgPesajeSalir');
  await cerrado();
  await page.click('.item-btn');
  await page.waitForSelector('#kgPopup.open');
  let pregunto = false;
  page.once('dialog', d => { pregunto = true; d.accept(); });
  await page.click('#kgX');
  await cerrado();
  ok(!pregunto, 'en el paso 1 la X cierra sin preguntar');

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
