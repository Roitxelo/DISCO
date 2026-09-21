# DISCO

**Download · Identify · Sample · Convert · Organize**

DISCO es una aplicación de escritorio para Windows y macOS orientada a productores musicales. Su objetivo es preparar audio autorizado para trabajar en un DAW y ofrecer análisis básicos como BPM, tonalidad y notación Camelot.

## Estado

Proyecto en fase inicial. La interfaz base está preparada; la descarga, conversión y análisis todavía no están implementados.

## Stack

- Electron
- React
- TypeScript
- Vite / electron-vite
- FFmpeg y yt-dlp (integración prevista)
- Essentia o motor equivalente (evaluación prevista)

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
