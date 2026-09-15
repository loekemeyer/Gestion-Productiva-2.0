# PENDIENTE — Cirugía: inyectores como Proveedor de Servicio

**Objetivo (usuario 2026-09-14):** que Kollplast, Pat Bet Plast y Pettofrezza aparezcan **dentro
de "Prov. de servicio"**. Modelo: mandamos **resina (bolsa, sector 14)** → el inyector inyecta →
vuelve la **pieza (sector 6)**. Convierte la pieza de *comprada* a *inyectada* y **cambia el costeo**.

## GATE 1 — mapeo pieza → resina: RESUELTO con la planilla del usuario
Fuente: `db/Conteo_y_Pedido_Sector_Plastico_VACIO.xls`, hojas *Consumo x Parte* (col Material) y
*Consumo x Cod Articulo* (Material + MB color). **kg por pieza sale de `componente.kg_x_uni`** (ya
está); **material sale de esta planilla** — como pidió el usuario. Match por descripción.

**Correcciones a lo que yo había adivinado antes (rule 16 — retiradas):**
- **PV8/PV8B "Corta Torta" → Ny Recuperado** (yo había puesto Alto Impacto; la planilla dice Ny Rec).
- **PC6 "Ojales" → PP** (había puesto ABS).
- **PA9 "Capuchón Mariposa" → PE** (la planilla lo confirma).
- **PEST1/PEST2/PB6/PB8B/PC7 "Insertos" → PP** (estaban en [?], la planilla los cierra en PP).
- **PA8A/PA8B "Bujes" → PA6N (Nylon 6 natural = Nylon Virgen)**; **PA4B/PA5B → PP**; **PV1 → Ny Rec**;
  **PV14 → PP**; **PA18B → ABS**. Todos salían [?], la planilla los cierra.

### Material por pieza (48; PEP5 madera afuera)
| Material (resina GP2) | Piezas |
|---|---|
| PP 2630 | PEST1, PA17, PA19, PB6, PB8B, PC6, PC7, PEP1, PEP2, PEST2, PC10, PC11, PV14, PA4B, PA5B, PC2, PC3B, PC8 |
| ABS GP 22 | PA10B, PA13B, PA18B, PC15AB, PC15B, PV17 |
| PE Baja 7147 | PA1, PA2, PA9, PA12, PA7A, PA7B |
| PS HF 555 | PB5, PC13, PC14 |
| Nylon Virgen (PA6N) | PA8A, PA8B |
| Nylon Recuperado | PV1, PV2, PV3, PV5, PV6, PV7, PV8, PV8B |
| Nylon c/Carga 25% | PB2 |
| Alto Impacto AI 4600 | PEP4 |
| Santoprene *(no existe como resina GP2, hay que crearla)* | PA3 (kg 0,008 — la planilla también da el kg) |

### Quedan 2 (lo único abierto)
| Código | Pieza | Problema | Necesito |
|---|---|---|---|
| PB8A | Mgo Sacac Plast | la planilla dice **ABS** (22 g) pero el kg de GP2 es 16,4 g y por peso da **PP** — conflicto | ¿PP o ABS? |
| PC16 | Inserto Chef | sin kg en `componente` y sin fila clara en la planilla | ¿resina y kg?, o lo dejo afuera |

### Resina a crear
- **Santoprene** (para PA3): no existe como componente sector 14. ¿La creo? Necesito **precio $/kg**.
- **Goma Eva / EVA:** NO hace falta — ninguna de las 48 la usa.

## Después del OK (gate 2 — diseño, te muestro el SQL antes de tocar la base)
Por cada pieza: inyector como `proveedor_servicio` (proceso "Inyección"), ruta de inyección
(entra resina + 4 % master bach del color `mb_color` → sale la pieza), inventario de la resina en
la ubicación del inyector. Snapshot de costos antes/después. Ejecución en bloque con backup (gate 3).
