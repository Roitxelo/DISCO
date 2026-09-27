# Seguridad

Si encuentras un problema de seguridad en DISCO, gracias por no publicarlo directamente en un Issue con todos los detalles si podría poner a otros usuarios en riesgo.

Puedes abrir un Issue con una descripción general y sin incluir pasos de explotación, credenciales, datos personales ni archivos sensibles. A partir de ahí coordinamos cómo compartir la información necesaria de forma más privada.

## Qué información ayuda

Si puedes, incluye:

- versión de DISCO;
- sistema operativo;
- parte de la aplicación afectada;
- impacto que crees que puede tener;
- si el problema necesita interacción del usuario o un archivo/enlace preparado.

No incluyas tokens, contraseñas, claves privadas ni datos personales reales.

## Dependencias

El proyecto ejecuta `npm audit --audit-level=high` en GitHub Actions.

Eso no sustituye una revisión de seguridad, pero sirve para detectar vulnerabilidades conocidas en dependencias antes de integrar cambios en `main`.

## Versiones soportadas

Ahora mismo solo se mantiene la beta más reciente publicada. Las versiones anteriores pueden contener problemas que ya estén corregidos en `main`.
