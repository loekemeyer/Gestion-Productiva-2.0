# PENDIENTE — Cirugía: inyectores como Proveedor de Servicio

**Objetivo (usuario 2026-09-14):** que Kollplast, Pat Bet Plast y Pettofrezza aparezcan **dentro
de "Prov. de servicio"** (Tablet y modelo GP2). Modelo: mandamos la **resina (bolsa, sector 14)** →
el inyector inyecta → vuelve la **pieza plástica (sector 6)**. Eso convierte a cada pieza de
*comprada* a *inyectada* y **cambia el costeo**.

**Este archivo es el GATE 1: el mapeo pieza → resina. NADA se escribe en la base hasta que el
usuario confirme esta tabla.** La regla de la casa es no inventar el dato.

## De dónde sale cada dato
- **kg por pieza:** `componente.kg_x_uni` (ya está).
- **resina (Tipo Plast) por pieza:** `planilla_fila` hoja *Plasticos*, pero **por descripción
  genérica, no por código** → el match es interpretativo. Cruzado por descripción + peso.
- **precio de la resina:** `v_material_precio_proveedor` (las 8 resinas base + master bach).

## Confianza
- **[Seguro]** descripción y peso coinciden con una fila única de la planilla.
- **[Probable]** calza por descripción o peso, con algún vecino cercano.
- **[?]** ambiguo o sin fuente clara → **lo tenés que decir vos**.

## Resinas base disponibles (sector 14)
PP 2630 · ABS GP 22 · PS HF 555 · PE Baja 7147 · Alto Impacto AI 4600 · Nylon Virgen ·
Nylon Recuperado · Nylon c/Carga 25% (+ Master Bach B/N/R/A por color).
**No existen como resina en GP2:** Santoprene y Goma Eva (aparecen en la planilla pero no hay
componente sector 14) → hay que crearlos o decidir con qué resina van.

## Mapeo propuesto (48 piezas; PEP5 "Mango Madera" queda AFUERA: es madera, no plástico)

| Código | Descripción | Inyector | g | Resina propuesta | Conf. |
|---|---|---|--:|---|---|
| PA19 | Mangos Chef | Pat Bet | 13,70 | PP | [Seguro] |
| PB8A | Mgo Sacac Plast | Pat Bet | 16,43 | PP | [Seguro] |
| PC2 | Mgo Pelapapa 505 | Pettofrezza | 5,40 | PP | [Seguro] |
| PC3B | Mgo Pelapapa 123 | Pettofrezza | 5,40 | PP | [Seguro] |
| PA9 | Capuchon Mariposa 512 | Pat Bet | 3,50 | PE | [Seguro] |
| PA12 | Pirolo Rojo | Pat Bet | 0,56 | PE | [Seguro] |
| PA7A | Pirolo Blanco | Pat Bet | 0,56 | PE | [Seguro] |
| PA7B | Pirolo Negro | Pat Bet | 0,58 | PE | [Seguro] |
| PC15AB | Cpo doble aleta LK | Pettofrezza | 21,60 | ABS | [Seguro] |
| PC15B | Cuerpo Sac Aleta Ch | Pettofrezza | 22,00 | ABS | [Seguro] |
| PV17 | Pela Naranjas | Pat Bet | 7,08 | ABS | [Seguro] |
| PC13 | Manguito Abrelat. Blanc | Pettofrezza | 9,00 | PS | [Seguro] |
| PC14 | Manguito Abrelat. Rojo | Pettofrezza | 9,00 | PS | [Seguro] |
| PV8 | Corta Torta | Pat Bet | 63,15 | Alto Impacto | [Seguro] (por desc; el peso miente) |
| PC10 | Mango LK Espatula | Pat Bet | 15,00 | PP | [Probable] |
| PC11 | Mangos ф 8 | Pat Bet | 15,00 | PP | [Probable] |
| PA17 | Mangos Cuch y P Torta | Pat Bet | 16,63 | PP | [Probable] |
| PEP1 | Mangos Pelador Negro | Pettofrezza | 16,50 | PP | [Probable] |
| PEP2 | Mango Pelador 586 | Pat Bet | 16,50 | PP | [Probable] |
| PA10B | Capuchon ф 8 | Pat Bet | 1,97 | ABS | [Probable] |
| PA13B | Capuchon Batidor LK | Pat Bet | 2,06 | ABS | [Probable] |
| PA1 | Plaquita 3 en 1 LK | Pat Bet | 2,00 | PE | [Probable] |
| PA2 | Plaquita 3-1 Blanca | Pat Bet | 2,00 | PE | [Probable] |
| PEST1 | Insertos Mango Madera | Kollplast | 6,60 | PP | [Probable] |
| PB5 | Manguito Abrelat. Negro | Pettofrezza | 3,77 | PS | [Probable] |
| PC8 | Cachas Azules | Pettofrezza | 23,00 | PP | [Probable] |
| PV8B | Corta Torta Chef | Pat Bet | 63,15 | Alto Impacto | [Probable] |
| PB2 | Cuchara Ny | Pettofrezza | 55,00 | Nylon c/Carga | [Probable] |
| PV2 | Cucharon Nylon | Pat Bet | 52,85 | Nylon Recuperado | [Probable] |
| PV3 | Espatula Lisa Nylon | Pat Bet | 48,50 | Nylon Recuperado | [Probable] |
| PV5 | Cuchara Fideos Nylon | Pat Bet | 50,45 | Nylon Recuperado | [Probable] |
| PV6 | Cuchara Calada Nylon | Pat Bet | 42,70 | Nylon Recuperado | [Probable] |
| PV7 | Espatula Calada Nylon | Pat Bet | 42,25 | Nylon Recuperado | [Probable] |
| PEP4 | Afila Caladas | Pettofrezza | 49,00 | Alto Impacto | [Probable] |
| PA18B | Capuchon Espatula LK | Pat Bet | 1,75 | ABS | [?] ¿ABS o PP? |
| PA8A | Buje Blanco | Pat Bet | 0,63 | Nylon Virgen | [?] planilla dice "Nylon natural" (no existe) |
| PA8B | Buje Negro | Pat Bet | 0,60 | Nylon Virgen | [?] idem |
| PC6 | Ojales Neg/Blanco | Pat Bet | 1,18 | ABS | [?] |
| PB6 | Inser. Neg. Espatula | Pat Bet | 5,00 | ? | [?] insertos sin fila clara |
| PB8B | Inser. Neg. Batidor Calado | Pat Bet | 3,72 | ? | [?] |
| PC7 | Inserto Neg. Canelones | Pat Bet | 5,00 | ? | [?] |
| PEST2 | Insertos Pisa Papas | Pat Bet | 3,82 | ? | [?] |
| PV14 | Picos Reposteros | Pat Bet | 1,10 | PP | [?] peso raro (planilla "4 picos" 4,25 g) |
| PV1 | Pisa Papa Nylon | Pat Bet | 17,15 | Nylon | [?] ¿recuperado o virgen? |
| PA4B | Mang Cuch Untar Rojo | Pettofrezza | 10,00 | ? | [?] "cuchillo untar", sin resina en planilla |
| PA5B | Mang Cuch Untar Chef | Pettofrezza | 10,00 | ? | [?] idem |
| PA3 | Muñeco Antiderrame | Pat Bet | s/kg | Santoprene | [?] resina no existe + sin kg |
| PC16 | Inserto Chef | Pat Bet | s/kg | ? | [?] sin resina y sin kg |

## Lo que necesito de vos (por impacto)
1. **Confirmar / corregir las 14 filas [?]** — sin la resina, la pieza no se puede costear como
   inyectada. Las peores: PA3 y PC16 (sin kg además), y los 4 insertos (PB6/PB8B/PC7/PEST2).
2. **Santoprene y Goma Eva:** ¿los creo como resina nueva (con qué precio) o van con otra?
3. **PA8A/PA8B ("Nylon natural"):** ¿Nylon Virgen sirve o es otra?

## Después del OK (gates 2 y 3, ya sin decisiones tuyas salvo el snapshot)
- **Gate 2 — diseño:** por cada pieza, ruta de inyección (entra resina+4% master bach → sale la
  pieza), inyector como `proveedor_servicio` (proceso "Inyección"), inventario de la resina en la
  ubicación del inyector. Te muestro el SQL exacto y el impacto de costeo (snapshot antes/después)
  antes de ejecutar.
- **Gate 3 — ejecución:** con backup y diff de costos, en bloque.
