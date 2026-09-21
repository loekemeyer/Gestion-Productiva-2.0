# Despiece: qué se le descuenta a cada tallerista cuando entrega

Generado el 2026-09-21 desde la base (`GP2`, ruta/ruta_paso + articulo_componente + componente_bom).
Fuente de verdad del descuento: las funciones `GP2.recepcion_virgilio(p jsonb)` (Virgilio) y
`GP2.crear_entrega_tallerista(...)` / el constructor `recepcionTall()` de `gp2-motor.js` (Cervantes).

## 1. Las dos puertas de entrega

| Puerta | Pantalla | Qué entra | Qué se descuenta del tallerista |
|---|---|---|---|
| **Virgilio** — artículo terminado | `Talleristas/Recepcion/RecepcionVirgilio_GP2.html` (hoy con candado en el menú, ver LOCKS 18/09 entrada 10) | el terminado, que queda en la ubicación Virgilio | **TODA la receta del artículo** (`articulo_componente`): el componente principal se transforma en el terminado (`recepcion_virgilio`), el resto sale como `consumo_virgilio` |
| **Cervantes** — parte armada / semi-elaborado | `Talleristas/Recepcion/EntregasTalleristas_GP2.html` | la parte, que vuelve a la ubicación de su sector | **el BOM de la parte** (`componente_bom`) como `consumo_tall`; si no tiene BOM, la pieza de entrada 1:1; si el paso es in-place, nada extra |

Reglas finas:

- **Principal (marcado `*` abajo):** lo elige `recepcion_virgilio` con `order by (sector_id=2) desc, cantidad desc, componente_id` — o sea prioriza sector 2, después la mayor cantidad. Es el que viaja como `comp_transformado`; el neto es el mismo cualquiera sea el elegido.
- **La caja y el cartón también se descuentan al tallerista.** Las líneas tipo `A8 x0.08` o `CART506 x1` son parte de `articulo_componente`, y `recepcion_virgilio` las saca de la ubicación del ORIGEN (el tallerista), no del sector.
- **Un mismo artículo puede tener dos talleristas** (505 = Danica + Lucho, 506 = Alex + Martin): son rutas duplicadas por tallerista, no un error.
- Los GRJ que aparecen como línea de descuento (GRJ10, GRJ5, GRJ13…) los arma OTRO tallerista por la puerta de Cervantes (sección 3).

## 2. Virgilio — artículo terminado (por tallerista)

Formato: `ARTÍCULO — componente ×cantidad | …` · `*` = principal (se transforma en el terminado).
Excluye artículos discontinuados. 12 contrapartes tallerista; los Prov. AT (Pintos, Pettofrezza, Cabral, Maspoli, López José, The Plast, Paternal Goma, Carriero, Melinox, Tierra Nativa) entran por la misma RPC con `origen_tipo='proveedor_at'`.

### Alex Escalante (11 artículos)
- 052 Cepillo Lavavajilla — PB8B ×1* | PA19 ×1 | GRJ14 ×1 | Q4A ×1 | A6 ×0,08
- 307 Cepillo Limpia Vaso y Mamadera — PB8B ×1* | PA19 ×1 | GRJ13 ×1 | S3C ×1 | A9B ×0,04
- 395 Descorazonador De Manzana — 1686 ×1* | PC10 ×1 | PA18 ×1 | G1A ×1 | A8 ×0,08
- 506 Abrelatas Uña Rojo — A10 ×1* | C10 ×1 | V9 ×1 | CART506 ×1 | A11 ×0,08
- 510 Abrelata Uña Cromado — A15 ×1* | C10 ×1 | V9 ×1 | A2B ×1 | A11 ×0,08
- 515 Batidores — PC10 ×1* | PA13 ×1 | C12 ×1 | A1C1 ×1 | A8 ×0,08
- 534 Cepillo Lavavajilla — PA13 ×1* | GRJ14 ×1 | PA17 ×1 | Q4B ×1 | A4 ×0,04
- 535 Cepillo Limpia Vaso y Mamadera — PA13 ×1* | GRJ13 ×1 | PA17 ×1 | K1A ×1 | A9B ×0,04
- 547 Corta Torta — F6B ×1* | PV8 ×1 | A4 ×0,08
- 615 Batidores — PB8B ×1* | PA19 ×1 | C12 ×1 | O2A ×1 | A8 ×0,08
- 818 Corta Torta — PV8B ×1* | O2D ×1 | A4 ×0,08

### Blist-Pack SA (2)
- 555 Cepillo Limpia Bombilla — GRJ28 ×1* | A8 ×0,03
- 764 Cepillo Limpia Bombilla — GRJ29 ×1* | A1 ×0,03

### Carlos Aguirre (7)
- 115 Batidor Pera — GRJ10 ×1* | I2A ×1 | A5 ×0,08
- 544 Batidor Pera Alambre — GRJ10 ×1* | C1A ×1 | A2 ×0,08
- 560 Pinza Corta Alambre 21cm — N7 ×1* | G3C ×1 | CV14 ×1 | A8 ×0,08
- 580 Batidor Mini — GRJ10A ×1* | G7A ×1 | A11 ×0,08
- 709 Descorazonador De Manzana — 1686 ×1* | PA19 ×1 | PB6 ×1 | A8 ×0,08
- 800 Pinza Corta Alambre 21 Cm — N7 ×1* | O5A ×1 | CV14 ×1 | A8 ×0,08
- 802 Batidor Pera Alambre — GRJ10 ×1* | P4A ×1 | A2 ×0,08

### Cavallero German (1)
- 121 Pisa Papas Inox. — M1 ×1* | PA10B ×1 | PC11 ×1 | I3C ×1 | A3 ×0,08

### Danica Garcia (11)
- 057 Destapa Corona x1 Cromado — C5 ×1* | Z25A ×1 | G8B ×1 | A11 ×0,08
- 498 Llavero Destapador Pie Cromado — Z45 ×1* | Z25A ×1 | Z25B ×1 | G8A ×1 | A11 ×0,08
- 499 Llavero Destapador Pie Color — Z22 ×1* | Z25A ×1 | Z25B ×1 | G8D ×1 | A11 ×0,08
- 505 Pelador Mgo Plástico — Z23 ×1* | PC1A ×1 | B3A ×1 | D9 ×1 | A11 ×0,08
- 516 Destapa Corona x1 Cromado Suelto — C5 ×1* | Z25A ×1 | L4B1 ×1 | A9 ×0,01
- 550 Filtro Para Bombillas — BOM13 ×2* | BOM14 ×2 | CCG6B ×1 | BOLSA550 ×1 | A9 ×0,03
- 590E Pincel Silicona 11 Gms — PINCEL590 ×1* | CART590 ×1 | A11 ×0,08
- 590ES Pincel Silicona s/Cartón — PINCEL590 ×1* | A11 ×0,02
- 700 Destapa Corona x1 Blanco — B8 ×1* | Z25A ×1 | O1B ×1 | A9 ×0,08
- 760 Filtro de Bombilla — BOM13 ×2* | BOM14 ×2 | CCG6B ×1 | BOLSA760 ×1 | A11 ×0,04
- 890E Pincel Silicona 11 Gms — PINCEL590 ×1* | CART890 ×1 | A11 ×0,08

### Fábrica (43) — Cervantes armando directo, no es un tallerista externo
- 058 Cierra Bolsa x2 — PC4 ×2* | CART058 ×1 | A9 ×0,08
- 071 Bowl Multi Uso 330ml — GRJ21 ×1* | A4 ×0,25
- 207 Ñoquera Madera Mgo Redondo — G1C ×1* | GRJ12B ×1 | A1 ×0,08
- 229 Ñoquera Madera — G2B ×1* | GRJ12 ×1 | A9 ×0,08
- 231 Palo de Amasar 30cm — GRJ22 ×1* | BANDITA ×1 | A9B ×0,08
- 232 Palo de Amasar 40cm — GRJ23 ×1* | BANDITA ×1 | A9B ×0,08
- 233 Palo de Amasar 50cm — GRJ24 ×1* | BANDITA ×1 | A9B ×0,08
- 234 Palo de Amasar Frances 40cm — GRJ17 ×1* | A9B ×0,08
- 248 Cuchara Nylon Reforzada 33cm — PB2 ×1* | A1A ×1 | A7B ×0,08
- 255 Mate Inox Térmico — GRJ26 ×1* | A4 ×0,13
- 256 Mate Madera Cerámica — GRJ27 ×1* | A4 ×0,13
- 280 Manga Repostera + 4 Boquillas — PV14 ×4* | BOM8B ×1 | F1A ×1 | A2 ×0,08
- 299 Muñeco Silicona Antiderrame — G6B ×1* | PA3 ×1 | A11 ×0,08
- 390 Cuchara Calada Nylon — PV6 ×1* | K6B ×1 | A2 ×0,04
- 391 Cuchara Fideos Nylon — PV5 ×1* | K6C ×1 | A6 ×0,04
- 392 Cucharon Nylon — PV2 ×1* | K7A ×1 | A6 ×0,04
- 393 Espátula Calada Nylon — PV7 ×1* | K7B ×1 | A2 ×0,04
- 394 Espátula Lisa Nylon — PV3 ×1* | K7C ×1 | A2 ×0,04
- 441 Colador de Pasta Plástico — GRJ25 ×1* | A4 ×0,08
- 507 Rompenueces — G1B ×1* | D5-M78 ×1 | A8 ×0,08
- 542 Ahueca Papas — D16B ×1* | PC10 ×1 | PA18 ×1 | G5A ×1 | A9 ×0,08
- 543 Ahueca Frutas — D16A ×1* | PC10 ×1 | PA18 ×1 | G5B ×1 | A9 ×0,08
- 570 Pala De Canelones — E6 ×1* | F2 ×1 | V10 ×2 | PC10 ×1 | PA18 ×1 | F2B ×1 | A6 ×0,04
- 707 Rompenueces — N6C ×1* | B1-M78 ×1 | A8 ×0,08
- 715 Cierra Bolsa x2 — PC4 ×4* | CART715 ×1 | A1 ×0,04
- 718 Cuchillito De Untar Plast x2 — PEP9 ×1* | A1 ×0,04
- 720 Ahueca Papas — D16B ×1* | PA19 ×1 | PB6 ×1 | N2B ×1 | PC6 ×1 | A3 ×0,08
- 722 Ahueca Frutas — D16A ×1* | PA19 ×1 | PB6 ×1 | N2C ×1 | PC6 ×1 | A3 ×0,08
- 842 Espátula Lisa Nylon — PV3 ×1* | R2C ×1 | A2 ×0,04
- 843 Cuchara Calada Nylon — PV6 ×1* | R1B ×1 | A2 ×0,04
- 844 Cuchara Fideos Nylon — PV5 ×1* | Q3A ×1 | A6 ×0,04
- 845 Cucharón Nylon — PV2 ×1* | Q3B ×1 | A6 ×0,04
- 846 Espátula Calada Nylon — PV7 ×1* | R1A ×1 | A2 ×0,04
- 858 Pala De Canelones Ac. Inox. — E6 ×1* | F2 ×1 | V10 ×2 | PA19 ×1 | PC7 ×1 | O2C ×1 | PC6 ×1 | A2 ×0,08
- 908 Cuchara Nylon 33cm — PB2 ×1* | Q3D ×1 | A7B ×0,08
- 909 Ñoquera Madera — S2A ×1* | GRJ12 ×1 | A5 ×0,08
- 941E / 942E / 943E / 944E / 945E / 946E / 948E (línea Ac. Inox) — PEST1 ×1* | A9B ×0,08 (las 7 iguales)

### Gentile Norberto (10) — bombillas, todas con su pliego
- 557 Bombilla Resorte Chata — GRJ6 ×1* | Pliego Ad 557 ×0,06 | A8 ×0,04
- 558 Bombilla Resorte Tradicional — GRJ5 ×1* | Pliego Ad 558 ×0,06 | A8 ×0,04
- 654 Bombilla Autolimpiante Inox — GRJ4 ×1* | Pliego Ad 654 ×0,06 | A8 ×0,04
- 658 Bombilla Plana Ancha Metalizada — GRJ19 ×1* | Pliego Ad 658 ×0,06 | A8 ×0,04
- 659 Bombilla Pico de Loro Inox — GRJ18 ×1* | Pliego Ad 659 ×0,06 | A8 ×0,04
- 758 Bombilla Plana Ancha Metalizada — GRJ19 ×1* | Pliego Ad 758 ×0,06 | A8 ×0,04
- 759 Bombilla Pico de Loro Inox — GRJ18 ×1* | Pliego Ad 759 ×0,06 | A8 ×0,04
- 762 Bombilla Resorte Chata — GRJ6 ×1* | Pliego Ad 762 ×0,06 | A1 ×0,04
- 763 Bombilla Resorte Tradicional — GRJ5 ×1* | Pliego Ad 763 ×0,06 | A1 ×0,04
- 769 Bombilla Autolimpiante Inox — GRJ4 ×1* | Pliego Ad 769 ×0,06 | A1 ×0,04

### IJUPA (11)
- 031 Filtro De Café 10cm — A1B ×1* | A9 ×0,04 | IC3 ×0,01
- 034 Filtro De Café Gastro 14cm — L4B ×1* | A8 ×0,04 | IC3V ×0,01
- 066 Abrelatas Super Mariposa — Z12 ×1* | Z30 ×1 | Z41 ×1 | Z42 ×1 | W7P ×1 | W9P ×1 | PA7B ×1 | PA8B ×1 | V7 ×1 | D4B ×1 | A8 ×0,08
- 108 Pelapapas Mango Metálico — M7 ×1* | Z23A ×1 | H2C ×1 | D9 ×1 | A9 ×0,08
- 120 Filtro De Café — A1B1 ×1* | A9 ×0,04 | IC3 ×0,01
- 502 Abrelatas Mariposa Cromado — B9 ×1* | B11 ×1 | B13 ×1 | Z12 ×1 | W7P ×1 | W9P ×1 | PA12 ×1 | PA8A ×1 | V7 ×1 | D3A ×1 | A8 ×0,08
- 512 Abrelatas Mariposa Capuchón Rojo — B11 ×1* | B13 ×1 | Z12 ×1 | Z29 ×1 | W7P ×1 | W9P ×1 | PA12 ×1 | PA8A ×1 | PA9 ×1 | V7 ×1 | D2B ×1 | A8 ×0,08
- 513 Pelador Mgo Metálico — Z23 ×1* | M5 ×1 | B1A ×1 | D9 ×1 | A9 ×0,08
- 713 Pelador Mgo Metálico — Z23 ×1* | M7 ×1 | P6A ×1 | D9 ×1 | A1 ×0,08
- 836 Filtro De Café 10cm — G8C ×1* | A9 ×0,04 | IC3 ×0,01
- 867 Filtro De Café Gastro Ø14cm — D5B ×1* | A8 ×0,04 | IC3V ×0,01

### Lucho (12)
- 059 Cuchillo de Untar Plástico x2 — PEP9 ×2* | CART059 ×1 | A9 ×0,08
- 099 Pelapapas Mgo Plástico Ergonómico — Z23A ×1* | PEP1 ×1 | Ñ4A ×1 | D9 ×1 | A1 ×0,08
- 123 Pelador Mgo Plástico — Z23A ×1* | PC1B ×1 | I42 ×1 | D9 ×1 | A11 ×0,08
- 186 Pelapapas Mgo Plástico Ergonómico — Z23A ×1* | PEP1 ×1 | D9 ×1 | CART186 ×1 | A1 ×0,08
- 505 Pelador Mgo Plástico — Z23 ×1* | PC1A ×1 | B3A ×1 | D9 ×1 | A11 ×0,08
- 518 Sacafuente Pizzero — E10 ×1* | PEP7 ×1 | W8 ×1 | G7B ×1 | A3 ×0,08
- 519 Cuchillo Untar Mgo Madera x2 — E7 ×2* | W5 ×2 | PEP5 ×2 | G3A ×1 | A9 ×0,08
- 546 Corta Queso Blandos Mango Loeke — C13 ×1* | PC10 ×1 | PA18 ×1 | CCC4 ×1 | A9 ×0,08
- 569 Pelanaranjas x1 Display — G5C ×1* | PV17 ×1 | A11 ×0,08
- 586 Pelapapas Mgo Ergonómico — Z23A ×1* | PEP3 ×1 | C5A ×1 | D9 ×1 | A9 ×0,08
- 587 Pelador Metálico Corte Láser — E2 ×1* | Z23B ×1 | PC10 ×1 | PA18 ×1 | C5B ×1 | A8 ×0,08
- 719 Cuchillo Untar Mgo Madera x2 — E7 ×2* | W5 ×2 | PEP5 ×2 | Ñ3A ×1 | A9 ×0,08

### Martin Cornejo (30)
- 043 Abrelatas Uña 3 En 1 — C3 ×1* | C10 ×1 | V9 ×2 | V13 ×2 | PA2 ×1 | Q4C ×1 | A8 ×0,08
- 097 Afila Cuchillos — E4 ×0,07* | K9 ×8 | V5 ×2 | PEP4 ×1 | T4A ×1 | A1 ×0,17
- 103 Abrelatas Uña Cromado — A8 ×1* | C10 ×1 | V9 ×1 | H1C ×1 | A11 ×0,08
- 104 Sacacorchos Mgo Ergonómico Nylon — D1 ×1* | V11 ×1 | PB8A ×1 | K5D ×1 | A9 ×0,08
- 114 Afila Cuchillos — E4 ×0,07* | K9 ×8 | V5 ×2 | PEP4 ×1 | H4C ×1 | A1 ×0,17
- 116 Corta Pizza Familiar — E12 ×1* | Z34 ×1 | LL1 ×1 | PC10 ×1 | PA18 ×1 | V12 ×1 | I2B ×1 | A8 ×0,08
- 312 Pala De Torta Acero Inox — PA18 ×1* | PA13 ×1 | Z22 ×1 | PA17 ×1 | F3A ×1 | A2 ×0,08
- 500 Abrelata Uña Pie Color — C1 ×1* | C10 ×1 | V9 ×1 | CART500 ×1 | A9 ×0,08
- 504 Afila Cuchillos — E4 ×0,07* | K9 ×8 | V5 ×2 | PEP4 ×1 | C3A ×1 | A1 ×0,17
- 506 Abrelatas Uña Rojo — A10 ×1* | C10 ×1 | V9 ×1 | CART506 ×1 | A11 ×0,08
- 508 Sacafuentes Articulado — Z1A ×1* | Z2A ×1 | PC12 ×1 | V6 ×1 | W8 ×1 | V18D ×1 | G2C ×1 | A8 ×0,17
- 511 Abrelatas Uña 3 En 1 — C4 ×1* | C10 ×1 | V9 ×2 | V13 ×2 | PA1 ×1 | G3B ×1 | A9 ×0,08
- 520 Sacacorcho Tipo Mozo Cromado — C15 ×1* | D4 ×1 | E15 ×1 | D1 ×1 | D14 ×1 | V2 ×1 | V1 ×1 | V3 ×1 | E2A ×1 | A11 ×0,08
- 521 Sacacorcho Combinado Cromado — C16 ×1* | D4 ×1 | D1 ×1 | D14 ×1 | V2 ×1 | V1 ×1 | E1A ×1 | A11 ×0,08
- 530 Sacacorcho Tipo Mozo Color — B4 ×1* | D4 ×1 | E15 ×1 | D1 ×1 | D14 ×1 | V2 ×1 | V1 ×1 | V3 ×1 | E3A ×1 | A11 ×0,08
- 531 Sacacorcho Combinado Color — B4 ×1* | C8 ×1 | D4 ×1 | D1 ×1 | D14 ×1 | V2 ×1 | V1 ×1 | V3 ×1 | E3B ×1 | A11 ×0,08
- 559 Corta Ravioles c/Mango Loeke — E12 ×1* | LL1 ×1 | LL2 ×1 | PC10 ×1 | PA18 ×1 | V12 ×1 | F2A ×1 | A8 ×0,08
- 562 Corta Pizza 6cm Mgo Loeke — E12 ×1* | Z34 ×1 | LL1 ×1 | PC10 ×1 | PA18 ×1 | V12 ×1 | F4A ×1 | A9 ×0,08
- 564 Corta Pizza 8cm Mgo Madera — E9 ×1* | Z35 ×1 | LL1 ×1 | PEP8 ×1 | V12 ×1 | F4B ×1 | A3 ×0,08
- 581 Sacacorcho Mango Ergonómico — D1 ×1* | V11 ×1 | CCE2B ×1 | PB8A ×1 | A9 ×0,08
- 706 Abrelatas Uña — A8 ×1* | C10 ×1 | V9 ×1 | Ñ3C ×1 | A1 ×0,08
- 708 Sacafuentes Articulado — Z1A ×1* | Z3A ×1 | PC12 ×1 | V6 ×1 | W8 ×1 | V18D ×1 | N4A ×1 | A8 ×0,17
- 730 Sacacorcho Tipo Mozo Color — B7 ×1* | D4 ×1 | E15 ×1 | D1 ×1 | D14 ×1 | V2 ×1 | V1 ×1 | V3 ×1 | O4A ×1 | A8 ×0,08
- 731 Sacacorcho Combinado Color — B7 ×1* | C8 ×1 | D4 ×1 | PC8 ×1 | D14 ×1 | V2 ×1 | V1 ×1 | V3 ×1 | T3B ×1 | A8 ×0,08
- 735 Sacacorcho Cabo Ergonómico — D1 ×1* | V11 ×1 | PB8A ×1 | T3A ×1 | A9 ×0,08
- 856 Pala De Torta Ac. Inox. — PA19 ×1* | PB6 ×1 | Z22 ×1 | O3D ×1 | A5 ×0,04
- 857 Cuchillo De Torta Ac. Inox — PA19 ×1* | PB6 ×1 | Z21 ×1 | O3B ×1 | A5 ×0,04
- 859 Corta Ravioles c/Mango Loeke — E12 ×1* | LL1 ×1 | LL2 ×1 | PA19 ×1 | PC7 ×1 | V12 ×1 | N2A ×1 | A3 ×0,08
- 862 Corta Pizza Familiar — E12 ×1* | Z34 ×1 | LL1 ×1 | PA19 ×1 | PC7 ×1 | V12 ×1 | N1A ×1 | A9 ×0,08
- 863 Corta Pizza Gastro Mgo Chef Ø8cm — E9 ×1* | Z35 ×1 | LL1 ×1 | PEP8 ×1 | PA19 ×1 | PB6 ×1 | V12 ×1 | S1A ×1 | PC6 ×1 | A8 ×0,08

### Pettofrezza Rafael (17)
- 053 Pinza Fiambre Inox Cachas Plást. 23cm — F9 ×1* | F10 ×1 | PC8 ×2 | C9 ×1 | O3A ×1 | A2 ×0,08
- 054 Pinza Ensalada Inox Cachas Plást. 23cm — F11 ×2* | PC8 ×2 | C9 ×1 | N3A ×1 | A2 ×0,08
- 055 Pinza Fideos Inox Cachas Plást. 25cm — F13 ×1* | F14 ×1 | PC8 ×2 | C9 ×1 | Q2C ×1 | A2 ×0,08
- 101 Abrelatas A Manija — W6 ×2* | C6 ×1 | Z40 ×1 | Z43 ×1 | W1P ×1 | W2P ×1 | W3P ×1 | W4 ×1 | PA7B ×1 | PB5 ×1 | V7 ×1 | H1A ×1 | A9 ×0,17
- 315 Pisa Papas Acero Inox — M1 ×1* | PC11 ×1 | PA10 ×1 | F3B ×1 | A2 ×0,08
- 355 Pisa Papas Nylon con Mgo — PC11 ×1* | PA10 ×1 | PV1 ×1 | F3C ×1 | A6 ×0,04
- 501 Abrelatas A Manija — W6 ×2* | A4 ×1 | B13 ×1 | C6 ×1 | W1P ×1 | W2P ×1 | W3P ×1 | W4 ×1 | PC14 ×1 | PA12 ×1 | V7 ×1 | D2A ×1 | A9 ×0,17
- 523 Sacacorcho Doble Aleta — D2 ×1* | D3 ×1 | V8 ×2 | PC15A ×1 | E4A ×1 | A8 ×0,08 | IE13 ×0,06
- 551 Cuchillo De Untar Mgo Plást x2 — E8 ×2* | PA4 ×2 | L4A ×1 | A9 ×0,08
- 594 Pinza Fideos Mgo Plástico 25cm — F13 ×1* | F14 ×1 | PC8 ×2 | C9 ×1 | G4A ×1 | A2 ×0,08
- 595 Pinza Fiambre Mgo Plástico 23cm — F9 ×1* | F10 ×1 | PC8 ×2 | C9 ×1 | G4B ×1 | A2 ×0,08
- 596 Pinza Ensalada Mgo Plástico 23cm — F11 ×2* | PC8 ×2 | C9 ×1 | G4C ×1 | A2 ×0,08
- 609 Pisa Papas Ac. Inox. — M1 ×1* | PA19 ×1 | Q5D ×1 | PEST2 ×1 | A2 ×0,08
- 701 Abrelatas A Manija — W6 ×2* | A7 ×1 | B13 ×1 | C6 ×1 | W1P ×1 | W2P ×1 | W3P ×1 | W4 ×1 | PC13 ×1 | PA7A ×1 | V7 ×1 | N7A ×1 | A3 ×0,17
- 723 Sacacorcho Doble Aleta Nylon Reforzado — D2 ×1* | D3 ×1 | V8 ×2 | PC15B ×1 | Ñ1A ×1 | A3 ×0,08 | IE13 ×0,06
- 789 Pisa Papas Nylon Con Mgo — PC11 ×1* | PV1 ×1 | R3A ×1 | PEST2 ×1 | A6 ×0,04
- 878 Cuchillo De Untar Mgo Plást. x2 — E8 ×2* | PA5 ×2 | P3B ×1 | A1 ×0,04

## 3. Cervantes — partes armadas / semi-elaborados (9 casos)

Lo que vuelve a un sector (no terminados). `consumo_tall` desde la ubicación del tallerista.

| Tallerista | Devuelve | Sector | Se le descuenta |
|---|---|---|---|
| Alex Escalante | GRJ10 | Garage | IE4 ×3 · IE5 ×1 · LL7B ×1 · LLF8 ×1 |
| Alex Escalante | GRJ10A | Garage | ABPM ×1 · EP10 ×1 · IE4 ×3 · IE5 ×1 |
| Alex Escalante | C12B | Bombilla | BOM10 ×1 · IE1 ×1 · W1B ×1 |
| Martin Cornejo | GRJ5 | Garage | BOM12 ×1 · BOM8 ×1 |
| Martin Cornejo | GRJ6 | Garage | BOM12 ×1 · BOM8 ×1 |
| Martin Cornejo | X4 | Crudo | X1 ×1 (transformación 1:1) |
| IJUPA | M6 | Crudo | M10 ×1 (transformación 1:1) |
| IJUPA | M8 | Crudo | M9 ×1 (transformación 1:1) |
| Lucho | J1 | Crudo | F7 ×1 (transformación 1:1) |

Los GRJ que consumen los artículos de la sección 2 (GRJ4, GRJ12, GRJ13, GRJ14, GRJ17…GRJ29) NO figuran acá: se descuentan directamente en la entrega del terminado en Virgilio, sin pasar por una entrega de parte en Cervantes.

## 4. Lo que hay que mirar antes de confiar en esto en producción

1. **`GP2.movimiento` está en 0 filas y las 1.324 filas de `inventario` están todas en cantidad 0.** Este despiece es lo que la configuración VA a descontar, no lo que descontó.
2. **402 de los 404 pares (tallerista, componente a descontar) no tienen fila de inventario en la ubicación del tallerista** (la única excepción es Carlos Aguirre, 15 de 17). Al primer registro real, esos descuentos arrancan de la nada: cajas, cartones y pliegos incluidos.
3. **La pantalla de Virgilio está apagada** (candado en `GP2_MODULOS.html` desde el 18/09), así que hoy la puerta de la sección 2 no se usa desde el menú.
4. **Bug latente ya comentado en `gp2-motor.js:313-318`**: en la cascada del BOM, la línea principal sólo multiplica por su cantidad si `q > 0` — con un BOM de `q` fraccionario (una entrada que rinde dos salidas, q = 0,5) el consumo de esa entrada saldría al doble. Hoy no muerde porque el único caso ≠ 1 es GRJ10/GRJ10A → IE4 ×3.
