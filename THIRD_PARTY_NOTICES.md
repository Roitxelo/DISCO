# Avisos de terceros

DISCO utiliza software sujeto a sus propias licencias.

Entre las dependencias principales están:

- **Electron** — MIT.
- **React / React DOM** — MIT.
- **Meyda** — MIT.
- **electron-vite / Vite** — MIT.
- **electron-builder** — MIT.
- **yt-dlp** — Unlicense. DISCO lo descarga desde sus releases oficiales y verifica el SHA-256 publicado.
- **FFmpeg / ffmpeg-static** — requiere atención especial.

## FFmpeg

La dependencia actual es `ffmpeg-static@5.3.0`.

El paquete `ffmpeg-static` declara licencia **GPL-3.0-or-later** y descarga binarios estáticos de FFmpeg. FFmpeg, por su parte, puede quedar bajo LGPL o GPL dependiendo de las opciones y componentes utilizados al compilar cada binario.

Por eso no conviene asumir que una mención en este archivo resuelve por sí sola las obligaciones de redistribución.

Antes de publicar instaladores de DISCO de forma abierta hay que verificar la build concreta que se incluye y decidir cómo cumplir su licencia o cambiar la estrategia de distribución.

La parte operativa está explicada en [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md).

## Dependencias transitivas

El listado completo y las versiones exactas están fijados en `package-lock.json`.

Cada dependencia conserva sus propios términos de licencia. Este archivo resume las piezas más relevantes del producto, no sustituye los textos de licencia que correspondan a cada componente.
