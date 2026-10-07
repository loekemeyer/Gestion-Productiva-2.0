-- 2026-10-07 — Orden de las cajas del selector de pieza: Loeke, Chef, c/Marca, s/Marca.
-- [usuario] "En todos los casos que aparezca Loeke, Chef, c/Marca, s/Marca. Ordename en este orden: Loeke, Chef,
--   c/Marca, s/Marca la aparición de las box".
--
-- Regla aplicada (sólo cambia GP2.matriz_salida_etiqueta.orden; ni etiquetas ni componentes):
--   dentro de cada grupo de cajas que difieren SOLO en la marca, la marca va en el orden Loeke < Chef < C/Marca < S/Marca,
--   y el grupo conserva los lugares que ya ocupaba. Lo que no lleva marca (Inox, Izquierda…) no se mueve de su lugar.
--   · 12 (G13/I11/I6), 39 (K2/K5), 356 (G11/I10), 77, 78, 79, 80, 81: la marca era todo el rótulo → se reordena entera.
--   · 73 y 74: el rótulo es marca + forma. Quedan Loeke Abierta · S/Marca Abierta · Loeke Cerrada · S/Marca Cerrada
--     (Loeke primero DENTRO de cada forma; las formas conservan su orden Abierta → Cerrada, como se escribió).
--   · SIN cambios porque ya cumplen: 3, 28, 33, 127, 254, 261, 309, 314, 320, 321, 322, 323, 394, 402, 512 (y 401, que otra
--     sesión dejó DE A PARES «Cucharón Loeke / Cucharón Chef» por pedido del usuario: Loeke antes que Chef en cada par).
--   Lo que NO se hizo: juntar TODOS los Loeke arriba y todos los S/Marca abajo en 73/74/401 (rompería los pares).
--
-- Guarda: cada fila lleva el orden VIEJO esperado; si alguna no coincide (alguien tocó la tabla), se cancela todo.
-- (matriz_id, orden) es UNIQUE y no diferible → se hace en dos fases (+100 y luego el valor final).
do $$
declare n1 int; n2 int;
begin
  create temp table _no (n_matriz text, codigo text, antes smallint, despues smallint) on commit drop;
  insert into _no values
    ('12','I6',3,1), ('12','G13',1,3),
    ('39','K5',3,2), ('39','K2',2,3),
    ('73','IE10-M73-A-L',2,1), ('73','IE10-M73-A-C',1,2), ('73','IE10-M73-C-L',4,3), ('73','IE10-M73-C-C',3,4),
    ('74','G7',2,1), ('74','G5',1,2), ('74','IE10-M74-L',4,3), ('74','IE10-M74-C',3,4),
    ('77','G8',2,1), ('77','G6',1,2),
    ('78','D5-M78',2,1), ('78','B1-M78',1,2),
    ('79','J8',2,1), ('79','G1',1,2),
    ('80','J8-M80',2,1), ('80','G1-M80',1,2),
    ('81','J7',2,1), ('81','G2',1,2),
    ('356','I10',2,1), ('356','G11',1,2);

  update "GP2".matriz_salida_etiqueta e set orden = e.orden + 100
    from _no n join "GP2".matriz m on m.n_matriz = n.n_matriz join "GP2".componente c on c.codigo = n.codigo
   where e.matriz_id = m.id and e.componente_id = c.id and e.orden = n.antes;
  get diagnostics n1 = row_count;
  if n1 <> 24 then raise exception 'orden de etiquetas: se esperaban 24 filas en el estado previo y encontre % (alguien cambio la tabla)', n1; end if;

  update "GP2".matriz_salida_etiqueta e set orden = n.despues
    from _no n join "GP2".matriz m on m.n_matriz = n.n_matriz join "GP2".componente c on c.codigo = n.codigo
   where e.matriz_id = m.id and e.componente_id = c.id and e.orden = n.antes + 100;
  get diagnostics n2 = row_count;
  if n2 <> 24 then raise exception 'orden de etiquetas: la segunda fase movio % filas y eran 24', n2; end if;
end $$;

-- VERIFICACION:
--   select m.n_matriz, string_agg(e.orden || ':' || e.etiqueta, ' | ' order by e.orden)
--     from "GP2".matriz_salida_etiqueta e join "GP2".matriz m on m.id = e.matriz_id
--    where m.n_matriz in ('12','39','73','74','77','78','79','80','81','356') group by 1;
--   -- orden contiguo 1..N en todas: select matriz_id from "GP2".matriz_salida_etiqueta group by 1 having max(orden) <> count(*) or min(orden) <> 1;  (0 filas)
