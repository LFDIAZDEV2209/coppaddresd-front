# Demostraciones de ejercicio

En el formulario de rutinas cada ejercicio dispone de una sección propia de
demostración. Se puede buscar una imagen o vídeo publicado, previsualizarlo,
quitarlo o subir y publicar un archivo. Los errores conservan los datos del
formulario; guardar espera a que terminen las subidas y a que se haya cargado
el detalle de una rutina en edición.

La referencia `mediaId` de cada ejercicio y la portada de la rutina se
conservan al editar. Las demostraciones se administran con los permisos
`Media.View`, `Media.Create` y `Media.Publish` existentes; la edición de la
rutina conserva `Wellness.Manage`. Los pacientes reciben únicamente medios
publicados de su rutina asignada, mediante el snapshot y enlaces firmados.

Las imágenes admiten JPEG/PNG/WebP/GIF hasta 20 MB, los vídeos MP4/WebM/MOV
hasta 1 GB. El backend valida el archivo antes de publicarlo. Las imágenes
no reciben una duración artificial. No se incorporan clips de terceros ni
demostraciones inventadas.

Verificación del recorrido del ERP, con todas las peticiones API interceptadas:

```sh
E2E_BASE_URL=http://localhost:3101 npx playwright test e2e/exercise-media.spec.ts --project chromium-desktop
```

El servidor de desarrollo se puede iniciar en este entorno con
`npm run dev -- --webpack --port 3101`; el modo webpack evita un fallo local
del resolutor de fuentes de Turbopack sin alterar la configuración del proyecto.
