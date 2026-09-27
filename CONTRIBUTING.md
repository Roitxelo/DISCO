# Contribuir a DISCO

DISCO sigue siendo un proyecto pequeño y muy personal, así que prefiero pocas contribuciones pero bien enfocadas antes que llenar el repo de cambios que luego no encajen.

Si encuentras un bug, tienes una idea o quieres mejorar algo, lo mejor es abrir primero un Issue. Así podemos hablar del problema antes de que nadie invierta tiempo en una solución que quizá no encaje con el rumbo del proyecto.

## Antes de empezar

Para trabajar con el proyecto necesitas:

- Node.js 22
- npm

Después:

```bash
git clone https://github.com/Roitxelo/DISCO.git
cd DISCO
npm ci
npm run dev
```

Antes de abrir un Pull Request:

```bash
npm audit
npm run check
```

Si el cambio afecta a empaquetado o instalación, conviene probar también el build correspondiente.

## Cómo plantear un cambio

Intenta que cada PR resuelva una cosa concreta.

En la descripción cuenta, sin darle demasiadas vueltas:

- qué problema había;
- qué has cambiado;
- cómo lo has probado;
- si queda algo pendiente.

Para cambios de interfaz, una captura ayuda mucho.

## Estilo del proyecto

No hay una guía enorme de estilo. La idea es mantener el código legible y evitar complejidad que no aporte nada.

Algunas reglas que sí quiero conservar:

- TypeScript tipado;
- nada de acceso directo a Node desde el renderer;
- cambios pequeños y fáciles de revisar;
- no añadir dependencias sin una razón clara;
- no meter datos personales, claves, tokens o rutas locales en commits;
- mensajes de commit cortos y entendibles.

## Sobre la licencia

Que el repositorio sea visible no significa que DISCO sea open source.

Si envías una contribución, asegúrate de que tienes derecho a compartir ese código y de que aceptas que, si se integra, pase a formar parte de DISCO bajo los términos actuales del proyecto. Si necesitas otro acuerdo, coméntalo antes de enviar código.
