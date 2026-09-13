/* Caracterizacion de Tablet/Tablet_GP2.html (2026-09-13, ideas 7342/7343): la Version Tablet del
   operario, con Supabase STUBEADO (tablet_bundle devuelve un fixture chico con la forma REAL del
   bundle de la base; tablet_registrar anota lo que recibe y contesta como la base).
   Fija:
     1. los tres modos (Enviar / Recibir / Conteo) y que en Enviar solo aparecen las contrapartes
        a las que se les manda desde Cervantes (Virgilio no);
     2. el buscador filtra la tabla;
     3. las dos trampas de unidad: una pieza en kg se carga en kg (teclado decimal) y viaja 'kg';
        el prov. AT se carga en CAJAS y viaja 'uni' + por_caja, con el esperado de la OC en uni;
     4. la alerta de "recibi de mas" AVISA pero NO BLOQUEA: la fila se marca, el boton sigue
        habilitado, el confirm lo dice, y el exito muestra lo que la base devolvio en alertas;
     5. el Conteo no llama a ninguna RPC que escriba;
     6. a 390px no hay scroll horizontal y los campos son tocables (>= 44px). */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

// misma forma que "GP2".tablet_bundle() (claves reales, verificadas contra la base 2026-09-13)
const BUNDLE = {
  generado_en: '2026-09-13T12:00:00Z',
  alertas_abiertas: 0,
  contrapartes: [
    { tipo: 'tallerista', ref: '6', nombre: 'Martin Cornejo', n_env: 2, n_rec: 1 },
    { tipo: 'proveedor_at', ref: '1', nombre: 'Cabral', n_env: 1, n_rec: 1 },
    { tipo: 'proveedor_servicio', ref: '5', nombre: 'Jade', n_env: 1, n_rec: 1 },
    { tipo: 'virgilio', ref: 'virgilio', nombre: 'Virgilio', n_env: 0, n_rec: 1 },
  ],
  enviar: [
    { tipo: 'tallerista', ref: '6', comp_id: 70, cod: 'A10', desc: 'Cpo Una', sector: 'Sector Crudo', um: 'unidad', uxc: 1000, kg_x_uni: 0.01, online_sector: 120 },
    { tipo: 'tallerista', ref: '6', comp_id: 75, cod: 'F7', desc: 'Fleje doblado', sector: 'Sector Fleje', um: 'kg', uxc: null, kg_x_uni: 0.0134, online_sector: 30.5 },
    { tipo: 'proveedor_servicio', ref: '5', comp_id: 90, cod: 'D5', desc: 'Mitad rompenuez', sector: 'Sector Crudo', um: 'unidad', uxc: 500, kg_x_uni: 0.05, online_sector: 40 },
    { tipo: 'proveedor_at', ref: '*', comp_id: 456, cod: 'A1', desc: 'Caja N°1', sector: 'Sector Caja', um: 'unidad', uxc: null, kg_x_uni: null, online_sector: 988 },
  ],
  recibir: [
    { tipo: 'tallerista', ref: '6', comp_id: 71, comp_entrada_id: 70, n_entradas: 1, tiene_bom: false, cod_art: null, cod: 'A11', desc: 'Una Armada', sector: 'Sector Procesado', um: 'unidad', uxc: 500, kg_x_uni: 0.01, por_caja: null, ent_cod: 'A10', ent_desc: 'Cpo Una', esperado: 100, esperado_origen: 'online_tall' },
    { tipo: 'proveedor_at', ref: '1', comp_id: null, comp_entrada_id: null, n_entradas: 0, tiene_bom: false, cod_art: '026', cod: '026', desc: 'Colador N°8', sector: null, um: null, uxc: null, kg_x_uni: null, por_caja: 36, ent_cod: null, ent_desc: null, esperado: 72, esperado_origen: 'oc' },
    { tipo: 'proveedor_servicio', ref: '5', comp_id: 91, comp_entrada_id: 90, n_entradas: 1, tiene_bom: false, cod_art: null, cod: 'D5-P', desc: 'Mitad pintada', sector: 'Sector Procesado', um: 'unidad', uxc: 500, kg_x_uni: 0.05, por_caja: null, ent_cod: 'D5', ent_desc: 'Mitad rompenuez', esperado: 40, esperado_origen: 'online_ps' },
    { tipo: 'virgilio', ref: 'virgilio', comp_id: 373, comp_entrada_id: null, n_entradas: 0, tiene_bom: false, cod_art: null, cod: 'IC3V', desc: 'Fleje N° 90 LARGO', sector: 'Sector Fleje', um: 'kg', uxc: 24, kg_x_uni: 0.0134, por_caja: null, ent_cod: null, ent_desc: null, esperado: 20, esperado_origen: 'online_virgilio' },
  ],
};

const STUB = `
window.supabase = { createClient: function(){ return {
  rpc: async function(name, args){
    window.__calls = window.__calls || [];
    window.__calls.push({name:name, args:args});
    if(name==='tablet_bundle') return { data: JSON.parse(JSON.stringify(${JSON.stringify(BUNDLE)})), error: null };
    if(name==='tablet_registrar'){
      // igual que la base: alerta por item recibido con esperado y comparable > esperado
      var p = args.p, al = [];
      (p.items||[]).forEach(function(it){
        if(p.modo==='recibir' && it.esperado != null){
          var comp = it.cantidad * (p.tipo==='proveedor_at' ? (it.por_caja||1) : 1);
          if(comp > it.esperado) al.push({ id: 900+al.length, cod: it.cod_art || ('comp'+it.comp_id), esperado: it.esperado, recibido: comp, exceso: comp-it.esperado });
        }
      });
      return { data: { ok:true, n:(p.items||[]).length, contraparte:'X', modo:p.modo, items:[], alertas: al }, error: null };
    }
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

  await page.goto(ROOT + '/Tablet/Tablet_GP2.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#cpGrid .prov-btn').length > 0);

  // ── 1) modo ENVIAR: solo a quien se le manda desde Cervantes ──────────────
  ok(await page.$eval('#modos .modo-btn.active', b => b.dataset.modo) === 'enviar', 'arranca en Enviar');
  let btns = await page.$$eval('#cpGrid .prov-btn', xs => xs.map(x => x.textContent));
  ok(btns.length === 3 && !btns.join('|').includes('Virgilio'), 'Enviar: 3 contrapartes, Virgilio afuera — ' + btns.map(b => b.split(/tallerista|prov\./)[0].trim()).join('|'));
  ok(btns.find(b => b.startsWith('Martin')).includes('2 piezas'), 'Martin: 2 piezas para enviar');

  await page.click('#cpGrid .prov-btn:has-text("Martin")');
  let rows = await page.$$eval('#tbody tr', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ')));
  ok(rows.length === 2 && rows[0].includes('A10') && rows[0].includes('120'), 'fila A10 con online 120 — ' + rows[0]);
  ok(rows[1].includes('F7') && rows[1].includes('kg') && rows[1].includes('30,5'), 'fila F7 en kg con online 30,5 — ' + rows[1]);
  // trampa 2: la pieza en kg se carga con teclado decimal; la de unidades con numerico
  const modos = await page.$$eval('#tbody input.cell-in', xs => xs.map(x => x.getAttribute('inputmode')));
  ok(modos[0] === 'numeric' && modos[1] === 'decimal', 'teclado: A10 numeric, F7 (kg) decimal — ' + modos.join(','));

  // ── 2) el buscador filtra ────────────────────────────────────────────────
  await page.fill('#q', 'fleje');
  rows = await page.$$eval('#tbody tr', xs => xs.map(x => x.textContent));
  ok(rows.length === 1 && rows[0].includes('F7'), 'buscador "fleje" deja solo F7');
  await page.fill('#q', '');
  await page.waitForFunction(() => document.querySelectorAll('#tbody tr').length === 2);

  // cargar 12,5 kg de F7 y enviar
  await page.fill('#tbody tr:nth-child(2) input.cell-in', '12,5');
  ok((await page.$eval('#btnEnviar', e => e.textContent)) === 'Enviar (1)', 'boton Enviar (1)');
  const fecha = await page.$eval('#fFecha', e => e.value);
  await page.click('#btnEnviar');
  await page.waitForFunction(() => !document.getElementById('fase3').classList.contains('hidden'));
  let reg = await calls('tablet_registrar');
  ok(reg.length === 1, 'una llamada tablet_registrar');
  let p = reg[0].args.p;
  ok(p.modo === 'enviar' && p.tipo === 'tallerista' && p.ref === '6' && p.fecha === fecha + 'T12:00:00' && p.remito === null,
     'payload enviar: modo/tipo/ref/fecha — ' + JSON.stringify({ modo: p.modo, tipo: p.tipo, ref: p.ref, fecha: p.fecha }));
  ok(p.items.length === 1 && p.items[0].comp_id === 75 && p.items[0].cantidad === 12.5 && p.items[0].unidad === 'kg' && p.items[0].esperado === null,
     'item F7: 12,5 kg viaja como kg — ' + JSON.stringify(p.items[0]));
  ok(dialogs.some(d => d.type === 'confirm' && d.msg.includes('Enviar a Martin Cornejo') && d.msg.includes('12,5 kg')), 'confirm de envio con resumen');
  ok((await page.$eval('#successTitle', e => e.textContent)).includes('Enviado'), 'exito de envio');
  const buf = await page.evaluate(() => JSON.parse(localStorage.getItem('gp2_tablet_buffer') || '{}'));
  ok(!buf['enviar:tallerista:6'], 'buffer limpio tras enviar');

  // ── 3) modo RECIBIR: prov. AT en CAJAS, alerta que avisa y no frena ─────────
  await page.click('#btnOtro');
  await page.waitForFunction(() => document.querySelectorAll('#cpGrid .prov-btn').length > 0);
  await page.click('#modos .modo-btn[data-modo="recibir"]');
  btns = await page.$$eval('#cpGrid .prov-btn', xs => xs.map(x => x.textContent));
  ok(btns.length === 4 && btns.some(b => b.startsWith('Virgilio')), 'Recibir: 4 contrapartes, Virgilio adentro');
  await page.click('#cpGrid .prov-btn:has-text("Cabral")');
  ok(!(await page.$eval('#fRemito', e => e.classList.contains('hidden'))), 'en Recibir se pide el remito');
  rows = await page.$$eval('#tbody tr', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ')));
  ok(rows.length === 1 && rows[0].includes('026') && rows[0].includes('cajas') && rows[0].includes('36 uni x caja') && rows[0].includes('2 cajas') && rows[0].includes('72 uni'),
     'prov AT: se carga en CAJAS, esperado de la OC = 2 cajas (72 uni) — ' + rows[0]);
  ok((await page.$eval('#tbody input.cell-in', e => e.getAttribute('inputmode'))) === 'numeric', 'cajas: teclado numerico');

  await page.fill('#fRemito', 'R-0001');
  await page.fill('#tbody input.cell-in', '3');   // 3 cajas = 108 uni > 72 esperadas
  await page.waitForFunction(() => document.querySelector('#tbody tr').classList.contains('demas'));
  ok(await page.$eval('#tbody tr', tr => tr.textContent.includes('36 de más')), 'la fila avisa "36 de más" (108 contra 72)');
  ok(!(await page.$eval('#alertaBox', e => e.classList.contains('hidden'))) && (await page.$eval('#alertaBox', e => e.textContent)).includes('registrar igual'),
     'el cartel dice que se puede registrar igual');
  ok((await page.$eval('#btnEnviar', e => !e.disabled && e.textContent === 'Recibir (1)')), 'el boton Recibir sigue habilitado: la alerta NO bloquea');

  dialogs.length = 0;
  await page.click('#btnEnviar');
  await page.waitForFunction(() => !document.getElementById('fase3').classList.contains('hidden'));
  ok(dialogs.some(d => d.type === 'confirm' && d.msg.includes('Recibir de Cabral') && d.msg.includes('3 cajas') && d.msg.includes('se registra igual')),
     'confirm de recepcion avisa el exceso y sigue');
  reg = await calls('tablet_registrar');   // la pagina se recargo: el registro de llamadas arranca de cero
  p = reg[reg.length - 1].args.p;
  ok(p.modo === 'recibir' && p.tipo === 'proveedor_at' && p.ref === '1' && p.remito === 'R-0001', 'payload recibir prov AT con remito');
  const it = p.items[0];
  ok(it.cod_art === '026' && it.comp_id === null && it.cantidad === 3 && it.unidad === 'uni' && it.por_caja === 36 && it.esperado === 72 && it.esperado_origen === 'oc',
     'item prov AT: 3 (cajas) como uni + por_caja 36 + esperado 72 de la OC — ' + JSON.stringify(it));
  ok((await page.$eval('#successAlertas', e => e.textContent)).includes('Quedó anotado para revisar') && (await page.$eval('#successAlertas', e => e.textContent)).includes('026'),
     'el exito muestra la alerta que devolvio la base');

  // recibir de tallerista: la pieza viaja con comp_entrada_id y esperado del online
  await page.click('#btnOtro');
  await page.waitForFunction(() => document.querySelectorAll('#cpGrid .prov-btn').length > 0);
  ok(await page.$eval('#modos .modo-btn.active', b => b.dataset.modo) === 'recibir', 'el modo se recuerda al recargar');
  await page.click('#cpGrid .prov-btn:has-text("Martin")');
  rows = await page.$$eval('#tbody tr', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ')));
  ok(rows.length === 1 && rows[0].includes('A11') && rows[0].includes('consume A10') && rows[0].includes('100 uni'), 'tallerista: A11 consume A10, esperado 100 — ' + rows[0]);
  await page.fill('#tbody input.cell-in', '80');
  ok(!(await page.$eval('#tbody tr', tr => tr.classList.contains('demas'))), '80 contra 100: sin alerta');
  await page.click('#btnEnviar');
  await page.waitForFunction(() => !document.getElementById('fase3').classList.contains('hidden'));
  reg = await calls('tablet_registrar');
  const it2 = reg[reg.length - 1].args.p.items[0];
  ok(it2.comp_id === 71 && it2.comp_entrada_id === 70 && it2.cantidad === 80 && it2.unidad === 'uni' && it2.esperado === 100 && it2.esperado_origen === 'online_tall' && it2.por_caja === null,
     'item tallerista: comp 71 consume 70, esperado 100 online_tall — ' + JSON.stringify(it2));
  ok((await page.$eval('#successAlertas', e => e.textContent.trim())) === '', 'sin alertas en el exito cuando no hay exceso');

  // ── 4) modo CONTEO: no escribe ───────────────────────────────────────────
  await page.click('#btnOtro');
  await page.waitForFunction(() => document.querySelectorAll('#cpGrid .prov-btn').length > 0);
  await page.click('#modos .modo-btn[data-modo="conteo"]');
  await page.waitForFunction(() => document.querySelectorAll('#tbody tr').length > 0);
  rows = await page.$$eval('#tbody tr', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ')));
  ok(rows.length === 4, 'conteo: una fila por pieza en Cervantes (4) — ' + rows.map(r => r.split(' ')[0]).join(','));
  ok(await page.$eval('#fase0', e => e.classList.contains('hidden')), 'conteo no pide contraparte');
  const filaA10 = await page.$('#tbody tr:has-text("A10")');
  await filaA10.$eval('input.cell-in', (e) => { e.value = '115'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  ok(await filaA10.$eval('td.dif', e => e.textContent === '-5' && e.classList.contains('neg')), 'conteo: 115 contra 120 online = -5 en rojo');
  ok((await page.$eval('#btnEnviar', e => e.textContent)) === 'Bajar CSV (1)', 'en conteo el boton baja el CSV');
  const nRegAntes = (await calls('tablet_registrar')).length;
  await page.click('#btnEnviar');
  await page.waitForTimeout(200);
  ok((await calls('tablet_registrar')).length === nRegAntes, 'el conteo no llama a tablet_registrar');

  // ── 5) render a 390px ────────────────────────────────────────────────────
  const m = await page.evaluate(() => {
    const ins = [...document.querySelectorAll('#tbody input.cell-in, #modos .modo-btn, #btnEnviar')];
    return {
      horizontal: document.documentElement.scrollWidth > window.innerWidth,
      altoMin: Math.min(...ins.map(i => i.getBoundingClientRect().height)),
      fuenteMin: Math.min(...[...document.querySelectorAll('#tbody input.cell-in')].map(i => parseFloat(getComputedStyle(i).fontSize))),
    };
  });
  ok(!m.horizontal, '390px: la pagina no scrollea horizontal');
  ok(m.altoMin >= 44, '390px: campos y botones tocables (' + Math.round(m.altoMin) + 'px, minimo 44)');
  ok(m.fuenteMin >= 19, '390px: letra grande en los campos de carga (' + m.fuenteMin + 'px)');

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
