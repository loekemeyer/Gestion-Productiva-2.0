# Problemas de matrices: GP2 vs Registro Producción 2.0 (29/09/2026)

Pedido de Elías Irace (*"listame todos los problemas de este estilo"*), a partir de la 12C y la familia 505.
Uso = producción cargada en Cervantes (`public.db_n8n_espejo`) en los últimos **90 días**, sin eliminados.
Ordenado por gravedad. Nada de esto se corrigió todavía: son datos que tiene que definir el dueño.

## 1. 67 matrices que se usan y NO están en ninguna ruta de GP2

> **Corrección (mismo día, a pregunta de Elías "¿están como tallerista?")**: no están como tallerista (los pasos de
> tallerista, incluido "Fábrica", no llevan matriz), y **no es stock perdido**: **63 de las 67 tampoco tienen
> Causa-Efecto en la base vieja**. Son tareas de mano de obra —envasar, reenvasar, armar importados, sacar film,
> poner capuchón— que cuentan para tiempo y premio, no transforman una pieza en otra. Antes decía "127.750 unidades
> que no suman stock": era una lectura equivocada.
>
> **Pero tienen que estar** [Elías: *"Fábrica sí tiene que estar porque se hacen en fábrica"* y *"tallerista es un
> 3ro"*]: son trabajos que se hacen **en la fábrica con esa matriz**, así que tienen que figurar en la ruta de cada
> artículo como **paso de matriz** (hecho en fábrica), no como tallerista. Hoy faltan: GP2 no sabe en qué artículo
> termina ese trabajo ni puede costearlo.
>
> ⚠ Y aparece un problema de modelo: en GP2 **"Fábrica" está cargada como tallerista** (`GP2.tallerista` id 3, con
> **141 pasos** de ruta). Si tallerista es siempre un tercero, esos 141 pasos están mal clasificados y hay que
> revisarlos (probablemente son pasos de matriz o de armado interno).
>
> Las **4 que sí tienen Causa-Efecto** en la vieja:
>
> - **12C → I11** y **28B → J5**: en GP2 esas piezas las hace la matriz **base** (12 y 28) con la pregunta "¿Qué
>   pieza vas a fabricar?". O sea, GP2 reemplazó la variante con letra por la elección de pieza: si el operario
>   carga 12C, GP2 no sabe qué hizo.
>   **Verificado por Elías en la app GP2**: la 28 ofrece A15, J2 y J5, así que la 28B **sí está**, como 28 + pieza J5.
>   ⚠ Pero los nombres se contradicen: Registro Producción 2.0 dice *28 = Pintar (JF2), 28B = **Cromar** (JF5)*; GP2
>   dice *J5 = Cuerpo Uña **s/M p/Pintar*** y la matriz 28B se llama "Corte Cuerpo Uña p/Cromar". Hay que definir qué
>   es J5 (¿cromar o pintar sin marca?) antes de mapear variante → pieza.
> - **113 → M1**: en GP2 M1 es un insumo comprado, no algo que se fabrica.
> - **309 → "Fabr"**: fabricación interna sin pieza.

| Matriz | Descripción | Cajones | Unidades | Último |
|---|---|--:|--:|--:|
| 28B | Corte Cuerpo Uña p/Cromar | 12 | 19.100 | 01/09 |
| 255B | Calado Mgo Pelador Met | 8 | 12.088 | 03/09 |
| 389 | Env Ñoquera | 40 | 10.378 | 29/09 |
| 12C | Doblado Mango Plano Chef | 10 | 7.499 | 25/08 |
| 39B | Cerrado Cuerpo Sacacorcho (Sin Marca) | 9 | 7.487 | 13/08 |
| 113 | Remachado pisa papas Inox | 34 | 7.334 | 23/07 |
| 343 | Env Cuch Spaghetti 339 | 4 | 7.300 | 28/09 |
| 79B | Corte Destapacorona Sin Marca | 5 | 6.500 | 25/09 |
| 255 | Calado Mgo Pelador Plast | 2 | 3.654 | 28/08 |
| 146 | Aplastado Bombilla | 2 | 3.200 | 11/08 |
| 506 | Colocar Inserto Nuevo a Mgo Md Chino | 13 | 3.171 | 14/08 |
| 300 | Env Pelador | 12 | 3.107 | 24/08 |
| 341 | Env Uña Inox | 8 | 2.369 | 10/09 |
| 330 | Env Rallador Cilindrico | 8 | 2.316 | 28/07 |
| 401 | Env Cucharas Inox Imp | 20 | 2.266 | 17/09 |
| 237 | Poner Capuchon Mgo Espatula | 4 | 1.477 | 20/08 |
| 395 | Sacar carton 1 Precinto | 6 | 1.362 | 14/07 |
| 261 | Colocar Mgo a Ahueca Papa | 6 | 1.360 | 10/08 |
| 510 | Reenvasado de sacacorcho chino | 8 | 1.356 | 22/09 |
| 363 | Soldado Ahueca Papa | 1 | 1.350 | 24/09 |
| 157 | Recorte Sacatapita 523 | 3 | 1.334 | 27/08 |
| 906 | Remachado Prensa p.p Ajo | 4 | 1.205 | 14/08 |
| 505 | Armado Cuchara Fideo Inox Imp | 5 | 1.020 | 02/09 |
| 383 | Env Palo de Amasar | 13 | 1.016 | 29/09 |
| 381 | Env Abrelata mariposa Crom 502/ 066 | 2 | 1.008 | 11/08 |
| 309 | Env Rompenuez | 12 | 998 | 28/08 |
| 384 | Env Cuchara 25 Cm | 7 | 984 | 23/09 |
| 396 | Sacacorcho Doble Impulso | 5 | 972 | 13/07 |
| 512 | Reenvasado imp rallador | 8 | 888 | 28/09 |
| 505D | Armado Cuchara Inox Imp | 7 | 838 | 13/08 |
| 505C | Armado Cucharon Inox Imp | 6 | 828 | 17/09 |
| 57 | Cremallera D/Aleta Espiral y Sacatap. | 6 | 780 | 16/09 |
| 509 | Env Pelador Mgo Madera | 6 | 770 | 28/09 |
| 408 | Env Cuchara Madera | 5 | 660 | 20/08 |
| 402 | Env Ahueca Papa | 5 | 618 | 10/08 |
| 322 | Env Espatula NY | 4 | 600 | 28/08 |
| 321 | Env espatula calada NY | 3 | 504 | 14/09 |
| 254 | Colocar Mgo a Pala Canelones | 3 | 471 | 21/08 |
| 362 | Soldado Ahueca Fruta | 1 | 470 | 28/09 |
| 394 | Env Pala Canelones X 24 | 2 | 456 | 22/08 |
| 309B | Env Rompenuez CH | 3 | 456 | 27/08 |
| 214B | Sacar Film Protector Pala Canelones | 1 | 438 | 21/08 |
| 325B | Reenvasado Colador N°20 Chino | 3 | 432 | 25/09 |
| 325 | ReEnv Colador 10 | 1 | 432 | 11/09 |
| 249 | Colocar Bastidor a Mgo LK | 2 | 432 | 28/07 |
| 406 | Filtro de Bombilla | 1 | 396 | 02/07 |
| 10B | Varilla c/ Cuchilla Curva (H15) | 1 | 385 | 17/07 |
| 505B | Armado Espumadera Inox Imp | 5 | 380 | 16/09 |
| 403 | Env Filtro Cafe | 2 | 360 | 08/07 |
| 334 | Env Muñeco Silicona | 2 | 348 | 20/08 |
| 326 | Env Batidor Pera | 1 | 348 | 11/08 |
| 401B | Env Espatula Calada Mgo Madera Chino | 1 | 280 | 04/09 |
| 323 | Env Cuchara Calada NY | 1 | 240 | 28/08 |
| 242 | Armado Pelador 505 | 1 | 220 | 21/08 |
| 150 | Env Remaches | 26 | 214 | 11/09 |
| 342 | Env Cuchara 30 cm | 1 | 204 | 14/07 |
| 505F | Armado Espatula Calada Inox Imp | 1 | 167 | 30/07 |
| 507 | Env Cuerpo Uña Inox | 1 | 156 | 05/08 |
| 327 | Env Sacafuente Gastro | 1 | 144 | 12/08 |
| 400 | Env Despolvillador Yerba | 1 | 132 | 18/09 |
| 320 | Env Cuchara Spagueti NY | 1 | 120 | 28/08 |
| 511 | Reenvasado Corta Pizza Impor | 2 | 108 | 02/09 |
| 301 | Env Abre 502 | 1 | 96 | 10/07 |
| 312 | Env Bequisa | 1 | 90 | 04/09 |
| 508 | Env Aceitero | 1 | 60 | 18/08 |
| 105 | Sacar Rebarba Cucharon | 3 | 17 | 20/08 |
| 372 | Soldado C.Q. Mgo Alamb | 1 | 1 | 24/09 |

## 2. 28 matrices con variantes que la app de operarios de GP2 esconde

En GP2, si lo escrito coincide exacto con una matriz, se muestra solo esa (regla del 31/08). Escribiendo `505` nunca aparecen 505B–505F: el operario carga la base sin enterarse. Registro Producción 2.0 abre un cartel obligatorio.

| Base | Variantes escondidas |
|---|---|
| 3 | 3B Corte y Estampado Mango Pelador Sin Marca |
| 10 | 10B Varilla c/ Cuchilla Curva (H15) |
| 12 | 12B Doblado Mango Plano 501 · 12C Doblado Mango Plano Chef |
| 28 | 28B Corte Cuerpo Uña p/Cromar |
| 39 | 39B Cerrado Cuerpo Sacacorcho (Sin Marca) |
| 74 | 74A Estampado Rompenuez Abierta |
| 79 | 79B Corte Destapacorona Sin Marca |
| 80 | 80B Estampa Destapacorona Sin Marca |
| 81 | 81B Doblado Destapacorona Sin Marca |
| 101 | 101B Remachado Espátula Calada · 101C Esp. Lisa · 101D Cuchara Salsera · 101E Cuchara Calada |
| 114 | 114A Doblado Aleta Izquierda · 114B Derecha |
| 127 | 127B Estampado Pza Gr Sacaf CH |
| 150 | 150B Env Engranaje Grande |
| 186 | 186B Repasar Agujero Cuchara |
| 214 | 214B Sacar Film Protector Pala Canelones |
| 254 | 254B Colocar Mgo a Pala Canelones Chef |
| 255 | 255B Calado Mgo Pelador Met |
| 305 | 305B Env Pinza Fideos CH |
| 309 | 309B Env Rompenuez CH |
| 310 | 310B Env Destapacorona Suelto |
| 325 | 325B Reenvasado Colador N°20 Chino (+325C, que falta en GP2) |
| 340 | 340B Env Cuch Untar Mad |
| 342 | 342B Env Cuchara 33 cm Ny |
| 360 | 360B Corte Ahueca |
| 394 | 394B Env Pala Canelones x 50 · 394C Pala Canelones x 12 Chef |
| 395 | 395B Sacar cartón 2 Precinto |
| 401 | 401B Env Espátula Calada Mgo Madera Chino |
| 505 | 505B Espumadera · 505C Cucharón · 505D Cuchara · 505E Espátula Lisa · 505F Espátula Calada |

## 3. 19 matrices que se usan y NO tienen tiempo histórico en GP2 — no se puede calcular el premio

| Matriz | Descripción | Cajones | Unidades |
|---|---|--:|--:|
| 21 | Corte Arandela buje 501 | 4 | 60.000 |
| 343 | Env Cuch Spaghetti 339 | 4 | 7.300 |
| 64 | Corte Pinza Fiambre | 6 | 6.200 |
| 182 | Estampado Flecha de Ahueca | 5 | 6.150 |
| 361 | Corte Flechita Ahueca | 2 | 6.000 |
| 63 | Estampado Pinza Fiambre Dere | 4 | 2.339 |
| 330 | Env Rallador Cilindrico | 8 | 2.316 |
| 395 | Sacar carton 1 Precinto | 6 | 1.362 |
| 906 | Remachado Prensa p.p Ajo | 4 | 1.205 |
| 396 | Sacacorcho Doble Impulso | 5 | 972 |
| 512 | Reenvasado imp rallador | 8 | 888 |
| 509 | Env Pelador Mgo Madera | 6 | 770 |
| 325B | Reenvasado Colador N°20 Chino | 3 | 432 |
| 325 | ReEnv Colador 10 | 1 | 432 |
| 403 | Env Filtro Cafe | 2 | 360 |
| 401B | Env Espatula Calada Mgo Madera Chino | 1 | 280 |
| 327 | Env Sacafuente Gastro | 1 | 144 |
| 508 | Env Aceitero | 1 | 60 |
| 105 | Sacar Rebarba Cucharon | 3 | 17 |

## 4. Matrices que están en una base y no en la otra

| Matriz | Descripción | Dónde está | Uso 90 días |
|---|---|---|---|
| 325C | Reenvasado Cola pastas 22,5 cm | solo en la base vieja | 1 cajón, 36 uni (25/09) |
| 513 | colocar etiqueta a bombillas | solo en la base vieja | 0 |
| S/N | Corte Arandela Cuchillitos | solo en GP2 | — |
| 227 | Armado Sacacorcho 525 | solo en GP2 | — |

## 5. Matrices con distinto nombre en cada base (31)

Las que cambian de SIGNIFICADO (hay que decidir cuál vale):

| Matriz | GP2 | Base vieja |
|---|---|---|
| 138 | Corte Grampa Batidor (tipo A) | Doblado Sacafuente (tipo B) |
| 501 | Afilado Cuchilla | Piedra (TP) |
| 12B | Doblado Mango Plano 501 | Doblado Mango Plano Sin Marca |
| 114 | Doblado de Aleta (activa) | OBSOLETO - usar 114A o 114B |
| 64 | Corte Pinza Fiambre | Corte Pinza Fiambre Izquierda |
| 73 | Corte Pza Rompenuez | Corte Rompe Pza |
| 20 | Corte Engranaje Gr | Corte Engranaje |
| 68 | Corte Resorte U | Corte Resorte |
| 137 | Cortar arandela Batidor | Cortar arandela Batidor mini |
| 350 | Corte Disco Corta Ravioles | Corte Corta Ravioles |
| 74 | Estampado Rompenuez | Estampado Rompenuez Cerrada |

Las otras 20 son abreviaturas del mismo nombre ("Sacaf Gast" = "Sacafuente", "Mgo Alamb" = "Mango Alambre"): 112, 127, 151, 152, 153, 154, 155, 156, 182, 234, 346, 364, 365, 368, 369, 371, 373, 512, 63, 65.

## 6. 289 matrices sin tipo en GP2 (la base vieja sí lo tiene)

`GP2.matriz.tipo` está vacío en 289 de 407; la base vieja las tiene clasificadas (A alimentador, B balancín, D dispositivo, P piedra, E). El tipo define la máquina y, en la app nueva, cómo se carga el cajón. Además la **138** es A en GP2 y B en la vieja.

## 7. "Fábrica" cargada como tallerista (141 pasos)

Tallerista es un tercero [Elías 29/09]. En GP2 hay un tallerista "Fábrica" (id 3) con 141 pasos de ruta: trabajo interno clasificado como de un tercero. Afecta envíos, stock en contraparte y costos de tallerista.

## Relación entre los puntos

- La **12C** y la familia **505** están en el punto 1 (sin ruta) y en el 2 (escondidas): son el caso que abrió este listado.
- La **325C** se usó el 25/09 y no existe en GP2: si la app nueva valida contra GP2, ese cajón se rechaza.
