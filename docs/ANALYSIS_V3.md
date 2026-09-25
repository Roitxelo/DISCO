# Motor de análisis v3.2

## Objetivo

La v3 sustituye a v2 como analizador principal. Prioriza candidatos musicales útiles, ordena el pulso y la tonalidad más probables y comunica incertidumbre sin alterar correcciones humanas.

## Evolución

- **v3.0**: ataques multibanda, segmentos, familias métricas, cromas y afinación.
- **v3.1**: cobertura de rejilla y desempate de nivel métrico y modo.
- **v3.2**: confianza conservadora y aviso ante modos paralelos ambiguos.

## Validación local

Conjunto: 18 canciones y beats revisados; tolerancia BPM de ±1,6.

| Métrica | v2 | v3.2 |
|---|---:|---:|
| BPM principal | 10/18 · 55,6% | 13/18 · 72,2% |
| BPM con alternativas | 15/18 · 83,3% | 17/18 · 94,4% |
| Tonalidad principal | 6/18 · 33,3% | 10/18 · 55,6% |
| Tonalidad con alternativas | 10/18 · 55,6% | 17/18 · 94,4% |

La v3.2 conserva la selección de v3.1 y cambia la calibración de confianza. La mejora frente a v2 es clara, pero el conjunto es pequeño y parte se utilizó durante el desarrollo; no representa precisión universal.

## Interpretación

- El valor principal es la estimación más probable.
- Las alternativas son parte del resultado, sobre todo en mitad/doble tempo y modos paralelos.
- “Revisión recomendada” señala confianza baja o competencia mayor/menor.
- Las notas se almacenan con sostenidos: `G#` equivale a `A♭`.
- Camelot se recalcula al cambiar tónica o modo.

## Banco de análisis

En Ajustes, el banco reprocesa canciones revisadas y genera `analysis-v3-report.json` en los datos privados. Incluye resumen, evaluación por caso y diagnósticos. No sobrescribe historial ni correcciones.

## Limitaciones

- El nivel métrico puede ser ambiguo entre mitad, doble, 3:2 o 4:3.
- Mayor y menor paralelos comparten gran parte del contenido cromático.
- Cambios de tonalidad, ruido, afinación no estándar o poca percusión reducen estabilidad.
- Las siguientes mejoras necesitan canciones nuevas no utilizadas para ajustar pesos.
