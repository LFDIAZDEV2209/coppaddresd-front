# Revisión — Fase 10b: baterías (detalle, creación y asignación)

Continuación de la fase 10 sobre la misma rama `feature/erp-phase-10-patients-batteries`, sin commit.

## Solicitud

Luis, tras ver la página de baterías de la fase 10: «this is way too simple». En la conversación se acordó el alcance:

1. Detalle de batería + crear + asignar (recomendado).
2. Formulario de creación completo: por test, obligatorio/opcional, frecuencia en días y reordenar.
3. Asignación masiva con buscador sobre los 447 pacientes, checkboxes, «seleccionar todos los filtrados» y un único POST.
4. Roadmap de momentos del programa con tarjetas «Próximamente» para Seguimiento, Nutricional y Psicológica.

## Resultado

- **Capa de datos**: `Battery` conserva `code`, `items` y `autoAssignOnPatientCreate`; `HealthTest` expone `versionId`; `mapBattery` ya no fuerza la etiqueta `v{items.length}` (el bug «vv9» de la fase 10 queda resuelto y la tarjeta muestra el code). Nuevos `getBattery`, `createBattery` y `assignBattery` con invalidación de la caché en memoria por epoch.
- **Listado**: tarjetas con «Ver detalle» y «Asignar pacientes» (según permisos); «Nueva batería» activo con permiso `HealthTests.Manage`; sección «Momentos del programa» con la batería Inicial real enlazada y tres tarjetas «Próximamente».
- **Detalle** `/health-tests/baterias/[id]`: chips de estado/code/fecha/auto-asignación; stats (tests, obligatorios/opcionales, pacientes, completados, cobertura); tabla por test con obligatoriedad, frecuencia, pacientes, completados, cobertura y severidad promedio; promedio por categoría y distribución por severidad.
- **Crear**: diálogo con validación, búsqueda de tests, reordenar, obligatorio/opcional y frecuencia; al crear redirige al detalle con la caché invalidada.
- **Asignar**: diálogo con buscador, selección múltiple, seleccionar todos los filtrados, un único POST y confirmación «Asignaciones creadas: {count}».

## Verificación realizada

- QA Playwright con sesión admin (escritorio y móvil 390×844).
  - Creación real de «Batería QA temporal» (`bateria-qa-temporal`): Nutrición (opcional, orden 1) y Sueño (obligatorio, orden 2, frecuencia 30 días); el reordenado y los flags se respetaron en el POST; redirección al detalle correcta.
  - Detalle con datos reales: 2 tests, «1 obligatorios · 1 opcionales», pacientes y cobertura derivados por `testCode` (aproximación documentada, no hay filtro por batería en `/assignments`).
  - Asignación de 2 pacientes (Lucas Thomas, Lucas Williams) con confirmación «Asignaciones creadas: 4» (2 pacientes × 2 tests).
  - Listado final: «Baterías configuradas» = 2 y ambas tarjetas con acciones.
  - Consola sin errores ni `[i18n] Missing key` en listado, detalle y diálogos.
- **Hallazgo de QA corregido**: el pie del diálogo de asignación quedaba fuera del viewport en móvil/ventanas bajas (faltaba `overflow-y-auto`); también se ajustó la etiqueta a «Asignar pacientes» cuando no hay seleccionados.
- `tsc --noEmit`, `eslint` de los archivos tocados, `next build` y `i18n:check` en verde (equivalentes `node` de los comandos `yarn`, porque `corepack`/`yarn` no están en el PATH del entorno).

## Límites y pendientes

- Editar/desactivar/borrar baterías no es posible: el backend no expone `PUT/PATCH/DELETE`; quedaría como fase aparte.
- Los conteos por batería son una aproximación por `testCode` (los tests son compartidos entre baterías); no es contabilidad de asignaciones.
- Datos de QA en la base de desarrollo: la batería «Batería QA temporal» no se puede eliminar desde la UI; las asignaciones creadas pueden cancelarse por API (`POST /assignments/{id}/cancel`).
- Pendiente: revisión visual de Luis y decisión de commit.
