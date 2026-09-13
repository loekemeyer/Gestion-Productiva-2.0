# Lo que la Est Madre pide y GP2 no tiene (2026-09-13)

Salió de verificar que **todos los artículos ya están despiezados** (190/190 con receta). La Est
Madre tiene **405 códigos**; **185 cruzan** con un artículo de GP2 y explican el **82,5 % de la
demanda proyectada** (208.073 de 252.170 uni/mes). Este archivo es el otro pedazo: **los 220
códigos que no cruzan**, 44.097 uni/mes.

Se parten en dos, y sólo el primer grupo es trabajo:

| Grupo | Códigos | uni/mes | % de la demanda total | Qué es |
|---|---:|---:|---:|---|
| **A. Los que faltan de verdad** | **43** | **4.160** | **1,6 %** | Un tallerista los entrega. Se producen o se envasan acá. |
| B. Reventa e importado | 177 | 39.937 | 15,8 % | Se compran terminados y listos para vender. |

> **Corregido el 2026-09-13 con lo que dijo el dueño** (ver abajo): **438E, 437E, 566E y 584E
> pasaron a importados listos para reventa** (−6.351 uni/mes del grupo A, que era el 60 % de ese
> grupo) y **890E entró al grupo A** (lo envasa García). El grupo A pasó de 46 a 43 códigos y de
> 10.504 a 4.160 uni/mes, y su artículo más grande ahora es el **590E**.

**El criterio de corte no es el volumen, es si alguien los fabrica**: un código sin despiece y sin
tallerista no tiene nada que modelar en GP2 aunque venda mucho.

---

## A. Los 43 que faltan de verdad

`partes` = cuántas líneas tiene su despiece en `public."Despiece x Articulo"` (0 = el vecino sabe
quién lo entrega pero tampoco lo despieza). `tallerista` sale de `public."Articulos Virgilio X
Tallerista"`; recordar que **«Carlos» del vecino es Alex Escalante en GP2** (CONOCIMIENTO §4).

| Cód | Artículo | uni/mes | Tallerista | partes |
|---|---|---:|---|---:|
| 590E | Pincel Silicona 11 Gms — **LK, con cartón, caja 29 x12** | 1.188 | Danica García | 2 |
| 890E | Pincel Silicona 11 Gms — **Chef, con cartón, caja 29 x12** | 7 | Danica García | 0 |
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
| 590ES | Pincel Silicona 11 gms — **LK, SIN cartón, caja 29 x50** | 0 | Danica García | 0 |

**Cómo se lee esta tabla para decidir:**

- **El primero es el 590E** (1.188 uni/mes, el 29 % del grupo) y arrastra a otros dos: es un solo
  circuito que produce tres artículos. Está explicado abajo.
- **Los coladores Loke 110/111/112/113** son la misma familia que los 438E/437E que ahora se
  importan: antes de darlos de alta conviene confirmar si siguen fabricándose.
- **`439E` Colador Pasta y `440E` Colador Extensible siguen figurando como de García** y son de la
  misma familia de coladores que se pasó a importada. **Pendiente de confirmar** si también se
  importan (no se movieron porque el dueño nombró sólo cuatro códigos).
- **El bloque de Carlos (332-337, 630-637, 613, 710)** son los cubiertos de acero inox: 16 códigos
  que suman 426 uni/mes, casi todos con despiece cargado en el vecino (3 a 7 partes). Es el grupo
  más barato de migrar porque la receta ya existe del otro lado — **y ojo: GP2 ya tiene los
  941E-948E, que son cubiertos inox del mismo estilo**, así que hay componentes reusables.
- **Los `CH`** (630-637, 801, 809) son los mismos artículos de la línea Chef. Mismo despiece,
  distinto código de venta.
- **55215 (Palo de Amasar 40 cm, Tierra Nativa)** es el mismo producto que el **232** que GP2 ya
  tiene: acá el trabajo no es dar de alta un artículo, es decidir si es un alias.
- **838E y 877E no tienen ni descripción** en el vecino: hay que preguntar qué son antes de nada.

## El circuito del pincel 590E — el más grande del grupo A

`[usuario 2026-09-13, textual]` *"590E se stockea en Virgilio en cajas x600uni, que se le mandan a
garcia para que las envase"*. **Es un solo insumo a granel que sale como TRES artículos**, y por eso
es un caso de manual para GP2: la diferencia entre los tres no es la pieza, es el envase.

| Artículo | Empresa | Cartón | Caja | uni/caja | uni/mes |
|---|---|---|---|---:|---:|
| 590E | LK | **sí** | 29 (`A11`) | 12 | 1.188 |
| 890E | Chef | **sí** | 29 (`A11`) | 12 | 7 |
| 590ES | LK | **no** | 29 (`A11`) | 50 | 0 |

Lo que ya está confirmado contra la base: **Caja N°29 = `A11`** (Sector Caja), **García = `Danica
García`, tallerista id 1, activo**, y los tres códigos existen en la Est Madre con el `uxb` que
corresponde (12, 12 y 50). El vecino modela el 590E con dos partes, `590E-CC` (caja chica, 1/12) y
`590E-MC` (mastercaja, 1/600) — o sea que **la caja x600 es cómo llega importado**, no una parte del
artículo terminado.

**Falta para poder darlos de alta** (no se inventa nada, tiene que decirlo el dueño):

1. **El componente del pincel a granel** — no existe todavía en GP2. Hay que decidir su código y su
   sector (¿Plástico?), y que su ubicación sea Virgilio, que es donde se stockea.
2. **Los dos cartones** (el de LK y el de Chef) tampoco existen. Los cartones de GP2 se codifican
   **por posición de estantería** (`G2B` = Cartón 229, `G6B` = Cartón 299), así que el código sale
   de dónde se guardan, no de un número inventado.
3. Confirmar si el 890E lleva **un cartón propio de Chef** o es el mismo que el de LK.

Con eso, la cirugía es la de siempre y en este orden: `componente` (pincel granel + 2 cartones) →
`inventario` (fila en Virgilio) → `articulo` × 3 con `articulos_por_caja` 12/12/50 →
`articulo_componente` (pincel 1 + cartón 1 + `A11` 1/12, y para el 590ES pincel 1 + `A11` 1/50) →
`ruta` / `ruta_paso` (insumo → tallerista Danica García → virgilio).

## Lo que se importa y ya viene listo para vender

`[usuario 2026-09-13, textual]` *"438E es importado a partir de ahora y esta listo para la reventa.
Lo mismo 437E, 566E y 584E"*. **Los cuatro salen del grupo A**: no se fabrican ni se envasan acá.

**La única excepción es transitoria y del 584E**: quedan **1.200 unidades en Virgilio** que se le
mandan a García **para que las reenvase de cajas de 60 a cajas x6**, y esas cajas x6 **no son cajas
del sistema**. Es un trabajo puntual sobre stock viejo, no el circuito nuevo — pero mientras dure,
ese consumo de cajas no se puede registrar en GP2 sin dar de alta ese formato.

## B. Los 177 de reventa e importado (39.937 uni/mes)

No hay nada que despiezar: se compran terminados. Se reparten así:

| | Códigos | uni/mes |
|---|---:|---:|
| Terminados en **E** — la línea importada (incluye 438E, 437E, 566E y 584E desde hoy; sin el 890E, que se fue al grupo A) | 81 | 38.947 |
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
