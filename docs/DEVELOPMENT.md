# Desarrollo de DISCO

Este documento es el mapa rápido del proyecto. La idea es poder volver dentro de unos meses y recordar dónde está cada cosa sin tener que seguir imports durante media hora.

## Stack

DISCO es una app de escritorio hecha con:

- Electron;
- React;
- TypeScript;
- electron-vite;
- FFmpeg para conversión/procesado;
- yt-dlp para la descarga autorizada desde YouTube;
- Meyda y lógica propia para el análisis musical.

El entorno de desarrollo fijado es Node.js 22.

## Estructura del repo

```text
DISCO/
├─ .github/
│  ├─ ISSUE_TEMPLATE/       Formularios de bugs e ideas
│  ├─ workflows/            CI y creación de releases
│  └─ dependabot.yml        Avisos/PR de dependencias
├─ build/                   Iconos usados al empaquetar
├─ docs/                    Documentación del proyecto
│  └─ assets/               Imágenes del README/docs
├─ src/
│  ├─ main/
│  │  ├─ index.ts           Ventana, IPC y coordinación
│  │  └─ services/          Trabajo con audio, historial y yt-dlp
│  ├─ preload/
│  │  └─ index.ts           API mínima expuesta al renderer
│  ├─ renderer/
│  │  └─ src/               React, vistas y estilos
│  └─ shared/
│     └─ media.ts           Tipos/contratos compartidos
├─ electron.vite.config.ts
├─ package.json
└─ package-lock.json
```

## Las tres partes de Electron

### Main

`src/main/index.ts`

Es el proceso con permisos de sistema. Aquí se crean las ventanas, se abren diálogos, se registran los handlers IPC y se coordinan las operaciones que necesitan archivos o procesos externos.

Si una función necesita tocar el sistema de archivos, ejecutar FFmpeg o abrir un diálogo nativo, normalmente acaba pasando por aquí.

### Preload

`src/preload/index.ts`

Es la frontera entre la interfaz y Electron.

El renderer no recibe Node.js. Solo recibe `window.disco`, con las operaciones que hemos decidido exponer. Si añades un IPC nuevo, revisa main, preload y los tipos compartidos como una sola unidad.

### Renderer

`src/renderer/src/`

Es la aplicación React.

No debe importar `fs`, `child_process`, `electron` ni ninguna API de Node. Todo lo que necesite del sistema debe pedírselo a main a través de preload.

## Dónde tocar cada cosa

| Quiero cambiar... | Archivo principal |
| --- | --- |
| Descargas / yt-dlp | `src/main/services/ytDlp.ts` |
| Análisis BPM/tono | `src/main/services/audioAnalysisV3.ts` |
| Comparación v2/v3 | `src/main/services/analysisComparison.ts` |
| Importación local | `src/main/services/localImport.ts` |
| Historial / colección | `src/main/services/history.ts` |
| Forma de onda | `src/main/services/waveform.ts` |
| Exportación de samples | `src/main/services/sampleExport.ts` |
| IPC / diálogos | `src/main/index.ts` + `src/preload/index.ts` |
| Tipos compartidos | `src/shared/media.ts` |
| Interfaz general | `src/renderer/src/App.tsx` |
| Pantallas concretas | `src/renderer/src/views/` |
| Componentes reutilizables | `src/renderer/src/components/` |
| Estilos | `src/renderer/src/styles.css` |

## Flujo principal

### YouTube

```text
URL
 ↓
ytDlp.ts obtiene metadatos
 ↓
yt-dlp descarga + FFmpeg convierte
 ↓
audioAnalysisV3.ts analiza
 ↓
history.ts guarda la entrada
 ↓
React permite revisar / corregir
 ↓
Samplea / Colección / Organiza
```

### Archivo local

```text
Diálogo nativo
 ↓
localImport.ts valida formato
 ↓
FFmpeg obtiene duración
 ↓
audioAnalysisV3.ts analiza
 ↓
history.ts referencia el archivo original
```

DISCO no copia un archivo local solo por importarlo. Guarda la ruta del original.

## Datos locales

El historial y las preferencias no viven en el repositorio.

El historial se guarda bajo `app.getPath('userData')` y tiene una copia de seguridad local. Las rutas exactas dependen del sistema operativo.

La interfaz guarda algunas preferencias con `localStorage`.

Nada de esto debe añadirse a Git.

## yt-dlp y FFmpeg

### yt-dlp

No se incluye en el instalador.

En el primer uso que lo necesita, DISCO consulta la release oficial de yt-dlp en GitHub, descarga el binario de la plataforma y comprueba el SHA-256 publicado por GitHub antes de instalarlo en los datos locales de la app.

### FFmpeg

Actualmente llega mediante `ffmpeg-static` y se empaqueta con la aplicación.

Esto tiene implicaciones de licencia importantes. Antes de distribuir instaladores públicamente, revisa [DISTRIBUTION.md](DISTRIBUTION.md) y [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

## Ejecutar en desarrollo

```bash
npm ci
npm run dev
```

## Comprobar antes de subir

```bash
npm audit
npm run check
```

El CI repite la auditoría y el build en Linux, Windows y macOS. También revisa el historial con Gitleaks.

## Empaquetar localmente

Windows:

```bash
npm run dist:win
```

macOS:

```bash
npm run dist:mac
```

Los resultados aparecen en `dist/`. Esa carpeta está ignorada por Git.

Los builds locales son para probar. Las versiones que se comparten deberían salir del workflow de release asociado a un tag.

## Regla de seguridad importante

Trata el renderer como una capa sin privilegios.

Aunque ahora controlemos todo el HTML, cualquier cambio que introduzca navegación, contenido remoto, HTML sin escapar o un IPC demasiado abierto puede romper esa separación.

Si una operación puede leer, escribir, borrar o ejecutar algo en el equipo, valida los datos otra vez en main. No confíes únicamente en que la interfaz envía lo correcto.
