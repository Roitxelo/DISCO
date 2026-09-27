# Motor de análisis v3.2

La v3 nació porque el primer motor servía para orientar, pero se quedaba corto en demasiados casos reales.

El objetivo de esta versión no es fingir que BPM y tonalidad siempre tienen una respuesta perfecta. Prefiero que ordene bien los candidatos y que, cuando haya dudas, las enseñe.

## Cómo fue evolucionando

- **v3.0**: ataques multibanda, análisis por segmentos, familias métricas, cromas y corrección de afinación.
- **v3.1**: mejor cobertura de rejilla y desempate del nivel métrico y del modo.
- **v3.2**: confianza más conservadora y avisos cuando mayor/menor están demasiado cerca.

## Prueba local

Durante el desarrollo usé un conjunto de 18 canciones y beats revisados manualmente.

Para BPM se consideró correcto un resultado con un margen de ±1,6 BPM.

| Métrica | v2 | v3.2 |
|---|---:|---:|
| BPM principal | 10/18 · 55,6% | 13/18 · 72,2% |
| BPM contando alternativas | 15/18 · 83,3% | 17/18 · 94,4% |
| Tonalidad principal | 6/18 · 33,3% | 10/18 · 55,6% |
| Tonalidad contando alternativas | 10/18 · 55,6% | 17/18 · 94,4% |

Los números son útiles para comparar v2 y v3.2, pero no hay que leerlos como “precisión real del 94%”.

El conjunto es pequeño y parte de esas canciones se utilizaron mientras se ajustaba el motor, así que el siguiente paso serio es probar con material nuevo.

## Cómo leer el resultado

- El valor principal es el candidato que el motor considera más probable.
- Las alternativas importan, especialmente en mitad/doble tempo.
- **Revisión recomendada** aparece cuando la confianza es baja o hay candidatos muy próximos.
- En tonalidad, una duda entre mayor y menor puede ser completamente razonable según el tema.
- Las notas se guardan con sostenidos: `G#` equivale a `A♭`.
- Camelot se recalcula si cambias tónica o modo.

## Banco de análisis

Desde Ajustes se puede lanzar el banco comparativo.

Reprocesa canciones que ya tienen una referencia revisada y genera:

`analysis-v3-report.json`

El informe incluye:

- resumen;
- evaluación caso por caso;
- candidatos;
- diagnósticos internos.

No modifica la colección ni sobrescribe las correcciones del usuario.

## Limitaciones que siguen abiertas

### Mitad y doble tempo

En algunos temas hay más de una interpretación métrica razonable. También pueden aparecer relaciones como 3:2 o 4:3.

### Mayor y menor

Los modos paralelos comparten mucha información cromática. En algunos casos la armonía o el contexto musical pesan más que el perfil global de notas.

### Material complicado

Cambios de tonalidad, poca percusión, afinaciones no estándar, ruido o mezclas muy densas pueden hacer que el resultado sea menos estable.

## Próximo paso del motor

A partir de aquí no quiero seguir ajustando pesos contra las mismas 18 canciones.

La siguiente mejora debería medirse sobre un banco nuevo e independiente. Si no, sería demasiado fácil mejorar el test sin mejorar realmente DISCO.
