# Revisión de seguridad previa a publicación

Fecha de revisión: **27 de septiembre de 2026**

Esta revisión se hizo antes de plantear la publicación del repositorio. No sustituye una auditoría externa, pero deja documentado qué se ha mirado, qué se ha corregido y qué sigue pendiente.

## Alcance

Se revisaron:

- archivos versionados;
- patrones de secretos y rutas personales;
- configuración de Electron;
- frontera renderer / preload / main;
- IPC y operaciones de archivos;
- ejecución de yt-dlp y FFmpeg;
- Content Security Policy;
- GitHub Actions;
- dependencias npm;
- proceso de release;
- licencias de terceros;
- metadatos del historial Git.

## Estado actual del árbol

En el árbol actual no se encontraron:

- archivos `.env`;
- tokens o API keys;
- contraseñas incrustadas;
- claves privadas;
- bases de datos de usuario;
- `dist/`;
- `node_modules/`;
- informes locales de análisis;
- rutas `/Users/<usuario>/...` o `C:\Users\<usuario>\...` en archivos de texto.

La captura de Descarga que mostraba una ruta local se retiró del árbol público previsto.

## Endurecimiento aplicado

### Electron

DISCO ya utilizaba:

- `sandbox: true`;
- `contextIsolation: true`;
- `nodeIntegration: false`;
- CSP sin scripts inline;
- renderer sin acceso directo a Node.

Durante esta revisión se añadió:

- bloqueo de navegación de la ventana principal fuera del renderer esperado;
- apertura externa únicamente para `http:` y `https:`.

Esto evita que una navegación accidental a contenido remoto herede la API de preload.

### Procesos externos

No se usa `exec` con comandos construidos a partir de texto del usuario.

FFmpeg se ejecuta con `execFile` y arrays de argumentos. yt-dlp se ejecuta mediante `execFile`/`spawn` con argumentos separados.

Las URLs de descarga se restringen a HTTPS y hosts explícitos de YouTube.

### yt-dlp

El binario se obtiene desde la release oficial de GitHub y el archivo descargado se compara con el digest SHA-256 publicado en la release antes de instalarlo.

Sigue existiendo una dependencia de confianza en GitHub y en la cuenta upstream de yt-dlp. La verificación protege frente a corrupción o sustitución en tránsito, pero no equivale a fijar una versión conocida dentro de DISCO.

### GitHub Actions

Se endureció el CI para:

- fijar las acciones externas por commit SHA;
- no persistir credenciales de checkout;
- usar `contents: read` por defecto;
- dar `contents: write` únicamente al job que crea una release;
- bloquear cualquier advisory que haga fallar `npm audit`;
- escanear todo el historial con Gitleaks;
- mantener dependencias con Dependabot.

### Releases

Las nuevas releases generan un `SHA256SUMS.txt` y publican como archivos principales solo los instaladores destinados al usuario y sus checksums.

## Hallazgo de privacidad en el historial Git — pendiente

El repositorio privado actual contiene **95 commits** cuyo autor utiliza una dirección de Gmail personal. En 91 commits también aparece como committer.

Aunque el árbol actual esté limpio, esos metadatos forman parte del historial Git.

Además, los Pull Requests ya creados conservan referencias a commits antiguos. Por eso una simple reescritura de `main` no garantiza que todos los objetos antiguos dejen de ser accesibles si este mismo repositorio cambia a público.

### Recomendación

La opción más limpia antes de publicar es mantener este repositorio como archivo privado de desarrollo y crear el repositorio público desde un historial limpio, usando desde el primer commit una dirección `users.noreply.github.com`.

Si se decide publicar este mismo repositorio, habría que reescribir ramas y tags y aceptar que referencias históricas asociadas a PR pueden seguir existiendo en GitHub.

## Licencia de FFmpeg — pendiente antes de distribuir instaladores

`ffmpeg-static@5.3.0` apunta a la release binaria `b6.1.1`, basada en FFmpeg 6.1.1, y el paquete declara GPL-3.0-or-later.

La release publica archivos de licencia separados para las plataformas, pero durante esta revisión no se ha podido verificar todavía el contenido/configuración exacta de los binarios `darwin-x64` y `win32-x64`. FFmpeg puede ser LGPL o GPL según su configuración de compilación, así que este punto sigue abierto antes de una distribución binaria pública.

Esto está explicado con más detalle en [DISTRIBUTION.md](DISTRIBUTION.md).

## Firma de instaladores — pendiente

- Windows: sin Authenticode.
- macOS: sin Developer ID / notarización.

No impide una beta privada, pero sí afecta a confianza, advertencias de SmartScreen/Gatekeeper y a cómo debería distribuirse una versión pública.

## Protección de main — pendiente al hacer público el repo

Mientras el repositorio siga privado, el plan actual no permite consultar/configurar aquí los rulesets avanzados.

Al hacerlo público conviene activar una regla para `main` que, como mínimo:

- exija Pull Request;
- exija que el CI pase;
- bloquee force-push;
- bloquee borrado de la rama;
- deje los tags publicados como referencias que no se reescriben.

## Private vulnerability reporting — pendiente

Cuando el repositorio sea público, activar **Private vulnerability reporting** en GitHub Security permite que alguien comunique una vulnerabilidad sin publicarla como Issue.

## Conclusión práctica

El código está en una base razonablemente fuerte para una beta de escritorio: aislamiento de Electron, CSP, sin shell concatenada, dependencias auditadas y CI multiplataforma.

Antes de poner **instaladores** a disposición pública quedan dos tareas que considero importantes:

1. resolver el historial con correo personal creando un historial público limpio;
2. cerrar la estrategia de licencia/distribución de FFmpeg.

La firma de código es el siguiente nivel de madurez, aunque puede hacerse después de una primera beta pública si se explican claramente las advertencias.
