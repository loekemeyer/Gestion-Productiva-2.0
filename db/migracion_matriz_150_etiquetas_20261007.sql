-- 2026-10-07 — Matriz 150 (Env Remaches): el selector de variantes muestra SÓLO el tipo de remache.
-- [usuario, con la captura de la 150 mostrando «V1 · Remache Espiral · Art. 520 · 521…»]: «quiero que solo aparezca que
--   tipo de remache es (ni código, ni qué artículos, solo descripción y sacale la palabra rem./remache/rem/etc)».
--   Y, sobre la tablet de GP2 y el Registro Producción 3.0: «ambos tendrían que aparecer igual».
--
-- Mecanismo YA existente (db/migracion_matriz_salida_etiqueta_20261007.sql): GP2.matriz_salida_etiqueta
--   (matriz_id, componente_id) -> etiqueta + orden. registro_operarios_bundle (tablet de GP2) y
--   reg_prod_3_0.reg_prod_3_0_bundle (Registro Producción 3.0) la devuelven en matriz_salidas[n][i].etiqueta y ordenan
--   por 'orden'; las dos pantallas (operarios_gp2.js y cervantes-gp2/app.js) dibujan SÓLO la etiqueta cuando existe.
--   Verificado el 07/10: el bundle vivo del 3.0 ya incluía 'etiqueta' y su app.js ya la leía (otra sesión lo portó),
--   así que esto es DATO: ningún cambio de código ni de función.
--
-- Etiqueta = la descripción del componente SIN «Rem.» / «Rem» / «Remache» (se dejó «Niq»/«niq.»: no se pidió sacarlo) y con la
--   primera letra en mayúscula. Orden = V1..V13 por número (no por código de texto: V1, V10, V11…).
--   Resolución por (n_matriz, código) CONTRA lo que la 150 expulsa (ruta_paso.tipo_paso='matriz'): si no da exactamente
--   13 filas, la transacción se cancela. Depende de db/migracion_remaches_cajon_bolsa_matriz150_20261007.sql (parte C),
--   que es la que le dio a la 150 sus 13 salidas.
--
-- Aplicado el 2026-10-07 con «Sí» del dueño. Verificación: 13 filas, orden 1..13.
-- ↩ Revertir (el conector de la sesión cuelga los DELETE: correrlo en el SQL Editor):
--   delete from "GP2".matriz_salida_etiqueta where matriz_id = (select id from "GP2".matriz where n_matriz = '150');
--   (sin etiquetas, las dos pantallas vuelven a «V1 · Remache Espiral · Art. …».)

do $$
declare n int;
begin
  if exists (select 1 from "GP2".matriz_salida_etiqueta e join "GP2".matriz m on m.id = e.matriz_id where m.n_matriz = '150') then
    raise exception 'la 150 ya tiene etiquetas: no se vuelve a aplicar';
  end if;
  insert into "GP2".matriz_salida_etiqueta (matriz_id, componente_id, etiqueta, orden)
  select m.id, c.id, v.etiqueta, v.orden
    from (values ('V1','Espiral',1),('V2','Cabezal Niq',2),('V3','Sacatapita Niq',3),('V4','Rompenuez',4),
                 ('V5','Afila niq.',5),('V6','Sacafuente 3.7 x 29.6',6),('V7','Abrelatas Niq',7),('V8','Doble Aleta',8),
                 ('V9','Uña niq.',9),('V10','Alum Canel',10),('V11','Sacacorcho',11),('V12','C/ Pizza/Raviol',12),
                 ('V13','Plaquita 3 en 1',13)) v(codigo, etiqueta, orden)
    join "GP2".matriz m on m.n_matriz = '150'
    join "GP2".componente c on c.codigo = v.codigo
     and exists (select 1 from "GP2".ruta_paso rp where rp.matriz_id = m.id and rp.tipo_paso = 'matriz' and rp.comp_salida_id = c.id);
  get diagnostics n = row_count;
  if n <> 13 then raise exception 'se esperaban 13 filas y fueron %', n; end if;
end $$;

select e.orden, c.codigo, e.etiqueta
  from "GP2".matriz_salida_etiqueta e
  join "GP2".matriz m on m.id = e.matriz_id
  join "GP2".componente c on c.id = e.componente_id
 where m.n_matriz = '150' order by e.orden;
