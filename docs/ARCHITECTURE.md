# Arquitectura inicial

DISCO separa la interfaz de los procesos con acceso al sistema operativo.

- **Renderer:** React. No dispone de acceso directo a Node.js.
- **Preload:** API mínima, tipada y controlada.
- **Main:** ventanas, sistema de archivos y futuros procesos externos.
- **Workers futuros:** descarga, conversión y análisis fuera del hilo de interfaz.

El binario oficial de `yt-dlp` se obtiene desde sus publicaciones de GitHub durante el primer análisis, se verifica mediante SHA-256 y se guarda en el directorio privado de datos de la aplicación.

FFmpeg se distribuye como dependencia desempaquetada para que pueda ejecutarse tanto en Windows como en macOS. Antes de una distribución pública habrá que revisar la licencia del binario y decidir la política definitiva de empaquetado.

El análisis musical usa una señal mono temporal a 22.050 Hz. El BPM se estima mediante una envolvente de ataques y autocorrelación; la tonalidad se calcula a partir del perfil cromático y su correlación con perfiles mayor y menor. Los resultados se presentan siempre como estimaciones corregibles.

## Principios

1. `contextIsolation` y sandbox activados.
2. Ningún comando de shell se construirá concatenando datos del usuario.
3. Los binarios externos no se guardarán en Git.
4. Las tareas largas informarán de progreso y podrán cancelarse.
5. Los metadatos e historial permanecerán en el equipo del usuario.
