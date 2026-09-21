# DISCO

**Download · Identify · Sample · Convert · Organize**

DISCO es una aplicación de escritorio para Windows y macOS orientada a productores musicales. Su objetivo es preparar audio autorizado para trabajar en un DAW y ofrecer análisis básicos como BPM, tonalidad y notación Camelot.

## Estado

La aplicación reconoce enlaces de YouTube, muestra sus metadatos, exporta el audio en WAV, MP3, FLAC o M4A y estima BPM, tonalidad y notación Camelot.

## Stack

- Electron
- React
- TypeScript
- Vite / electron-vite
- yt-dlp oficial con descarga y verificación automática
- FFmpeg para conversión local
- Meyda y análisis DSP local para BPM y tonalidad

## Desarrollo

Requisitos: Node.js 22 o superior.

```bash
npm install
npm run dev
```

Comprobaciones:

```bash
npm run typecheck
npm run build
```

## Uso responsable

DISCO se plantea para contenido propio, autorizado, de dominio público o cuyo uso permita su licencia. Convertir audio comprimido a WAV no recupera la información perdida en la fuente original.

## Hoja de ruta

Consulta [docs/ROADMAP.md](docs/ROADMAP.md).
