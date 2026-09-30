# Stock General vs "Enviar" de la tablet — pieza por pieza (2026-09-30)

Pregunta del usuario: *"en stock prov de servicio guazzaroni me aparecen estos componentes. Si voy a enviar a
guazzaroni, me aparecen estos mismos? Hay de más? Hay de menos? Así con todos"*.

**Cómo se midió** [dato, en vivo]:
- Tablet: `tablet_bundle().enviar`, filtrado por contraparte igual que `piezasDe()`. Son las contrapartes que se
  muestran en Enviar (`n_env > 0`, sin virgilio ni prov. de insumos).
- Stock General: el `inventario` de la ubicación de la contraparte con los mismos filtros de la pantalla. En P.S. se
  ocultan los consumibles (fleje, plástico, remache, cartón, caja, bolsas) que tienen 0; el tallerista inactivo con 0
  también se oculta. Para prov. AT se usa `stock_general_extra_bundle().prov_at`.
- Todas las filas que difieren tienen **stock 0**. Hoy no hay plata ni unidades mal paradas: el problema es lo que
  se ve en pantalla.

## Resumen por contraparte (de mayor a menor diferencia)

"De menos": la tablet la manda y Stock General no la muestra. "De más": Stock General la muestra y la tablet no
la manda.

| Contraparte | Tablet | Stock Gral | En los 2 | De menos | De más |
|---|--:|--:|--:|--:|--:|
| Alex Escalante (tall.) | 48 | 26 | 24 | 24 | 2 |
| Pedernera + Carlos Aguirre (misma ubicación 18) | 44 | 40 | 33 | 11 | 7 |
| Blist-Pack SA (tall. O.C.) | 18 | 0 | 0 | 18 | 0 |
| Guazzaroni Patricio (P.S.) | 25 | 10 | 10 | 15 | 0 |
| AJ Adhesivos (P.S.) | 10 | 0 | 0 | 10 | 0 |
| Martin Cornejo (tall.) | 92 | 90 | 86 | 6 | 4 |
| Pettofrezza Rafael (tall.) | 66 | 62 | 59 | 7 | 3 |
| Cavallero German (tall.) | 7 | 12 | 5 | 2 | 7 |
| Lucho (tall.) | 38 | 36 | 33 | 5 | 3 |
| Hernandez Julio (P.S.) | 11 | 4 | 4 | 7 | 0 |
| Danica Garcia (tall.) | 28 | 23 | 22 | 6 | 1 |
| Pat Bet Plast (inyector) | 6 | 0 | 0 | 6 | 0 |
| IJUPA (tall.) | 39 | 42 | 39 | 0 | 3 |
| Esther (P.S.) | 2 | 0 | 0 | 2 | 0 |
| JL Matriceria (inyector) | 1 | 0 | 0 | 1 | 0 |
| **Total** | | | | **120** | **30** |

**Coinciden exacto (11):** Jade 13, Laboratorio FAAT 10, Mabra 1, Maspoli SRL 1, Scorrano 1 · Pettofrezza como
inyector 5 · prov. AT Carriero 3, Lopez Jose 6, Maspoli 5, Pintos 16, The Plast 4.

**Aparte:** Fábrica muestra 30 piezas en Stock General y ninguna en la tablet. Es a propósito: el armado en
fábrica se modela más adelante.

## Por qué difieren

- **De menos, 102 piezas: no tienen fila en `inventario`.** La fila recién se crea con el primer envío, así que
  una pieza que nunca se mandó no aparece en Stock General.
- **De menos, 18 piezas: la fila existe, pero Stock General oculta en P.S. los consumibles en 0.** Son los pliegos
  de AJ, las cajas y cartones de Pedernera/Carlos, los CV de Guazzaroni y el PC2 de Esther. Pero a esos P.S. se les
  mandan justamente consumibles.
- **De más, 27 piezas: filas viejas de piezas que ya no se le mandan** (cambió la ruta), todas en 0.
- **De más, 3 piezas: son lo que el tercero devuelve** (C12 en Pedernera, C12B en Alex, 706 en Martin), no lo que
  se le manda.
- **Inyectores:** Stock General no tiene botón. Lo suyo solo aparece en "Todos los rubros".
- **Carlos Aguirre:** comparte la ubicación 18 con Pedernera, que es de tipo P.S. Su stock sale en "Prov.
  Servicio" con el nombre de Pedernera, nunca en Talleristas.

## Detalle de piezas

**Guazzaroni** — de menos 15:
- ocultas (remache en 0): CV1, CV11, CV12, W1B
- sin fila: CV13, CV18D, CV2, CV3, CV4, CV5, CV6, CV7, CV8, CV9, PCP3

**Alex Escalante**
- de menos 24, sin fila: A1A, A2, A4, A5, A6, A7B, A9B, F6B, G1A, GRJ13, GRJ14, IVBCM, IVBLM, K1A, PA17, PA18,
  PB2, PB8B, PV8, Q3D, Q4A, Q4B, S3C, Z31
- de más 2: C1 (ya no se le manda), C12B (lo que devuelve)

**Pedernera + Carlos Aguirre**
- de menos 11: A11, A2, A5, A8, C1A, G3C, G7A, I2A, O5A, P4A (ocultas, caja/cartón en 0); G8 (sin fila)
- de más 7: A15, C10, GRJ13, LL7B, LLF8, Z31 (ya no se le mandan); C12 (lo que devuelve)

**Blist-Pack SA** — de menos 18, sin fila: A1, A8, GRJ18, GRJ19, GRJ28, GRJ4, GRJ5, GRJ6, Pliego Ad 557 / 558 /
654 / 658 / 659 / 758 / 759 / 762 / 763 / 769

**AJ Adhesivos** — de menos 10:
- ocultas: Pliego 557, 558, 654
- sin fila: Pliego 658, 659, 758, 759, 762, 763, 769

**Martin Cornejo**
- de menos 6: A2, CCE2B, K5D, O3B, PB6, Z21
- de más 4: A15, D13, PC8 (ya no se le mandan); 706 (lo que devuelve)

**Pettofrezza Rafael (tallerista)**
- de menos 7: A1, A6, F3C, I3C, PA10B, PV1, R3A
- de más 3: A4, O2B, PB8B

**Cavallero German**
- de menos 2: PEST2, R3A
- de más 7: A3, F3B, I3C, PA10B, PA19, PB8B, Q5D

**Lucho**
- de menos 5: A3, CART059, G5C, PEP9, PV17
- de más 3: A6, D13, PCP3

**Hernandez Julio** — de menos 7, sin fila: PA10B, PA13B, PA18B, PA4B, PA5B, PC15AB, PEP2

**Danica Garcia**
- de menos 6: CART590, CART890, I42, PC1B, PINCEL590, Z23A
- de más 1: PCP3

**Pat Bet Plast** — de menos 6: 2405, 2435, 2455, 2475, 2505, SANTO

**IJUPA** — de más 3: GRJ21A, GRJ21B, PCP3

**Esther** — de menos 2: PC2 (oculta), PC3B (sin fila)

**JL Matriceria** — de menos 1: 2405
