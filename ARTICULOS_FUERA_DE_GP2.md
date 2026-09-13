# Lo que la Est Madre pide y GP2 no tiene (2026-09-13)

Salió de verificar que **todos los artículos ya están despiezados** (190/190 con receta). La Est
Madre tiene **405 códigos**; **185 cruzan** con un artículo de GP2 y explican el **82,5 % de la
demanda proyectada** (208.073 de 252.170 uni/mes). Este archivo es el otro pedazo: **los 220
códigos que no cruzan**, 44.097 uni/mes.

Se parten en dos, y sólo el primer grupo es trabajo:

| Grupo | Códigos | uni/mes | % de la demanda total | Qué es |
|---|---:|---:|---:|---|
| **A. Los que faltan de verdad** | **46** | **10.504** | **4,2 %** | Un tallerista los entrega, o el programa viejo los despieza. Se producen. |
| B. Reventa e importado | 174 | 33.593 | 13,3 % | Ni el vecino los despieza ni hay tallerista. Se compran terminados. |

**El criterio de corte no es el volumen, es si alguien los fabrica**: un código sin despiece y sin
tallerista no tiene nada que modelar en GP2 aunque venda mucho.

---

## A. Los 46 que faltan de verdad

`partes` = cuántas líneas tiene su despiece en `public."Despiece x Articulo"` (0 = el vecino sabe
quién lo entrega pero tampoco lo despieza). `tallerista` sale de `public."Articulos Virgilio X
Tallerista"`; recordar que **«Carlos» del vecino es Alex Escalante en GP2** (CONOCIMIENTO §4).

| Cód | Artículo | uni/mes | Tallerista | partes |
|---|---|---:|---|---:|
| 438E | Colador N°20 | 2.788 | Garcia | 0 |
| 437E | Colador N°16 | 2.388 | Garcia | 0 |
| 590E | Pincel Silicona 11 Gms | 1.188 | Garcia | 2 |
| 566E | Aceitera 100 Ml | 624 | Garcia | 2 |
| 584E | Aceitera 400 Ml | 551 | Garcia | 2 |
| 565 | Pinza De Hielo | 534 | Manfer | 1 |
| 110 | Colador N°8 Loke | 384 | Lopez Jose | 1 |
| 561 | Pinza Grande LK | 324 | Pedernera | 2 |
| 111 | Colador N°10 Loke | 296 | Lopez Jose | 1 |
| 112 | Ø 16 Env. Loke | 160 | Lopez Jose | 0 |
| 113 | Colador N°20 Loke | 160 | Garcia | 0 |
| 332 | Espátula Acero Inox. | 136 | Carlos | 4 |
| 323 | Rallador Cilíndrico Chico | 124 | Garcia | 2 |
| 439E | Colador Pasta | 122 | Garcia | 2 |
| 509 | Paleta Batidora | 104 | Carlos | 0 |
| 574 | Corta Queso Alambre | 88 | Lucho | 4 |
| 336 | Cucharón Ac. Inox. | 84 | Carlos | 3 |
| 396 | Enrulador De Manteca | 80 | — | 2 |
| 335 | Cuchara Calada Ac. Inox. | 64 | Carlos | 4 |
| 334 | Cuchara Salsera Inox | 52 | Carlos | 3 |
| 337 | Tenedor Ac. Inox | 48 | Carlos | 3 |
| 440E | Colador Extensible | 36 | Garcia | 2 |
| 55215 | Palo de Amasar 40 cm | 35 | Tierra Nativa | 0 |
| 838E | (sin descripción en el vecino) | 34 | Log/Fabr | 0 |
| 333 | Espumadera Ac. Inox. | 28 | Carlos | 3 |
| 548 | Pincel Pastelero | 24 | Log/Fabr | 2 |
| 877E | (sin descripción en el vecino) | 11 | Log/Fabr | 0 |
| 839 | Rallador Chocolate/Limón 14 cm | 10 | Garcia | 0 |
| 852 | Pinza De Hielo 14 cm | 7 | Manfer | 1 |
| 635 | Cuchara Lisa CH | 3 | Carlos | 5 |
| 636 | Espátula Calada Ac. Inox CH | 3 | Carlos | 7 |
| 634 | Cuchara Calada Ac. Inox. CH | 2 | Carlos | 7 |
| 633 | Cuchara Ac. Inox. CH | 2 | Carlos | 6 |
| 977 | Platos Individuales Pizza x 6 | 2 | Log/Fabr | 0 |
| 801 | Pinza Grande CH | 2 | Pedernera | 2 |
| 809 | Corta Queso Alambre Chef | 1 | — | 5 |
| 630 | Cucharón Ac. Inox. CH | 1 | Carlos | 4 |
| 637 | Cuchara Spaghetti Ac. Inox | 1 | Carlos | 0 |
| 632 | Tenedor Ac. Inox CH | 1 | Carlos | 6 |
| 710 | Enrulador Manteca | 1 | Carlos | 2 |
| 456 | Espátula Lisa Nylon c/Mango | 1 | Log/Fabr | 0 |
| 631 | Espumadera Ac. Inox. CH | 0 | Carlos | 5 |
| 717 | Cuchillo De Untar Acrílico x4 | 0 | Log/Fabr | 0 |
| 613 | Cuchara Calada 1 Pieza Ac. Inox | 0 | Carlos | 0 |
| 747 | Bombilla Coco Hexagonal | 0 | Log/Fabr | 0 |
| 590ES | Pincel Silicona 11 gms Suelto | 0 | Garcia | 0 |

**Cómo se lee esta tabla para decidir:**

- **Los 5 primeros son el 70 % del grupo** (7.539 de 10.504 uni/mes): coladores 438E/437E, pincel
  590E y aceiteras 566E/584E, **los cinco de García**. Si se entra por algún lado, es por ahí.
- **Los coladores Loke 110/111/112/113 y los 438E/437E son la misma familia** con dos numeraciones.
  Antes de dar de alta seis artículos conviene mirar si no son variantes del mismo despiece.
- **El bloque de Carlos (332-337, 630-637, 613, 710)** son los cubiertos de acero inox: 16 códigos
  que suman 426 uni/mes, casi todos con despiece cargado en el vecino (3 a 7 partes). Es el grupo
  más barato de migrar porque la receta ya existe del otro lado — **y ojo: GP2 ya tiene los
  941E-948E, que son cubiertos inox del mismo estilo**, así que hay componentes reusables.
- **Los `CH`** (630-637, 801, 809) son los mismos artículos de la línea Chef. Mismo despiece,
  distinto código de venta.
- **55215 (Palo de Amasar 40 cm, Tierra Nativa)** es el mismo producto que el **232** que GP2 ya
  tiene: acá el trabajo no es dar de alta un artículo, es decidir si es un alias.
- **838E y 877E no tienen ni descripción** en el vecino: hay que preguntar qué son antes de nada.

## B. Los 174 de reventa e importado (33.593 uni/mes)

No hay nada que despiezar: se compran terminados. Se reparten así:

| | Códigos | uni/mes |
|---|---:|---:|
| Terminados en **E** — la línea importada | 78 | 32.603 |
| Terminados en **L** — los mismos, vendidos por Chef | 75 | 435 |
| Otros | 21 | 555 |

Los de más volumen, por si alguno no fuera reventa y haya que revisarlo: 529E Sacacorchos Doble
Impulso Acero (3.708), 102E Abrelatas Mariposa (3.108), 582E Salero 90 ml (2.828), 598E Pelador
Negro Dentado (2.328), 525E Sacacorcho Cabo de Madera (1.368), 809E Corta Pizza 6 cm (1.358), 816E
Pelador V (1.314), 106E Sacacorchos Doble Impulso Inox (948), 589E Pelador Mango Acrílico (860),
522E Sacacorcho Doble Aleta Premium (782). Las familias son sacacorchos, ralladores, peladores,
cortadores, pinzas y los utensilios de nylon/silicona con mango de madera o bambú (931E-937E,
951E-958E, 969E-971E, 981E-985E).

**Los 75 códigos con `L` suman 435 uni/mes entre todos**: son códigos de venta por Chef de esa
misma mercadería, no artículos distintos. No justifican trabajo propio.

---

**Consulta que regenera todo esto** (schema GP2; `public` se lee sólo para saber si el vecino lo
despieza o quién lo entrega, que es exactamente el uso permitido por la Regla 0):

```sql
with faltan as (
  select em.cod, em.proy_uni_mes from "GP2".est_madre em
   where not exists (select 1 from "GP2".articulo a
                      where regexp_replace(a.codigo,'^0+','') = regexp_replace(em.cod,'^0+','')))
select f.cod, round(f.proy_uni_mes) uni_mes,
       coalesce((select max(d."ARTICULO") from public."Despiece x Articulo" d where d."COD" = f.cod),
                (select max(av."Desc") from public."Articulos Virgilio X Tallerista" av where av."Cod_Art" = f.cod)) nombre,
       (select count(*) from public."Despiece x Articulo" d where d."COD" = f.cod) partes,
       (select string_agg(distinct av."Tallerista", ', ') from public."Articulos Virgilio X Tallerista" av
         where av."Cod_Art" = f.cod) talleristas
  from faltan f order by f.proy_uni_mes desc;
```
