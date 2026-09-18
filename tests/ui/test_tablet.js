/* Caracterizacion de Tablet/Tablet_GP2.html (2026-09-13, ideas 7342/7343; reescrito 2026-09-14
   con el flujo por TIPO), con Supabase STUBEADO (tablet_bundle devuelve un fixture chico con la
   forma REAL del bundle de la base; tablet_registrar anota lo que recibe y contesta como la base).
   Fija:
     1. primero el TIPO y despues la contraparte de ese tipo — en Enviar los tres tipos a los que
        se les manda desde Cervantes (Virgilio no), y adentro de un tipo solo sus contrapartes;
     2. en Recibir NO esta el prov. de art. terminado (entrega en Virgilio, no en Cervantes),
        SI esta "Prov. de insumos" y es un link a Recepcion Insumos, y un tipo con una sola
        contraparte (Virgilio) entra derecho a la carga;
     3. el Conteo no es un modo: es un link al modulo de Relevamientos;
     4. el buscador filtra la tabla;
     5. la trampa de unidad que queda: una pieza en kg se carga en kg (teclado decimal) y viaja
        'kg' (la carga en CAJAS se fue con el prov. AT);
     6. la alerta de "recibi de mas" AVISA pero NO BLOQUEA: la fila se marca, el boton sigue
        habilitado, el confirm lo dice, y el exito muestra lo que la base devolvio en alertas;
     7. a 390px no hay scroll horizontal y los campos son tocables (>= 44px). */
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
    { tipo: 'tallerista', ref: '6', nombre: 'Martin Cornejo', n_env: 5, n_rec: 2 },
    { tipo: 'tallerista', ref: '9', nombre: 'Lucho', n_env: 1, n_rec: 0 },
    { tipo: 'proveedor_at', ref: '1', nombre: 'Cabral', n_env: 2, n_rec: 1 },
    // el PS "comun", sin unidad de envio propia. Al 2026-09-18 ya NINGUN P.S. con piezas quedo
    // asi (los 7 que las tienen van por el cajon de cada pieza, AJ por paquetes y Julio por peso):
    // Blist-Pack es de los que siguen sin unidad definida, y aca se le dan piezas para cubrir el
    // render comun, que es el que ven los talleristas y el que quedaria si se suma un P.S. nuevo.
    { tipo: 'proveedor_servicio', ref: '20', nombre: 'Blist-Pack', n_env: 1, n_rec: 1 },
    // AJ es la EXCEPCION de la entrega: envia en paquetes de 100 y ENTREGA en paquetes de 200
    { tipo: 'proveedor_servicio', ref: '12', nombre: 'AJ Adhesivos', envio_unidad: 'paquetes', envio_uni_x: 100, entrega_unidad: 'paquetes', entrega_uni_x: 200, n_env: 1, n_rec: 1 },
    { tipo: 'proveedor_servicio', ref: '8', nombre: 'Hernandez Julio', envio_unidad: 'kg', envio_uni_x: null, n_env: 2, n_rec: 0 },
    { tipo: 'proveedor_servicio', ref: '14', nombre: 'Ester', envio_unidad: 'bolsas', envio_uni_x: 1800, envio_carga_unidad: 'kg', n_env: 1, n_rec: 0 },
    // Guazzaroni: el envase es el CAJON de cada pieza (envio_uni_x null), no uno del proveedor
    { tipo: 'proveedor_servicio', ref: '4', nombre: 'Guazzaroni Patricio', envio_unidad: 'cajones', envio_uni_x: null, envio_carga_unidad: 'kg', n_env: 2, n_rec: 1 },
    { tipo: 'inyector', ref: 'Pat Bet Plast', nombre: 'Pat Bet Plast', n_env: 2, n_rec: 0 },
    { tipo: 'proveedor_insumo', ref: 'Corrugadora del Plata', nombre: 'Corrugadora del Plata', n_env: 0, n_rec: 3 },
    { tipo: 'virgilio', ref: 'virgilio', nombre: 'Virgilio', n_env: 0, n_rec: 1 },
  ],
  // PS y tallerista traen ademas maximo/stock_dest/sugerido de la pieza PROCESADA/ARMADA (la
  // salida): la tablet MUESTRA el sugerido y lo precarga en Cantidad SOLO para talleristas (a los
  // P.S. y a los inyectores no: el campo arranca vacio, usuario 2026-09-17). Prov. AT no trae
  // sugerido (va con esas claves nulas) y sigue mostrando "Online sector".
  enviar: [
    // AL TALLERISTA la unidad de envio la pone la PIEZA, y la manda la base en cada fila
    // [usuario 2026-09-18]: carton y caja en PAQUETES (el paqueton del formato / los 25 de la
    // caja) y el resto con el sugerido en CAJONES y la cantidad en KG.
    { tipo: 'tallerista', ref: '6', comp_id: 70, cod: 'A10', desc: 'Cpo Una', sector: 'Sector Crudo', um: 'unidad', uxc: 1000, kg_x_uni: 0.01, online_sector: 120, saldo_dest: 42, maximo: 200, stock_dest: 50, sugerido: 150, env_unidad: 'cajones', env_factor: 1000, env_carga: 'kg' },
    { tipo: 'tallerista', ref: '6', comp_id: 75, cod: 'F7', desc: 'Fleje doblado', sector: 'Sector Fleje', um: 'kg', uxc: null, kg_x_uni: 0.0134, online_sector: 30.5, saldo_dest: 7.5, maximo: 40, stock_dest: 10, sugerido: 12.5, env_unidad: 'cajones', env_factor: null, env_carga: 'kg' },
    // carton: 2.500 uni / paqueton de 1.000 (carton_formato.uni_x_bolsa del formato C) -> 3 paquetes
    { tipo: 'tallerista', ref: '6', comp_id: 300, cod: 'C10', desc: 'Carton Pelapapa 505', sector: 'Sector Cartón', um: 'unidad', uxc: null, kg_x_uni: null, online_sector: 0, saldo_dest: 0, maximo: 3000, stock_dest: 0, sugerido: 2500, env_unidad: 'paquetes', env_factor: 1000, env_carga: 'envase' },
    // caja: paquetes de 25 (parametro caja_uni_x_paquete) -> 60 uni = 3 paquetes (techo)
    { tipo: 'tallerista', ref: '6', comp_id: 310, cod: 'CJ7', desc: 'Caja N°7', sector: 'Sector Caja', um: 'unidad', uxc: null, kg_x_uni: null, online_sector: 0, saldo_dest: 0, maximo: 100, stock_dest: 0, sugerido: 60, env_unidad: 'paquetes', env_factor: 25, env_carga: 'envase' },
    // carton cuyo formato NO tiene paqueton cargado: se carga en unidades y la tarjeta lo dice
    { tipo: 'tallerista', ref: '6', comp_id: 320, cod: 'BANDITA', desc: 'Bandita Palo de Amasar', sector: 'Sector Cartón', um: 'unidad', uxc: null, kg_x_uni: null, online_sector: 0, saldo_dest: 0, maximo: 900, stock_dest: 0, sugerido: 900, env_unidad: 'paquetes', env_factor: null, env_carga: 'envase' },
    { tipo: 'tallerista', ref: '9', comp_id: 70, cod: 'A10', desc: 'Cpo Una', sector: 'Sector Crudo', um: 'unidad', uxc: 1000, kg_x_uni: 0.01, online_sector: 120, saldo_dest: 0, maximo: 200, stock_dest: 0, sugerido: 200, env_unidad: 'cajones', env_factor: 1000, env_carga: 'kg' },
    { tipo: 'proveedor_servicio', ref: '20', comp_id: 90, cod: 'D5', desc: 'Mitad rompenuez', sector: 'Sector Crudo', um: 'unidad', uxc: 500, kg_x_uni: 0.05, online_sector: 40, saldo_dest: 0, maximo: 100, stock_dest: 20, sugerido: 80 },
    // AJ Adhesivos manda por PAQUETES de 100: sugerido 250 uni -> 3 paquetes (techo)
    { tipo: 'proveedor_servicio', ref: '12', comp_id: 564, cod: 'Pliego 506', desc: 'Sin adhesivar', sector: 'Sector Procesado', um: 'unidad', uxc: null, kg_x_uni: null, online_sector: 0, saldo_dest: 0, maximo: 500, stock_dest: 0, sugerido: 250 },
    // Hernandez Julio recibe PESADO (envio_unidad 'kg'): las metalicas van en cajones y las
    // plasticas en bolsas — el bulto sale del sector, no del proveedor.
    { tipo: 'proveedor_servicio', ref: '8', comp_id: 80, cod: 'A1', desc: 'Mgo Plano 501 Pint.', sector: 'Sector Procesado', um: 'unidad', uxc: 750, kg_x_uni: 0.04, online_sector: 0, saldo_dest: 0, maximo: 2000, stock_dest: 0, sugerido: 1000 },
    { tipo: 'proveedor_servicio', ref: '8', comp_id: 231, cod: 'PA10B', desc: 'Capuchon ф 8 S/Serig', sector: 'Sector Plástico', um: 'unidad', uxc: 1000, kg_x_uni: 0.002, online_sector: 0, saldo_dest: 0, maximo: 8000, stock_dest: 0, sugerido: 5000 },
    // Ester manda de a BOLSAS de 1800 mangos pero PESA lo que carga: el sugerido va en bolsas
    // (112.432 mangos -> 63 bolsas, techo) y la cantidad en kg (63 x 1800 x 0,0054 = 612,36 kg)
    { tipo: 'proveedor_servicio', ref: '14', comp_id: 622, cod: 'PC2', desc: 'Mgo Pelapapa 505 Sin Calar', sector: 'Sector Plástico', um: 'unidad', uxc: 1852, kg_x_uni: 0.0054, online_sector: 0, saldo_dest: 0, maximo: 112432, stock_dest: 0, sugerido: 112432 },
    // Guazzaroni Patricio: sugerido en CAJONES (el uni_x_cajon de cada pieza) y cantidad en kg.
    // CV1 tiene cajon (57.143) -> 34.992 remaches = 1 cajon = 20,00 kg. CV9 NO tiene cajon
    // cargado: esa fila NO se convierte, queda en unidades.
    { tipo: 'proveedor_servicio', ref: '4', comp_id: 601, cod: 'CV1', desc: 'Remache Espiral p/Niquelar', sector: 'Sector Remache', um: 'unidad', uxc: 57143, kg_x_uni: 0.00035, online_sector: 0, saldo_dest: 0, maximo: 34992, stock_dest: 0, sugerido: 34992 },
    { tipo: 'proveedor_servicio', ref: '4', comp_id: 609, cod: 'CV9', desc: 'Remache uña niq. p/Niquelar', sector: 'Sector Remache', um: 'unidad', uxc: null, kg_x_uni: 0.000567, online_sector: 0, saldo_dest: 0, maximo: 113304, stock_dest: 0, sugerido: 113304 },
    // el prov. de art. terminado recibe cartones y cajas: los dos van en PAQUETES (mismo envase
    // por pieza que el tallerista). No tiene sugerido, asi que su referencia es el online sector.
    { tipo: 'proveedor_at', ref: '1', comp_id: 456, cod: 'A1', desc: 'Caja N°1', sector: 'Sector Caja', um: 'unidad', uxc: null, kg_x_uni: null, online_sector: 988, saldo_dest: null, maximo: null, stock_dest: null, sugerido: null, env_unidad: 'paquetes', env_factor: 25, env_carga: 'envase' },
    { tipo: 'proveedor_at', ref: '1', comp_id: 457, cod: 'C20', desc: 'Carton Colador N°8', sector: 'Sector Cartón', um: 'unidad', uxc: null, kg_x_uni: null, online_sector: 4200, saldo_dest: null, maximo: null, stock_dest: null, sugerido: null, env_unidad: 'paquetes', env_factor: 1000, env_carga: 'envase' },
    { tipo: 'inyector', ref: 'Pat Bet Plast', comp_id: 742, cod: '2405', desc: 'PP 2630', sector: 'Sector Bolsas Plásticas', um: 'kg', uxc: null, kg_x_uni: null, online_sector: 100, saldo_dest: 40, maximo: 300, stock_dest: 100, sugerido: 200 },
    { tipo: 'inyector', ref: 'Pat Bet Plast', comp_id: 743, cod: '2455', desc: 'ABS GP 22', sector: 'Sector Bolsas Plásticas', um: 'kg', uxc: null, kg_x_uni: null, online_sector: 50, saldo_dest: 8, maximo: 50, stock_dest: 20, sugerido: 30 },
  ],
  recibir: [
    // ENTREGA de tallerista: el esperado se mira en CAJONES y la cantidad se escribe en KG
    // [usuario 2026-09-18]. 1.000 uni / 500 por cajon = 2 cajones; esos 1.000 pesan 10 kg.
    { tipo: 'tallerista', ref: '6', comp_id: 71, comp_entrada_id: 70, n_entradas: 1, tiene_bom: false, cod_art: null, cod: 'A11', desc: 'Una Armada', sector: 'Sector Procesado', um: 'unidad', uxc: 500, kg_x_uni: 0.01, por_caja: null, ent_cod: 'A10', ent_desc: 'Cpo Una', esperado: 1000, esperado_origen: 'online_tall', env_unidad: 'cajones', env_factor: 500, env_carga: 'kg' },
    // la UNICA excepcion: las bombillas GRJ5/GRJ6 entregan BOLSAS de 120 (componente.entrega_*)
    { tipo: 'tallerista', ref: '6', comp_id: 541, comp_entrada_id: null, n_entradas: 0, tiene_bom: false, cod_art: null, cod: 'GRJ5', desc: 'Bombilla Resorte Trad 558', sector: 'Sector Garage', um: 'unidad', uxc: 960, kg_x_uni: 0.0147, por_caja: null, ent_cod: null, ent_desc: null, esperado: 360, esperado_origen: 'online_tall', env_unidad: 'bolsas', env_factor: 120, env_carga: 'kg' },
    { tipo: 'proveedor_at', ref: '1', comp_id: null, comp_entrada_id: null, n_entradas: 0, tiene_bom: false, cod_art: '026', cod: '026', desc: 'Colador N°8', sector: null, um: null, uxc: null, kg_x_uni: null, por_caja: 36, ent_cod: null, ent_desc: null, esperado: 72, esperado_origen: 'oc' },
    { tipo: 'proveedor_servicio', ref: '20', comp_id: 91, comp_entrada_id: 90, n_entradas: 1, tiene_bom: false, cod_art: null, cod: 'D5-P', desc: 'Mitad pintada', sector: 'Sector Procesado', um: 'unidad', uxc: 500, kg_x_uni: 0.05, por_caja: null, ent_cod: 'D5', ent_desc: 'Mitad rompenuez', esperado: 40, esperado_origen: 'online_ps' },
    // Guazzaroni envia por el CAJON de cada pieza y kg: la entrega copia esa misma logica, pero EL
    // CAJON ES EL DE LA PIEZA QUE SE LE MANDO (ent_uxc / ent_kgu, que la base manda solo para los
    // remaches): 1.000 uni / 500 por cajon de CV1 = 2 cajones, y esos 1.000 pesan 50 kg. El uxc de
    // la pieza NIQUELADA (50) es la bolsa en la que se fracciona despues, no un cajon: con ese
    // numero el esperado daba 20 cajones donde habian salido 2 (el caso real fue CV11 -> V11, 5
    // cajones mostrados como 50). [usuario 2026-09-18]
    { tipo: 'proveedor_servicio', ref: '4', comp_id: 601, comp_entrada_id: 600, n_entradas: 1, tiene_bom: false, cod_art: null, cod: 'CV1N', desc: 'Remache Espiral Niquelado', sector: 'Sector Remache', um: 'unidad', uxc: 50, kg_x_uni: 0.05, por_caja: null, ent_cod: 'CV1', ent_desc: 'Remache Espiral p/Niquelar', ent_uxc: 500, ent_kgu: 0.05, esperado: 1000, esperado_origen: 'online_ps' },
    // AJ: 600 pliegos esperados / 200 por paquete de ENTREGA = 3 paquetes (no 6, que serian de envio)
    { tipo: 'proveedor_servicio', ref: '12', comp_id: 565, comp_entrada_id: 564, n_entradas: 1, tiene_bom: false, cod_art: null, cod: 'Pliego Ad 506', desc: 'Adhesivado', sector: 'Sector Procesado', um: 'unidad', uxc: null, kg_x_uni: null, por_caja: null, ent_cod: 'Pliego 506', ent_desc: 'Sin adhesivar', esperado: 600, esperado_origen: 'online_ps' },
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
      // igual que la base: alerta por item recibido con esperado y recibido > esperado
      var p = args.p, al = [];
      (p.items||[]).forEach(function(it){
        if(p.modo==='recibir' && it.esperado != null && it.cantidad > it.esperado)
          al.push({ id: 900+al.length, cod: it.cod_art || ('comp'+it.comp_id), esperado: it.esperado, recibido: it.cantidad, exceso: it.cantidad-it.esperado });
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
  const tipos = () => page.$$eval('#tipoGrid .tipo-btn', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  // Enviar -> Prov. de servicio (y los inyectores, que se eligen ahi adentro) muestra las partes
  // como TARJETAS y la carga en una vista aparte [usuario 2026-09-18]. Estos helpers son ese flujo.
  const cards = () => page.$$eval('#cardsGrid .parte-card', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  const abrir = async (cod) => {
    await page.click('#cardsGrid .parte-card:has-text("' + cod + '")');
    await page.waitForSelector('#detCard input[data-f="q"]');
  };
  const det = () => page.$eval('#detCard', e => e.textContent.replace(/\s+/g, ' ').trim());
  const DQ = '#detCard input[data-f="q"]', DC = '#detCard input[data-f="c"]';
  const DEQ = '#detCard .det-eq';   // el renglon chico con el equivalente en bultos
  const cargarParte = async (cod, valor) => { await abrir(cod); await page.fill(DQ, valor); await page.click('#btnVolverPartes'); };

  await page.goto(ROOT + '/Tablet/Tablet_GP2.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);

  // ── 1) modo ENVIAR: primero el TIPO ──────────────────────────────────────
  ok(await page.$eval('#modos .modo-btn.active', b => b.dataset.modo) === 'enviar', 'arranca en Enviar');
  let ts = await tipos();
  ok(ts.length === 4 && !ts.join('|').includes('Virgilio'), 'Enviar: 4 tipos, Virgilio afuera — ' + ts.join(' | '));
  ok(ts.some(t => t.includes('Inyectores')), 'Enviar: los Inyectores tienen su propio tipo — ' + ts.join(' | '));
  ok(ts[0].includes('Talleristas') && ts[0].includes('· 2') && !ts.join('|').includes('contraparte'),
     'el tipo dice cuántas hay sin la palabra "contraparte" — ' + ts[0]);
  ok(await page.$eval('#cpBox', e => e.classList.contains('hidden')), 'todavía no se listan las contrapartes');

  await page.click('#tipoGrid .tipo-btn[data-tipo="tallerista"]');
  let btns = await page.$$eval('#cpGrid .prov-btn', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ')));
  ok(btns.length === 2 && btns[0].startsWith('Martin Cornejo') && btns[1].startsWith('Lucho') && !btns.join('|').includes('tallerista'),
     'adentro de Talleristas solo talleristas (2) y sin repetir el tipo en cada chip — ' + btns.join(' | '));
  ok((await page.$eval('#fase0Title', e => e.textContent)) === 'Talleristas', 'el título dice el tipo elegido');

  // el "← Cambiar tipo" vuelve a los tipos sin recargar
  await page.click('#btnVolverTipo');
  ok((await tipos()).length === 4 && await page.$eval('#cpBox', e => e.classList.contains('hidden')), 'Cambiar tipo vuelve a los tipos');

  // Los INYECTORES tienen su PROPIO tipo y NO aparecen bajo "Prov. de servicio" [usuario
  // 2026-09-18]. Su envio son las RESINAS (bolsas) en kg.
  await page.click('#tipoGrid .tipo-btn[data-tipo="proveedor_servicio"]');
  const soloPS = await page.$$eval('#cpGrid .prov-btn', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ')));
  ok(soloPS.some(b => b.startsWith('Blist-Pack')) && !soloPS.some(b => b.startsWith('Pat Bet Plast')),
     'bajo "Prov. de servicio" ya no sale el inyector — ' + soloPS.join(' | '));
  await page.click('#btnVolverTipo');
  // un solo inyector en el fixture: el tipo entra directo a su carga (no se elige entre uno)
  await page.click('#tipoGrid .tipo-btn[data-tipo="inyector"]');
  ok((await page.$eval('#fase1Title', e => e.textContent)) === 'Pat Bet Plast',
     'Inyectores abre el inyector (Pat Bet Plast)');
  // el inyector se carga igual que un P.S., asi que tambien va en TARJETAS (aunque desde v1.14.0
  // se lo elija en su propio boton): la vista cuelga de envSinMemoria, que incluye a los dos
  ok(await page.$eval('#tblWrap', e => e.classList.contains('hidden')) &&
     !(await page.$eval('#cardsGrid', e => e.classList.contains('hidden'))),
     'inyector: la tabla no se usa, las partes van en tarjetas');
  const resinas = await cards();
  ok(resinas.length === 2 && resinas.some(r => r.includes('2405')) && resinas.every(r => r.includes('kg')),
     'el inyector manda sus resinas (bolsas) en kg — ' + resinas.join(' | '));
  // el sugerido de bolsas (kg) se VE en la tarjeta, pero la cantidad arranca sin cargar: el campo
  // lo escribe la persona [usuario 2026-09-17: "no me preescribas ... la cantidad que voy a enviar"]
  ok(resinas[0].includes('Sugerido 200 kg') && resinas[1].includes('Sugerido 30 kg'),
     'inyector: cada tarjeta muestra su sugerido — ' + resinas.join(' | '));
  ok(resinas.every(r => r.includes('sin cargar')), 'inyector: las tarjetas arrancan sin cargar — ' + resinas.join(' | '));
  ok((await page.$$eval('#cardsGrid .parte-card.cargada', xs => xs.length)) === 0,
     'inyector: ninguna tarjeta se pinta como cargada');
  ok((await page.$eval('#btnEnviar', e => e.disabled)) === true, 'inyector: sin nada cargado el boton Enviar no habilita');
  // la vista de UNA parte: codigo, descripcion, el sugerido y el campo de la cantidad efectiva
  await abrir('2405');
  const detIny = await det();
  ok(detIny.includes('2405') && detIny.includes('PP 2630') && detIny.includes('Sugerido a enviar') &&
     detIny.includes('200 kg') && detIny.includes('Cantidad a enviar'),
     'inyector: la vista de la parte trae codigo, descripcion, sugerido y el campo — ' + detIny);
  ok((await page.$eval(DQ, e => e.value)) === '', 'inyector: el campo de la vista arranca vacio');
  ok((await page.$eval(DQ, e => e.getAttribute('inputmode'))) === 'decimal', 'inyector: teclado decimal (resina en kg)');
  // adentro de una parte no se cierra la carga: ni Fecha ni el boton de registrar [usuario 2026-09-18]
  ok(await page.$eval('#accBox', e => e.classList.contains('hidden')),
     'Enviar: adentro de la parte no se ve ni la Fecha ni el boton de enviar');
  await page.click('#btnVolverPartes');
  ok(!(await page.$eval('#accBox', e => e.classList.contains('hidden'))),
     'Enviar: "← Partes" devuelve la Fecha y el boton de enviar');
  ok((await page.$$eval('#cardsGrid .parte-card', xs => xs.length)) === 2, 'inyector: "← Partes" vuelve a la grilla');
  await page.click('#btnVolver');        // un solo inyector: vuelve directo a los tipos
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);

  await page.click('#tipoGrid .tipo-btn[data-tipo="tallerista"]');
  await page.click('#cpGrid .prov-btn:has-text("Martin")');

  // ── el TALLERISTA tambien va en tarjetas, y cada pieza trae su unidad de envio ──────────
  ok(await page.$eval('#tblWrap', e => e.classList.contains('hidden')) &&
     !(await page.$eval('#cardsGrid', e => e.classList.contains('hidden'))),
     'tallerista: las partes van en tarjetas, no en la tabla');
  let tcards = await cards();
  ok(tcards.length === 5, 'tallerista: una tarjeta por pieza (5) — ' + tcards.length);
  const cardDe = (cod) => tcards.find(c => c.startsWith(cod));
  // el resto de las piezas: el sugerido se mira en CAJONES y la cantidad se escribe en KG
  ok(cardDe('A10').includes('Cpo Una') && cardDe('A10').includes('Sugerido 1 caj\u00f3n') &&
     cardDe('A10').includes('kg'),
     'A10: sugerido 150 uni -> 1 cajon (techo, en singular) y se carga en kg — ' + cardDe('A10'));
  // carton: el paqueton lo pone el FORMATO (1.000) -> 2.500 uni = 3 paquetes
  ok(cardDe('C10').includes('Sugerido 3 paquetes'),
     'C10 (carton): 2.500 uni / paqueton de 1.000 -> 3 paquetes — ' + cardDe('C10'));
  // caja: paquetes de 25
  ok(cardDe('CJ7').includes('Sugerido 3 paquetes'),
     'CJ7 (caja): 60 uni / 25 por paquete -> 3 paquetes — ' + cardDe('CJ7'));
  // lo que no tiene el dato NO se convierte: queda en unidades y lo dice
  ok(cardDe('BANDITA').includes('900') && cardDe('BANDITA').includes('sin paquete cargado'),
     'BANDITA: sin paqueton cargado queda en unidades y avisa — ' + cardDe('BANDITA'));
  ok(cardDe('F7').includes('12,5') && cardDe('F7').includes('sin caj\u00f3n cargado'),
     'F7: sin uni_x_cajon queda en kg y avisa — ' + cardDe('F7'));
  // NADA viene precargado: desde el 2026-09-18 tampoco al tallerista [usuario: "igual que P.S."]
  ok(tcards.every(c => c.includes('sin cargar')), 'tallerista: las tarjetas arrancan sin cargar');
  ok((await page.$eval('#btnEnviar', e => e.disabled)) === true, 'tallerista: sin nada cargado no se puede enviar');

  // la vista de la parte: el sugerido en cajones arriba, los kg abajo, y la equivalencia
  // LAS DOS UNIDADES: primero los cajones y despues los kg [usuario 2026-09-18], y "Listo" no se
  // habilita hasta que esten las dos.
  await abrir('A10');
  const detA10 = await det();
  ok(detA10.includes('Sugerido a enviar') && detA10.includes('1 caj\u00f3n') &&
     detA10.includes('Cantidad (cajones)') && detA10.includes('Cantidad (kg)'),
     'A10: la vista pide los cajones Y los kg — ' + detA10);
  ok((await page.$eval(DC, e => e.value)) === '' && (await page.$eval(DQ, e => e.value)) === '',
     'A10: los dos campos arrancan vacios');
  ok((await page.$eval('#detCard button[data-a="listo"]', b => b.disabled)) === true,
     'A10: sin nada cargado no se puede cerrar la parte');
  await page.fill(DC, '3');
  ok((await page.$eval('#detCard button[data-a="listo"]', b => b.disabled)) === true,
     'A10: con los cajones solos tampoco: falta el kg');
  ok((await page.$eval('#detCard .det-falta', e => e.textContent.trim())) === 'Falta anotar los kg',
     'A10: y la vista dice que falta');
  ok((await page.$eval('#btnEnviar', e => e.textContent)) === 'Enviar',
     'A10: una fila a medias NO se cuenta para registrar');
  // EL PUNTO TIPEADO ENTRA COMO COMA [usuario 2026-09-18: "quiero que me deje poner . o , para
  // poner decimales"]. Se tipea tecla por tecla: con page.fill no pasa por beforeinput.
  await page.click(DQ);
  await page.type(DQ, '10.5');
  ok((await page.$eval(DQ, e => e.value)) === '10,5',
     'el punto tipeado en un campo con decimales entra como coma — ' + (await page.$eval(DQ, e => e.value)));
  await page.fill(DQ, '');
  await page.fill(DC, '');
  await page.click(DC);
  await page.type(DC, '2.5');
  ok((await page.$eval(DC, e => e.value)) === '25',
     'en un campo de enteros (cajones) el punto no entra — ' + (await page.$eval(DC, e => e.value)));
  await page.fill(DC, '3');
  await page.fill(DQ, '25');
  ok((await page.$eval('#detCard button[data-a="listo"]', b => b.disabled)) === false,
     'A10: con las dos, Listo se habilita');
  // 3 cajones contra los 2,5 que dan los kg: media unidad de desvio, NO avisa
  ok((await page.$eval('#detCard .det-eq', e => e.textContent.trim())) === '= 2,5 cajones' &&
     !(await page.$eval('#detCard .det-eq', e => e.classList.contains('mal'))),
     'A10: 3 cajones contra 2,5 es medio envase de diferencia y NO salta alerta');
  // 4 contra 2,5: se pasa de media unidad, avisa — pero deja cerrar igual
  await page.fill(DC, '4');
  ok((await page.$eval('#detCard .det-eq', e => e.classList.contains('mal'))) &&
     (await page.$eval('#detCard .det-eq', e => e.textContent)).includes('anotaste 4 cajones'),
     'A10: 4 cajones contra 2,5 SI avisa — ' + (await page.$eval('#detCard .det-eq', e => e.textContent.trim())));
  ok((await page.$eval('#detCard button[data-a="listo"]', b => b.disabled)) === false,
     'A10: la alerta avisa pero NO frena: Listo sigue habilitado');
  // los dos campos van UNO AL LADO DEL OTRO, no apilados [usuario 2026-09-18]
  const dos = await page.evaluate(() => {
    const c = document.querySelector('#detCard input[data-f="c"]').getBoundingClientRect();
    const q = document.querySelector('#detCard input[data-f="q"]').getBoundingClientRect();
    return { mismaFila: Math.abs(c.top - q.top) < 4, envaseIzq: c.left < q.left,
             ancho: Math.round(document.querySelector('#detCard').getBoundingClientRect().width) };
  });
  ok(dos.mismaFila && dos.envaseIzq,
     'los dos campos van al lado, con el envase a la izquierda \u2014 ' + JSON.stringify(dos));
  await page.fill(DC, '3');
  await page.click('#btnVolverPartes');
  ok((await cards()).find(c => c.startsWith('A10')).includes('env\u00eda 25 kg') &&
     (await cards()).find(c => c.startsWith('A10')).includes('(3 cajones)'),
     'A10: la tarjeta muestra las dos unidades — ' + (await cards()).find(c => c.startsWith('A10')));

  // el carton se escribe EN PAQUETES (no en kg): no lleva el renglon de equivalencia
  await abrir('C10');
  ok((await page.$eval('#detCard .det-uni', e => e.textContent.trim())) === 'paquetes',
     'C10: la cantidad se escribe en paquetes');
  ok((await page.$eval('#detCard .det-eq', e => e.textContent.trim())) === '',
     'C10: sin equivalencia: el campo YA esta en paquetes');
  ok((await page.$eval(DQ, e => e.getAttribute('inputmode'))) === 'numeric', 'C10: teclado numerico (paquetes enteros)');
  await page.fill(DQ, '3');
  await page.click('#btnVolverPartes');
  await cargarParte('CJ7', '2');

  // ── 2) el buscador filtra las tarjetas ────────────────────────────────
  await page.fill('#q', 'fleje');
  tcards = await cards();
  ok(tcards.length === 1 && tcards[0].includes('F7'), 'buscador "fleje" deja solo F7');
  await page.fill('#q', '');
  await page.waitForFunction(() => document.querySelectorAll('#cardsGrid .parte-card').length === 5);

  // se registra lo que se cargo a mano: A10 25 kg, C10 3 paquetes, CJ7 2 paquetes
  const fecha = await page.$eval('#fFecha', e => e.value);
  ok((await page.$eval('#btnEnviar', e => e.textContent)) === 'Enviar (3)', 'tallerista: las 3 piezas cargadas');
  await page.click('#btnEnviar');
  await page.waitForFunction(() => !document.getElementById('fase3').classList.contains('hidden'));
  let reg = await calls('tablet_registrar');
  ok(reg.length === 1, 'una llamada tablet_registrar');
  let p = reg[0].args.p;
  ok(p.modo === 'enviar' && p.tipo === 'tallerista' && p.ref === '6' && p.fecha === fecha + 'T12:00:00' && p.remito === null,
     'payload enviar: modo/tipo/ref/fecha — ' + JSON.stringify({ modo: p.modo, tipo: p.tipo, ref: p.ref, fecha: p.fecha }));
  ok(p.items.length === 3, 'se envian las 3 piezas cargadas');
  const itA10 = p.items.find(i => i.comp_id === 70), itC10 = p.items.find(i => i.comp_id === 300),
        itCJ = p.items.find(i => i.comp_id === 310);
  // el inventario nunca ve paquetes ni cajones: lo que viaja es kg o unidades
  // el bulto que se anota es el MISMO numero que se ve en pantalla, con decimales
  ok(itA10 && itA10.cantidad === 25 && itA10.unidad === 'kg' && itA10.cajones === 3,
     'A10: viajan los 25 kg y los 3 cajones que ANOTO el operario — ' + JSON.stringify(itA10));
  ok(itC10 && itC10.cantidad === 3000 && itC10.unidad === 'uni',
     'C10: 3 paquetes se guardan como 3.000 cartones (uni) — ' + JSON.stringify(itC10));
  ok(itCJ && itCJ.cantidad === 50 && itCJ.unidad === 'uni',
     'CJ7: 2 paquetes se guardan como 50 cajas (uni) — ' + JSON.stringify(itCJ));
  ok(dialogs.some(d => d.type === 'confirm' && d.msg.includes('Enviar a Martin Cornejo') &&
                       d.msg.includes('3 paquetes') && d.msg.includes('25 kg')),
     'confirm de envio con resumen en la unidad de cada pieza');
  ok((await page.$eval('#successTitle', e => e.textContent)).includes('Enviado'), 'exito de envio');
  const buf = await page.evaluate(() => JSON.parse(localStorage.getItem('gp2_tablet_buffer') || '{}'));
  ok(!buf['enviar:tallerista:6'], 'buffer limpio tras enviar');

  // ── PROV. DE ART. TERMINADO: tarjetas tambien, en PAQUETES, y sin sugerido ──────────────
  // Recibe cartones y cajas, o sea las dos cosas que van en paquetes. No tiene sugerido: su
  // numero de referencia es el ONLINE DEL SECTOR (lo que hay en Cervantes para mandarle).
  await page.click('#btnOtro');
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  await page.click('#tipoGrid .tipo-btn[data-tipo="proveedor_at"]');   // una sola contraparte: entra derecho
  await page.waitForFunction(() => document.querySelectorAll('#cardsGrid .parte-card').length > 0);
  ok((await page.$eval('#fase1Title', e => e.textContent)) === 'Cabral', 'prov. AT: entra derecho a Cabral');
  ok(await page.$eval('#tblWrap', e => e.classList.contains('hidden')),
     'prov. AT: en Enviar ya no queda tabla, van en tarjetas');
  const atCards = await cards();
  ok(atCards.length === 2, 'prov. AT: una tarjeta por pieza (2) — ' + atCards.length);
  ok(atCards[0].includes('Caja N°1') && atCards[0].includes('Online sector 988'),
     'prov. AT: sin sugerido, la referencia es el online del sector — ' + atCards[0]);
  ok(atCards.every(c => c.includes('paquetes')), 'prov. AT: cartones y cajas se mandan en paquetes — ' + atCards.join(' | '));
  await abrir('A1');
  const detAt = await det();
  ok(detAt.includes('Online en el sector') && detAt.includes('988') && detAt.includes('Cantidad a enviar'),
     'prov. AT: la vista de la parte dice el online y pide la cantidad — ' + detAt);
  ok((await page.$eval('#detCard .det-uni', e => e.textContent.trim())) === 'paquetes',
     'prov. AT: la cantidad se escribe en paquetes (de 25 la caja)');
  ok((await page.$eval(DQ, e => e.value)) === '', 'prov. AT: el campo arranca vacio');
  await page.fill(DQ, '2');
  await page.click('#btnVolverPartes');
  await cargarParte('C20', '3');
  await page.click('#btnEnviar');
  await page.waitForFunction(() => !document.getElementById('fase3').classList.contains('hidden'));
  const regAt = await calls('tablet_registrar');
  const itsAt = regAt[regAt.length - 1].args.p.items;
  const itCaja = itsAt.find(i => i.comp_id === 456), itCart = itsAt.find(i => i.comp_id === 457);
  ok(itCaja && itCaja.cantidad === 50 && itCaja.unidad === 'uni',
     'prov. AT: 2 paquetes de caja se guardan como 50 cajas (uni) — ' + JSON.stringify(itCaja));
  ok(itCart && itCart.cantidad === 3000 && itCart.unidad === 'uni',
     'prov. AT: 3 paquetones de carton se guardan como 3.000 cartones (uni) — ' + JSON.stringify(itCart));

  // ── AJ Adhesivos manda por PAQUETES de 100: sugerido y cantidad EN paquetes, se guarda en pliegos ──
  await page.click('#btnOtro');
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  await page.click('#tipoGrid .tipo-btn[data-tipo="proveedor_servicio"]');
  await page.click('#cpGrid .prov-btn:has-text("AJ Adhesivos")');
  const ajCards = await cards();
  ok(ajCards.length === 1 && ajCards[0].includes('Pliego 506') && ajCards[0].includes('Sin adhesivar'),
     'AJ: la parte es una tarjeta con su codigo y su descripcion — ' + ajCards[0]);
  ok(ajCards[0].includes('Sugerido 3 paquetes'),
     'AJ: sugerido 250 uni -> 3 paquetes (techo), en la unidad del proveedor — ' + ajCards[0]);
  await abrir('Pliego 506');
  const detAj = await det();
  ok(detAj.includes('Sugerido a enviar') && detAj.includes('3 paquetes') && detAj.includes('Cantidad a enviar'),
     'AJ: la vista de la parte muestra el sugerido en paquetes y el campo — ' + detAj);
  ok((await page.$eval(DQ, e => e.value)) === '',
     'AJ (P.S.): la cantidad NO viene precargada, la escribe la persona');
  ok((await page.$eval('#detCard .det-uni', e => e.textContent.trim())) === 'paquetes',
     'AJ: el campo dice que se escribe en paquetes');
  // NO hay atajo para copiar el sugerido al campo [usuario 2026-09-18: "no quiero que aparezca la
  // opcion de enviar sugerido"]: el unico boton de la vista es "Listo"
  const btnsDet = await page.$$eval('#detCard button', xs => xs.map(b => b.textContent.trim()));
  ok(btnsDet.join('|') === 'Listo', 'la vista de la parte no ofrece copiar el sugerido — ' + btnsDet.join(' | '));
  await page.fill(DQ, '3');
  await page.click('#btnVolverPartes');
  const ajCard2 = (await cards())[0];
  ok(ajCard2.includes('envía 3 paquetes') && (await page.$$eval('#cardsGrid .parte-card.cargada', xs => xs.length)) === 1,
     'AJ: al volver, la tarjeta muestra lo que se va a mandar y queda marcada — ' + ajCard2);
  await page.click('#btnEnviar');
  await page.waitForFunction(() => !document.getElementById('fase3').classList.contains('hidden'));
  const regAj = await calls('tablet_registrar');
  const itAj = regAj[regAj.length - 1].args.p.items[0];
  ok(itAj.comp_id === 564 && itAj.cantidad === 300 && itAj.unidad === 'uni',
     'AJ: 3 paquetes se guardan como 300 pliegos (uni), no como paquetes — ' + JSON.stringify(itAj));
  ok(dialogs.some(d => d.type === 'confirm' && d.msg.includes('3 paquetes')), 'AJ: el confirm resume en paquetes');

  // ── Hernandez Julio recibe PESADO: sugerido en bultos enteros + Cantidad (kg) con el bulto abajo ──
  // Desde el 2026-09-18 Julio NO tiene columna de bulto: sus bolsas/cajones salen como el renglon
  // chico de debajo del campo de kg, igual que en Ester y en los que van por el cajon de la pieza
  // [usuario: "esta bien que me lo ponga chiquito abajo, pero modifica hernandez julio asi quedan
  // todos asi"]. El bulto se calcula de los kg y ya no se corrige a mano.
  await page.click('#btnOtro');
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  await page.click('#tipoGrid .tipo-btn[data-tipo="proveedor_servicio"]');
  await page.click('#cpGrid .prov-btn:has-text("Hernandez Julio")');
  const juCards = await cards();
  // el sugerido se mira en BULTOS enteros (techo), no en kilos: 1000 uni / 750 por cajon -> 2
  ok(juCards.length === 2 && juCards[0].includes('A1') && juCards[0].includes('Sugerido 2 cajones'),
     'Julio metalica: sugerido 1000 uni -> 2 cajones (techo), sin kilos en la tarjeta — ' + juCards[0]);
  ok(juCards[1].includes('PA10B') && juCards[1].includes('Sugerido 5 bolsas'),
     'Julio plastica: sugerido 5000 uni -> 5 bolsas — ' + juCards[1]);
  ok(juCards.every(c => c.includes('sin cargar')), 'Julio: las dos tarjetas arrancan sin cargar (P.S.)');
  // desde el 2026-09-18 (tarde) Julio vuelve a tener DOS campos, como todos los que se mandan
  // pesados: el bulto se ANOTA (no se calcula) y despues los kg [usuario: "tengo que poder poner
  // cajones primero y despues los kg"]. El renglon chico pasa a ser el CRUCE de los dos.
  await abrir('PA10B');
  const detJu = await det();
  ok(detJu.includes('Sugerido a enviar') && detJu.includes('5 bolsas') &&
     detJu.includes('Cantidad (bolsas)') && detJu.includes('Cantidad (kg)'),
     'Julio: la vista pide las bolsas Y los kg — ' + detJu);
  ok((await page.$eval(DQ, e => e.value)) === '' && (await page.$eval(DC, e => e.value)) === '',
     'Julio plastica: los dos campos arrancan vacios (P.S.: no se precarga)');
  ok((await page.$eval(DEQ, e => e.textContent.trim())) === '',
     'Julio: con el campo vacio el renglon del bulto no dice "= 0"');
  await page.fill(DC, '10');
  await page.fill(DQ, '21');
  ok((await page.$eval(DEQ, e => e.textContent.trim())) === '= 10,5 bolsas',
     'Julio plastica: 21 kg -> 10,5 bolsas, sin redondear — ' + (await page.$eval(DEQ, e => e.textContent.trim())));
  ok(!(await page.$eval(DEQ, e => e.classList.contains('mal'))),
     'Julio plastica: 10 bolsas contra 10,5 es medio envase, no avisa');
  await page.click('#btnVolverPartes');
  await abrir('A1');
  await page.fill(DC, '3');
  await page.fill(DQ, '82');
  ok((await page.$eval(DEQ, e => e.textContent.trim())) === '= 2,73 cajones',
     'Julio metalica: 82 kg -> 2,73 cajones, con decimales — ' + (await page.$eval(DEQ, e => e.textContent.trim())));
  await page.click('#btnVolverPartes');
  const juCards2 = await cards();
  ok(juCards2[0].includes('envía 82 kg') && juCards2[1].includes('envía 21 kg'),
     'Julio: las tarjetas muestran los kg cargados — ' + juCards2.join(' | '));
  await page.click('#btnEnviar');
  await page.waitForFunction(() => !document.getElementById('fase3').classList.contains('hidden'));
  const regJu = await calls('tablet_registrar');
  const itsJu = regJu[regJu.length - 1].args.p.items;
  ok(itsJu[0].comp_id === 80 && itsJu[0].cantidad === 82 && itsJu[0].unidad === 'kg' && itsJu[0].cajones === 3,
     'Julio metalica: viajan los KG y los cajones ANOTADOS — ' + JSON.stringify(itsJu[0]));
  ok(itsJu[1].comp_id === 231 && itsJu[1].cantidad === 21 && itsJu[1].unidad === 'kg' && itsJu[1].cajones === 10,
     'Julio plastica: 21 kg con las 10 bolsas anotadas — ' + JSON.stringify(itsJu[1]));
  ok(dialogs.some(d => d.type === 'confirm' && d.msg.includes('82 kg (3 cajones)')),
     'Julio: el confirm resume las dos unidades');
  // ── Ester: el sugerido en BOLSAS de 1800 pero la cantidad EN KG, con las bolsas al lado ──
  await page.click('#btnOtro');
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  await page.click('#tipoGrid .tipo-btn[data-tipo="proveedor_servicio"]');
  await page.click('#cpGrid .prov-btn:has-text("Ester")');
  const esCard = (await cards())[0];
  ok(esCard.includes('PC2') && esCard.includes('Sugerido 63 bolsas'),
     'Ester: 112.432 mangos / 1800 -> 63 bolsas (techo) en la tarjeta — ' + esCard);
  await abrir('PC2');
  const detEs = await det();
  ok(detEs.includes('63 bolsas') && detEs.includes('Cantidad (bolsas)') && detEs.includes('Cantidad (kg)'),
     'Ester: el sugerido se mira en bolsas, y se anotan las bolsas Y los kg — ' + detEs);
  ok((await page.$eval(DQ, e => e.value)) === '',
     'Ester (P.S.): los kg NO vienen precargados con esas 63 bolsas, los escribe la persona');
  await page.fill(DC, '63');
  await page.fill(DQ, '612,36');
  ok((await page.$eval('#detCard .det-eq', e => e.textContent.trim())) === '= 63 bolsas',
     'Ester: debajo del campo dice a cuántas bolsas equivale lo tipeado');
  await page.fill(DQ, '100');
  ok((await page.$eval('#detCard .det-eq', e => e.textContent)).includes('10,29 bolsas'),
     'Ester: 100 kg / 9,72 = 10,29 bolsas, tal cual (usuario 2026-09-18) — ' +
     (await page.$eval('#detCard .det-eq', e => e.textContent.trim())));
  // y si no llega a un envase se dice el decimal, no una frase
  await page.fill(DQ, '3');
  ok((await page.$eval('#detCard .det-eq', e => e.textContent)).includes('0,31 bolsas'),
     'Ester: 3 kg = 0,31 bolsas, en numero y no en palabras — ' +
     (await page.$eval('#detCard .det-eq', e => e.textContent.trim())));
  await page.fill(DQ, '612,36');
  await page.click('#btnVolverPartes');
  ok((await cards())[0].includes('envía 612,36 kg') && (await cards())[0].includes('(63 bolsas)'),
     'Ester: la tarjeta muestra las dos unidades — ' + (await cards())[0]);
  await page.click('#btnEnviar');
  await page.waitForFunction(() => !document.getElementById('fase3').classList.contains('hidden'));
  const regEs = await calls('tablet_registrar');
  const itEs = regEs[regEs.length - 1].args.p.items[0];
  ok(itEs.comp_id === 622 && itEs.cantidad === 612.36 && itEs.unidad === 'kg' && itEs.cajones === 63,
     'Ester: viaja el KG tal cual (la base lo pasa a mangos con kg_x_uni) y las 63 bolsas quedan anotadas — ' + JSON.stringify(itEs));
  ok(dialogs.some(d => d.type === 'confirm' && d.msg.includes('612,36 kg (63 bolsas)')),
     'Ester: el confirm dice los kg y las bolsas');

  // ── Guazzaroni: el sugerido en CAJONES (el de cada pieza) y la cantidad en kg ──────
  await page.click('#btnOtro');
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  await page.click('#tipoGrid .tipo-btn[data-tipo="proveedor_servicio"]');
  await page.click('#cpGrid .prov-btn:has-text("Guazzaroni")');
  const gzCards = await cards();
  ok(gzCards[0].includes('Sugerido 1 caj\u00f3n'),
     'Guazzaroni: 34.992 remaches / 57.143 por cajón -> 1 cajón (techo, en singular) — ' + gzCards[0]);
  ok(gzCards[1].includes('113.304') && gzCards[1].includes('sin cajón cargado'),
     'Guazzaroni: la pieza sin uni_x_cajon NO se convierte, queda en unidades y lo dice — ' + gzCards[1]);
  ok(gzCards.every(c => c.includes('sin cargar')), 'Guazzaroni (P.S.): las tarjetas arrancan sin cargar');
  await page.click('#cardsGrid .parte-card:first-child');
  await page.waitForSelector(DQ);
  ok((await page.$eval('#detCard .det-eq', e => e.textContent.trim())) === '',
     'Guazzaroni: con el campo vacio la equivalencia no dice nada');
  await page.fill(DC, '4');
  await page.fill(DQ, '70');
  ok((await page.$eval('#detCard .det-eq', e => e.textContent.trim())) === '= 3,5 cajones',
     'Guazzaroni: los cajones van con decimales (70 kg / 20 = 3,5) — ' +
     (await page.$eval('#detCard .det-eq', e => e.textContent.trim())));
  await page.click('#btnVolverPartes');
  // la pieza sin cajon se carga en unidades, a mano como el resto
  await page.click('#cardsGrid .parte-card:nth-child(2)');
  await page.waitForSelector(DQ);
  ok((await page.$eval('#detCard .det-uni', e => e.textContent.trim())) === 'uni',
     'Guazzaroni: la pieza sin cajón se escribe en unidades, no en kg');
  ok((await page.$$eval('#detCard .det-eq', xs => xs.map(x => x.textContent.trim()))).join('') === '',
     'Guazzaroni: y no muestra equivalencia a cajones');
  await page.fill(DQ, '113.304');
  await page.click('#btnVolverPartes');
  await page.click('#btnEnviar');
  await page.waitForFunction(() => !document.getElementById('fase3').classList.contains('hidden'));
  const regGz = await calls('tablet_registrar');
  const itsGz = regGz[regGz.length - 1].args.p.items;
  ok(itsGz[0].comp_id === 601 && itsGz[0].cantidad === 70 && itsGz[0].unidad === 'kg' && itsGz[0].cajones === 4,
     'Guazzaroni: viaja el KG y los 4 cajones ANOTADOS — ' + JSON.stringify(itsGz[0]));
  ok(itsGz[1].comp_id === 609 && itsGz[1].cantidad === 113304 && itsGz[1].unidad === 'uni' && itsGz[1].cajones === null,
     'Guazzaroni: la pieza sin cajón viaja en unidades, sin inventar factor — ' + JSON.stringify(itsGz[1]));

  // ── 3) modo RECIBIR: sin prov. AT, con Insumos que es un link ─────────────
  await page.click('#btnOtro');
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  await page.click('#modos .modo-btn[data-modo="recibir"]');
  ts = await tipos();
  ok(ts.length === 4 && !ts.join('|').includes('art. terminado'),
     'Recibir: 4 tipos y el prov. de art. terminado NO esta (entrega en Virgilio) — ' + ts.join(' | '));
  ok(ts.some(t => t.includes('Prov. de insumos')) && ts.some(t => t.includes('Virgilio')), 'Recibir: estan Insumos y Virgilio');
  const hrefInsumos = await page.$eval('#tipoGrid .tipo-btn[data-tipo="proveedor_insumo"]', a => a.getAttribute('href'));
  ok(hrefInsumos === '../StockFlejes/RecepcionInsumos_GP2.html?volver=tablet',
     'Insumos abre Recepcion Insumos (una sola copia del flujo) — ' + hrefInsumos);

  // Virgilio es una sola contraparte: se entra derecho a la carga
  await page.click('#tipoGrid .tipo-btn[data-tipo="virgilio"]');
  await page.waitForFunction(() => !document.getElementById('fase1').classList.contains('hidden'));
  ok((await page.$eval('#fase1Title', e => e.textContent)) === 'Virgilio', 'un tipo con una sola contraparte entra derecho');
  rows = await page.$$eval('#tbody tr', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ')));
  ok(rows.length === 1 && rows[0].includes('IC3V') && rows[0].includes('20 kg') && rows[0].includes('online Virgilio'),
     'Virgilio: IC3V con esperado 20 kg del online — ' + rows[0]);
  await page.click('#btnVolver');
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  ok(true, 'volver desde un tipo de una sola contraparte cae en los tipos');

  // tallerista: en Recibir solo entrega Martin (Lucho tiene n_rec 0), asi que se entra derecho
  await page.click('#tipoGrid .tipo-btn[data-tipo="tallerista"]');
  await page.waitForFunction(() => !document.getElementById('fase1').classList.contains('hidden'));
  ok((await page.$eval('#fase1Title', e => e.textContent)) === 'Martin Cornejo',
     'en Recibir solo el tallerista que entrega algo (Lucho no), y se entra derecho');
  ok(!(await page.$eval('#fRemito', e => e.classList.contains('hidden'))), 'en Recibir se pide el remito');
  // las partes tambien en TARJETAS, con ESPERADO y CANTIDAD en vez de sugerido y cantidad
  ok(await page.$eval('#tblWrap', e => e.classList.contains('hidden')),
     'Recibir de tallerista: tarjetas, no tabla');
  let rcards = await cards();
  ok(rcards.length === 2, 'Recibir: una tarjeta por pieza (2) — ' + rcards.length);
  const rDe = (cod) => rcards.find(c => c.startsWith(cod));
  ok(rDe('A11').includes('Una Armada') && rDe('A11').includes('Esperado 2 cajones'),
     'A11: el esperado se mira en CAJONES (1.000 uni / 500) — ' + rDe('A11'));
  ok(rDe('A11').includes('kg'), 'A11: la cantidad se escribe en kg — ' + rDe('A11'));
  ok(rDe('GRJ5').includes('Esperado 3 bolsas'),
     'GRJ5: la excepcion son BOLSAS de 120 (360 uni = 3 bolsas) — ' + rDe('GRJ5'));
  await page.fill('#fRemito', 'R-0001');
  await abrir('A11');
  const detA11 = await det();
  ok(detA11.includes('Esperado') && detA11.includes('2 cajones') && detA11.includes('Cantidad') &&
     !detA11.includes('Sugerido') && !detA11.includes('Recibido'),
     'A11: la vista dice Esperado y Cantidad (no sugerido ni recibido) — ' + detA11);
  ok((await page.$eval('#detCard .det-uni', e => e.textContent.trim())) === 'kg',
     'A11: la cantidad se escribe en kg');
  // 13 kg = 1.300 unidades contra 1.000 esperadas: avisa 300 de mas, y NO frena
  await page.fill(DQ, '13');
  ok((await page.$eval('#detCard .det-eq', e => e.textContent.trim())) === '= 2,6 cajones',
     'A11: debajo del campo, a cuantos cajones equivalen los kg (con decimales) — ' +
     (await page.$eval('#detCard .det-eq', e => e.textContent.trim())));
  await page.click('#btnVolverPartes');
  rcards = await cards();
  ok(rDe('A11') !== undefined && (await cards()).find(c => c.startsWith('A11')).includes('300 de m\u00e1s'),
     'la tarjeta avisa "300 de mas" (13 kg = 1.300 uni contra 1.000) — ' + (await cards())[0]);
  ok(!(await page.$eval('#alertaBox', e => e.classList.contains('hidden'))) && (await page.$eval('#alertaBox', e => e.textContent)).includes('registrar igual'),
     'el cartel dice que se puede registrar igual');
  ok((await page.$eval('#btnEnviar', e => !e.disabled && e.textContent === 'Recibir (1)')), 'el boton Recibir sigue habilitado: la alerta NO bloquea');

  dialogs.length = 0;
  await page.click('#btnEnviar');
  await page.waitForFunction(() => !document.getElementById('fase3').classList.contains('hidden'));
  ok(dialogs.some(d => d.type === 'confirm' && d.msg.includes('Recibir de Martin Cornejo') && d.msg.includes('se registra igual')),
     'confirm de recepcion avisa el exceso y sigue');
  reg = await calls('tablet_registrar');
  p = reg[reg.length - 1].args.p;
  ok(p.modo === 'recibir' && p.tipo === 'tallerista' && p.ref === '6' && p.remito === 'R-0001', 'payload recibir con remito');
  const it = p.items[0];
  // viaja el KG, y el esperado viaja EN KG tambien (1.000 uni x 0,01): la base los compara crudos
  ok(it.comp_id === 71 && it.comp_entrada_id === 70 && it.cantidad === 13 && it.unidad === 'kg' &&
     it.esperado === 10 && it.esperado_origen === 'online_tall',
     'item tallerista: 13 kg contra 10 kg esperados, mismo idioma — ' + JSON.stringify(it));
  ok((await page.$eval('#successAlertas', e => e.textContent)).includes('Quedó anotado para revisar'),
     'el exito muestra la alerta que devolvio la base');

  // ── RECIBIR DE UN P.S.: tarjetas, y la ENTREGA copia la unidad del ENVIO ──────────────
  // [usuario 2026-09-18: "AJ adhesivos entrega en paquetes de 200. El resto copia la logica del
  // envio: si enviamos en bolsas recepcionamos en bolsas, si lo hacemos en cajones, en cajones"].
  await page.click('#btnOtro');
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  await page.click('#tipoGrid .tipo-btn[data-tipo="proveedor_servicio"]');
  await page.click('#cpGrid .prov-btn:has-text("Guazzaroni")');
  await page.waitForFunction(() => document.querySelectorAll('#cardsGrid .parte-card').length > 0);
  ok(await page.$eval('#tblWrap', e => e.classList.contains('hidden')),
     'Recibir de P.S.: tarjetas, no tabla');
  const gzRec = (await cards())[0];
  ok(gzRec.includes('CV1N') && gzRec.includes('consume CV1'),
     'P.S.: la tarjeta dice la pieza y que SC consume — ' + gzRec);
  ok(gzRec.includes('Esperado 2 cajones'),
     'Guazzaroni: el esperado se mira en los mismos cajones con los que se le envia — ' + gzRec);
  // el mismo numero contado con la bolsa del fraccionado (uxc 50 de la pieza niquelada) daria 20:
  // ese era el bug del 18/09 (5 cajones de CV11 mostrados como 50 de V11).
  ok(!gzRec.includes('20 cajones'),
     'Guazzaroni: NO se usa el uni_x_cajon de la pieza devuelta (la bolsa del fraccionado) — ' + gzRec);
  await abrir('CV1N');
  const detPs = await det();
  ok(detPs.includes('Esperado') && detPs.includes('2 cajones') && detPs.includes('Cantidad') &&
     !detPs.includes('Recibido'),
     'P.S.: la vista dice Esperado y Cantidad — ' + detPs);
  ok((await page.$eval('#detCard .det-uni', e => e.textContent.trim())) === 'kg',
     'Guazzaroni: la cantidad se escribe en kg, igual que en el envio');
  ok(await page.$eval('#accBox', e => e.classList.contains('hidden')),
     'Recibir: adentro de la parte tampoco se ve la Fecha, el Remito ni el boton de registrar');
  await page.fill(DQ, '50');   // 50 kg / 0,05 = 1.000 uni = exactamente lo esperado (2 cajones de 25 kg)
  ok((await page.$eval('#detCard .det-eq', e => e.textContent.trim())) === '= 2 cajones',
     'Guazzaroni: el renglon chico dice a cuantos cajones equivale — ' +
     (await page.$eval('#detCard .det-eq', e => e.textContent.trim())));
  await page.click('#btnVolverPartes');
  ok((await cards())[0].includes('recibe'), 'P.S.: la tarjeta muestra lo que se va a recibir');
  await page.click('#btnEnviar');
  await page.waitForFunction(() => !document.getElementById('fase3').classList.contains('hidden'));
  const regPs = await calls('tablet_registrar');
  const itPs = regPs[regPs.length - 1].args.p.items[0];
  // viaja el kg, y el esperado tambien en kg (1.000 x 0,05) para que la base compare igual contra igual
  ok(itPs.comp_id === 601 && itPs.comp_entrada_id === 600 && itPs.cantidad === 50 && itPs.unidad === 'kg' &&
     itPs.esperado === 50,
     'Guazzaroni: 50 kg contra 50 kg esperados — ' + JSON.stringify(itPs));

  // AJ es la EXCEPCION: envia en paquetes de 100 y ENTREGA en paquetes de 200
  await page.click('#btnOtro');
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  await page.click('#tipoGrid .tipo-btn[data-tipo="proveedor_servicio"]');
  await page.click('#cpGrid .prov-btn:has-text("AJ Adhesivos")');
  await page.waitForFunction(() => document.querySelectorAll('#cardsGrid .parte-card').length > 0);
  const ajRec = (await cards())[0];
  ok(ajRec.includes('Pliego Ad 506') && ajRec.includes('Esperado 3 paquetes'),
     'AJ: 600 uni / 200 por paquete de entrega = 3 paquetes (no 6, que serian los de envio) — ' + ajRec);
  await abrir('Pliego Ad 506');
  ok((await page.$eval('#detCard .det-uni', e => e.textContent.trim())) === 'paquetes',
     'AJ: la cantidad se escribe en paquetes, como en el envio');
  await page.fill(DQ, '3');
  await page.click('#btnVolverPartes');
  await page.click('#btnEnviar');
  await page.waitForFunction(() => !document.getElementById('fase3').classList.contains('hidden'));
  const regAjR = await calls('tablet_registrar');
  const itAjR = regAjR[regAjR.length - 1].args.p.items[0];
  ok(itAjR.comp_id === 565 && itAjR.cantidad === 600 && itAjR.unidad === 'uni',
     'AJ: 3 paquetes de 200 se registran como 600 pliegos — ' + JSON.stringify(itAjR));

  // y un P.S. SIN unidad definida sigue como estaba: esperado y cantidad en la unidad de la pieza
  await page.click('#btnOtro');
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  await page.click('#tipoGrid .tipo-btn[data-tipo="proveedor_servicio"]');
  await page.click('#cpGrid .prov-btn:has-text("Blist-Pack")');
  await page.waitForFunction(() => document.querySelectorAll('#cardsGrid .parte-card').length > 0);
  ok((await cards())[0].includes('Esperado 40 uni'),
     'P.S. sin unidad definida: el esperado queda en la unidad de la pieza — ' + (await cards())[0]);

  // ── 4) el CONTEO es el modulo de Relevamientos ──────────────────────────────
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  ok(await page.$eval('#modos .modo-btn.active', b => b.dataset.modo) === 'recibir', 'el modo se recuerda al recargar');
  const hrefConteo = await page.$eval('#modoConteo', a => a.getAttribute('href'));
  ok(hrefConteo === '../Relevamiento/Relevamiento_GP2.html?volver=tablet', 'Conteo abre Relevamientos — ' + hrefConteo);
  ok((await page.$$('#modos .modo-btn')).length === 3, 'siguen los tres modos arriba');

  // las dos pantallas que se abren desde acá devuelven el "Atrás" a la tablet
  for (const [url, vuelve] of [['/StockFlejes/RecepcionInsumos_GP2.html?volver=tablet', '../Tablet/Tablet_GP2.html?modo=recibir'],
                               ['/Relevamiento/Relevamiento_GP2.html?volver=tablet', '../Tablet/Tablet_GP2.html']]) {
    await page.goto(ROOT + url);
    await page.waitForSelector('#btnAtrasHeader');
    ok((await page.$eval('#btnAtrasHeader', a => a.getAttribute('href'))) === vuelve, 'con ?volver=tablet el Atrás vuelve a la tablet — ' + url.split('/')[1]);
  }

  // ── en un P.S. NADA sobrevive: ni lo que dejo la precarga vieja ni lo que anoto la persona
  //    [usuario 2026-09-18: "si cargue algo yo, cuando salgo quiero que desaparezca"] ──
  for (const [guardado, etiq] of [['250', 'el sugerido viejo que dejo la precarga'],
                                  ['2',   'lo que anoto la persona a mano']]) {
    await page.goto(ROOT + '/Tablet/Tablet_GP2.html?modo=enviar');
    await page.evaluate(q => localStorage.setItem('gp2_tablet_buffer',
      JSON.stringify({ 'enviar:proveedor_servicio:12': { '564::': { q: q } } })), guardado);
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
    await page.click('#tipoGrid .tipo-btn[data-tipo="proveedor_servicio"]');
    await page.click('#cpGrid .prov-btn:has-text("AJ Adhesivos")');
    ok((await cards())[0].includes('sin cargar'),
       'AJ: ' + etiq + ' (' + guardado + ') no aparece, la tarjeta arranca sin cargar');
    await abrir('Pliego 506');
    ok((await page.$eval(DQ, e => e.value)) === '', 'AJ: y el campo de la vista tambien arranca vacio');
    await page.click('#btnVolverPartes');
    const bufAj = await page.evaluate(() => JSON.parse(localStorage.getItem('gp2_tablet_buffer') || '{}'));
    ok(!bufAj['enviar:proveedor_servicio:12'],
       'AJ: y tampoco queda en el buffer de la tablet — ' + JSON.stringify(bufAj));
  }
  // y lo que se tipea AHORA se olvida al salir de la contraparte (sin registrar)
  await cargarParte('Pliego 506', '4');
  ok((await page.$eval('#btnEnviar', e => e.textContent)) === 'Enviar (1)',
     'AJ: mientras la contraparte esta abierta, lo tipeado se usa (Enviar (1))');
  await page.click('#btnVolver');
  const bufSalida = await page.evaluate(() => JSON.parse(localStorage.getItem('gp2_tablet_buffer') || '{}'));
  ok(!bufSalida['enviar:proveedor_servicio:12'],
     'AJ: al salir con "← Cambiar" lo tipeado se borra — ' + JSON.stringify(bufSalida));
  await page.click('#cpGrid .prov-btn:has-text("AJ Adhesivos")');
  ok((await cards())[0].includes('sin cargar'),
     'AJ: al volver a entrar la tarjeta esta sin cargar, no con los 4 paquetes de antes');
  // y al TALLERISTA tampoco se le precarga ni se le guarda nada [usuario 2026-09-18: "igual que P.S."]
  await page.click('#btnVolver');        // vuelve a las contrapartes del tipo
  await page.click('#btnVolverTipo');    // y de ahi a los tipos
  await page.click('#tipoGrid .tipo-btn[data-tipo="tallerista"]');
  await page.click('#cpGrid .prov-btn:has-text("Martin")');
  ok((await cards()).every(c => c.includes('sin cargar')),
     'tallerista: las tarjetas arrancan sin cargar, ya no se precarga el sugerido');
  await cargarParte('A10', '30');
  await page.click('#btnVolver');
  const bufT = await page.evaluate(() => JSON.parse(localStorage.getItem('gp2_tablet_buffer') || '{}'));
  ok(!bufT['enviar:tallerista:6'], 'tallerista: al salir sin registrar no queda nada — ' + JSON.stringify(bufT));

  // ── 5) render a 390px ────────────────────────────────────────────────────
  await page.goto(ROOT + '/Tablet/Tablet_GP2.html?modo=enviar');
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  // en Enviar ya no queda ninguna tabla (los cuatro destinos van en tarjetas): la tabla que se
  // mide es la de Recibir.
  await page.click('#modos .modo-btn[data-modo="recibir"]');
  await page.click('#tipoGrid .tipo-btn[data-tipo="virgilio"]');
  await page.waitForFunction(() => document.querySelectorAll('#tbody tr').length > 0);
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

  // las TARJETAS de un P.S. a 390px: una columna, sin desborde, y la vista de la parte con la
  // letra grande que pide la casa (el campo de carga nunca baja de 19px)
  await page.click('#btnVolver');   // Virgilio es una sola contraparte: vuelve a los tipos
  await page.waitForFunction(() => !document.getElementById('tipoGrid').classList.contains('hidden'));
  await page.click('#modos .modo-btn[data-modo="enviar"]');
  await page.click('#tipoGrid .tipo-btn[data-tipo="proveedor_servicio"]');
  await page.click('#cpGrid .prov-btn:has-text("Ester")');
  await page.waitForFunction(() => document.querySelectorAll('#cardsGrid .parte-card').length > 0);
  const mc = await page.evaluate(() => {
    const cs = [...document.querySelectorAll('#cardsGrid .parte-card')];
    return { horizontal: document.documentElement.scrollWidth > window.innerWidth,
             alto: Math.min(...cs.map(c => c.getBoundingClientRect().height)),
             cod: parseFloat(getComputedStyle(cs[0].querySelector('.pc-cod')).fontSize) };
  });
  ok(!mc.horizontal, '390px (tarjetas): la pagina no scrollea horizontal');
  ok(mc.alto >= 44, '390px: las tarjetas son tocables (' + Math.round(mc.alto) + 'px)');
  ok(mc.cod >= 19, '390px: el codigo de la tarjeta se lee de lejos (' + mc.cod + 'px)');
  await abrir('PC2');
  const md = await page.evaluate(() => {
    const i = document.querySelector('#detCard input[data-f="q"]');
    const r = i.getBoundingClientRect();
    return { horizontal: document.documentElement.scrollWidth > window.innerWidth,
             alto: r.height, fuente: parseFloat(getComputedStyle(i).fontSize),
             im: i.getAttribute('inputmode') };
  });
  ok(!md.horizontal, '390px (vista de la parte): no scrollea horizontal');
  ok(md.alto >= 44 && md.fuente >= 19,
     '390px: el campo de la cantidad es grande y tocable (' + Math.round(md.alto) + 'px, ' + md.fuente + 'px de letra)');
  ok(md.im === 'decimal', '390px: y con teclado numerico (Ester carga en kg)');
  await page.click('#btnVolver');
  await page.click('#btnVolverTipo');

  // y los botones de TIPO tambien se tocan con el dedo
  await page.waitForFunction(() => !document.getElementById('tipoGrid').classList.contains('hidden'));
  const tMin = await page.$$eval('#tipoGrid .tipo-btn', xs => Math.min(...xs.map(x => x.getBoundingClientRect().height)));
  ok(tMin >= 44, '390px: los botones de tipo son tocables (' + Math.round(tMin) + 'px)');

  // ── 6) a lo ancho de una TABLET la tabla no se estira: columnas pegadas, sin blanco muerto ──
  // [usuario 2026-09-17: "optimizame todos los espacios en blanco que hay entre las columnas en
  // todas las pantallas de envio a ps en la version tablet"]. table.t viene a width:100%, asi que
  // sin el encogido el navegador repartia el sobrante y dejaba media pantalla de blanco entre la
  // pieza y su numero. Se mide en la tablet real (1280px), no a 390.
  const ctxT = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pT = await ctxT.newPage();
  pT.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  await pT.route('**/@supabase/supabase-js@2**', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await pT.route('**/GP2_favicon.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));
  // Desde 2026-09-18 van en TARJETAS los cuatro destinos de Enviar y el tallerista en Recibir: la
  // tabla que queda viva es la del resto de Recibir, y es la que se mide aca (Virgilio, que ademas
  // tiene una sola contraparte y se entra derecho).
  for (const [modo, tipo, etiq] of [['recibir', 'virgilio', 'Virgilio (Recibir)']]) {
    await pT.goto(ROOT + '/Tablet/Tablet_GP2.html?modo=' + modo);
    await pT.evaluate(() => localStorage.clear());
    await pT.reload();
    await pT.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
    await pT.click('#tipoGrid .tipo-btn[data-tipo="' + tipo + '"]');
    await pT.waitForFunction(() => document.querySelectorAll('#tbody tr').length > 0);
    const g = await pT.evaluate(() => {
      const t = document.querySelector('table.t').getBoundingClientRect();
      const paso = document.querySelector('.steps').getBoundingClientRect();
      const bus = document.querySelector('#q').closest('.search-box').getBoundingClientRect();
      // el blanco muerto ENTRE columnas = lo que la tabla mide de mas que su propio contenido
      // (max-content es el ancho al que las columnas quedan pegadas a lo que tienen adentro)
      const tab = document.querySelector('table.t');
      const prev = tab.style.width;
      tab.style.width = 'max-content';
      const ideal = Math.round(tab.getBoundingClientRect().width);
      tab.style.width = prev;
      return { tabla: Math.round(t.width), ideal: ideal, disponible: Math.round(paso.width), buscador: Math.round(bus.width) };
    });
    ok(g.tabla < g.disponible * 0.75, etiq + ': la tabla ocupa lo que necesita, no todo el ancho (' + g.tabla + ' de ' + g.disponible + 'px)');
    ok(g.tabla - g.ideal <= 4, etiq + ': las columnas quedan pegadas a su contenido, sin blanco repartido (' + g.tabla + ' vs ' + g.ideal + 'px de contenido)');
    ok(Math.abs(g.buscador - g.tabla) <= 4, etiq + ': el buscador mide lo mismo que la tabla (' + g.buscador + ' vs ' + g.tabla + 'px)');
  }
  // ── las TARJETAS de un P.S. en la tablet real: grilla de varias columnas, nada desbordado y
  //    tarjetas bien tocables. Se mide en Julio, que tiene dos partes. ──
  await pT.goto(ROOT + '/Tablet/Tablet_GP2.html?modo=enviar');
  await pT.evaluate(() => localStorage.clear());
  await pT.reload();
  await pT.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  await pT.click('#tipoGrid .tipo-btn[data-tipo="proveedor_servicio"]');
  await pT.click('#cpGrid .prov-btn:has-text("Hernandez Julio")');
  await pT.waitForFunction(() => document.querySelectorAll('#cardsGrid .parte-card').length > 0);
  const gT = await pT.evaluate(() => {
    const cs = [...document.querySelectorAll('#cardsGrid .parte-card')].map(c => c.getBoundingClientRect());
    const paso = document.querySelector('.steps').getBoundingClientRect();
    return { horizontal: document.documentElement.scrollWidth > window.innerWidth,
             filas: new Set(cs.map(c => Math.round(c.top))).size, alto: Math.min(...cs.map(c => c.height)),
             ancho: Math.round(document.querySelector('#cardsGrid').getBoundingClientRect().width),
             disponible: Math.round(paso.width) };
  });
  ok(!gT.horizontal, '1280px (tarjetas): la pagina no scrollea horizontal');
  ok(gT.filas === 1, '1280px: las tarjetas se acomodan en columnas, no una abajo de la otra');
  ok(gT.alto >= 44, '1280px: las tarjetas son tocables (' + Math.round(gT.alto) + 'px)');
  ok(gT.ancho > gT.disponible * 0.9,
     '1280px: la grilla usa el ancho entero, no el de la tabla (' + gT.ancho + ' de ' + gT.disponible + 'px)');
  // EL TEXTO DE LA TARJETA NO SE PUEDE CORTAR CONTRA EL BORDE. Se mide a 1.280px, que es donde
  // la tarjeta es angosta (grilla de 230px), con la linea mas larga que produce la pantalla:
  // "Sugerido 113.304 uni · sin cajón cargado" de Guazzaroni. Se compara el ancho REAL del
  // texto (Range) contra el de su caja: con white-space:nowrap la caja mide bien y el texto se va
  // afuera igual, asi que scrollWidth no alcanza para verlo.
  await pT.click('#btnVolver');
  await pT.click('#cpGrid .prov-btn:has-text("Guazzaroni")');
  await pT.waitForFunction(() => document.querySelectorAll('#cardsGrid .parte-card').length > 0);
  const gzCorte = await pT.evaluate(() => Math.max(...[...document.querySelectorAll('#cardsGrid .parte-card span')]
    .map(x => { const r = document.createRange(); r.selectNodeContents(x);
                return r.getBoundingClientRect().width - x.getBoundingClientRect().width; })));
  ok(gzCorte <= 1,
     '1280px: el texto de la tarjeta baja de renglon, no queda cortado (desborde ' + Math.round(gzCorte) + 'px)');
  // ── lo que quedo GUARDADO de otro dia no aparece en ningun destino de Enviar ────────────
  // Antes el tallerista precargaba el sugerido y esa precarga se refrescaba sola (firma qAuto).
  // Desde el 2026-09-18 no se precarga en ningun lado y el buffer se borra al entrar, asi que
  // tanto la precarga vieja como lo anotado a mano tienen que desaparecer igual.
  for (const [guardado, etiq] of [[{ q: '99', qAuto: '99' }, 'la precarga vieja'],
                                  [{ q: '77', qAuto: '99' }, 'lo anotado a mano']]) {
    await page.evaluate(g => {
      localStorage.setItem('gp2_tablet_buffer', JSON.stringify({ 'enviar:tallerista:6': { '70::': g } }));
    }, guardado);
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
    await page.click('#tipoGrid .tipo-btn[data-tipo="tallerista"]');
    await page.click('#cpGrid .prov-btn:has-text("Martin")');
    ok((await cards()).find(c => c.startsWith('A10')).includes('sin cargar'),
       'tallerista: ' + etiq + ' de otro dia no aparece, la tarjeta arranca sin cargar');
  }
  // el mismo caso en un P.S.: la precarga firmada de otro día se BORRA y lo editado sobrevive
  await page.evaluate(() => {
    localStorage.setItem('gp2_tablet_buffer', JSON.stringify({
      'enviar:proveedor_servicio:20': { '90::': { q: '99', qAuto: '99' } }
    }));
  });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  await page.click('#tipoGrid .tipo-btn[data-tipo="proveedor_servicio"]');
  await page.click('#cpGrid .prov-btn:has-text("Blist-Pack")');
  ok((await cards())[0].includes('sin cargar'),
     'P.S.: la precarga firmada de otro día se limpia, no se refresca');
  await page.evaluate(() => {
    localStorage.setItem('gp2_tablet_buffer', JSON.stringify({
      'enviar:proveedor_servicio:20': { '90::': { q: '77', qAuto: '99' } }
    }));
  });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#tipoGrid .tipo-btn').length > 0);
  await page.click('#tipoGrid .tipo-btn[data-tipo="proveedor_servicio"]');
  await page.click('#cpGrid .prov-btn:has-text("Blist-Pack")');
  ok((await cards())[0].includes('sin cargar'),
     'P.S.: lo editado a mano tampoco sobrevive a la salida (usuario 2026-09-18)');


  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
