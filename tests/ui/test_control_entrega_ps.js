/* Tablet/ControlEntregaPS_GP2.html — el CONTROL de lo que entrego un proveedor de servicio.
   Circuito pedido por el usuario el 2026-09-21: "primero cargar lo que dice el remito y despues
   hacer el control (como en recepcion de insumos)... controlar en kg y cajones (o unidad de medida
   correspondiente segun la parte)".
   Lo que fija este test:
     - la tarjeta muestra el REMITO y los campos arrancan VACIOS (el control es un dato nuevo, no
       una confirmacion: precargarlo invita a firmar sin contar);
     - la diferencia se calcula al tipear y se marca cuando supera la tolerancia (tol_pct);
     - el payload de controlar_entrega_ps (cantidad contada + bultos contados);
     - el envase se pide SOLO si la pieza tiene con que contarlo, y con el rotulo del proveedor
       (AJ entrega en paquetes, el resto en cajones);
     - las reglas de pantalla de la casa: 390px sin scroll horizontal, inputs grandes con
       inputmode, y botones tocables. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const BUNDLE = {
  tol_pct: 2,
  pend: [
    // el caso real: 21 kg de remito, remache que vuelve en cajones
    { mov_id: 85502, fecha: '2026-09-21T12:00:00-03:00', ps_id: 4, ps_nombre: 'Guazzaroni Patricio',
      sc_cod: 'CV1', sc_desc: 'Remache Espiral p/Niquelar', sc_unixcaj: 57143,
      sp_id: 276, sp_cod: 'V1', sp_desc: 'Remache Espiral', sp_um: 'unidad',
      sp_kgxuni: 0.00035, sp_unixcaj: 5714, entrega_unidad: null, entrega_uni_x: null,
      envio_unidad: 'cajones', envio_uni_x: null,
      declarado: 21, unidad: 'kg', cajones: null },
    // AJ entrega en PAQUETES y la pieza se cuenta: el campo tiene que decir "Paquetes" y la
    // cantidad va en uni
    { mov_id: 85510, fecha: '2026-09-21T12:00:00-03:00', ps_id: 12, ps_nombre: 'AJ Adhesivos',
      sc_cod: 'Pliego 506', sc_desc: 'Sin adhesivar', sc_unixcaj: null,
      sp_id: 565, sp_cod: 'Pliego Ad 506', sp_desc: 'Adhesivado', sp_um: 'unidad',
      sp_kgxuni: null, sp_unixcaj: null, entrega_unidad: 'paquetes', entrega_uni_x: 200,
      declarado: 600, unidad: 'uni', cajones: null },
    // pieza SIN envase cargado por ningun lado: no se inventa un campo que nadie puede llenar
    { mov_id: 85511, fecha: '2026-09-21T12:00:00-03:00', ps_id: 20, ps_nombre: 'Blist-Pack',
      sc_cod: 'D5', sc_desc: 'Mitad rompenuez', sc_unixcaj: null,
      sp_id: 91, sp_cod: 'D5-P', sp_desc: 'Mitad pintada', sp_um: 'unidad',
      sp_kgxuni: null, sp_unixcaj: null, entrega_unidad: null, entrega_uni_x: null,
      declarado: 40, unidad: 'uni', cajones: null },
    // ESTER: sin entrega_unidad propia, la entrega COPIA el envio -> BOLSAS, no el "cajones"
    // generico [usuario 2026-09-22: "La devolucion de Ester es en bolsas como el envio"]
    { mov_id: 85512, fecha: '2026-09-22T12:00:00-03:00', ps_id: 14, ps_nombre: 'Ester',
      sc_cod: 'PC2', sc_desc: 'Mgo Pelapapa', sc_unixcaj: 1800,
      sp_id: 700, sp_cod: 'PC1A', sp_desc: 'Mgo Pelapapa 505 Calado', sp_um: 'unidad',
      sp_kgxuni: 0.27, sp_unixcaj: 1800, sp_sector: 'Sector Plastico',
      entrega_unidad: null, entrega_uni_x: null, envio_unidad: 'bolsas', envio_uni_x: 1800,
      declarado: 485, unidad: 'kg', cajones: null },
    // JULIO manda por PESO: el bulto lo pone el sector, plastico -> bolsas (como en la Tablet)
    { mov_id: 85513, fecha: '2026-09-22T12:00:00-03:00', ps_id: 8, ps_nombre: 'Hernandez Julio',
      sc_cod: 'PB6', sc_desc: 'Inser. Neg.', sc_unixcaj: 2000,
      sp_id: 701, sp_cod: 'PB6S', sp_desc: 'Inser. serigrafiado', sp_um: 'unidad',
      sp_kgxuni: 0.002, sp_unixcaj: 2000, sp_sector: 'Sector Plastico',
      entrega_unidad: null, entrega_uni_x: null, envio_unidad: 'kg', envio_uni_x: null,
      declarado: 10, unidad: 'kg', cajones: null }
  ],
  hechos: [
    { mov_id: 85400, fecha: '2026-09-20T12:00:00-03:00', ps_nombre: 'Guazzaroni Patricio',
      sp_cod: 'V11', sp_desc: 'Remache Sacacorcho', unidad: 'kg',
      declarado: 40, controlado: 39.2, cajones: 2, diff: -0.8,
      controlado_en: '2026-09-20T15:00:00-03:00', controlado_por: 'thomas' }
  ]
};

const STUB = `
window.supabase = { createClient: function(){ return {
  rpc: async function(name, args){
    window.__calls = window.__calls || [];
    window.__calls.push({name:name, args:args});
    if(name==='control_entrega_ps_bundle')
      return { data: JSON.parse(JSON.stringify(${JSON.stringify(BUNDLE)})), error: null };
    if(name==='controlar_entrega_ps') return { data: { ok:true, id: 1 }, error: null };
    return { data: null, error: { message: 'rpc desconocida '+name } };
  }
};}};
`;

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  const dialogs = [];
  page.on('dialog', d => { dialogs.push({ type: d.type(), msg: d.message() }); d.accept(); });
  await page.route('**/@supabase/supabase-js@2**', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/GP2_favicon.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));

  const ok = (c, msg) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + msg); if (!c) process.exitCode = 1; };
  const calls = async (n) => page.evaluate(n => (window.__calls || []).filter(c => c.name === n), n);
  const cards = () => page.$$eval('#pend .card', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));

  await page.goto(ROOT + '/Tablet/ControlEntregaPS_GP2.html');
  await page.waitForFunction(() => document.querySelectorAll('#pend .card').length > 0);

  // ── 1) lo pendiente, con el remito a la vista y los campos vacios ────────────────
  const cs = await cards();
  ok(cs.length === 5 && (await page.$eval('#nPend', e => e.textContent)) === '5',
     'las 5 entregas sin controlar se listan — ' + cs.length);
  ok(cs[0].includes('V1') && cs[0].includes('consume CV1') && cs[0].includes('Guazzaroni Patricio'),
     'la tarjeta dice la pieza, de que SC sale y quien la entrego — ' + cs[0]);
  ok(cs[0].includes('Remito 21 kg'), 'el remito queda a la vista para comparar — ' + cs[0]);
  const vacios = await page.$$eval('#pend .card input', xs => xs.every(x => x.value === ''));
  ok(vacios, 'los campos arrancan vacios: el control se cuenta, no se confirma');

  // ── 2) EL CONTROL SE CUENTA EN EL ENVASE Y EN KILOS, no en la unidad de la pieza ──
  // [usuario 2026-09-23: "Cuando voy a hacer el control de AJ adhesivos me aparece para marcar uni.
  // Y yo te dije solo paquetes"; "El control lo hago en bolsas y kilos, no en unibolsas"].
  const labels = await page.$$eval('#pend .card', xs => xs.map(x =>
    Array.from(x.querySelectorAll('label')).map(l => l.textContent.trim()).join(' | ')));
  ok(labels[0] === 'Cajones | Kilos',
     'remache: se cuenta en cajones y se pesa — ' + labels[0]);
  ok(labels[1] === 'Paquetes',
     'AJ: SOLO paquetes — el pliego no tiene kg_x_uni, no hay nada que pesar — ' + labels[1]);
  ok(labels[2] === 'Contado (uni)',
     'pieza sin envase ni peso: queda el campo suelto, no se inventa un envase — ' + labels[2]);
  ok(labels[3] === 'Bolsas | Kilos',
     'Ester: bolsas y kilos, que es como lo cuenta el usuario — ' + labels[3]);
  ok(labels[4] === 'Bolsas | Kilos',
     'Julio (envio por peso): pieza plastica en bolsas, y los kilos — ' + labels[4]);
  ok(!labels.slice(0, 2).concat(labels.slice(3)).some(l => /Contado \(/.test(l)),
     'ya no se pide "Contado (uni)" donde hay envase — ' + labels.join(' / '));
  ok((await cards())[1].includes('200 por paquete'),
     'la tarjeta dice cuantas unidades entran en el envase — ' + (await cards())[1]);
  const im = await page.$$eval('#pend .card:first-child input', xs => xs.map(x => x.getAttribute('inputmode')));
  ok(im[0] === 'numeric' && im[1] === 'decimal',
     'teclado numerico: entero para los cajones, decimal para los kg — ' + im.join(','));

  // ── 3) la diferencia se ve al tipear, y se marca cuando pasa la tolerancia ────────
  const card1 = '#pend .card:first-child';
  await page.fill(card1 + ' input[data-f="kg"]', '20,8');
  const d1 = await page.$eval(card1 + ' .diff', e => e.textContent.trim());
  ok(d1.includes('= 20,8 kg') && d1.includes('-0,2') && d1.includes('-1'),
     'se ve lo que se guarda y la diferencia contra el remito — ' + d1);
  ok(!(await page.$eval(card1, e => e.classList.contains('desvio'))),
     '1 % contra una tolerancia de 2 % no es desvio');
  await page.fill(card1 + ' input[data-f="kg"]', '19');
  ok(await page.$eval(card1, e => e.classList.contains('desvio')),
     '9,5 % SI es desvio: la tarjeta se pinta');
  // el PESO manda sobre el envase cuando estan los dos (mismo criterio que el control de insumos)
  await page.fill(card1 + ' input[data-f="env"]', '99');
  ok((await page.$eval(card1 + ' .diff', e => e.textContent)).includes('= 19 kg'),
     'con kg cargados, el envase no cambia lo que se guarda: manda el peso');

  // ── 4) el payload del control ────────────────────────────────────────────────────
  await page.fill(card1 + ' input[data-f="kg"]', '20,8');
  await page.fill(card1 + ' input[data-f="env"]', '1');
  await page.click(card1 + ' button[data-a="ok"]');
  await page.waitForFunction(() => (window.__calls || []).some(c => c.name === 'controlar_entrega_ps'));
  const reg = await calls('controlar_entrega_ps');
  ok(reg.length === 1 && reg[0].args.p_mov_id === 85502 && reg[0].args.p_cantidad === 20.8 &&
     reg[0].args.p_cajones === 1,
     'viaja el movimiento, lo contado y los cajones contados — ' + JSON.stringify(reg[0].args));
  ok(!dialogs.length, 'dentro de la tolerancia no pregunta nada');

  // ── 5) AJ: 2 paquetes de 200 = 400 pliegos contra los 600 del remito ─────────────
  // Fuera de tolerancia pregunta antes de pisar el stock, y lo que viaja es la unidad canonica.
  await page.fill('#pend .card:nth-child(2) input[data-f="env"]', '2');
  ok((await page.$eval('#pend .card:nth-child(2) .diff', e => e.textContent)).includes('= 400 uni'),
     'AJ: 2 paquetes de 200 se leen como 400 pliegos antes de confirmar');
  await page.click('#pend .card:nth-child(2) button[data-a="ok"]');
  await page.waitForFunction(() => (window.__calls || []).filter(c => c.name === 'controlar_entrega_ps').length === 2);
  const regAj = (await calls('controlar_entrega_ps'))[1];
  ok(regAj.args.p_cantidad === 400 && regAj.args.p_cajones === 2,
     'AJ: se guardan 400 pliegos y los 2 paquetes contados — ' + JSON.stringify(regAj.args));
  ok(dialogs.some(d => d.type === 'confirm' && d.msg.includes('600') && d.msg.includes('400') &&
                       d.msg.includes('CONTADO')),
     'el desvio avisa que el stock queda con lo contado — ' + (dialogs[0] || {}).msg);

  // ── 6) lo ya controlado, con su diferencia ───────────────────────────────────────
  const tabla = await page.$eval('#hechosWrap', e => e.textContent.replace(/\s+/g, ' ').trim());
  ok(tabla.includes('V11') && tabla.includes('40') && tabla.includes('39,2') && tabla.includes('-0,8'),
     'lo controlado muestra remito, contado y diferencia — ' + tabla.slice(0, 120));

  // ── 7) reglas de pantalla de la casa ─────────────────────────────────────────────
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(over <= 0, 'celular 390px: sin scroll horizontal (overflow=' + over + ')');
  const chico = await page.$$eval('#pend .card input', xs =>
    xs.map(x => parseFloat(getComputedStyle(x).fontSize)).filter(s => s < 18));
  ok(!chico.length, 'todos los campos con letra grande (>= 18px)');
  const alto = await page.$eval('#pend .card button[data-a="ok"]', e => e.getBoundingClientRect().height);
  ok(alto >= 44, 'el boton de confirmar es tocable (' + Math.round(alto) + 'px)');

  // ── 8) sin pendientes lo dice, no deja la pantalla muda ──────────────────────────
  await page.route('**/@supabase/supabase-js@2**', r => r.fulfill({ contentType: 'application/javascript', body: `
    window.supabase = { createClient: function(){ return { rpc: async function(){
      return { data: { tol_pct: 2, pend: [], hechos: [] }, error: null }; } }; } };
  ` }));
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#pend .empty').length > 0);
  const vacio = await page.$eval('#pend', e => e.textContent.trim());
  ok(vacio.includes('No hay entregas pendientes'),
     'sin pendientes se dice, no se deja la pantalla muda — ' + vacio);
  ok((await page.$eval('#hechosWrap', e => e.textContent)).includes('Todavía no se controló'),
     'y lo mismo cuando no se controlo nada todavia');

  console.log('TODO OK');
  await browser.close();
})();
