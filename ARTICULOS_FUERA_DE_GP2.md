# Lo que la Est Madre pide y GP2 no tiene (2026-09-13)

Salió de verificar que **todos los artículos ya están despiezados** (190/190 con receta). La Est
Madre tiene **405 códigos**; **185 cruzan** con un artículo de GP2 y explican el **82,5 % de la
demanda proyectada** (208.073 de 252.170 uni/mes). Este archivo es el otro pedazo: **los 220
códigos que no cruzan**, 44.097 uni/mes.

Se parten en dos, y sólo el primer grupo es trabajo:

| Grupo | Códigos | uni/mes | % de la demanda total | Qué es |
|---|---:|---:|---:|---|
| **A. Los que faltan de verdad** | **26** | **3.655** | **1,4 %** | Un tallerista los entrega. Se producen o se envasan acá. |
| B. Reventa e importado | 179 | 39.982 | 15,8 % | Se compran terminados y listos para vender. |
| C. Discontinuados / no se venden más | 15 | 460 | 0,2 % | Reemplazados por otro artículo, o vendidos una sola vez. |

> **Corregido dos veces el 2026-09-13 con lo que dijo el dueño.** Arrancó en **46 códigos /
> 10.504 uni/mes** y quedó en **26 / 3.655**. Se fueron: 438E, 437E, 566E y 584E (importados
> listos, −6.351), los cubiertos inox 332-337 y 630-637 (discontinuados, −425), 838E y 877E
> (son otros códigos de artículos que ya se compran, −45) y 55215 (no se vende más, −35).
> Entró 890E. **El más grande ahora es el 590E**, y **1.038 uni/mes de lo que queda son
> coladores que también se van a importar en poco tiempo**: el trabajo estable son ~2.600
> uni/mes.

**El criterio de corte no es el volumen, es si alguien los fabrica**: un código sin despiece y sin
tallerista no tiene nada que modelar en GP2 aunque venda mucho.

---

## A. Los 26 que faltan de verdad

`partes` = cuántas líneas tiene su despiece en `public."Despiece x Articulo"` (0 = el vecino sabe
quién lo entrega pero tampoco lo despieza). `tallerista` sale de `public."Articulos Virgilio X
Tallerista"`; recordar que **«Carlos» del vecino es Alex Escalante en GP2** (CONOCIMIENTO §4).

| Cód | Artículo | uni/mes | Tallerista | partes |
|---|---|---:|---|---:|
| 590E | Pincel Silicona 11 Gms — **LK, con cartón, caja 29 x12** | 1.188 | Danica García | 2 |
| 890E | Pincel Silicona 11 Gms — **Chef, con cartón, caja 29 x12** | 7 | Danica García | 0 |
| 565 | Pinza De Hielo | 534 | Manfer | 1 |
| 110 | Colador N°8 Loke — *José López, sólo le damos el cartón* | 384 | Lopez Jose | 1 |
| 561 | Pinza Grande LK | 324 | Pedernera | 2 |
| 111 | Colador N°10 Loke — *José López, sólo le damos el cartón* | 296 | Lopez Jose | 1 |
| 112 | Ø 16 Env. Loke — *el 16 no lleva nuestro cartón* | 160 | Lopez Jose | 0 |
| 113 | Colador N°20 Loke — *el 20 no lleva nuestro cartón* | 160 | Garcia | 0 |
| 323 | Rallador Cilíndrico Chico | 124 | Garcia | 2 |
| 439E | Colador Pasta | 122 | Garcia | 2 |
| 509 | Paleta Batidora | 104 | Carlos | 0 |
| 574 | Corta Queso Alambre | 88 | Lucho | 4 |
| 396 | Enrulador De Manteca | 80 | — | 2 |
| 440E | Colador Extensible | 36 | Garcia | 2 |
| 548 | Pincel Pastelero | 24 | Log/Fabr | 2 |
| 839 | Rallador Chocolate/Limón 14 cm | 10 | Garcia | 0 |
| 852 | Pinza De Hielo 14 cm | 7 | Manfer | 1 |
| 977 | Platos Individuales Pizza x 6 | 2 | Log/Fabr | 0 |
| 801 | Pinza Grande CH | 2 | Pedernera | 2 |
| 809 | Corta Queso Alambre Chef | 1 | — | 5 |
| 710 | Enrulador Manteca | 1 | Carlos | 2 |
| 456 | Espátula Lisa Nylon c/Mango | 1 | Log/Fabr | 0 |
| 717 | Cuchillo De Untar Acrílico x4 | 0 | Log/Fabr | 0 |
| 613 | Cuchara Calada 1 Pieza Ac. Inox | 0 | Carlos | 0 |
| 747 | Bombilla Coco Hexagonal | 0 | Log/Fabr | 0 |
| 590ES | Pincel Silicona 11 gms — **LK, SIN cartón, caja 29 x50** | 0 | Danica García | 0 |

**Cómo se lee esta tabla para decidir:**

- **El primero es el 590E** (1.188 uni/mes, el 29 % del grupo) y arrastra a otros dos: es un solo
  circuito que produce tres artículos. Está explicado abajo.
- **Los coladores están de salida** `[usuario 2026-09-13, textual]`: *"Coladores, ahora pasan a ser
  importados dentro de muy poco, pero por ahora las hace Jose Lopez y entrega. Solo le damos el
  carton de cada uno (salvo 16 y 20cm de Chef y Loeke)"*. O sea: **de los coladores lo único que
  pone GP2 es el cartón**, y ni eso en los de 16 y 20 cm. Son 1.038 uni/mes (110, 111, 112, 113,
  439E, 440E) que **en poco tiempo pasan al grupo B**. **Recomendación: no modelarlos.** Además
  **José López no existe como tallerista en GP2** (los 13 cargados son Danica García, Alex
  Escalante, Fábrica, Cavallero, Lucho, Martín Cornejo, Maspoli, Gentile, Carlos Aguirre, IJUPA,
  Pettofrezza, Tierra Nativa y Blist-Pack), así que darlos de alta obliga a crear el tallerista
  para algo que se va a discontinuar solo.
- **`439E` Colador Pasta NO tiene nada que ver con el `441`** `[usuario 2026-09-13, textual: "439E
  no tiene nada que cer con 441"]`. **Queda sin efecto** la suposición anterior de que era el `441`
  Colador de Pasta Plástico (`GRJ25`) con otro código de venta: son dos artículos distintos. El
  439E sigue en el grupo A y le vale la recomendación de los coladores — no modelarlo, se va.
- **El bloque de Carlos (332-337, 630-637, 613, 710)** son los cubiertos de acero inox: 16 códigos
  que suman 426 uni/mes, casi todos con despiece cargado en el vecino (3 a 7 partes). Es el grupo
  más barato de migrar porque la receta ya existe del otro lado — **y ojo: GP2 ya tiene los
  941E-948E, que son cubiertos inox del mismo estilo**, así que hay componentes reusables.
- **Los `CH`** (630-637, 801, 809) son los mismos artículos de la línea Chef. Mismo despiece,
  distinto código de venta.
- **55215 (Palo de Amasar 40 cm, Tierra Nativa)** es el mismo producto que el **232** que GP2 ya
  tiene: acá el trabajo no es dar de alta un artículo, es decidir si es un alias.
- **838E y 877E no tienen ni descripción** en el vecino, pero el dueño ya los identificó: son otros
  códigos de artículos que se compran (ver grupo C). Ninguno de los dos es trabajo.

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

## C. Discontinuados y códigos que son otra cosa (2026-09-13)

`[usuario 2026-09-13, textual]` *"332/7 y 630/7 son discontinuos. Se reemplazaron por 941/8E"*.

- **Los 14 cubiertos de acero inox salen de la lista**: `332`, `333`, `334`, `335`, `336`, `337`
  (línea LK) y `630`, `631`, `632`, `633`, `634`, `635`, `636`, `637` (línea Chef), 425 uni/mes.
  **Los reemplazan los `941E`-`948E`, que GP2 YA TIENE** con su receta y su ruta. Era el bloque que
  este mismo archivo proponía migrar por barato: **ya está hecho, por otro camino.**
  > Ojo al pasar: GP2 tiene 941E, 942E, 943E, 944E, 945E, 946E y **948E**, y **el `947E` no existe**
  > `[usuario 2026-09-13, textual: "947E no"]`. El juego está completo: **no falta ninguno**.
- **`838E` es el `323E` con otro cartón** `[usuario 2026-09-13, textual: "838E=323E con otro carton,
  no 323 (sin E)"]` — el Rallador Mini de Chef; lo único que los separa es el cartón. Y **`877E` es
  el corta pizza, el mismo que el `809E` de Loeke** `[usuario]`. Los dos van al grupo B: ya se
  compran. **El `323` (sin E) Rallador Cilíndrico Chico es OTRA COSA**, sigue en el grupo A.
- **`55215`** (Palo de Amasar 40 cm, Tierra Nativa): *"se entrego solo una vez… y no se va a volver
  a vender"* `[usuario]`. Fuera. **Deja sin efecto la nota anterior** de que era un alias del 232.

## B. Los 179 de reventa e importado (39.982 uni/mes)

No hay nada que despiezar: se compran terminados. Se reparten así:

| | Códigos | uni/mes |
|---|---:|---:|
| Terminados en **E** — la línea importada (incluye 438E, 437E, 566E, 584E, 838E y 877E desde hoy; sin el 890E, que se fue al grupo A) | 83 | 38.992 |
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
