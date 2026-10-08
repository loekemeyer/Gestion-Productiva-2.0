-- =====================================================================
-- 510 (Abrelata Uña Inox): lo arman Alex Escalante y Martin Cornejo, 50 / 50 (2026-10-08)
-- [Nazareno, textual: "El artículo 510 se les manda para armar a los talleristas Alex Escalante y
--  Martín Cornejo 50 y 50. Agregalo en proporciones y también agregá que se le puedan mandar las
--  partes del 510 a Martín Cornejo"].
--
-- CORRIGE CONOCIMIENTO 4dw (15-09: "510 solo alex lo hace", se borraron las 5 rutas de Martin 601,
-- 602, 604, 605, 607). La realidad ya habia vuelto antes que el dato: Martin tenia -1.176 en A15,
-- Cartón 510 (A2B), C10 y V9 en su casa = entregaba 510 sin que GP2 supiera que se lo tenia que mandar.
--
-- Convención de la casa (CLAUDE.md, normalización punto 4): más de un tallerista en el mismo paso ->
-- la ruta se DUPLICA, una por tallerista (molde: el 506, rutas 1042-1046 Martin / 1047-1051 Alex).
--   1) componente: nada nuevo.
--   2) inventario: Martin (ubicación 26) YA tiene fila de las 5 partes (A15, A2B, C10, V9, A11).
--   3) recetas: el 510 no cambia de partes.
--   4) ruta / ruta_paso: las 5 rutas de Alex (160, 215, 302, 303, 490) se copian para Martin, paso por
--      paso, cambiando sólo el tallerista 2 -> 6. Las 2 de Alex que no decían de quién eran (160, 215)
--      ganan el sufijo "(Alex Escalante)", como las otras 3.
--   5) contraparte_alias: Martin ya está ("MARTIN" -> 6). Nada.
-- + reparto_tallerista: 510 / paso 510 terminado (componente 403) -> Alex 50, Martin 50.
--
-- La ruta duplicada NO duplica consumo ni costo (las vistas de demanda arman los edges con DISTINCT,
-- CONOCIMIENTO 4dt). Los máximos de tallerista se recalculan solos al COMMIT (trg_maximos_rutas sobre
-- ruta_paso -> fn_recalc_maximos_diferido) y ya leen el 50 / 50.
-- Idempotente: si Martin ya tiene rutas del 510 no duplica nada.
-- =====================================================================

do $$
declare v_src bigint; v_new bigint; v_nom text; v_n int;
begin
  if exists (select 1 from "GP2".ruta r join "GP2".ruta_paso rp on rp.ruta_id = r.id
              where r.articulo_id = 32 and rp.tallerista_id = 6) then
    raise notice 'Martin Cornejo ya tiene rutas del 510: no se duplica nada';
    return;
  end if;

  -- las 5 rutas fuente tienen que ser del 510 y llevar a Alex Escalante (2): si no, no se toca nada
  select count(distinct r.id) into v_n
    from "GP2".ruta r join "GP2".ruta_paso rp on rp.ruta_id = r.id
   where r.id in (160, 215, 302, 303, 490) and r.articulo_id = 32 and rp.tallerista_id = 2;
  if v_n <> 5 then
    raise exception 'Las rutas fuente del 510 no son las esperadas (% de 5 con Alex): no se toca nada', v_n;
  end if;

  for v_src in select unnest(array[160, 215, 302, 303, 490]::bigint[]) loop
    select nombre into v_nom from "GP2".ruta where id = v_src;
    if v_nom not like '%(Alex Escalante)' then
      v_nom := v_nom || ' (Alex Escalante)';
      update "GP2".ruta set nombre = v_nom where id = v_src;
    end if;
    insert into "GP2".ruta (nombre, articulo_id)
    values (replace(v_nom, '(Alex Escalante)', '(Martin Cornejo)'), 32)
    returning id into v_new;
    insert into "GP2".ruta_paso (ruta_id, orden, tipo_paso, matriz_id, proveedor_id, tallerista_id,
                                 comp_entrada_id, comp_salida_id, cantidad, proveedor_at_id)
    select v_new, orden, tipo_paso, matriz_id, proveedor_id,
           case when tallerista_id = 2 then 6 else tallerista_id end,
           comp_entrada_id, comp_salida_id, cantidad, proveedor_at_id
      from "GP2".ruta_paso where ruta_id = v_src order by orden;
  end loop;
end $$;

-- el % dictado: 50 / 50 en el paso del terminado (componente 403 = "510 Terminado")
insert into "GP2".reparto_tallerista (articulo_id, comp_salida_id, tallerista_id, pct)
values (32, 403, 2, 50), (32, 403, 6, 50)
on conflict (articulo_id, comp_salida_id, tallerista_id) do update set pct = excluded.pct, actualizado_en = now();

-- verificación (debe dar: 10 rutas, 5 por tallerista; reparto 50 / 50 no supuesto)
-- select t.nombre, count(distinct r.id) from "GP2".ruta r join "GP2".ruta_paso rp on rp.ruta_id = r.id
--   join "GP2".tallerista t on t.id = rp.tallerista_id where r.articulo_id = 32 group by 1;
-- select * from "GP2".v_reparto_efectivo where articulo_id = 32;

-- REVERT (si hiciera falta volver a "solo Alex"):
-- delete from "GP2".reparto_tallerista where articulo_id = 32 and comp_salida_id = 403;
-- delete from "GP2".ruta_paso where ruta_id in (select distinct r.id from "GP2".ruta r
--   join "GP2".ruta_paso rp on rp.ruta_id = r.id where r.articulo_id = 32 and rp.tallerista_id = 6);
-- delete from "GP2".ruta r where r.articulo_id = 32 and r.nombre like '%(Martin Cornejo)'
--   and not exists (select 1 from "GP2".ruta_paso rp where rp.ruta_id = r.id);
