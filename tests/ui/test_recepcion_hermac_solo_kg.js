const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = 'file://' + path.resolve(__dirname, '..', '..').replace(/\\/g, '/');
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

/* v3.72.1: HERMAC PIDE SOLO KG, COMO EL RESTO [usuario 2026-10-02: "en la recepción de flejes de
   Hermac me pide que le ponga paquetes, que me pida solo kg como el resto"]. Hermac era la ultima
   excepcion de "todos los flejes, solo Kg total": el popup sumaba un campo "Paquetes" obligatorio y
   sin el no dejaba confirmar. Este test cubre: (1) el popup de un fleje de Hermac no tiene ningun
   campo de paquetes; (2) se confirma con el Kg solo; (3) baja con p_pallets null, que es lo que
   hace que el pesaje arranque con 1 pallet (bloquesVacios), como Brawin/Szapiro. */
const BUNDLE = {
  tara: { tara_pallet: '20', tol_ctrl_pct: '5', carton_uni_x_paquete: '250' },
  sectores: [{ id: 5, nombre: 'Sector Fleje' }],
  proveedores: [{ nombre: 'Hermac', modo_control: 'pesaje', informa_rollos: false, factura_uni: false }],
  recepciones: [], pallets: [], rollos: [],
  insumos: [
    { comp_id: 189, codigo: 'ID1', descripcion: 'Fleje N° 28', sector: 'Sector Fleje', sector_id: 5, um: 'kg',
      proveedor: 'Hermac', n_fleje: 28, medida: '10 x 2', ultima: null, oc_pend: null },
  ],
};

const STUB = 'window.supabase={createClient:function(){return{'
  + 'rpc:async function(n,a){ if(n==="recepcion_bundle") return {data:' + JSON.stringify(BUNDLE) + ',error:null};'
  + ' if(n==="cargar_recepcion"){ window.__cargas=(window.__cargas||[]).concat([a]); return {data:{recepcion_id:77,movimiento_id:1,oc_cruzada:[]},error:null}; }'
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
  const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
  page.on('dialog', d => d.accept());

  await page.goto(ROOT + '/StockFlejes/RecepcionInsumos_GP2.html');
  await page.click('button:has-text("Flejes")');
  await page.click('button:has-text("Hermac")');
  await page.click('#btnContinuar');
  await page.waitForSelector('.item-btn');

  // cargar() es async y re-renderiza: se reintenta la secuencia entera (mismo patron que
  // test_recepcion_salir_pesaje).
  let popup = null;
  for (let intento = 1; ; intento++) {
    try {
      await page.click('.item-btn');
      await page.waitForSelector('#kgPopup.open', { timeout: 3000 });
      popup = await page.evaluate(() => {
        const pop = document.getElementById('kgPopup');
        const vis = el => !!el && el.offsetParent !== null;
        const labels = [...pop.querySelectorAll('label')].filter(vis).map(l => l.textContent.trim());
        return { kgPaquetes: !!document.getElementById('kgPaquetes'),
                 paqLabel: labels.some(t => /paquete/i.test(t)) };
      });
      await page.fill('#kgValue', '360');
      await page.waitForFunction(() => document.getElementById('kgValue').value === '360',
                                 null, { timeout: 3000 });
      await page.click('#kgConfirm');
      await page.waitForSelector('#btnTerminarRemito', { timeout: 3000 });
      break;
    } catch (e) {
      if (intento >= 6) throw e;
      await page.waitForTimeout(300);
      await page.evaluate(() => { const p = document.getElementById('kgPopup');
                                  if (p) p.classList.remove('open'); });
    }
  }

  // 1) el popup de Hermac no pide paquetes
  ok(!popup.kgPaquetes, 'el popup de Hermac no tiene el input #kgPaquetes');
  ok(!popup.paqLabel, 'el popup de Hermac no muestra ninguna etiqueta "Paquetes"');
  // 2) con el Kg solo se confirma (antes: "Cargá los paquetes del remito.")
  ok(true, 'con el Kg solo, Confirmar deja el item en el remito');

  await page.click('#btnTerminarRemito');
  await page.waitForSelector('#pesajeWrap:not(.hidden)');
  const r = await page.evaluate(() => ({ cargas: window.__cargas || [] }));
  ok(r.cargas.length === 1 && Number(r.cargas[0].p_cantidad) === 360, 'baja una recepcion de 360 kg');
  ok(r.cargas.length === 1 && r.cargas[0].p_pallets == null, 'sin paquetes del remito: p_pallets va null');

  await browser.close();
  console.log(process.exitCode ? 'HAY FALLOS' : 'TODO OK');
})();
