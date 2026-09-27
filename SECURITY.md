# Seguridad

Si encuentras un problema de seguridad en DISCO, evita publicar detalles explotables en un Issue.

Cuando el repositorio sea público, la vía preferida será **GitHub Private vulnerability reporting** desde la pestaña **Security**. Así se puede describir el problema sin hacerlo visible para todo el mundo.

Si esa opción todavía no aparece, abre un Issue indicando únicamente que has encontrado un posible problema de seguridad y que necesitas un canal privado. No incluyas pasos de explotación, credenciales, datos personales ni archivos sensibles.

## Qué información ayuda

Si puedes, incluye:

- versión de DISCO;
- sistema operativo;
- parte de la aplicación afectada;
- impacto que crees que puede tener;
- si requiere interacción del usuario;
- si depende de un archivo o enlace preparado.

No incluyas tokens, contraseñas, claves privadas ni datos personales reales.

## Dependencias e historial

El CI ejecuta:

- `npm audit`;
- build en Linux, Windows y macOS;
- Gitleaks sobre el historial Git completo.

Estas comprobaciones ayudan a detectar advisories conocidos, secretos accidentales y regresiones de build, pero no sustituyen una revisión manual del código.

## Versiones soportadas

Ahora mismo solo se mantiene la beta más reciente publicada.

Si un problema afecta a una versión antigua, comprueba primero si sigue existiendo en la última release o en `main`.
