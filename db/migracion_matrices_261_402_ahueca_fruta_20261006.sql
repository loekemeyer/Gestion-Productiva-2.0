-- 2026-10-06 — Matrices 261 y 402: «... Ahueca Papa» pasa a «... Ahueca Papa y Ahueca Fruta».
-- [Thomas] "la matriz 261 y 402 renombra a '...ahueca papa y ahueca fruta' en vez de ahueca papa solo".
-- Alcance: SOLO GP2.matriz id 257 (402) y 259 (261). public.Matrices no se tocó (Regla 0).
begin;
update "GP2".matriz set descripcion = 'Env Ahueca Papa y Ahueca Fruta'
 where id = 257 and n_matriz = '402' and descripcion = 'Env Ahueca Papa';
update "GP2".matriz set descripcion = 'Colocar Mgo a Ahueca Papa y Ahueca Fruta'
 where id = 259 and n_matriz = '261' and descripcion = 'Colocar Mgo a Ahueca Papa';
commit;

-- ROLLBACK
-- update "GP2".matriz set descripcion = 'Env Ahueca Papa' where id = 257;
-- update "GP2".matriz set descripcion = 'Colocar Mgo a Ahueca Papa' where id = 259;
