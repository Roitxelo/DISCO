# Hoja de ruta

## Beta 0.1.0 — completado

- Flujo YouTube → conversión → análisis → revisión.
- Importación local múltiple.
- Motor v3.2 con alternativas y confianza calibrada.
- Colección persistente, reproductor y relocalización.
- Forma de onda, selección por compases y exportación de samples.
- Favoritos, etiquetas y estados de proyecto.
- Ajustes persistentes y reducción de animaciones.
- Banco comparativo v2/v3 con informe JSON.
- Iconos y empaquetado mediante Electron Builder.
- Instalador Windows x64 probado.
- DMG macOS Intel x64 probado.
- Electron 44.4.5 con `npm audit` sin vulnerabilidades conocidas al cerrar la beta.

## Cierre de beta — completado

- Validación multiplataforma mediante GitHub Actions.
- Revisión de documentación y repositorio.
- Integración de la beta en `main`.
- Publicación de `v0.1.0-beta.1` en GitHub Releases.
- Generación automática de instaladores Windows x64 y macOS Intel x64 por tag.

## Después de la beta

### Calidad

- Pruebas unitarias para historial, rutas, Camelot y ranking.
- Registro local de errores exportable.
- Banco independiente con canciones nuevas.
- Métricas de precisión por género y confianza.

### Producto

- Reanalizar voluntariamente elementos antiguos.
- Buscar por BPM, tonalidad y Camelot.
- Arrastrar audio y samples hacia un DAW.
- Importar carpetas y detectar duplicados por contenido.
- Exportar y restaurar la colección.

### Distribución

- Firma digital para Windows.
- Firma y notarización para macOS.
- Build y validación de macOS Apple Silicon arm64.
- Ampliar la automatización de releases con firma y notarización cuando estén disponibles.
- Actualizaciones automáticas cuando exista infraestructura estable.
