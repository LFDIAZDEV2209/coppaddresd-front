# Revisión de fase 10 — Pacientes y baterías

## Solicitud de Luis

Notas originales: «pacientes y baterías tiene que estar mejor; «Ver perfil» y «Ver evaluaciones» llevan al mismo sitio y no debería ser así; «Plan de intervención» pasa a «Recomendaciones»». Decisiones confirmadas antes de implementar: «Ver evaluaciones» ancla a `#historial` del perfil; alcance de mejora visual y de datos visibles (sin tocar semántica clínica); renombre solo de etiqueta/copy; botón «Nueva batería» deshabilitado con tooltip «Próximamente»; tarjetas de batería sin acciones por ahora. Solo frontend: no se tocó backend, base de datos ni la app móvil.

Rama: `feature/erp-phase-10-patients-batteries`. Artefactos OpenSpec en `../openspec/changes/erp-phase-10-patients-batteries/` (propuesta, diseño, specs y tareas). Sin commit ni push; pendiente de revisión de Luis.

## Resultado

- `RowActions` del listado: «Ver perfil» → `/health-tests/pacientes/{id}` y «Ver evaluaciones» → `/health-tests/pacientes/{id}#historial`. Al llegar con hash, un efecto en el perfil desplaza a la sección «Historial de evaluaciones» cuando los datos ya cargaron.
- Sección «Plan de intervención priorizado» renombrada a «Recomendaciones»; las menciones a «plan priorizado» del perfil pasan a «recomendaciones priorizadas» (banner de atención, DOFA, mensaje IA, textos de desbloqueo). El contenido y la lógica de las recomendaciones no cambian.
- Listado: encabezado de tabla legible (colores de tema en vez de blanco sobre tarjeta blanca); encabezado duplicado y copy de desarrollo eliminados; el chip de contexto pasa a singular/plural correcto («1 batería · 9 tests»). Stat «Evaluados» ahora cuenta pacientes con ≥1 test completado (antes umbral ≥5, que daba 0 de forma permanente).
- «Estado por categoría» promedia `scorePercentage ?? score` y clasifica severidad en el sentido correcto (≥70 alto, ≥40 moderado, >0 bajo, 0 sin evaluar). `mapMasterResult` propaga `scorePercentage` del backend. Antes promediaba puntajes crudos de instrumentos distintos (5–6 pts) contra umbrales de 0–100, con riesgo invertido: mostraba todo «Alto».
- Baterías: «Nueva batería» deshabilitado con tooltip «Próximamente»; «Pacientes asignados» y «Cobertura inicial» derivados de datos reales del listado (447 pacientes; 11 % de tests completados sobre los 9 instrumentos); grilla auto-fit sin columna muerta con una sola batería; `BatteryCard` recibe tests por props en lugar de volver a pedir catálogo.
- i18n: claves nuevas/renombradas agregadas a `providers/translations/es.json` y `en.json`; claves viejas del renombre eliminadas de ambos.

## Verificación realizada

- Datos reales de `/master` (447 pacientes): 335 con ≥1 test completado; 459 resultados completados; severidad y `scorePercentage` monótonos por test (low ≈31, moderate ≈55, high ≈78, critical ≈96) — valida la clasificación usada.
- QA Playwright escritorio: categorías correctas y con datos reales (Cardiometabólico 54 «Moderado», 104 evals; suma 459 evals); encabezados de tabla legibles; chip «1 batería · 9 tests»; «Evaluados» 335; en baterías: botón `disabled` con tooltip «Próximamente», «Pacientes asignados» 447, «Cobertura inicial» 11 %, card a ancho completo.
- Deep link verificado: «Ver evaluaciones» navega a `…/pacientes/{id}#historial` y la sección «Historial de evaluaciones» queda visible (top 88 px); el perfil muestra el h2 «Recomendaciones» y ningún encabezado «Plan de intervención».
- QA móvil 390 px en listado, baterías y perfil: sin desbordamiento horizontal; cards, filtros y stats apilados correctamente.
- Consola sin errores ni claves i18n faltantes en las tres vistas (solo React DevTools + HMR en desarrollo).
- `eslint .`: exit 0. `tsc --noEmit`: exit 0. `next build` de producción: correcto. `i18n:check` (`node scripts/i18n-scan.mjs`): exit 0, 0 claves ausentes en `en.json`.
- Nota de entorno: `yarn`/`corepack` no están disponibles en esta máquina; los equivalentes se ejecutaron con `node node_modules/.bin/...`. El `git fetch` falló por credenciales SSH: la rama se creó desde `dev` local sin divergencia conocida con `origin/dev`.

## Revisión pendiente antes de cerrar

Validar con Luis en escritorio amplio y dispositivo móvil real (el navegador integrado cubrió 390 px), foco visible y contraste en ambos temas. Confirmar que «Recomendaciones» es el nombre final de la sección del perfil. No se tocó la semántica clínica (umbrales de riesgo, generación de recomendaciones) ni el backend; cualquier cambio de ese tipo requiere una fase aparte con Diomedes.

## Pasos para revisar

1. Abrir `/health-tests/pacientes`; revisar encabezados de tabla, chip, stat «Evaluados» y tarjeta «Estado por categoría».
2. En una fila, abrir acciones y elegir «Ver evaluaciones»: debe llevar al perfil con la sección «Historial de evaluaciones» visible; «Ver perfil» debe abrir el perfil arriba.
3. En el perfil, revisar la sección «Recomendaciones» y los textos con «recomendaciones priorizadas».
4. Abrir `/health-tests/baterias`; comprobar botón deshabilitado con tooltip, «Pacientes asignados», «Cobertura inicial» y la card a ancho completo.
5. Revisar a 390 px y en escritorio, con teclado y contraste. Aprobar antes de avanzar: merge, commit y sync/archive de OpenSpec requieren petición explícita.
