# Arquitectura de DISCO

## Capas

- **Renderer (`src/renderer`)**: interfaz React sin acceso directo a Node.js.
- **Preload (`src/preload`)**: contrato IPC mínimo y tipado mediante `window.disco`.
- **Main (`src/main`)**: ventanas, diálogos, archivos, historial y coordinación.
- **Servicios (`src/main/services`)**: descarga, conversión, análisis, forma de onda, samples e historial.
- **Tipos (`src/shared`)**: contratos compartidos por las tres capas.

La ventana mantiene `contextIsolation` y sandbox. Los procesos externos reciben listas de argumentos; no se construyen comandos de shell concatenando datos del usuario.

## Flujo de audio

### Descarga

1. El renderer solicita metadatos.
2. Main valida el enlace y coordina `yt-dlp`.
3. FFmpeg convierte al formato elegido.
4. El motor v3.2 analiza el archivo.
5. El resultado se guarda pendiente de revisión.

### Importación local

Un diálogo nativo admite selección múltiple. Cada archivo se valida y procesa de forma independiente, por lo que un error parcial no cancela el lote. DISCO guarda una referencia al original y no duplica el audio.

Formatos admitidos: WAV, MP3, FLAC y M4A.

## Herramientas externas

- `yt-dlp` se descarga desde publicaciones oficiales, se verifica con SHA-256 y se almacena en los datos privados.
- FFmpeg procede de `ffmpeg-static` y se desempaqueta del ASAR para permitir su ejecución.
- Meyda se usa para extraer características espectrales.

## Motor de análisis

El audio se decodifica a mono y 22.050 Hz. La v3.2 combina envolvente de ataques multibanda, autocorrelación, estabilidad temporal, familias métricas, cromas por segmentos, corrección de afinación, perfiles Krumhansl y Temperley, evidencia armónica y calibración conservadora de confianza.

El resultado contiene tres alternativas de BPM y tonalidad. Los diagnósticos internos permiten comparar candidatos sin mostrarlos en el flujo normal.

## Persistencia

El historial vive en `app.getPath('userData')`. Se escribe primero un temporal, se valida el historial previo, se conserva una copia de seguridad y finalmente se reemplaza mediante renombrado. Las preferencias también son locales. No existe servidor, cuenta, telemetría ni sincronización.

## Distribución

- Versión: `0.1.0-beta.1`.
- Windows: NSIS x64, instalación por usuario.
- macOS: DMG preparado, todavía sin firma ni notarización.
- GitHub Actions ejecuta `npm ci` y `npm run build`.
- La beta no incluye actualizaciones automáticas ni firma de código.
