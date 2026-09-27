# DISCO

**Descarga · Identifica · Samplea · Convierte · Organiza**

DISCO es una aplicación de escritorio para productores musicales. Reúne la descarga de audio autorizado, la importación local, el análisis de BPM y tonalidad, la creación no destructiva de samples y la organización de una colección local.

> Estado: beta `0.1.0-beta.1` validada manualmente en Windows x64 y macOS x64. Los resultados musicales son estimaciones y siempre pueden revisarse.

## Descargar e instalar

La beta se distribuye desde [GitHub Releases](https://github.com/Roitxelo/DISCO/releases/tag/v0.1.0-beta.1):

- Windows x64: instalador NSIS `.exe`.
- macOS Intel x64: imagen `.dmg`.

Consulta la [guía de instalación](docs/INSTALLATION.md) para los pasos y advertencias de cada sistema. Los usuarios de los instaladores no necesitan Node.js, npm, FFmpeg ni yt-dlp instalados globalmente.

## Funciones

- Descarga audio autorizado desde YouTube mediante `yt-dlp`.
- Importa uno o varios WAV, MP3, FLAC o M4A.
- Analiza BPM, tonalidad, modo y Camelot con el motor local v3.2.
- Propone alternativas y recomienda revisión cuando existe ambigüedad.
- Conserva la detección original y las correcciones del usuario.
- Reproduce la colección y vuelve a enlazar archivos movidos.
- Recorta samples sobre una forma de onda, ajusta compases y aplica fundidos.
- Exporta WAV, MP3 o FLAC con normalización opcional.
- Organiza mediante favoritos, etiquetas y estado de proyecto.

Los archivos, preferencias e historial permanecen en el equipo. DISCO no necesita cuenta ni envía telemetría.

## Desarrollo

Requisitos: Node.js 22 y npm. El repositorio incluye `.nvmrc` para mantener el mismo entorno entre equipos.

```bash
git clone https://github.com/Roitxelo/DISCO.git
cd DISCO
npm ci
npm run dev
```

Validación:

```bash
npm audit
npm run check
```

Empaquetado local:

```bash
npm run dist:win
npm run dist:mac
```

Los artefactos se generan en `dist/` y no se incorporan al repositorio.

## Plataformas validadas

| Plataforma | Arquitectura | Estado |
| --- | --- | --- |
| Windows | x64 | Instalador y flujo completo validados |
| macOS | Intel x64 | DMG y flujo completo validados |
| macOS | Apple Silicon arm64 | Pendiente de validación |

## Documentación

- [Instalación](docs/INSTALLATION.md)
- [Guía de uso](docs/USER_GUIDE.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Motor v3.2](docs/ANALYSIS_V3.md)
- [Problemas conocidos](docs/KNOWN_ISSUES.md)
- [Hoja de ruta](docs/ROADMAP.md)
- [Historial de cambios](CHANGELOG.md)
- [Avisos de terceros](THIRD_PARTY_NOTICES.md)

## Uso responsable

DISCO está pensado para contenido propio, autorizado, de dominio público o compatible con la licencia de la fuente. El usuario es responsable de respetar los derechos aplicables. Convertir audio comprimido a WAV no recupera la información perdida.

## Licencia

El código de DISCO no se distribuye con una licencia de código abierto. Consulta [LICENSE](LICENSE). Las dependencias mantienen sus propias licencias.
