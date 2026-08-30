/* Regla del usuario (2026-08-30): "Siempre quiero letras bien grandes y legibles
   para que alguien que ve mal pueda escribir y no equivocarse. Donde van numeros,
   solo teclado numerico."
   Este test la vigila en frio (sin browser):
   1. Ningun <input type="number"> sin inputmode (numeric/decimal) en todo el repo.
   2. gp2-modulo.css mantiene el piso de 18px para input/select/textarea.
   Es estatico a proposito: corre rapido y agarra el HTML generado por JS tambien. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
let fallas = 0;
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) { fallas++; process.exitCode = 1; } };

const EXCLUIR = /(^|[\\/])(_backup|node_modules|\.git|tests)([\\/]|$)/;
const archivos = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (EXCLUIR.test(p)) continue;
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(html|js)$/.test(f)) archivos.push(p);
  }
})(ROOT);

const TAG = /<input\b[^>]*?>/gs;
const malos = [];
for (const p of archivos) {
  const s = fs.readFileSync(p, 'utf8');
  if (!s.includes('type="number"') && !s.includes("type='number'")) continue;
  for (const m of s.matchAll(TAG)) {
    const t = m[0];
    if (!/type=["']number["']/.test(t)) continue;
    if (/inputmode=/.test(t)) continue;
    const linea = s.slice(0, m.index).split('\n').length;
    malos.push(path.relative(ROOT, p) + ':' + linea);
  }
}
ok(malos.length === 0, 'todo type="number" lleva inputmode (' + archivos.length + ' archivos)' +
   (malos.length ? ' — faltan: ' + malos.slice(0, 8).join(', ') : ''));

const css = fs.readFileSync(path.join(ROOT, 'gp2-modulo.css'), 'utf8');
const piso = css.match(/input,\s*select,\s*textarea\s*\{\s*font-size:\s*(\d+)px/);
ok(!!piso && Number(piso[1]) >= 18, 'gp2-modulo.css mantiene el piso de letra grande (18px) en los campos');

console.log(fallas ? 'HAY FALLOS' : 'TODO OK');
