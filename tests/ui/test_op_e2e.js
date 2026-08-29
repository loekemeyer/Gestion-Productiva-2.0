const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
// Raiz del repo (los tests viven en tests/ui/) y Chromium portable si existe.
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const BUNDLE = {
  empleados: { '19': { nombre: 'Eduardo B', activo: true, hora_entrada: '08:00' } },
  matrices: [ { n: '28', d: 'Pinza Grande', ppk: 30 } ],
  matriz_fleje: { '28': { comp_id: 176, codigo: 'A1', descripcion: 'Fleje 13' } },
  matriz_salidas: {},
  rollos_saldo: [ { comp_id: 176, codigo: 'A1', kg_por_rollo: 50, rollos: 3 } ],
  rollos_abiertos: {},
};

const STUB = `
window.supabase = { createClient: function(){ return {
  rpc: async function(name, args){
    window.__calls = (window.__calls||[]); window.__calls.push({name:name, args:args});
    if(name==='registro_operarios_bundle') return { data: ${JSON.stringify(BUNDLE)}, error: null };
    if(name==='registrar_evento_prod') return { data: { ok:true, id: window.__calls.length }, error: null };
    if(name==='tomar_rollo') return { data: { ok:true, uso_id: 1 }, error: null };
    if(name==='anular_evento_prod') return { data: { ok:true, anulados: 1 }, error: null };
    return { data: { ok:true }, error: null };
  },
  from: function(){ throw new Error('DIRECT TABLE ACCESS: ' + 'la app no debe tocar tablas directo'); }
};}};
`;

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const page = await browser.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });
  page.on('dialog', d => d.accept());

  await page.route('**/@supabase/supabase-js@2', r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route(/Operarios_GP2\.html$/, r => r.continue()).catch(()=>{});

  await page.goto(ROOT + '/Produccion/RegistroApp/Operarios_GP2.html');
  await page.waitForFunction(() => (window.__calls||[]).some(c => c.name === 'registro_operarios_bundle'));

  const ok = (c, m) => { console.log((c?'OK  ':'FAIL')+' '+m); if(!c) process.exitCode = 1; };
  const calls = () => page.evaluate(() => window.__calls);

  // legajo -> opciones
  await page.fill('#legajoInput', '19');
  await page.click('#btnContinuar');
  await page.waitForSelector('.box[data-code="E"]');

  // E: matriz 28 + rollo
  await page.click('.box[data-code="E"]');
  await page.fill('#textInput', '28');
  await page.dispatchEvent('#textInput', 'input');
  await page.waitForFunction(() => document.querySelectorAll('#rolloSelect option').length > 1);
  await page.selectOption('#rolloSelect', { index: 1 });
  await page.click('#btnEnviar');
  await page.waitForFunction(() => (window.__calls||[]).some(c =>
    c.name === 'registrar_evento_prod' && c.args.p && c.args.p.matriz === '28' && c.args.p.uni === 0));
  let cs = await calls();
  const evE = cs.find(c => c.name === 'registrar_evento_prod' && c.args.p.matriz === '28');
  ok(evE.args.p.nombre_matriz === 'Pinza Grande' && evE.args.p.legajo === '19', 'evento E: matriz 28 Pinza Grande legajo 19');
  ok(cs.some(c => c.name === 'tomar_rollo' && c.args.p_comp_id === 176 && c.args.p_kg_por_rollo === 50 && c.args.p_matriz === '28'),
     'tomar_rollo A1 50kg matriz 28');

  // C: 500 unidades (la app vuelve a la pantalla de legajo tras cada envio)
  await page.click('#btnContinuar');
  await page.waitForSelector('.box[data-code="C"]');
  await page.click('.box[data-code="C"]');
  await page.fill('#textInput', '500');
  await page.click('#btnEnviar');
  await page.waitForFunction(() => (window.__calls||[]).some(c =>
    c.name === 'registrar_evento_prod' && c.args.p && c.args.p.uni === 500));
  cs = await calls();
  const evC = cs.find(c => c.name === 'registrar_evento_prod' && c.args.p.uni === 500);
  ok(evC.args.p.matriz === '28' && evC.args.p.hora_inicio && evC.args.p.hora_fin, 'cajon 500 con matriz y horas');

  // cartel de rollo: 500/30 = 16,7 kg usados -> quedan ~33,3
  await page.click('#btnContinuar');
  await page.waitForSelector('.box[data-code="C"]');
  await page.click('.box[data-code="C"]');
  await page.waitForSelector('#matrizInfo:not(.hidden)');
  const info = await page.textContent('#matrizInfo');
  ok(info.includes('Rollo de 50 kg') && info.includes('33,3'), 'rollo: quedan ~33,3 kg — ' + info.trim().slice(-60));

  // RM (volver de la seleccion C con la flecha; seguimos en la pantalla de opciones)
  await page.click('#btnResetSelection');
  await page.waitForSelector('.box[data-code="RM"]');
  await page.click('.box[data-code="RM"]');
  await page.click('#btnEnviar');
  await page.waitForFunction(() => (window.__calls||[]).some(c =>
    c.name === 'registrar_evento_prod' && c.args.p && c.args.p.nombre_matriz === 'Rotura Matriz'));
  cs = await calls();
  const evRM = cs.find(c => c.name === 'registrar_evento_prod' && c.args.p.nombre_matriz === 'Rotura Matriz');
  ok(evRM.args.p.matriz === '28' && evRM.args.p.uni === 0, 'RM sobre matriz 28');

  // borrar del historial (pantalla legajo) -> RPC anular_evento_prod (ya no update directo)
  await page.waitForSelector('.hist-del');
  await page.click('.hist-del');
  await page.waitForFunction(() => (window.__calls||[]).some(c => c.name === 'anular_evento_prod'));
  cs = await calls();
  const evDel = cs.find(c => c.name === 'anular_evento_prod');
  ok(typeof evDel.args.p_id_ejecucion === 'string' && evDel.args.p_id_ejecucion.length > 10, 'baja logica via RPC con id_ejecucion');

  // badge sync sin pendientes
  const badge = await page.textContent('#syncBadge');
  ok(badge.includes('✓'), 'cola sincronizada: ' + badge.trim());

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
