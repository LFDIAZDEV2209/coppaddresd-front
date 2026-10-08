# QA: carga de alertas de tests

## Hallazgo y alcance

El 8 de octubre de 2026 la pantalla de producción `/health-tests/alertas`
cargó 72 alertas. No se reprodujo el error de la captura ni se identificó la
petición original fallida; esta observación no demuestra que todos los flujos
de notificación o revisión estén verificados.

La inspección encontró que `useAlerts` bloqueaba toda la pantalla si fallaba
el catálogo de instrumentos, aunque ninguno de sus consumidores lo utilizaba.
También exigía el directorio de pacientes para mostrar alertas que ya incluyen
`patientName` en su DTO.

## Cambio

- Se elimina la petición innecesaria al catálogo de instrumentos.
- La tabla carga con las alertas reales, sin esperar al directorio de pacientes.
- Los nombres y la búsqueda usan el directorio cuando está disponible y el
  nombre de la alerta cuando no lo está. No se generan pacientes ficticios.
- Si falla la petición principal de alertas, se conserva el estado de error;
  no se transforma en una lista vacía.
- El asistente de notificaciones sigue requiriendo el directorio para revisar
  destinatarios. No se enviaron notificaciones durante esta verificación.

## Validación

`node scripts/health-alert-data.test.mjs` cubre ocho casos: directorio fallido
o pendiente, alertas fallidas, carga/lista vacía, bloqueo del asistente,
transiciones, nombres y mapeo de la API. TypeScript y ESLint se ejecutan sobre
el código actualizado. La captura de producción corresponde a la versión
previa al despliegue de este cambio.

Después de desplegar el frontend, abrir **Tests de salud → Alertas** y probar
la búsqueda por nombre, los filtros y la paginación. Un fallo real del endpoint
de alertas debe seguir mostrando el botón de reintento. La tolerancia a errores
del directorio se comprueba mediante los tests de regresión, sin interrumpir
servicios de producción.
