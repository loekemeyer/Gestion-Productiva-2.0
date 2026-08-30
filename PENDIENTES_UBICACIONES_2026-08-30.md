# Pendientes de carga: ubicaciones y cajones por ubicacion

Contexto: los maximos de Sector Crudo y Sector Procesado en `GP2.inventario` estaban
cargados tomando `Max Caj Cerv` / `Max Cajon SP Cerv` como el total del sector. En
realidad ese numero es **cuantos cajones entran en UNA ubicacion fisica**.

Como la convencion de la fabrica es **nombrar solo la primera ubicacion**, un sector que
ocupa varias seguidas deja huecos en la numeracion. Las ubicaciones se deducen como
`(numero del proximo codigo de la misma letra) - (numero propio)`.

Ejemplo: `J2` = 5 cajones por ubicacion x 3 ubicaciones (J2, J3, J4, porque el siguiente
existente es J5) = **15 cajones** = 25.275 unidades. Hoy figura 8.427.

La correccion esta en `SQL_MAXIMOS_POR_UBICACIONES.sql` (sin aplicar todavia).

## 1. Ultimo de su serie: no hay codigo siguiente de donde sacar el hueco

La migracion los deja supuestos en **1 ubicacion** (`maximo_origen = 'ultimo_de_serie_supuesto_1'`).
Hay que decir cuantas ocupan realmente.

| Sector | Codigo | Descripcion | Caj x ubic | Ubicaciones |
|---|---|---|---|---|
| Crudo | D13B | Virola Sacafuente | 2 | ? |
| Crudo | G15 | Mariposita Abrelata p/Cromar | 5 | ? |
| Crudo | H16 | Super Mariposita p/Cromar | 3 | ? |
| Crudo | I16 | Cuchilla Abrelata Templada y Pulida | 5 | ? |
| Crudo | J15 | Cabezal doblado | 12 | ? |
| Crudo | K14 | Vastago Corta Pizza Gastr p/Cromar | 2 | ? |
| Crudo | L16 | Cuchufli p/Zincar | 2 | ? |
| Crudo | LL7B | Arandela Batidor Pera | 2 | ? |
| Crudo | M10 | Mgo Met Pelador s/Doblar C/Marca | 20 | ? |
| Crudo | N7 | Pinza Corta P/Cromar | 2 | ? |
| Crudo | W9 | Arandela Fina Mariposa p/Niquelar | 1 | ? |
| Crudo | X4 | Cuchilla Pelapapa Cerrada | (falta) | ? |
| Crudo | Z36 | Sacafuente Pizzero p/Cromar | 5 | ? |
| Procesado | A15 | Cpo Uña Crom. LK C/M | 10 | ? |
| Procesado | B13 | Varilla C/ Cuchilla Crom. | 25 | ? |
| Procesado | C16 | C Sacacorcho 521 Crom | 10 | ? |
| Procesado | D16B | Ahueca Papa Crom. | 1 | ? |
| Procesado | E15 | Cuchufli Zinc. | 5 | ? |
| Procesado | F14 | Puntera Fideos Der. Inox. | 2 | ? |
| Procesado | M7 | Mang. Pelador Ch Crom. | 10 | ? |
| Procesado | W9P | Arandela Fina Marip Niq. | 4 | ? |
| Procesado | Z45 | Destapador Pie Cromado | 1 | ? |

## 2. Codigo sin numero: no hay serie de donde deducir

Quedan supuestos en 1 ubicacion (`maximo_origen = 'codigo_sin_numero_supuesto_1'`).

| Sector | Codigo | Descripcion | Caj x ubic | Ubicaciones |
|---|---|---|---|---|
| Crudo | ABPM | Arandela Batidor Pera Mini | 1 | ? |
| Crudo | RULETA | Ruleta | (falta) | ? |

## 3. Sin cajones por ubicacion cargado

Sin este dato no se puede calcular el maximo: el sector queda en 0 y la Orden de
Produccion nunca lo va a pedir.

| Sector | Codigo | Descripcion | Caj x ubic |
|---|---|---|---|
| Crudo | J5 | Cuerpo Uña s/M p/Pintar | ? |
| Crudo | RULETA | Ruleta | ? |
| Crudo | X4 | Cuchilla Pelapapa Cerrada | ? |
| Procesado | Z12 | Alamb. Aluminio Ganch. | ? |
| Procesado | Z23A | Cuch China | ? |
| Procesado | Z23B | Cuchilla Laser | ? |

Se cargan en las tablas madre: `SC Kg."Max Caj Cerv"` y `SP Kg."Max Cajon SP Cerv"`.

## Impacto de la correccion (dry run 30/08/2026)

| Sector | Antes | Despues | Ocupan mas de 1 ubicacion |
|---|---|---|---|
| Crudo (75) | 405 cajones | 964 cajones | 29 |
| Procesado (83) | 540 cajones | 970 cajones | 28 |

**A confirmar**: la regla se verifico con J2, que es crudo. La migracion la aplica tambien
a procesado asumiendo que la convencion de nombrar solo la primera ubicacion es la misma.
Si en procesado no es asi, correr solo la parte de `sector_id = 1`.
