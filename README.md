# DISCO

**Descarga · Identifica · Samplea · Convierte · Organiza**

DISCO es una aplicación de escritorio para productores musicales. Reúne la descarga de audio autorizado, la importación local, el análisis de BPM y tonalidad, la creación no destructiva de samples y la organización de una colección local.

> Estado: candidata a beta `0.1.0-beta.1` para Windows x64. Los resultados musicales son estimaciones y siempre pueden revisarse.

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

Requisitos: Node.js 22 o posterior y npm.

```bash
git clone https://github.com/Roitxelo/DISCO.git
cd DISCO
npm ci
npm run dev
```

Validación y empaquetado:

```bash
npm run check
npm run dist:win
npm run dist:mac
```

Los artefactos se generan en `dist/` y no se incorporan al repositorio.

## Documentación

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
