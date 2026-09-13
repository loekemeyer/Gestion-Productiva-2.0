# Croquis de GP2 — cómo funciona hoy (2026-09-13)

> Versión para mirar en el celular (misma info, dibujada):
> https://claude.ai/code/artifact/0004f23b-587f-4d5e-b8c8-bf313836955b

Una frase: **GP2 es un libro de movimientos sobre un catálogo normalizado.** La app nunca calcula
stock; inserta filas en `GP2.movimiento` y los triggers (`fn_movimiento_calc` +
`fn_movimiento_aplicar`) actualizan `GP2.inventario`. Todo sale del schema `GP2` (Regla 0).

---

## 1 · El circuito físico: de la chapa al cliente

```mermaid
flowchart LR
  subgraph COMPRA[" "]
    OC["Orden de Compra<br/>OC_GP2"]
    REC["Recepción Insumos<br/>RecepcionInsumos_GP2"]
  end

  subgraph CASA["Cervantes (la fábrica)"]
    SEC["Sectores<br/>Crudo · Procesado · Fleje<br/>Plástico · Remache · Cartón · Caja"]
    MAT["Matrices<br/>Registro_GP2 / Operarios_GP2"]
  end

  subgraph TERCEROS["Los de afuera"]
    PS["Prov. de Servicio<br/>pintan, niquelan, afilan"]
    TALL["Talleristas<br/>arman"]
    PAT["Prov. Art. Terminado<br/>traen el producto hecho"]
    INY["Inyectores<br/>hacen las plásticas"]
  end

  VIR["VIRGILIO<br/>centro logístico"]
  GV["Gestión Virgilio<br/>(otro sistema, otro repo)"]

  OC -->|compra| REC --> SEC
  SEC -->|consumo_prod| MAT -->|fabricacion| SEC
  SEC -->|envio_ps| PS -->|entrega_ps| SEC
  SEC -->|envio_tallerista| TALL -->|entrega_tallerista| SEC
  TALL -->|devolucion_tallerista| SEC
  SEC -->|envio_inyector| INY -->|entrega| SEC
  SEC -->|envio_prov_at| PAT
  TALL -->|recepcion_virgilio| VIR
  PAT -->|recepcion_virgilio| VIR
  SEC -->|consumo_virgilio<br/>se descuenta la receta| VIR
  VIR -.->|espejo: virgilio_espejo_pend| GV
```

**Quién entrega qué no se declara en ninguna tabla suelta: lo dice la RUTA.** Cada artículo tiene
sus `ruta` / `ruta_paso` (tipos: `insumo`, `ingreso`, `matriz`, `proveedor_servicio`, `tallerista`,
`proveedor_at`, `virgilio`), y de ahí sale todo — a quién se le manda, qué devuelve, y quién lo
entrega en Virgilio (el último paso con contraparte antes del paso `virgilio`).

## 2 · El motor: una pantalla nunca toca el stock

```mermaid
flowchart LR
  P["Pantalla GP2<br/>(GP2_SB, schema GP2)"] -->|"rpc(...)"| R["RPC SECURITY DEFINER<br/>crear_envio_ps · crear_entrega_tallerista<br/>recepcion_virgilio · cargar_recepcion · registrar_movimientos"]
  R --> M[("GP2.movimiento<br/>el libro")]
  M -->|"trigger fn_movimiento_calc"| M
  M -->|"trigger fn_movimiento_aplicar"| I[("GP2.inventario<br/>cantidad por comp + ubicación")]
  I --> V["Lo que se ve<br/>StockSector · StockGeneral · ControlEnvios"]
```

Regla de la casa: **si un número de stock se calculó en el JS, está mal.** El JS arma el
movimiento; el stock lo decide la base.

## 3 · La cabeza: qué pedir y cuánto vale

```mermaid
flowchart LR
  EM["est_madre<br/>lo que se va a vender"] --> CONS["v_consumo_componente<br/>v_consumo_fleje_kg"]
  CONS --> MAX["inventario.maximo<br/>(o consumo × meses)"]
  MAX --> REP["v_reposicion<br/>sugerido = máximo − stock"]
  REP --> OC2["OC_GP2<br/>+ norma del rubro:<br/>múltiplos de cartón, pliegos de 100,<br/>bolsas, paquetes de Charcas"]
  PRE["precio_proveedor · precio_tallerista<br/>tarifa_servicio · costo_segundo_pesos"] --> COST["v_costo_componente<br/>costea por las ARISTAS DE RUTA"]
  COST --> VAL["Valorización_GP2<br/>Despiece_GP2"]
  I2[("inventario")] --> REP
  I2 --> VAL
```

Dos cosas que ya nos mordieron y conviene tener a mano:
- **La receta (`articulo_componente` / `componente_bom`) no costea; costea la ruta.** La receta
  decide qué se DESCUENTA al entregar; el costo sale de los pasos.
- **El sugerido llena el máximo** (máximo − stock), y recién después se aplica la norma del rubro.
  Primero el lugar, después el envase.

---

## 4 · Dónde entran los 4 que faltan

Son los últimos archivos que miran `public` (ver `MIGRACION_PUBLIC_GP2.md`). Ninguno está en el
menú y ninguno está en uso hoy. Puestos en el croquis, **cada uno tapa un agujero distinto**:

```mermaid
flowchart LR
  PS2["Prov. Servicio<br/>Tallerista"] -.->|"① PREAVISO<br/>lo que PROMETEN traer"| PUERTA["Puerta de Cervantes"]
  PUERTA -->|"③ mostrador único<br/>(ya lo hacen EntregaPS_GP2<br/>+ RecepcionInsumos_GP2)"| MOV[("movimiento<br/>entrega_ps · compra")]
  MOV -->|"② FACTURA<br/>¿lo facturado = lo entregado<br/>al precio pactado?"| PLATA["Control de plata<br/>precio_proveedor · tarifa_servicio"]
  EXT["App externa de remitos<br/>(Control-Carga-Remitos-FC)"] -.->|"④ feed"| TABLERO["Tablero de control<br/>no toca stock"]
```

| # | Módulo viejo | Dónde se engancha | Qué le falta a GP2 | Si no se hace |
|---|---|---|---|---|
| ① | **Preaviso de Entrega** | **antes** de `entrega_ps` / `entrega_tallerista` | una tabla `preaviso` (contraparte, componente, cantidad, fecha prometida) que después se concilie contra el movimiento real | no se sabe qué va a entrar mañana; el faltante se descubre cuando ya es tarde |
| ② | **Lectura de Facturas** | **después** de `entrega_ps`, del lado de la plata | una `factura` + sus ítems, cruzada contra los movimientos de entrega y contra `precio_proveedor` / `tarifa_servicio` | se paga contra el papel del proveedor, sin cruzar con lo que realmente entregó ni con el precio pactado |
| ③ | **Entrega Prov. Cervantes** | en la puerta, al recibir | **casi nada**: `crear_entrega_ps` y `crear_recepcion_insumo` ya existen y hacen exactamente eso. Lo único distinto de la vieja era ser **un mostrador único** para las dos cosas | nada grave: hoy se hace en dos pantallas (`EntregaPS_GP2` y `RecepcionInsumos_GP2`) |
| ④ | **Control Carga Remitos** | al costado, no toca stock | leer el feed de la app externa que ya existe | se sigue mirando en la página externa, como hoy |

**Orden que tiene sentido si algún día se hacen:** ① (avisa antes, evita el faltante),
② (es plata), ③ (comodidad, no capacidad), ④ (es un tablero ajeno).

---

*Archivos vivos relacionados: `GP2_MAPA.md` (contratos y nombres reales), `MIGRACION_PUBLIC_GP2.md`
(qué queda mirando `public`), `CONOCIMIENTO_GP2.md` (por qué cada cosa es como es).*
