/* Caracterizacion de Compras/Control Inyectores/ControlInyectores_GP2.html.
   Fija: contrapartes = inyectores del bundle, modo Todos, columnas de RESINA en kg
   (Enviado/Consumido/Saldo) y que la celda de saldo abre la composicion apuntando a
   la ubicacion tipo 'inyector'. Solo lectura. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const BUNDLE = {
  generado_en: '2026-10-01T12:00:00Z',
  inyectores: [
    { iny_id: 11, nombre: 'Pat Bet Plast', partes: [
      { comp_id: 2405, codigo: '2405', descripcion: 'PP 2630', sector: 'Sector Bolsas Plásticas',
        enviado: 25.5, consumido: 5.25, saldo: 20.25 },
      { comp_id: 2455, codigo: '2455', descripcion: 'ABS GP 22', sector: 'Sector Bolsas Plásticas',
        enviado: 0, consumido: 0, saldo: 0 },
    ] },
    { iny_id: 19, nombre: 'JL Matriceria', partes: [
      { comp_id: 2425, codigo: '2425', descripcion: 'PS HF 555', sector: 'Sector Bolsas Plásticas',
        enviado: 10, consumido: 12, saldo: -2 },
    ] },
  ],
};

const STUB = `
window.supabase = { createClient: function(){ return {
  rpc: async function(name, args){
    window.__calls = window.__calls || [];
    window.__calls.push({name:name, args:args});
    if(name==='control_inyector_bundle') return { data: ${JSON.stringify(BUNDLE)}, error: null };
    return { data: null, error: { message: 'rpc desconocida '+name } };
  }
};}};
`;

(async () => {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const page = await browser.newPage();
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); process.exitCode = 1; });

  await page.route('**/@supabase/supabase-js@2**', r =>
    r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await page.route('**/GP2_favicon.png', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('') }));

  await page.goto(ROOT + '/Compras/Control%20Inyectores/ControlInyectores_GP2.html');
  await page.waitForFunction(() => document.querySelectorAll('#provGrid .prov-btn').length > 0);

  const ok = (c, msg) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + msg); if (!c) process.exitCode = 1; };

  // Todos + 2 inyectores
  const btns = await page.$$eval('#provGrid .prov-btn', xs => xs.map(x => x.textContent));
  ok(btns.length === 3, 'grid: Todos + 2 inyectores (hay ' + btns.length + ')');
  ok(btns[0].indexOf('Todos') >= 0, 'primer boton es Todos');
  ok(btns.some(t => t.indexOf('JL Matriceria') >= 0), 'aparece JL Matriceria');
  ok(btns.some(t => t.indexOf('resinas') >= 0), 'meta dice "resinas"');

  // Entrar a un inyector y ver sus filas
  await page.click('#provGrid .prov-btn:nth-child(2)');  // Pat Bet Plast (orden alfabetico: JL, Pat? -> "Todos" va primero)
  await page.waitForFunction(() => document.querySelectorAll('#tbody tr').length > 0);
  const filas = await page.$$eval('#tbody tr', rs => rs.length);
  ok(filas >= 1, 'el inyector muestra filas de resina (' + filas + ')');

  // La columna Consumido existe en el encabezado (no "Entregado"/"Devuelto")
  const heads = await page.$$eval('thead th', th => th.map(x => x.textContent));
  ok(heads.some(h => /Consumido/.test(h)), 'encabezado tiene "Consumido"');
  ok(heads.some(h => /Saldo en inyector/.test(h)), 'encabezado tiene "Saldo en inyector"');
  ok(heads.some(h => /Enviado/.test(h)), 'encabezado tiene "Enviado"');

  // Modo Todos: columna Inyector visible y mas de un inyector en la tabla
  await page.click('#btnVolver');
  await page.waitForFunction(() => document.querySelectorAll('#provGrid .prov-btn').length > 0);
  await page.click('#provGrid .prov-btn:nth-child(1)');  // Todos
  await page.waitForFunction(() => document.querySelectorAll('#tbody tr').length > 0);
  const colProvVisible = await page.$eval('#colProv', el => !el.classList.contains('hidden'));
  ok(colProvVisible, 'modo Todos muestra columna Inyector');
  const totalFilas = await page.$$eval('#tbody tr', rs => rs.length);
  ok(totalFilas === 3, 'modo Todos: 3 resinas en total (' + totalFilas + ')');

  // La celda de saldo abre la composicion con ubic_tipo 'inyector'
  const compArgs = await page.evaluate(() => {
    let captured = null;
    window.GP2Composicion = window.GP2Composicion || {};
    window.GP2Composicion.abrir = function(o){ captured = o; };
    const td = document.querySelector('#tbody td.stk-cell');
    td.click();
    return captured;
  });
  ok(compArgs && compArgs.ubic_tipo === 'inyector', 'la celda de saldo abre composicion ubic_tipo=inyector');

  await browser.close();
  console.log(process.exitCode ? 'RESULTADO: FAIL' : 'RESULTADO: OK');
})();
