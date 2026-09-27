# Roadmap

La beta 0.1.0 ya está cerrada. A partir de aquí la prioridad no es meter funciones por meter, sino decidir bien qué merece la pena mejorar y qué hace que DISCO sea realmente más útil.

## Lo que ya está hecho

- Flujo completo desde descarga/importación hasta colección.
- Importación múltiple de archivos locales.
- Motor v3.2 para BPM, tonalidad, modo y Camelot.
- Alternativas y avisos cuando el análisis no está claro.
- Colección persistente con reproducción y relocalización.
- Editor de samples con forma de onda y ajuste por compases.
- Favoritos, etiquetas y estados.
- Ajustes persistentes.
- Instaladores probados en Windows x64 y macOS Intel.
- Electron 44.4.5.
- `npm audit` limpio al cerrar la beta.
- CI multiplataforma con GitHub Actions.
- Releases automáticas desde tags.
- FFmpeg externalizado y verificado por SHA-256 antes de ejecutarse.
- Checksums y SBOM en releases.

## Lo siguiente

### Mejorar la calidad del análisis

El motor funciona bastante mejor que la primera versión, pero todavía hay margen.

Quiero trabajar sobre todo en:

- más pruebas unitarias para historial, rutas, Camelot y ranking;
- un banco de canciones nuevo que no se haya usado para ajustar el motor;
- métricas más claras por género y nivel de confianza;
- mejor detección de mitad/doble tempo;
- mejorar los casos donde mayor y menor compiten demasiado.

### Hacer la colección más útil

Ahora mismo sirve para guardar y volver a encontrar material. La idea es que poco a poco también ayude a decidir qué hacer con él.

Posibles siguientes pasos:

- buscar por BPM, tonalidad y Camelot;
- reanalizar elementos antiguos de forma voluntaria;
- importar carpetas completas;
- detectar duplicados por contenido;
- exportar y restaurar la colección;
- arrastrar audio o samples hacia un DAW.

### Distribución

Todavía hay trabajo aquí:

- firma digital en Windows;
- firma y notarización en macOS;
- build y validación de Apple Silicon;
- integrar firma/notarización en GitHub Actions;
- estudiar actualizaciones automáticas cuando el sistema de releases esté más asentado.

## Más adelante

Hay ideas que me gustan, pero no quiero convertir el proyecto en una lista infinita de funciones antes de tener claro qué aporta cada una.

El siguiente enfoque de DISCO se decidirá a partir de uso real: qué partes se usan más, qué tareas siguen siendo incómodas y dónde realmente ahorra tiempo.
