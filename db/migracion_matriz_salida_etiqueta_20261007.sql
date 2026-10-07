-- 2026-10-07 — Selector de pieza de la tablet de operarios: SOLO una etiqueta corta por matriz y componente.
-- [usuario, captura de la matriz 12 con G13/I11/I6 «Art. 101 · 501»…]: "En vez de esos nombres como variantes en el
--   recuadro amarillo quiero que solo le aparezca esto al operario (esta ordenado por matriz y por componente como me
--   lo mandaste en la lista)" + la lista de 42 matrices / 105 componentes.
--
-- Modelo: tabla GP2.matriz_salida_etiqueta (matriz_id, componente_id) -> etiqueta + orden. Es la MISMA clave que usa
--   registro_operarios_bundle().matriz_salidas (matriz + comp_salida_id), así que la etiqueta vive junto a lo que expulsa
--   la matriz y no en el JS (nada por código de matriz hardcodeado en la tablet). El bundle la devuelve como
--   'etiqueta' y ordena por 'orden' (sin etiqueta, cae al orden por código de siempre).
--   La tablet muestra la etiqueta; si una salida NO tiene (matriz nueva, bundle viejo cacheado) cae a código +
--   descripción + artículos como antes. El dato que viaja (comp_salida_id y pieza=código) NO cambia.
--
-- Resolución del componente: por (n_matriz, código) CONTRA LO QUE ESA MATRIZ EXPULSA (ruta_paso.tipo_paso='matriz'),
--   no por código solo: 4 códigos de componente están repetidos en la base (A1, A4, A8, Z22; ninguno es de esta lista,
--   pero el cruce por matriz lo hace a prueba de eso). Si algún par no resuelve exactamente a 1 componente, la
--   transacción entera se cancela.
-- Orden = el de la lista que se le mandó al dueño (por componente), con las aletas 114/116 en Izquierda -> Derecha
--   (L9 = Izq, L10 = Der) como se escribió en la lista y no por código.
--
-- Aplicado el 2026-10-07 (una transacción). Verificación al final. Reversa: drop table "GP2".matriz_salida_etiqueta
--   y volver a la definición anterior de registro_operarios_bundle (db/funciones_GP2.sql en git, commit previo).
begin;

create table if not exists "GP2".matriz_salida_etiqueta (
  matriz_id    bigint   not null,
  componente_id bigint  not null,
  etiqueta     text     not null,
  orden        smallint not null,
  constraint matriz_salida_etiqueta_pkey PRIMARY KEY (matriz_id, componente_id),
  constraint matriz_salida_etiqueta_orden_uk UNIQUE (matriz_id, orden),
  constraint matriz_salida_etiqueta_txt_chk CHECK (btrim(etiqueta) <> ''),
  constraint matriz_salida_etiqueta_matriz_id_fkey FOREIGN KEY (matriz_id) REFERENCES "GP2".matriz(id) ON DELETE CASCADE,
  constraint matriz_salida_etiqueta_componente_id_fkey FOREIGN KEY (componente_id) REFERENCES "GP2".componente(id) ON DELETE CASCADE
);
comment on table "GP2".matriz_salida_etiqueta is 'Etiqueta CORTA que ve el operario en la tablet al elegir que pieza fabrica una matriz con 2+ salidas (matriz + componente que expulsa). orden = orden en pantalla. Sin fila, la tablet cae a codigo + descripcion + articulos.';
alter table "GP2".matriz_salida_etiqueta enable row level security;
create policy p_gp2_select on "GP2".matriz_salida_etiqueta for select to anon, authenticated using (true);
revoke all on "GP2".matriz_salida_etiqueta from anon, authenticated;
grant select on "GP2".matriz_salida_etiqueta to anon, authenticated;

insert into "GP2".matriz_salida_etiqueta (matriz_id, componente_id, etiqueta, orden)
select m.id, s.comp_salida_id, v.etiqueta, v.orden
from (values
  -- 5 salidas
  ('401','942E','Cuchara Lisa',1), ('401','943E','Cucharón',2), ('401','944E','Pinza Fideos',3), ('401','945E','Espátula Calada',4), ('401','948E','Espumadera',5),
  ('505','Z44-M505','Cucharón',1), ('505','Z47-M505','Cuchara Lisa',2), ('505','Z48-M505','Pinza Fideos',3), ('505','Z49-M505','Espátula Calada',4), ('505','Z50-M505','Espumadera',5),
  -- 4 salidas
  ('73','IE10-M73-A-C','S/Marca Abierta',1), ('73','IE10-M73-A-L','Loeke Abierta',2), ('73','IE10-M73-C-C','S/Marca Cerrada',3), ('73','IE10-M73-C-L','Loeke Cerrada',4),
  ('74','G5','S/Marca Abierta',1), ('74','G7','Loeke Abierta',2), ('74','IE10-M74-C','S/Marca Cerrada',3), ('74','IE10-M74-L','Loeke Cerrada',4),
  ('261','542-ARM','Ahueca Papa Loeke',1), ('261','543-ARM','Ahueca Fruta Loeke',2), ('261','720-ARM','Ahueca Papa Chef',3), ('261','722-ARM','Ahueca Fruta Chef',4),
  ('383','231','30cm',1), ('383','232','40cm',2), ('383','233','50cm',3), ('383','234','Francés',4),
  ('402','542','Ahueca Papa Loeke',1), ('402','543','Ahueca Fruta Loeke',2), ('402','720','Ahueca Papa Chef',3), ('402','722','Ahueca Fruta Chef',4),
  -- 3 salidas
  ('12','G13','S/Marca',1), ('12','I11','Chef',2), ('12','I6','Loeke',3),
  ('27','I1','Llavero P/Pintar',1), ('27','I9','Llavero P/Cromar',2), ('27','J13','Abrelata Pie',3),
  ('28','A15','Inox',1), ('28','J2','Loeke',2), ('28','J5','S/Marca',3),
  ('39','C15','Inox',1), ('39','K2','S/Marca',2), ('39','K5','Loeke',3),
  ('389','207','Ñoquera 207 LK',1), ('389','229','Ñoquera 229 LK',2), ('389','909','Ñoquera 909 CH',3),
  -- 2 salidas
  ('3','M10','Loeke',1), ('3','M9','S/Marca',2),
  ('21','W1','Buje',1), ('21','W5','Arandela',2),
  ('33','J10','Loeke',1), ('33','J12','S/Marca',2),
  ('37','IF3-M37','P/Pintar/Cromar',1), ('37','IF3A-M37','Inox',2),
  ('38','IF3-M38','P/Pintar/Cromar',1), ('38','IF3A-M38','Inox',2),
  ('77','G6','S/Marca',1), ('77','G8','Loeke',2),
  ('78','B1-M78','S/Marca',1), ('78','D5-M78','Loeke',2),
  ('79','G1','S/Marca',1), ('79','J8','Loeke',2),
  ('80','G1-M80','S/Marca',1), ('80','J8-M80','Loeke',2),
  ('81','G2','S/Marca',1), ('81','J7','Loeke',2),
  ('114','L9-M114','Izquierda',1), ('114','L10-M114','Derecha',2),
  ('116','L9','Izquierda',1), ('116','L10','Derecha',2),
  ('127','Z2B','Loeke',1), ('127','Z3B','S/Marca',2),
  ('183','N1','Ahueca Fruta',1), ('183','N2','Ahueca Papa',2),
  ('221','D2','Derecha',1), ('221','D3','Izquierda',2),
  ('254','570-ARM','Loeke',1), ('254','858-ARM','S/Marca',2),
  ('309','507','Loeke',1), ('309','707','Chef',2),
  ('314','392','Loeke',1), ('314','845','Chef',2),
  ('320','391','Loeke',1), ('320','844','Chef',2),
  ('321','393','Loeke',1), ('321','846','Chef',2),
  ('322','394','Loeke',1), ('322','842','Chef',2),
  ('323','390','Loeke',1), ('323','843','Chef',2),
  ('349','LL4','Corta Pizza',1), ('349','M2','Pisa Papa',2),
  ('356','G11','S/Marca',1), ('356','I10','Chef',2),
  ('360','N4','Ahueca Papa',1), ('360','N5','Ahueca Fruta',2),
  ('368','Z5','Pieza Grande',1), ('368','Z6','Pieza Chica',2),
  ('394','570','Loeke',1), ('394','858','Chef',2),
  ('504','255','Mate Inox',1), ('504','256','Mate Madera',2),
  ('512','323E','Loeke',1), ('512','838E','Chef',2),
  ('515','PB6-M237B','Inserto Espátula',1), ('515','PC7-M237B','Inserto Canelón',2)
) as v(n_matriz, codigo, etiqueta, orden)
join "GP2".matriz m on m.n_matriz = v.n_matriz
join lateral (
  select distinct rp.comp_salida_id
  from "GP2".ruta_paso rp
  join "GP2".componente c on c.id = rp.comp_salida_id
  where rp.matriz_id = m.id and rp.tipo_paso = 'matriz' and c.codigo = v.codigo
) s on true;

do $$
declare n int;
begin
  select count(*) into n from "GP2".matriz_salida_etiqueta;
  if n <> 105 then
    raise exception 'matriz_salida_etiqueta: se esperaban 105 filas y quedaron % (algun par matriz+codigo no resolvio a una sola salida)', n;
  end if;
end $$;

-- registro_operarios_bundle(): matriz_salidas devuelve 'etiqueta' y ordena por 'orden'. Cirugía sobre la definición
-- viva: si el fragmento no está EXACTAMENTE una vez, se cancela todo y no se toca nada.
do $$
declare
  def text := pg_get_functiondef('"GP2".registro_operarios_bundle()'::regprocedure);
  nuevo text;
  a_old constant text := E'\'arts\',q.arts)\n                         order by q.codigo) salidas';
  a_new constant text := E'\'arts\',q.arts,\'etiqueta\',e.etiqueta)\n                         order by coalesce(e.orden, 9999), q.codigo) salidas';
  b_old constant text := E'          group by rp.matriz_id, rp.comp_salida_id, c.codigo, c.descripcion\n        ) q\n        join "GP2".matriz m on m.id=q.matriz_id\n';
  b_new constant text := E'          group by rp.matriz_id, rp.comp_salida_id, c.codigo, c.descripcion\n        ) q\n        join "GP2".matriz m on m.id=q.matriz_id\n        left join "GP2".matriz_salida_etiqueta e on e.matriz_id=q.matriz_id and e.componente_id=q.comp_salida_id\n';
begin
  if def like '%''etiqueta'',e.etiqueta%' then
    raise notice 'registro_operarios_bundle ya devuelve la etiqueta: no se toca';
    return;
  end if;
  if (length(def) - length(replace(def, a_old, ''))) / length(a_old) <> 1
     or (length(def) - length(replace(def, b_old, ''))) / length(b_old) <> 1 then
    raise exception 'registro_operarios_bundle: los fragmentos a reemplazar no estan exactamente una vez; la funcion cambio, revisar a mano';
  end if;
  nuevo := replace(replace(def, a_old, a_new), b_old, b_new);
  execute nuevo;
end $$;

commit;

-- VERIFICACION (después de correrlo):
--   select count(*) from "GP2".matriz_salida_etiqueta;                                 -- 105
--   -- cada salida de cada matriz con 2+ salidas tiene etiqueta (0 sin etiqueta):
--   select m.n_matriz, c.codigo from "GP2".matriz m
--     join (select distinct matriz_id, comp_salida_id from "GP2".ruta_paso where tipo_paso='matriz' and comp_salida_id is not null) x on x.matriz_id=m.id
--     join "GP2".componente c on c.id=x.comp_salida_id
--     left join "GP2".matriz_salida_etiqueta e on e.matriz_id=m.id and e.componente_id=x.comp_salida_id
--    where e.etiqueta is null and m.n_matriz in (select m2.n_matriz from "GP2".matriz m2 join "GP2".ruta_paso r2 on r2.matriz_id=m2.id and r2.tipo_paso='matriz' and r2.comp_salida_id is not null group by m2.n_matriz having count(distinct r2.comp_salida_id) > 1);
--   select jsonb_pretty("GP2".registro_operarios_bundle() -> 'matriz_salidas' -> '12');  -- 3 salidas con 'etiqueta' en orden S/Marca, Chef, Loeke
