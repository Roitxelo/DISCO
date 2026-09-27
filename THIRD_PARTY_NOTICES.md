# Avisos de terceros

DISCO utiliza software sujeto a sus propias licencias.

Entre las dependencias principales están:

- **Electron** — MIT.
- **React / React DOM** — MIT.
- **Meyda** — MIT.
- **electron-vite / Vite** — MIT.
- **electron-builder** — MIT.
- **yt-dlp** — Unlicense. DISCO lo descarga desde sus releases oficiales y verifica el SHA-256 publicado.
- **FFmpeg** — software externo descargado bajo demanda; conserva su propia licencia.

## FFmpeg

DISCO no redistribuye FFmpeg dentro de su instalador.

Cuando una función lo necesita, la aplicación descarga directamente desde la release upstream `b6.1.1` un binario específico para la plataforma y verifica su SHA-256 antes de usarlo.

FFmpeg sigue sujeto a sus propios términos de licencia. La procedencia y hashes utilizados por DISCO están documentados en `src/main/services/ffmpeg.ts`.

## Dependencias transitivas

El listado completo y las versiones exactas están fijados en `package-lock.json`.

Cada dependencia conserva sus propios términos de licencia. Este archivo resume las piezas más relevantes del producto, no sustituye los textos de licencia que correspondan a cada componente.
