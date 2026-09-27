# DISCO

[![Validar DISCO](https://github.com/Roitxelo/DISCO/actions/workflows/ci.yml/badge.svg)](https://github.com/Roitxelo/DISCO/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Roitxelo/DISCO?include_prereleases&label=release)](https://github.com/Roitxelo/DISCO/releases)

**Descarga · Identifica · Samplea · Convierte · Organiza**

DISCO nació para juntar en una sola app varias cosas que acababa haciendo por separado cuando trabajaba con música: descargar audio que puedo usar, identificar BPM y tonalidad, sacar un sample y dejarlo todo organizado para volver a encontrarlo después.

Ahora mismo está en beta, pero ya se puede usar de principio a fin en **Windows x64** y **macOS Intel**.

> Versión actual: `0.1.0-beta.1` · Motor de análisis: **v3.2**


## Un vistazo a DISCO

<img src="docs/assets/identifica.webp" alt="Pantalla Identifica de DISCO mostrando BPM, tonalidad y Camelot" width="100%">

*Identifica: análisis con BPM, tonalidad, Camelot y revisión manual.*

<img src="docs/assets/descarga.webp" alt="Pantalla Descarga de DISCO con un tema preparado para convertir y analizar" width="100%">

*Descarga: trae el audio, elige formato y deja preparado el análisis.*

## Descargar

La forma más sencilla de probar DISCO es desde la última release:

**[Descargar DISCO 0.1.0-beta.1](https://github.com/Roitxelo/DISCO/releases/tag/v0.1.0-beta.1)**

- **Windows x64** → instalador `.exe`
- **macOS Intel x64** → `.dmg`

No hace falta instalar Node.js, npm, FFmpeg ni yt-dlp para usar la aplicación.

Si el sistema muestra una advertencia al abrirla, consulta la [guía de instalación](docs/INSTALLATION.md). Esta beta todavía no está firmada digitalmente ni notarizada.

## Qué puedes hacer

El flujo principal de DISCO es bastante simple:

**Descargar o importar → Identificar → Samplear → Coleccionar y organizar**

A partir de ahí puedes:

- descargar audio autorizado desde YouTube;
- importar WAV, MP3, FLAC y M4A desde tu equipo;
- analizar BPM, tonalidad, modo y Camelot;
- revisar alternativas cuando el resultado no está del todo claro;
- corregir BPM o tonalidad manualmente sin perder el análisis original;
- reproducir y ordenar tu colección;
- crear samples directamente sobre la forma de onda;
- ajustar selecciones a compases;
- exportar en WAV, MP3 o FLAC;
- usar favoritos, etiquetas y estados para organizar material.

La idea no es que el análisis “decida por ti”. BPM y tonalidad son estimaciones, y por eso DISCO enseña alternativas y permite corregirlas cuando haga falta.

## Privacidad

DISCO funciona de forma local.

No hay cuenta, servidor ni telemetría. La colección, las rutas, las preferencias y el historial se guardan en tu propio equipo.

La primera vez que necesitas descargar desde YouTube, DISCO obtiene el binario oficial de `yt-dlp` y comprueba su SHA-256 antes de usarlo. FFmpeg va incluido con la aplicación.

## Estado de las plataformas

| Plataforma | Estado |
| --- | --- |
| Windows x64 | ✅ Instalador y flujo completo probados |
| macOS Intel x64 | ✅ DMG y flujo completo probados |
| macOS Apple Silicon | ⏳ Pendiente de build y validación |

## Desarrollo

El proyecto usa Electron, React y TypeScript.

Necesitas **Node.js 22** y npm. Hay un `.nvmrc` en el repo para mantener la misma versión entre equipos.

```bash
git clone https://github.com/Roitxelo/DISCO.git
cd DISCO
npm ci
npm run dev
```

Antes de subir cambios:

```bash
npm audit
npm run check
```

Para generar instaladores manualmente:

```bash
npm run dist:win
npm run dist:mac
```

Los builds terminan en `dist/` y esa carpeta no se versiona.

GitHub Actions también valida automáticamente el proyecto en Linux, Windows y macOS. Las releases etiquetadas con `v*` generan los instaladores de Windows y macOS.

## Feedback y contribuciones

Si pruebas DISCO y algo falla, abre un [Issue](https://github.com/Roitxelo/DISCO/issues). Hay plantillas separadas para bugs e ideas para que sea más fácil dar el contexto necesario.

Si quieres proponer código, echa un vistazo a [CONTRIBUTING.md](CONTRIBUTING.md) antes de empezar. Para problemas de seguridad, sigue [SECURITY.md](SECURITY.md) y evita publicar detalles sensibles en abierto.

## Documentación

Si quieres entrar un poco más en detalle:

- [Instalación](docs/INSTALLATION.md)
- [Guía de uso](docs/USER_GUIDE.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Motor de análisis v3.2](docs/ANALYSIS_V3.md)
- [Problemas conocidos](docs/KNOWN_ISSUES.md)
- [Roadmap](docs/ROADMAP.md)
- [Historial de cambios](CHANGELOG.md)
- [Software de terceros](THIRD_PARTY_NOTICES.md)

## Sobre las descargas

DISCO está pensado para trabajar con audio propio o con contenido que tengas permiso para descargar y utilizar. Cada usuario es responsable del uso que haga de las fuentes y del material descargado.

Y una cosa importante: convertir un MP3 a WAV no recupera la información que ya se perdió en la compresión.

## Licencia

El repositorio es visible, pero **DISCO no es un proyecto open source**.

El código puede consultarse para evaluación y beta privada, pero no se concede permiso general para copiarlo, modificarlo o redistribuirlo. Los detalles están en [LICENSE](LICENSE).

Las dependencias utilizadas por DISCO mantienen sus propias licencias.
