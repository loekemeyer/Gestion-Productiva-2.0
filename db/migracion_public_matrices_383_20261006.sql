-- public."Matrices": 383B, 383C y 383D nuevas + la 383 renombrada a «Frances» (2026-10-06)
-- [Elías 06/10/2026] "1 si" a: "¿cargamos 383, 383B, 383C y 383D también en public.Matrices, con estos nombres, para que el
-- Registro Producción 2.0 las ofrezca?". Es la ÚNICA escritura de GP2 sobre `public` (casa del vecino, Regla 0) y la autorizó el
-- dueño; las matrices GP2 equivalentes están en db/migracion_matrices_383bcd_palo_amasar_20261006.sql.
--
-- public."Matrices".id NO tiene default: se cargaron con id = max(id)+1.. (max era 425).
--   336  383  = Env Palo de Amasar Frances 40cm   (renombrada; antes «Env Palo de Amasar»)
--   426  383B = Env Palo de Amasar 30cm
--   427  383C = Env Palo de Amasar 40cm
--   428  383D = Env Palo de Amasar 50cm
-- Atributos copiados de la 383 (Tipo E, Tiempo_Historico 30,2 s, resto en 0/null, Disc false).
--
-- Efectos en cadena (leídos antes de escribir): trg_audit_matrices dejó 4 filas en Matrices_audit (810 -> 814);
-- trg_sync_stock_matrices, al ser Tipo 'E', sólo borra de UnixCajon_Stock_Registro_Prod_Cerv lo de esa matriz (0 filas: no
-- había); trg_matrices_disc_flow no actúa (Disc no cambia). Los 33 registros históricos de la 383 en db_n8n_espejo conservan
-- «Env Palo de Amasar» (el nombre se copia al registrar, no se propaga). APLICADA el 2026-10-06 y verificada.

with base as (select * from public."Matrices" where "N_Matriz" = '383'),
mx as (select max(id) as m from public."Matrices"),
nuevas as (
  insert into public."Matrices" (id, "N_Matriz", "Matriz", "Tiempo_Historico", "Tiempo_Anterior", "Tiempo_Video", "Uni_X_Golpe", "Uni_X_Cajon", "Familia", "Tipo_Matriz", "SC", "SP", "Cajones_X_Sector", "createdAt", "updatedAt", "Disc")
  select (select m from mx) + v.n, v.nm, v.nombre, b."Tiempo_Historico", b."Tiempo_Anterior", b."Tiempo_Video", b."Uni_X_Golpe", b."Uni_X_Cajon", b."Familia", b."Tipo_Matriz", b."SC", b."SP", b."Cajones_X_Sector", now(), now(), false
    from base b, (values (1, '383B', 'Env Palo de Amasar 30cm'), (2, '383C', 'Env Palo de Amasar 40cm'), (3, '383D', 'Env Palo de Amasar 50cm')) as v(n, nm, nombre)
   where not exists (select 1 from public."Matrices" x where x."N_Matriz" = v.nm)
  returning id),
ren as (
  update public."Matrices" set "Matriz" = 'Env Palo de Amasar Frances 40cm', "updatedAt" = now()
   where "N_Matriz" = '383' and "Matriz" = 'Env Palo de Amasar' returning id)
select (select count(*) from nuevas) as nuevas, (select count(*) from ren) as renombradas;   -- 3, 1

-- verificación: 336 383 = Frances · 426 383B · 427 383C · 428 383D, todas Tipo E y 30,2 s
-- select id, "N_Matriz", "Matriz", "Tipo_Matriz", "Tiempo_Historico" from public."Matrices" where "N_Matriz" like '383%' order by "N_Matriz";

-- ROLLBACK (sólo mientras 383B/C/D no tengan registros en db_n8n_espejo)
-- update public."Matrices" set "Matriz" = 'Env Palo de Amasar', "updatedAt" = now() where "N_Matriz" = '383';
-- delete from public."Matrices" where id in (426, 427, 428) and "N_Matriz" in ('383B', '383C', '383D');
