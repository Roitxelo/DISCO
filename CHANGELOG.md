# Historial de cambios

## 0.1.0-beta.2 — pendiente de publicación

Beta centrada en endurecimiento, distribución y preparación del repositorio público. No cambia el motor musical ni el flujo principal de trabajo.

### Seguridad

- Bloqueo explícito de navegación fuera del renderer de DISCO.
- Permisos web innecesarios denegados.
- Protocolo interno `disco-audio://` más restrictivo.
- Validación adicional del origen de yt-dlp.
- Gitleaks sobre todo el historial Git.
- `npm audit` como bloqueo del CI y de las releases.
- GitHub Actions fijadas por commit SHA y con permisos mínimos.
- Dependabot para npm y GitHub Actions.

### Distribución

- Checksums SHA-256 para los instaladores.
- SBOM CycloneDX en las nuevas releases.
- Documentación de desarrollo, distribución y revisión de seguridad.
- La interfaz obtiene la versión real desde Electron en lugar de tenerla escrita a mano.

### Pendiente antes de distribución pública

- verificar/cerrar la estrategia de licencia de la build de FFmpeg incluida;
- firma Authenticode en Windows;
- firma y notarización en macOS;
- soporte validado de Apple Silicon.

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
