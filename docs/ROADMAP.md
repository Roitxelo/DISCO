# Hoja de ruta

## Estado actual

DISCO ya cubre el flujo completo desde un enlace de YouTube hasta un archivo preparado para trabajar:
consulta de metadatos, descarga, conversión, análisis musical, revisión de resultados, historial y reproducción local.

## Fase 0 — Base técnica

- [x] Proyecto Electron + React + TypeScript.
- [x] Configuración para Windows y macOS.
- [x] Aislamiento seguro entre interfaz y sistema operativo.
- [x] Gestión verificada de `yt-dlp` y FFmpeg.
- [ ] Añadir validación automática en GitHub Actions.
- [ ] Añadir pruebas unitarias para análisis, historial y rutas.

## Fase 1 — Descarga y conversión

- [x] Validar enlaces compatibles.
- [x] Consultar título, canal, miniatura y duración.
- [x] Elegir carpeta de destino.
- [x] Descargar el mejor audio disponible.
- [x] Convertir a WAV, MP3, FLAC o M4A.
- [ ] Mostrar progreso real de descarga y conversión.
- [ ] Permitir cancelar operaciones largas.
- [ ] Gestionar nombres duplicados y reintentos recuperables.

## Fase 2 — Análisis musical

- [x] Estimar BPM y proponer mitad o doble.
- [x] Estimar tonalidad mayor o menor.
- [x] Convertir la tonalidad a Camelot.
- [x] Confirmar resultados correctos.
- [x] Corregir resultados conservando el análisis automático original.
- [x] Crear un banco local de pruebas con los resultados revisados.
- [ ] Mostrar alternativas probables cuando la confianza sea baja.
- [ ] Recalibrar BPM, tónica y modo con el banco de pruebas.
- [x] Medir precisión por separado para BPM, tónica y mayor/menor.

## Fase 3 — Biblioteca local

- [x] Guardar historial persistente.
- [x] Mostrar metadatos y análisis musical.
- [x] Abrir la ubicación del archivo.
- [x] Reproducir WAV, MP3, FLAC y M4A de forma segura.
- [ ] Buscar por título, canal, BPM o tonalidad.
- [ ] Añadir favoritos y etiquetas.
- [ ] Detectar y volver a enlazar archivos movidos.
- [ ] Abrir o arrastrar audio hacia un DAW.

## Fase 4 — Sample

- [x] Dibujar la forma de onda del archivo seleccionado.
- [x] Marcar inicio y final de un fragmento.
- [x] Reproducir la selección en bucle.
- [x] Exportar el fragmento en WAV, MP3 o FLAC.
- [x] Aplicar fundidos cortos para evitar clics.
- [x] Nombrar el sample con título, BPM y tonalidad.
- [x] Ajustar la selección a 1, 2, 4 u 8 compases.
- [x] Añadir normalización opcional.

## Fase 5 — UX/UI

- [ ] Separar Descarga, Biblioteca y Sample en vistas claras.
- [ ] Rediseñar jerarquía, navegación y estados vacíos.
- [ ] Mostrar progreso y errores sin desplazar el contenido principal.
- [ ] Adaptar correctamente ventanas pequeñas y pantallas de alta densidad.
- [ ] Completar navegación por teclado, foco visible y accesibilidad.
- [ ] Añadir ajustes para carpeta predeterminada, formato y comportamiento.

## Fase 6 — Calidad y distribución

- [ ] Probar el flujo completo en Windows y macOS.
- [ ] Preparar instalador de Windows e imagen DMG para macOS.
- [ ] Revisar licencias de FFmpeg, `yt-dlp` y dependencias distribuidas.
- [ ] Añadir registro local de errores sin recopilar datos personales.
- [ ] Decidir firma de aplicaciones y actualizaciones automáticas.
- [ ] Preparar capturas, documentación y demostración para portfolio.

## Orden inmediato

1. Validar la corrección del reproductor WAV.
2. Implementar forma de onda y selección no destructiva.
3. Exportar el primer sample con fundidos.
4. Crear el banco de evaluación del análisis musical.
5. Recalibrar BPM y tonalidad con casos reales.
6. Rediseñar la interfaz alrededor de los flujos ya validados.
