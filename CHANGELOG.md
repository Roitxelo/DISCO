# Historial de cambios

## 0.1.0-beta.2 — 2026-09-27

Esta beta está centrada en seguridad, distribución y mantenimiento. No cambia el flujo principal de DISCO, pero deja la aplicación bastante mejor preparada para compartirla.

### Cambios importantes

- Electron actualizado y validado con `npm audit` limpio.
- Navegación externa bloqueada dentro de la ventana principal.
- Permisos web innecesarios denegados.
- GitHub Actions fijadas por commit SHA.
- Gitleaks revisa todo el historial Git.
- Dependabot vigila npm y Actions.
- Las releases generan `SHA256SUMS.txt` y un SBOM CycloneDX.
- FFmpeg deja de formar parte del instalador.
- FFmpeg se descarga bajo demanda desde una release upstream conocida y se verifica por SHA-256.
- yt-dlp mantiene descarga y verificación desde su release oficial.
- Documentación nueva para desarrollo, distribución y revisión de seguridad.
- Eliminada del material público una captura que mostraba una ruta local.

### Validación

- CI verde en Linux x64, Windows x64 y macOS Intel x64.
- Workflow manual de instaladores validado en Windows y macOS.
- Smoke test manual completo en macOS Intel con FFmpeg externalizado.
- Smoke test manual completo en Windows x64 con FFmpeg externalizado.

### Sigue pendiente

- firma Authenticode en Windows;
- firma y notarización en macOS;
- soporte validado para Apple Silicon;
- actualizaciones automáticas.

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
