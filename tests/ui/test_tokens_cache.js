/* Guardia de CACHE. No abre navegador: lee el repo y el historial de git.
 *
 * Existe por un problema real que paso 2 veces el 2026-08-29/30: dos sesiones
 * trabajando en paralelo bumpearon la MISMA version global y el MISMO token
 * ?v= en commits distintos. Resultado: v1.30.0 y v1.35.0 existen dos veces en
 * la historia, y los tokens 20260829h y 20260829n tambien. Un dispositivo que
 * cacheo con uno de esos tokens NO volvio a bajar el archivo aunque el
 * contenido habia cambiado — que es justo lo que el sistema de tokens viene a
 * evitar.
 *
 * Chequea tres cosas:
 *   1. Cada asset compartido se carga con UN solo token en todas las paginas.
 *      (Si dos paginas piden el mismo archivo con tokens distintos, una de las
 *      dos puede quedarse con una copia vieja.)
 *   2. La APP_VERSION actual no fue usada antes por otro commit.
 *   3. El token actual de version.js no fue usado antes por otro commit.
 *
 * Los archivos _backup_* quedan afuera a proposito: son fotos congeladas y
 * deben conservar el token con el que se sacaron.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
let fallos = 0;
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fallos++; };

function htmls(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) htmls(p, acc);
    else if (e.name.endsWith('.html') && !e.name.startsWith('_backup_')) acc.push(p);
  }
  return acc;
}

// ── 1) un token por asset ────────────────────────────────────────────────
const porAsset = new Map();
for (const f of htmls(ROOT)) {
  const txt = fs.readFileSync(f, 'utf8');
  for (const m of txt.matchAll(/([A-Za-z0-9_.\/-]+\.(?:js|css))\?v=([0-9A-Za-z.]+)/g)) {
    // Se agrupa por la RUTA RESUELTA, no por el nombre: hay varios app.js y
    // varios styles.css distintos en carpetas distintas, y no son el mismo
    // archivo. Lo que importa es que UN archivo no se pida con dos tokens.
    const abs = path.resolve(path.dirname(f), m[1]);
    if (!fs.existsSync(abs)) continue;          // referencia rota: no es tema de este test
    const asset = path.relative(ROOT, abs);
    if (!porAsset.has(asset)) porAsset.set(asset, new Map());
    const tk = porAsset.get(asset);
    if (!tk.has(m[2])) tk.set(m[2], []);
    tk.get(m[2]).push(path.relative(ROOT, f));
  }
}
const dispersos = [...porAsset].filter(([, tk]) => tk.size > 1);
for (const [asset, tk] of dispersos) {
  console.log('     ' + asset + ' tiene ' + tk.size + ' tokens:');
  for (const [t, files] of tk) console.log('       ?v=' + t + '  ->  ' + files.join(', '));
}
ok(dispersos.length === 0,
   'cada asset compartido usa un solo ?v= (' + porAsset.size + ' assets revisados)');

// ── 2) y 3) version y token nunca reusados ───────────────────────────────
function git(args) {
  try { return execSync('git -C "' + ROOT + '" ' + args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch { return null; }
}
const commits = (git('log --format=%h -- version.js') || '').trim().split('\n').filter(Boolean);

if (!commits.length) {
  console.log('SKIP historial de git no disponible: se saltean los chequeos 2 y 3');
} else {
  const versionDe = (c) => {
    const t = git('show ' + c + ':version.js');
    const m = t && t.match(/APP_VERSION\s*=\s*"([^"]+)"/);
    return m ? m[1] : null;
  };
  const tokenDe = (c) => {
    const t = git('show ' + c + ':login.html');
    const m = t && t.match(/version\.js\?v=([0-9A-Za-z.]+)/);
    return m ? m[1] : null;
  };

  const actualVer = (fs.readFileSync(path.join(ROOT, 'version.js'), 'utf8')
                      .match(/APP_VERSION\s*=\s*"([^"]+)"/) || [])[1];
  const actualTok = (fs.readFileSync(path.join(ROOT, 'login.html'), 'utf8')
                      .match(/version\.js\?v=([0-9A-Za-z.]+)/) || [])[1];

  const vers = commits.map(versionDe);
  const toks = commits.map(tokenDe);
  const nVer = vers.filter(v => v === actualVer).length;
  const nTok = toks.filter(t => t === actualTok).length;

  // <=1 = solo este commit (o todavia sin commitear). >1 = otra sesion la uso.
  ok(nVer <= 1, 'la version actual (' + actualVer + ') no fue usada por otro commit' +
                (nVer > 1 ? ' — aparece en ' + nVer + ' commits, subila' : ''));
  ok(nTok <= 1, 'el token actual (?v=' + actualTok + ') no fue usado por otro commit' +
                (nTok > 1 ? ' — aparece en ' + nTok + ' commits, cambialo' : ''));
}

console.log(fallos ? 'HAY FALLOS' : 'TODO OK');
process.exit(fallos ? 1 : 0);
