# Problemas conocidos de 0.1.0-beta.1

La beta funciona en Windows x64 y macOS Intel, pero todavía hay algunas cosas a tener en cuenta.

- **Windows puede mostrar SmartScreen.** El instalador todavía no tiene firma de código.
- **macOS puede bloquear la primera apertura.** El DMG no está firmado ni notarizado.
- **Apple Silicon todavía no está validado.** No doy soporte oficial a arm64 en esta beta.
- **La primera descarga desde YouTube necesita conexión.** DISCO tiene que obtener y verificar yt-dlp.
- **El análisis no es infalible.** En algunos temas puede aparecer mitad/doble tempo o una duda entre modos mayor y menor.
- **Las notas se muestran con sostenidos.** Por ejemplo, `G#` y `A♭` son equivalentes.
- **Los análisis antiguos no se sobrescriben solos.** Los elementos creados antes de v3.2 conservan su resultado histórico.
- **Los archivos importados no se duplican.** DISCO apunta al original; si lo mueves o lo borras, tendrás que volver a enlazarlo.
- **No hay actualizaciones automáticas todavía.**

Si aparece un problema que no esté aquí, lo ideal es guardar qué estabas haciendo, el sistema operativo y, si existe, el mensaje de error exacto.
