# Instalar DISCO 0.1.0-beta.2

La beta actual está probada en **Windows x64** y **macOS Intel x64**.

Los instaladores están en la [release v0.1.0-beta.2](https://github.com/Roitxelo/DISCO/releases/tag/v0.1.0-beta.2).

## Windows x64

Descarga:

`DISCO-0.1.0-beta.2-win-x64.exe`

Después:

1. abre el instalador;
2. elige la carpeta si no quieres usar la predeterminada;
3. termina la instalación;
4. abre DISCO desde el acceso directo o desde Inicio.

### Si aparece SmartScreen

Esta beta todavía no tiene firma de código, así que Windows puede mostrar una advertencia aunque el archivo sea el correcto.

Comprueba que lo has descargado desde la release oficial del repositorio antes de continuar.

## macOS Intel

Descarga:

`DISCO-0.1.0-beta.2-mac-x64.dmg`

Después:

1. abre el DMG;
2. arrastra `DISCO.app` a `Applications`;
3. abre DISCO desde Aplicaciones.

### Si macOS bloquea la primera apertura

El DMG todavía no está firmado ni notarizado por Apple. macOS puede frenarlo la primera vez por ese motivo.

Comprueba primero que el archivo viene de la release oficial. Si es así, puedes autorizar la apertura desde **Ajustes del Sistema → Privacidad y seguridad**.

## Apple Silicon

Todavía no doy soporte oficial a la build arm64 porque no está validada.

Eso está en la lista de siguientes pasos del proyecto.

## ¿Tengo que instalar algo más?

No.

Los instaladores ya llevan lo necesario para ejecutar DISCO:

- FFmpeg se descarga automáticamente la primera vez que hace falta;
- yt-dlp se descarga automáticamente la primera vez que hace falta;
- no necesitas Node.js;
- no necesitas npm.

Cuando DISCO descarga yt-dlp o FFmpeg, usa una release upstream conocida y comprueba el hash SHA-256 antes de instalar el binario dentro de los datos locales de la aplicación.

## Actualizar DISCO

Puedes instalar una build nueva encima de una anterior.

La colección, las preferencias y el historial se guardan fuera de la carpeta de la aplicación, así que una actualización normal no debería borrarlos.

Aun así, mientras el proyecto siga en beta, siempre es buena idea conservar el audio original.

## Si quieres trabajar con el código

Entonces sí necesitas **Node.js 22** y npm:

```bash
git clone https://github.com/Roitxelo/DISCO.git
cd DISCO
npm ci
npm run dev
```

Para comprobar que todo está bien antes de hacer cambios:

```bash
npm audit
npm run check
```
