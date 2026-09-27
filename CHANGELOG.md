# Historial de cambios

## 0.1.0-beta.1 — 2026-09-26

Primera beta de DISCO que considero suficientemente cerrada como para compartirla fuera del entorno de desarrollo.

### Qué trae

- Descarga y conversión de audio autorizado.
- Importación múltiple de archivos locales.
- Motor v3.2 para BPM, tonalidad, modo y Camelot.
- Alternativas y avisos cuando el análisis tiene dudas.
- Corrección manual sin perder la detección original.
- Colección con reproducción, relocalización y organización.
- Editor de samples sobre forma de onda.
- Ajuste por compases, normalización y fundidos.
- Exportación en WAV, MP3 y FLAC.
- Banco comparativo entre v2 y v3.
- Instalador NSIS para Windows x64.
- DMG para macOS Intel x64.
- Electron 44.4.5.
- GitHub Actions para validación y creación de releases.

### Qué se ha probado

La beta se instaló y probó manualmente en:

- Windows x64;
- macOS Intel x64.

En ambos casos se comprobó el flujo principal: importación, análisis, reproducción, samples, persistencia y descarga/conversión.

### Pendiente

- firma digital en Windows;
- firma y notarización en macOS;
- soporte validado para Apple Silicon;
- actualizaciones automáticas.
