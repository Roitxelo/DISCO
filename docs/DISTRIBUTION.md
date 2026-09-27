# Distribuir DISCO

Este es el proceso que quiero seguir para que un instalador que llega a otra persona se pueda relacionar con una versión concreta del código y no dependa de “el .exe que tenía en Descargas”.

## Qué archivo recibe un usuario

Para una release normal:

- Windows x64 → `DISCO-<version>-win-x64.exe`
- macOS Intel x64 → `DISCO-<version>-mac-x64.dmg`
- verificación → `SHA256SUMS.txt`
- inventario de dependencias → `SBOM.cdx.json`

Los `.blockmap` y `latest*.yml` se generan porque electron-builder los utiliza para escenarios de actualización, pero mientras DISCO no tenga auto-updater no hace falta publicarlos como archivos principales de la release.

## Forma recomendada de compartir DISCO

Comparte el enlace a la **GitHub Release**, no una copia suelta del instalador.

Así quien lo recibe puede ver:

- la versión;
- las notas de cambios;
- el instalador original generado por Actions;
- su checksum SHA-256;
- el código correspondiente al tag.

## Comprobar un checksum

### Windows PowerShell

```powershell
Get-FileHash .\DISCO-0.1.0-beta.1-win-x64.exe -Algorithm SHA256
```

### macOS

```bash
shasum -a 256 DISCO-0.1.0-beta.1-mac-x64.dmg
```

El resultado debe coincidir con `SHA256SUMS.txt` de la misma release.

## Flujo para crear una versión

### 1. Trabajar en una rama

No preparar una versión directamente sobre `main`.

### 2. Abrir PR hacia main

Antes de fusionar deben pasar:

- Gitleaks;
- `npm audit`;
- TypeScript;
- build Linux;
- build Windows;
- build macOS.

### 3. Actualizar versión y changelog

La versión de `package.json` y la documentación deben describir lo que realmente se va a publicar.

### 4. Fusionar

Solo con CI verde.

### 5. Crear el tag

Ejemplo:

```bash
git switch main
git pull --ff-only
git tag v0.1.0-beta.2
git push origin v0.1.0-beta.2
```

Los tags `v*` disparan `.github/workflows/release.yml`.

### 6. GitHub Actions construye

El workflow:

1. instala exactamente el lockfile con `npm ci`;
2. ejecuta `npm audit`;
3. construye Windows x64;
4. construye macOS Intel x64;
5. genera un SBOM CycloneDX;
6. genera SHA-256 de los instaladores;
7. crea la GitHub Release.

Si el tag contiene `-beta`, `-alpha` o `-rc`, se publica como prerelease.

### 7. Probar lo que se ha publicado

No basta con que Actions esté verde.

Descarga el instalador **desde la propia release** y haz al menos un smoke test:

- abre la app;
- importa un audio;
- analiza;
- reproduce;
- exporta un sample;
- comprueba persistencia;
- prueba una descarga autorizada.

## No mover tags publicados

Una vez que una versión se comparte, su tag debe considerarse inmutable.

Si aparece un fallo, se corrige y se publica una versión nueva. No se fuerza el mismo tag para que apunte a otro commit.

Esto permite que versión, código, checksums e instaladores sigan significando lo mismo con el paso del tiempo.

## Firma de código

### Windows

El instalador actual no tiene certificado Authenticode. Por eso SmartScreen puede advertir al usuario.

Una distribución más madura debería firmar el instalador con un certificado de firma de código y guardar la clave/certificado únicamente como secreto de CI o en un sistema de firma externo.

### macOS

El DMG actual no está firmado ni notarizado.

Para una distribución normal fuera de pruebas hace falta:

- Apple Developer Program;
- Developer ID Application;
- codesign;
- notarización de Apple;
- stapling cuando corresponda.

Nunca subas certificados, claves privadas o contraseñas al repositorio.

## FFmpeg: punto pendiente antes de abrir la descarga al público

DISCO empaqueta actualmente FFmpeg mediante `ffmpeg-static@5.3.0`. Esa versión utiliza la release binaria `b6.1.1`, basada en FFmpeg 6.1.1.

El paquete `ffmpeg-static` declara licencia **GPL-3.0-or-later** y publica archivos de licencia separados para cada plataforma. FFmpeg, por su parte, explica que la licencia efectiva de una build depende de las opciones y componentes con los que se compile: una build puede ser LGPL o pasar a GPL.

Por eso el siguiente paso no es adivinar la licencia por el nombre del paquete, sino verificar la licencia/configuración exacta de los binarios `darwin-x64` y `win32-x64` que estamos redistribuyendo y cumplir lo que corresponda.

Como DISCO mantiene una licencia propietaria, no quiero dar por hecho que basta con mencionar FFmpeg en un README. Antes de hacer pública una release con el binario incluido hay que escoger una estrategia clara:

1. verificar exactamente la build incluida y cumplir sus obligaciones de redistribución y código fuente; o
2. cambiar a una build/configuración de FFmpeg compatible con el modelo de distribución que queramos; o
3. dejar de incluir FFmpeg dentro del instalador y resolver su obtención de otra manera.

Esto es un tema de licencias, no un fallo técnico. Merece cerrarse antes de distribuir públicamente los instaladores.

## Release actual

`v0.1.0-beta.1` se creó durante la beta privada.

Después de la auditoría de seguridad no se debe reutilizar ese tag para los siguientes cambios. La primera versión que incorpore el endurecimiento de esta revisión deberá llevar un tag nuevo.
