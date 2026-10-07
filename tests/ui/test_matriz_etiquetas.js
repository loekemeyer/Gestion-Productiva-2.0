/* Etiquetas cortas del selector de pieza (2026-10-07).
   [usuario, 2026-10-07] "En vez de esos nombres como variantes en el recuadro amarillo quiero que solo le
   aparezca esto al operario (esta ordenado por matriz y por componente como me lo mandaste en la lista)".
   Sin navegador: lee el SQL del repo y el código de la tablet. Fija:
     1. la migración carga las 105 etiquetas de las 42 matrices con 2+ salidas, sin huecos de orden, sin repetir
        una etiqueta DENTRO de una matriz (el operario tiene que poder distinguir una opción de otra) y sin
        etiquetas largas (tienen que entrar en una tarjeta);
     2. el respaldo de la base (tablas_GP2.sql / funciones_GP2.sql) conoce la tabla, su RLS y su policy, y el
        bundle de la tablet devuelve 'etiqueta' y ordena por 'orden';
     3. la tablet muestra SOLO la etiqueta cuando existe (tarjeta, línea elegida y chip) y cae al formato
        de siempre cuando no. El comportamiento en pantalla lo cubre test_op_e2e.js. */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const leer = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };

const mig = leer('db/migracion_matriz_salida_etiqueta_20261007.sql');
const valores = mig.slice(mig.indexOf('from (values'), mig.indexOf(') as v(n_matriz'));
const filas = [...valores.matchAll(/\('([^']+)','([^']+)','([^']+)',(\d+)\)/g)]
  .map(m => ({ matriz: m[1], codigo: m[2], etiqueta: m[3], orden: Number(m[4]) }));

ok(filas.length === 105, 'la migración carga 105 etiquetas — ' + filas.length);

const porMatriz = {};
filas.forEach(f => { (porMatriz[f.matriz] = porMatriz[f.matriz] || []).push(f); });
ok(Object.keys(porMatriz).length === 42, 'son 42 matrices — ' + Object.keys(porMatriz).length);

const malas = [];
Object.entries(porMatriz).forEach(([n, fs_]) => {
  const ords = fs_.map(f => f.orden).sort((a, b) => a - b);
  if (fs_.length < 2) malas.push(n + ': menos de 2 salidas');
  if (ords.some((o, i) => o !== i + 1)) malas.push(n + ': orden sin huecos 1..' + fs_.length + ' → ' + ords.join(','));
  if (new Set(fs_.map(f => f.codigo)).size !== fs_.length) malas.push(n + ': código repetido');
  if (new Set(fs_.map(f => f.etiqueta.toLowerCase())).size !== fs_.length) malas.push(n + ': dos opciones con la misma etiqueta');
});
ok(!malas.length, 'orden 1..N sin huecos, sin códigos ni etiquetas repetidas dentro de cada matriz — ' + (malas.join(' | ') || 'ok'));
ok(filas.every(f => f.etiqueta.trim() === f.etiqueta && f.etiqueta.length > 0 && f.etiqueta.length <= 24),
   'ninguna etiqueta vacía, con espacios en los bordes ni de más de 24 caracteres (entran en la tarjeta)');
ok(filas.every(f => !/Art\.|\d{3}/.test(f.etiqueta) || /^\d{2}cm$|Ñoquera \d{3}/.test(f.etiqueta)),
   'las etiquetas no llevan artículos ni códigos (salvo 30/40/50cm y las 3 ñoqueras, que se piden así)');

// Spot-check de lo que el usuario escribió, por matriz y componente (la lista que se le mandó).
const E = (m, c) => (filas.find(f => f.matriz === m && f.codigo === c) || {}).etiqueta;
ok(E('12', 'G13') === 'S/Marca' && E('12', 'I11') === 'Chef' && E('12', 'I6') === 'Loeke', '12: G13 S/Marca · I11 Chef · I6 Loeke');
ok(E('114', 'L9-M114') === 'Izquierda' && E('114', 'L10-M114') === 'Derecha' &&
   E('116', 'L9') === 'Izquierda' && E('116', 'L10') === 'Derecha', 'aletas 114/116: L9 = Izquierda, L10 = Derecha (no por orden de código)');
ok(E('221', 'D2') === 'Derecha' && E('221', 'D3') === 'Izquierda', '221: D2 Derecha · D3 Izquierda');
ok(E('383', '234') === 'Francés' && E('515', 'PC7-M237B') === 'Inserto Canelón', '383: 234 Francés · 515: PC7 Inserto Canelón');

// Respaldo de la base
const tablas = leer('db/tablas_GP2.sql');
ok(/create table "GP2"\.matriz_salida_etiqueta \(/.test(tablas) &&
   /alter table "GP2"\.matriz_salida_etiqueta enable row level security;/.test(tablas) &&
   /create policy p_gp2_select on "GP2"\.matriz_salida_etiqueta for select to anon, authenticated using \(true\);/.test(tablas),
   'tablas_GP2.sql: la tabla, su RLS y su policy de solo lectura');
const func = leer('db/funciones_GP2.sql');
ok(func.includes("'arts',q.arts,'etiqueta',e.etiqueta)") &&
   func.includes('order by coalesce(e.orden, 9999), q.codigo) salidas') &&
   func.includes('left join "GP2".matriz_salida_etiqueta e on e.matriz_id=q.matriz_id and e.componente_id=q.comp_salida_id'),
   'funciones_GP2.sql: registro_operarios_bundle devuelve la etiqueta y ordena por orden');

// Tablet
const js = leer('Produccion/RegistroApp/operarios_gp2.js');
const html = leer('Produccion/RegistroApp/Operarios_GP2.html');
ok(/if \(sa\.etiqueta\) \{\s*el\.classList\.add\("mz-et"\);\s*el\.innerHTML = `<div class="mz-n">\$\{esc\(sa\.etiqueta\)\}<\/div>`;/.test(js),
   'operarios_gp2.js: la tarjeta con etiqueta dice SOLO la etiqueta');
ok(js.includes('piezaSel.etiqueta || piezaSel.codigo') && js.includes('etiquetaDeSalida(nm, s.lastMatrix.comp_salida_id)'),
   'operarios_gp2.js: el chip de la matriz y el "Pieza:" del último registro usan la etiqueta');
ok(js.includes('payload.pieza = piezaSel.codigo || ""') && js.includes('payload.comp_salida_id = piezaSel.comp_id'),
   'operarios_gp2.js: lo que viaja sigue siendo el código y el comp_salida_id');
ok(/\.mz\.mz-et \.mz-n \{[^}]*font-size: 2\d+px/.test(html), 'Operarios_GP2.html: la etiqueta se ve grande (>= 20px)');
