# Plan del motor de análisis v3

## Estado al cerrar la sesión

Banco de prueba real: 18 canciones revisadas manualmente con el motor v2.

| Métrica | Resultado principal | Cobertura con alternativas |
|---|---:|---:|
| BPM | 44% (8/18) | 89% con tolerancia estricta; 17/18 con tolerancia práctica de ±1,6 BPM |
| Tónica | 67% (12/18) | — |
| Mayor / menor | 78% (14/18) | — |
| Tonalidad completa | 67% (12/18) | 94% (17/18) |

Otros datos:

- 3 resultados BPM son errores exactos o casi exactos de mitad/doble tempo.
- Otros 6 errores BPM siguen relaciones rítmicas aproximadas 3:2 o 4:3.
- De los 10 errores principales de BPM, la alternativa correcta aparece 6 veces en primera posición, 1 en segunda, 2 en tercera y falta en 1 caso.
- De los 6 errores de tonalidad, la correcta aparece 2 veces como primera alternativa, 3 como segunda y falta en 1 caso.
- 15 de 18 análisis quedan marcados con confianza baja: la confianza v2 no está bien calibrada.

Conclusión: la generación de candidatos funciona mucho mejor que la elección del candidato principal. No se debe reducir el número de alternativas ni sustituir el motor completo antes de mejorar el ranking.

## Restricciones

- Conservar los resultados automáticos v2 y las correcciones humanas como línea base.
- No sobrescribir el banco de 18 revisiones al probar v3.
- No aplicar una preferencia rígida por 100–120 BPM: perjudicaría reggae lento, boom bap y canciones rápidas.
- No ajustar pesos solamente para estas 18 canciones. La muestra sirve para detectar patrones, no para memorizar resultados.
- El archivo `history.json` del usuario no se incorpora al repositorio porque contiene títulos y rutas locales.

## Implementación propuesta

### 1. Diagnóstico de candidatos

Guardar temporalmente para cada candidato:

- BPM o tonalidad.
- Puntuación bruta.
- Puntuación por segmentos.
- Relación armónica con otros candidatos.
- Evidencia de raíz, tercera y quinta para tonalidad.
- Motivo por el que fue elegido como resultado principal.

Estos datos pueden ser opcionales en `AudioAnalysis` y no necesitan mostrarse en la interfaz normal.

### 2. BPM v3

- Mejorar la envolvente de ataques para depender menos del cambio de energía RMS.
- Puntuar la estabilidad del tempo en varios segmentos de la canción.
- Agrupar candidatos relacionados por ×2, ÷2, ×1,5 y ×0,75.
- Elegir entre pulso, subdivisión y compás usando estabilidad y soporte armónico, no solo el pico máximo global.
- Mantener al menos tres alternativas razonables.

### 3. Tonalidad v3

- Normalizar cromas por segmento antes de agregarlos.
- Añadir votación entre segmentos además de la correlación global.
- Revisar el peso actual de raíz, tercera y quinta.
- Tratar explícitamente empates entre relativa mayor/menor y desplazamientos de cuarta/quinta.
- Conservar las tres mejores alternativas.

### 4. Confianza v3

- Separar la distancia entre candidatos de la estabilidad entre segmentos.
- Evitar que casi todos los casos terminen como confianza baja.
- Definir bandas interpretables: alta, media y baja.

### 5. Comparación segura

Crear una forma de volver a analizar los mismos archivos con v3 sin borrar:

- Resultado automático v2.
- Corrección humana considerada como referencia.
- Resultado automático v3.

La evaluación debe mostrar v2 y v3 por separado.

## Criterios para adoptar v3

Sobre las mismas 18 canciones:

- BPM principal: superar claramente el 44%; objetivo inicial mínimo 67% (12/18).
- Tonalidad completa: superar el 67%; objetivo inicial mínimo 72% (13/18).
- Cobertura de alternativas: no bajar del 89% BPM ni del 94% tonal.
- Reducir los errores mitad/doble sin introducir una preferencia de rango que dañe canciones lentas o rápidas.
- Mantener la corrección manual y el historial sin pérdidas.

Después de superar esta muestra, validar con canciones nuevas antes de sustituir v2 como motor principal.

## Próximo paso exacto

Empezar por instrumentar las puntuaciones internas del motor v2 y preparar el almacenamiento paralelo de una ejecución v3. No cambiar todavía el resultado mostrado al usuario. Después ejecutar v3 sobre las 18 canciones, comparar y ajustar el ranking con datos observables.
