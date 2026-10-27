# Evaluación del análisis de tallos

Compara `python/analizar_tallo.py` contra el método original de Natalia (`docs/lesiones3.py`: CLAHE + Otsu sobre L\*) usando sus imágenes de referencia.

## Uso

Desde la carpeta `python/`, con el entorno virtual del proyecto:

```bash
.venv/Scripts/python evaluacion/evaluar.py "<carpeta con 1.png … 50.png y 0 escala.png … 5 escala.png>"
```

Con máscaras marcadas a mano (`<nombre>_tallo.png` y `<nombre>_lesion.png`, blanco = zona) se mide además el error real:

```bash
.venv/Scripts/python evaluacion/evaluar.py "<imagenes>" --referencia "<mascaras>"
```

Salidas en `evaluacion/resultados/` (ignorada por git, contiene las fotos):

- `comparacion.csv`: % del CSV de Natalia, de su método, del nuevo, nivel y referencia.
- `hoja_*.jpg`: por imagen, el método de Natalia a la izquierda y el nuevo a la derecha (lesión en rojo, contorno en verde).

> Las fotos son de Natalia: **no se suben al repositorio**. Están en el Drive del equipo.

## Archivos

- `evaluar.py`: script de evaluación.
- `resumen_natalia.csv`: resultados de su método (`docs/lesiones3.py`) sobre las 56 imágenes. La réplica de `evaluar.py` reproduce estos porcentajes.

## Resultados (25 de octubre de 2026, sin referencia manual todavía)

|                                                                | Método de Natalia (Otsu) | Nuevo         |
| -------------------------------------------------------------- | ------------------------ | ------------- |
| Imágenes analizadas                                            | 56 / 56                  | 56 / 56       |
| Imagen sana de la escala (`0 escala`)                          | 14.86 %                  | **0.05 %**    |
| Tallos casi sanos con lesión diminuta (21, 25, 27, 31, 33, 47) | 7 – 15 %                 | **0 – 1.3 %** |
| Nivel correcto en las 6 imágenes de la escala                  | 2 / 6                    | **4 / 6**     |
| Tiempo por imagen                                              | —                        | ~0.05 s       |

Pendiente para medir el error real:

1. Marcar a mano tallo y lesión en al menos 30 imágenes, con el criterio de Natalia.
2. Confirmar con ella los cortes entre niveles (`config/escala.php`) y si la corteza y los extremos cortados cuentan como daño. Hoy el método nuevo los cuenta cuando son oscuros o rojizos, lo que infla imágenes como la 2, la 23 o `3 escala`.
