# QA de contenido y legibilidad — 8 de octubre de 2026

## Cambios

- Detalle de medios con ancho adaptable, límite de altura, cabecera fija y contenido desplazable. Vista previa y metadatos en columnas en escritorio; una columna en móvil. Título y valores permiten saltos de línea.
- El reproductor y el detalle muestran la duración real del archivo. Si difiere del catálogo, el detalle conserva la duración registrada como aviso informativo, sin modificar el registro automáticamente.
- Pares semánticos separados para texto sobre fondos sólidos y suaves. Publicado/Borrador y avisos ya no usan blanco sobre pastel. Controles deshabilitados conservan etiquetas opacas y una superficie diferenciada.
- Una subida con fallo de conexión directo al almacenamiento puede usar el PUT autenticado del gateway con la misma clave. Los errores HTTP no se ocultan ni se reintentan por otra ruta. No se desactiva CORS.
- El formulario libera el estado de progreso después de terminar o fallar, conservando el archivo para reintentar.
- El ERP local usa el proxy de Next para /api únicamente en desarrollo. Producción conserva el gateway configurado.

## Verificación

Navegador nativo sobre ERP de producción y app local conectada al gateway de producción. Cuenta de prueba Luis Prueba Movil: se reprodujo el podcast asignado, se comprobó el salto de 15 segundos y el bloqueo por debajo del 70%; al completar, la app mostró 1/6 y 80 XP. El ERP mostró TASK_PODCAST +80 y balance 365 (anterior 285).

El diálogo local conectado a los datos de producción se comprobó en escritorio y viewport móvil: no desborda horizontalmente y mantiene la cabecera visible.

Pruebas: TypeScript y ESLint; 4 casos del servicio de subida; contraste de los pares semánticos de ambos temas con mínimo 4.5:1. La compilación de producción de Next no termina en este sandbox porque no puede descargar las fuentes de Google. No se afirma que todos los flujos estén desplegados o verificados en producción por ello.

Las acciones destructivas de eliminación y mantenimiento no forman parte de esta ejecución.

## Estado de producción y despliegue

El intento real de crear «QA E2E Content 2026-10-08» falló al subir el MP3: error de conexión directo y HTTP 500 por el gateway al probar el fallback local. No se creó un medio nuevo ni se publicó o asignó contenido de prueba. El backend ahora prepara un stream seekable para S3; necesita despliegue y nueva prueba. No se considera aprobado el flujo completo de alta → publicación → asignación.

Comprobación visual adicional: Publicado tiene texto oscuro sobre verde suave en tema claro y texto claro sobre verde oscuro en tema oscuro, con opacidad 1. Los botones Ionic deshabilitados conservan disabled en el control nativo y opacidad 1 con fondo gris y texto azul oscuro. Se restauró el tema claro y el viewport habitual al terminar.
