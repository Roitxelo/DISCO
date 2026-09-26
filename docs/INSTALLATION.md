# Instalación de DISCO 0.1.0-beta.1

Esta beta ha sido validada manualmente en Windows x64 y macOS Intel x64.

## Windows x64

1. Descarga el instalador `DISCO-0.1.0-beta.1-win-x64.exe` desde la release oficial.
2. Ejecuta el instalador.
3. Elige la carpeta de instalación si quieres cambiar la predeterminada.
4. Abre DISCO desde el acceso directo o el menú Inicio.

El instalador todavía no está firmado. Windows SmartScreen puede mostrar una advertencia al tratarse de una beta sin reputación de firma. Verifica que el archivo procede de la release oficial del repositorio antes de continuar.

## macOS Intel x64

1. Descarga `DISCO-0.1.0-beta.1-mac-x64.dmg` desde la release oficial.
2. Abre el DMG.
3. Arrastra `DISCO.app` a `Applications`.
4. Abre DISCO desde Aplicaciones.

La beta todavía no está firmada ni notarizada por Apple. Si macOS bloquea la primera apertura, comprueba que el DMG procede de la release oficial y utiliza la opción de apertura permitida por macOS en Ajustes del Sistema → Privacidad y seguridad.

## Apple Silicon

La beta 0.1.0-beta.1 todavía no tiene una build arm64 validada. No se anuncia soporte oficial para Apple Silicon en esta versión.

## Primer inicio y componentes externos

DISCO incluye FFmpeg en el paquete. La primera operación que necesita YouTube descarga el binario oficial de `yt-dlp` correspondiente al sistema y verifica su hash SHA-256 antes de usarlo.

No es necesario instalar Node.js, npm, FFmpeg ni yt-dlp para utilizar los instaladores.

## Actualizar una beta anterior

Puedes instalar una nueva build de la misma beta sobre la anterior. Los datos de usuario, la colección y las preferencias se almacenan fuera del ejecutable de la aplicación y deberían conservarse.

## Desarrollo

Para trabajar con el código fuente sí necesitas Node.js 22 y npm:

```bash
git clone https://github.com/Roitxelo/DISCO.git
cd DISCO
npm ci
npm run dev
```

Antes de proponer cambios:

```bash
npm audit
npm run check
```
