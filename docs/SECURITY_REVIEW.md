# Revisión de seguridad de 0.1.0-beta.2

Fecha de revisión: **27 de septiembre de 2026**

Esta revisión deja documentadas las comprobaciones hechas antes de publicar la beta.2. No sustituye una auditoría externa, pero sí marca una base clara de seguridad y mantenimiento para el proyecto.

## Alcance

Se revisaron:

- archivos versionados;
- patrones de secretos y rutas personales;
- historial Git;
- configuración de Electron;
- frontera renderer / preload / main;
- IPC y operaciones de archivos;
- ejecución de yt-dlp y FFmpeg;
- Content Security Policy;
- GitHub Actions;
- dependencias npm;
- proceso de release;
- licencias y procedencia de herramientas externas.

## Estado del árbol

No se encontraron:

- archivos `.env` versionados;
- tokens o API keys;
- contraseñas incrustadas;
- claves privadas;
- bases de datos de usuario;
- `dist/`;
- `node_modules/`;
- informes locales de análisis;
- rutas personales en archivos de texto del snapshot público.

Gitleaks forma parte del CI y revisa todo el historial Git disponible del repositorio.

## Electron

DISCO utiliza:

- `sandbox: true`;
- `contextIsolation: true`;
- `nodeIntegration: false`;
- `webSecurity: true`;
- bloqueo de contenido inseguro;
- CSP sin scripts inline;
- renderer sin acceso directo a Node.

También se bloquea la navegación de la ventana principal fuera del renderer esperado y las aperturas externas solo aceptan `http:` y `https:`.

Los permisos web que DISCO no necesita se deniegan.

## Procesos externos

No se construyen comandos shell concatenando texto del usuario.

FFmpeg se ejecuta con `execFile` y arrays de argumentos. yt-dlp se ejecuta mediante `execFile`/`spawn`, también con argumentos separados.

### yt-dlp

Se descarga desde su release oficial de GitHub y se verifica el SHA-256 publicado antes de instalarlo.

### FFmpeg

`ffmpeg-static` ya no forma parte del instalador.

DISCO descarga bajo demanda una build upstream conocida, fijada por plataforma, y comprueba su SHA-256 antes de ejecutarla. El binario se guarda dentro de los datos locales de la aplicación.

## GitHub Actions

El CI:

- fija acciones externas por commit SHA;
- no persiste credenciales de checkout;
- usa permisos de solo lectura por defecto;
- concede escritura únicamente al job que publica una release;
- ejecuta `npm audit`;
- revisa el historial con Gitleaks;
- construye en Linux, Windows y macOS;
- usa Dependabot para npm y GitHub Actions.

## Releases

Las releases generan:

- instalador Windows x64;
- DMG macOS Intel x64;
- `SHA256SUMS.txt`;
- `SBOM.cdx.json`.

La beta.2 se probó manualmente en Windows x64 y macOS Intel después de externalizar FFmpeg.

## Pendiente

La siguiente capa de madurez no está en el código, sino en la confianza del sistema operativo:

- Windows todavía no tiene firma Authenticode.
- macOS todavía no tiene Developer ID ni notarización.
- Apple Silicon todavía no está validado.
- No hay actualizaciones automáticas.

## Conclusión

La beta.2 parte de una base razonable para distribución pública: aislamiento de Electron, dependencias auditadas, escaneo de secretos, builds reproducibles y herramientas externas verificadas antes de ejecutarse.

Si el proyecto crece, esta revisión debería repetirse periódicamente y ampliarse con pruebas específicas de IPC, análisis estático y firma de releases.
