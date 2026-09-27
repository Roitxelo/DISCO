# Arquitectura de DISCO

DISCO está montado con Electron, React y TypeScript. La separación entre procesos intenta ser bastante simple: la interfaz no toca directamente el sistema y todo lo que necesita permisos pasa por preload/main.

## Capas

- **Renderer (`src/renderer`)**: interfaz React.
- **Preload (`src/preload`)**: expone a la interfaz solo las funciones IPC que necesita mediante `window.disco`.
- **Main (`src/main`)**: ventanas, diálogos, archivos, historial y coordinación general.
- **Servicios (`src/main/services`)**: descarga, conversión, análisis, forma de onda, samples e historial.
- **Tipos (`src/shared`)**: contratos que comparten renderer, preload y main.

La ventana usa `contextIsolation`, sandbox y `nodeIntegration: false`.

Cuando DISCO llama a procesos externos, pasa argumentos separados. No construye comandos de shell concatenando datos introducidos por el usuario.

## Flujo de audio

### Cuando descargas

1. La interfaz pide los metadatos.
2. Main valida el enlace y coordina yt-dlp.
3. FFmpeg convierte al formato elegido.
4. El motor v3.2 analiza el archivo.
5. El resultado entra en la colección pendiente de revisión.

### Cuando importas un archivo local

Se abre un diálogo nativo y puedes escoger varios archivos.

Cada uno se procesa de forma independiente. Si uno falla, no se cancela todo el lote.

DISCO guarda la ruta del archivo original; no crea una copia solo por importarlo.

Formatos soportados actualmente:

- WAV
- MP3
- FLAC
- M4A

## Herramientas externas

### yt-dlp

No hace falta instalarlo manualmente.

DISCO descarga el binario oficial para el sistema, comprueba su SHA-256 y lo guarda dentro de los datos de usuario de la aplicación.

### FFmpeg

Se incluye mediante `ffmpeg-static`.

En la versión empaquetada se saca del ASAR porque necesita existir como ejecutable real en disco.

### Meyda

Se usa para obtener características espectrales que después alimentan parte del análisis.

## Motor de análisis

El audio se decodifica en mono a 22.050 Hz.

La v3.2 combina varias señales en lugar de depender de una única medición: ataques multibanda, autocorrelación, estabilidad temporal, familias métricas, cromas por segmentos, afinación, perfiles tonales y evidencia armónica.

El motor devuelve un candidato principal y alternativas. Los diagnósticos más detallados se guardan para comparación y desarrollo, no para llenar la interfaz de números.

Hay más detalle en [ANALYSIS_V3.md](ANALYSIS_V3.md).

## Persistencia

El historial vive en `app.getPath('userData')`.

Al guardar, DISCO intenta evitar que un cierre inesperado deje el historial a medias:

1. escribe un archivo temporal;
2. conserva una copia del historial anterior;
3. reemplaza el archivo final mediante renombrado.

Las preferencias también se guardan localmente.

No hay servidor, cuenta, sincronización ni telemetría.

## Distribución

Versión actual: `0.1.0-beta.1`.

- Windows: NSIS x64.
- macOS: DMG Intel x64.
- GitHub Actions valida Linux, Windows y macOS.
- Los tags `v*` generan los instaladores de la release.
- La beta todavía no tiene firma de código ni actualizaciones automáticas.
