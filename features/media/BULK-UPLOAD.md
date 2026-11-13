# Integración de 1.18 / 1.19

La referencia visual es `openspec/changes/organizar-experiencia-bienestar/mockups/referencia-claude-f1-4/`:
`Biblioteca de podcasts.png` (drawer) y `Carga múltiple de podcasts.png`.
Se reutilizan Sheet de Base UI, Button, Input, Skeleton y tokens del ERP.

## Punto de conexión de 1.17

`MediaQuickEditSheet` se exporta desde `components/media-form-fields.tsx`.
Recibe `open`, `onOpenChange`, `media`, `saving`, `serverError?` y `onSubmit`.
`onSubmit(input, file?, thumbnailFile?, onProgress?)` conserva la firma del formulario
actual. El contenedor debe mantener `saving=true` durante toda la operación, resolver
los archivos con `resolveStorageKeys`, actualizar **el mismo id** y cerrar tras guardar.
El drawer conserva estado y metadatos avanzados; no muestra día ni mes. Las referencias
se consultan con `fetchMediaReferences`; se cuentan inscripciones, pues ese contrato no
proporciona un total de pacientes distintos. No se ha editado `media-page.tsx`.

La carga múltiple se abre en `/media/new?mode=bulk`. `/media/new` conserva el formulario
individual. 1.17 puede enlazar a esa ruta con la clave `Subir podcasts`; el formulario
individual ya ofrece el enlace con `Carga múltiple de podcasts`.

## Transporte y dependencias

`MediaBulkUpload` recibe adaptadores `createDraft` y `publishDraft`; la cola está aislada
en `services/media-bulk-queue.ts`. El adaptador de página utiliza las operaciones
individuales ya existentes (upload-intent, almacenamiento, POST media, GET/PUT media y
POST publish). No presupone rutas HTTP de lote nuevas. El registro es idempotente por
storageKey; se conserva la clave tras una respuesta fallida y el id tras crear el borrador.
Antes de reintentar publicar se consulta el estado: un medio ya publicado no se despublica.

La salida por archivo sigue 1.13: `{ nombre, estado: borrador|publicado|error, error? }`.
Los resultados correctos se omiten al reintentar. El autor permanece editable y obligatorio
porque el contrato vigente lo exige. El progreso y la duración vienen del archivo real.

**Pendientes para cerrar:** confirmar 1.8 commiteada antes de integrar etiquetas; confirmar
el contrato definitivo de 1.13; conectar el drawer desde las tarjetas de 1.17. Estos cambios
preparatorios no cierran esas dependencias ni acreditan QA con el backend real.

## Verificación

```powershell
node --test features/media/services/media-bulk-queue.test.mjs
corepack yarn e2e media-bulk-upload.spec.ts --project=chromium-desktop
corepack yarn lint
corepack yarn build
corepack yarn i18n:check
```

La suite HTTP sintética cubre cinco archivos con un fallo, reintento sin volver a subir
los correctos, edición del borrador, respuesta perdida de publicación, permisos de lectura,
tabla accesible a 390 px, traducción y ausencia de día/mes. Genera capturas de escritorio y
móvil en el directorio de resultados de Playwright. No sustituye la prueba de API real.

## Claves i18n para coordinación

Añadidas a ambos diccionarios, sin cambiar traducciones existentes:

- `Carga múltiple de podcasts`, `Subir podcasts`, `Seleccionar varios archivos`, `Elegir archivos`.
- `Cada archivo queda como borrador con el título tomado del nombre. Complétalos aquí y publícalos juntos.`
- `Arrastra los audios aquí. Cada archivo se guarda como borrador antes de publicarlo.`
- `Suelta aquí más archivos de audio`, `Audio · hasta 200 MB por archivo · {count} en esta carga`.
- `Archivos del lote`, `Título de {name}`, `Autor de {name}`, `Categoría de {name}`.
- `{drafts} borradores · {published} publicados · {errors} con error`, `Procesando...`, `Subida de {name}`.
- `Quitar {name} del lote`, `Crear borradores`, `Guardar borradores`, `Publicar en lote`, `Publicar {count} listos`, `Borrador listo`.
- `Selecciona archivos de audio para la biblioteca de podcasts.`, `El archivo supera 200 MB.`.
- `No se pudo publicar el medio.`, `El medio ya no es un borrador. Actualiza la biblioteca.`.
- `Editar podcast`, `Edición rápida del podcast`, `Actualiza título, categoría y miniatura sin salir de la biblioteca.`.
- `Dónde se usa`, `{count} inscripciones`.
- `Al reemplazar el archivo se conservan las asignaciones. El cambio se aplica al guardar.`
- `Mindfulness` (clave dinámica de categoría).

Las claves adicionales de 1.17 deben llegar del dueño de ese worktree antes de incorporarlas.
