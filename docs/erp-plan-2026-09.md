# ERP: plan de trabajo por fases

Fecha de preparación: 2026-09-13. Repositorio principal: `coppaddresd-front`.

Este documento organiza la solicitud del equipo; no sustituye las especificaciones de `../openspec/specs/`. Los responsables son los indicados por Luis, no asignaciones enviadas a terceros. El orden es inicial y puede ajustarse antes de abrir cada cambio.

## Método de ejecución

1. Mantener una sola tarea funcional activa. Terminar su implementación, validación y revisión; esperar la aprobación explícita de Luis antes de pasar a la siguiente.
2. Leer los AGENTS.md y las skills aplicables; consultar `openspec list` y las especificaciones del dominio. Investigar únicamente el módulo activo con CodeGraph y navegador.
3. Reproducir el comportamiento, acordar el resultado esperado y preparar una propuesta OpenSpec de máximo 500 palabras, con Non-goals, delta specs Given/When/Then, diseño con alternativa rechazada y tareas de hasta dos horas.
4. Obtener aprobación de la propuesta antes de implementar, según la gobernanza del workspace. La autorización de esta fase cubre configuración, arranque y planificación.
5. Implementar el alcance aprobado, validar y presentar evidencia. No sincronizar ni archivar OpenSpec sin petición explícita.

La inspección funcional se realiza por módulo. No convertir la preparación en una auditoría completa de todos los repositorios.

Cada fase usa una rama descriptiva propia desde `origin/dev` actualizado en cada repositorio afectado. Luis prueba y hace el merge a `dev`; el agente no lo hace. Al entregar: rama, cambios, archivos, decisiones UX/UI, pruebas para Luis, riesgos y pendientes. Mantener commits acotados y revisables.

## Fase 0 — Entorno y agente

- [x] Leer guías de los proyectos que se arrancan y revisar el estado Git de frontend/backend.
- [x] Comprobar skills de diseño ya disponibles para Codex y Caveman.
- [x] Registrar Playwright MCP en Codex; comprobar navegador integrado para el QA de esta sesión.
- [x] Arrancar PostgreSQL, Valkey, ERP, app móvil, cinco servicios .NET y AI Service.
- [x] Verificar HTTP de los anteriores y la pantalla de acceso del ERP.
- [x] Preparar Food AI con Python 3.13, pip y modelos básicos; verificar `/health` con HTTP 200 y estado healthy.
- [x] Registrar backlog, criterios iniciales, dependencias y proceso secuencial.
- [x] Ejecutar QA autenticado del primer módulo al iniciar la fase 1.

Cambios OpenSpec preexistentes al preparar este plan: `paciente-telemedicina-movil` (18/19) y `valkey-distributed-cache` (29/30). Conservarlos; no cerrar ni mezclar tareas automáticamente.

## Backlog secuencial

Cada fila se aborda de forma individual. Las subdivisiones de agenda y alertas son entregas separadas, no trabajo simultáneo.

| Fase | Trabajo y responsable | Criterio inicial de aceptación | Dependencias o decisiones por resolver |
| --- | --- | --- | --- |
| 1 | Profesionales: estado y estilos — Carlos | Toggle visible de un clic entre Activo e Inactivo; estado textual, guardado, bloqueo de clics repetidos y recuperación ante fallos. Desactivar bloquea solo el ERP y conserva la app de paciente. Eliminar opacidades innecesarias de Profesionales. | Invitado conserva su etiqueta sin toggle. Coordinar estado profesional y autorización ERP sin desactivar globalmente la cuenta. |
| 2 | Dashboard general de pacientes — Mauricio | Indicadores, tablas y navegación por secciones coherentes con los filtros y el estado de clínica; evitar vistas duplicadas sin propósito. | Precisar qué significa «clinic state» y cuáles son las dos vistas descritas como equivalentes. Definir métricas y fuente de datos antes de añadir tabs. |
| 3 | Ocultar recetario — Mauricio | El recetario deja de mostrarse en las superficies acordadas; enlaces y navegación permanecen coherentes. | Definir alcance de ocultación y comportamiento del acceso por URL; ocultar menú no equivale a retirar autorización. |
| 4.1 | Agenda: navegación — Carlos | Solicitudes aparece como «Bandeja»; eliminar la pestaña redundante de agenda manteniendo acceso a las funciones. | Inventariar rutas y enlaces existentes antes de retirar navegación. |
| 4.2 | Agenda: calendario y creación — Carlos | Se puede agendar desde la vista; calendario responsive; todos los turnos visibles por defecto dentro del alcance autorizado; calendarios profesionales y vista de citas mejorados. | Mantener permisos, zona horaria, validación y prevención de doble reserva. |
| 4.3 | Agenda: mapa — Carlos | Mapa de citas coordinado con filtros y listado; estados vacío/error y alternativa de lista. | Definir ubicación representada y disponibilidad de coordenadas. |
| 4.4 | Citas: eventos y notificaciones — Carlos | Inasistencias y eventos anómalos acordados generan alertas integradas con notificaciones, con acceso a la cita pertinente. | Definir eventos, destinatarios y transiciones. Depende del contrato de notificaciones de Community; no enviar avisos reales durante QA. |
| 4.5 | Sala y formulario — Carlos | Sala y formulario con mayor presencia de blanco, jerarquía legible, responsive y controles de videollamada accesibles. | Ruta indicada: `/appointments/sala/[id]`; verificar ruta real al comenzar. |
| 5 | Stream y Community — Lucho | Integración autenticada con estados de conexión, errores y actualización de eventos verificables. | Identificar qué «Stream service» se quiere conectar: proveedor, producto, repositorio, credenciales y contrato. No asumir que es SSE de AI Service. |
| 6 | Catálogo CPT de EE. UU. — Diomedes | Búsqueda por código/descripción para profesionales e importación idempotente con versión y procedencia registradas. | Investigar primero fuente autorizada y condiciones de uso; confirmar vocabulario, idioma y actualización. No importar hasta resolver esos puntos. |
| 7 | Resumen y filtros de pacientes/tests — Carlos | Elementos de resumen de citas en una fila en escritorio, títulos centrados y filtros que actualizan realmente los datos; adaptación móvil sin desbordamiento. | Ruta recibida: `healt-tests/pacientes`; verificar si corresponde a `/health-tests/pacientes` y qué elementos son «cards de appointments». |
| 8 | Mapa y gráficas de tests — Diomedes | Colores pastel legibles, hover claro, selector acumulado conectado al mapa y a las gráficas; distribución revisada. | Definir semántica de «acumulado», período, universo de pacientes y estados sin datos. |
| Transversal | Iconos y emojis — Todos; exploración 3D de Byron | Preferir iconos útiles y etiquetas claras cuando simplifiquen la lectura; mantener tablas donde hacen falta. | Los iconos 3D dependen de propuesta/activos de Byron; no sustituir información clínica ni accesibilidad por decoración. |
| 9 | Marca Antares a Copp Adresd — Mauricio | Sustituir referencias visibles dentro del alcance aprobado y actualizar traducciones. | Acordar escritura de marca y repositorios. Separar copy de renombrar paquetes, rutas, IDs o contratos técnicos. |
| 10 | Pacientes y baterías — Diomedes | Listados y acciones más claros; «Ver perfil» y «Ver evaluaciones» llevan a destinos distintos; «Plan de intervención» pasa a «Recomendaciones» donde corresponda. | Confirmar si cambia solo la etiqueta o también la función clínica y el modelo de datos. |
| 11.1 | Alertas de tests: selección y filtros — Mauricio | Selección de pacientes/alertas y filtros por anomalía; recuento de destinatarios visible y consistente. | Reutilizar resultados clínicos y permisos existentes; definir deduplicación. |
| 11.2 | Alertas: plantillas y canales — Mauricio | Tabs para editar plantillas, previsualización contextual y selección entre SMS/notificación en app vía Community. | Depende de integración de Community; confirmar proveedor SMS y variables admitidas en plantillas. QA con envío simulado. |
| 11.3 | Alertas: envío e historial — Mauricio | Envío confirmado, estados por destinatario/canal, prevención de duplicados y registro consultable de notificaciones. | Pruebas de fallos parciales, reintentos y auditoría; autorización explícita antes de envíos reales. |
| 11.4 | Alertas: analítica — Mauricio | Gráficas coherentes con filtros e historial, con estados vacíos y de carga. | Definir métricas; evaluar preagregación CQRS si se modifican agregados del backend. |

## Primer incremento: profesionales

Estado: propuesta aprobada por Luis e implementación realizada. QA funcional y pruebas de seguridad ejecutados; revisión visual final de escritorio amplio/móvil pendiente. Evidencia y límites: [revisión de fase 1](erp-phase-01-review.md). No iniciar otra fase hasta aprobación.

Artefactos: `../openspec/changes/erp-professionals-status-access/` desde la raíz del frontend; contienen propuesta, diseño, delta specs y tareas de frontend/backend. OpenSpec vive en el workspace sin repositorio Git propio; las ramas corresponden a los dos repositorios de implementación.

Rama de frontend y backend: `feature/erp-phase-01-professionals-toggle`, creada desde `origin/dev` actualizado el 2026-09-13.

Decisiones confirmadas por Luis:

- Toggle visible en el listado y las tarjetas, sin abrir menús ni confirmar cambios ordinarios.
- Eliminar opacidades innecesarias en Profesionales ahora; el resto se revisa en sus respectivas fases.
- Desactivar bloquea acceso ERP, pero conserva la cuenta y acceso como paciente en la app.
- Invitado permanece como estado independiente sin toggle; no saltar onboarding.
- Impedir autodesactivación en interfaz y backend.
- Conservar coherencia con login, resumen, usuarios y roles/permisos. Usar superficies definidas, foco claro y microinteracciones con movimiento reducido.
- Iconografía 3D solo como acento útil, sin reemplazar los iconos funcionales. Proponer procedencia antes de incorporar una biblioteca o recursos externos.

- Bloque A (hasta 2 h): inspeccionar listado, contrato y estilos; resolver estado profesional frente a acceso ERP; escribir propuesta y escenarios.
- Bloques B (hasta 2 h cada uno, tras aprobar): implementar coordinación con Auth y validación ERP; probar aislamiento de app/paciente, revocación y fallos parciales.
- Bloque C (hasta 2 h): integrar Switch existente en tabla y tarjetas con estado textual, guardado, permisos y traducciones; eliminar transparencias innecesarias del alcance.
- Bloque D (hasta 2 h): comprobar cambios, recarga, errores, teclado y desktop/móvil; ejecutar lint, build e i18n y pruebas backend pertinentes; documentar resultado para revisión de Luis.

Escenarios iniciales para la propuesta:

- Given un profesional activo y un usuario con permiso, When desactiva su toggle visible con un clic, Then se muestra el guardado y se bloquea su acceso ERP sin afectar la app de paciente.
- Given una actualización correcta, When recarga el listado, Then el estado persiste y la presentación lo distingue sin depender solo del color.
- Given un fallo de API, When intenta cambiar el estado, Then recibe un error claro y no queda un estado visual falso.
- Given un usuario sin permiso de modificación, When consulta el listado, Then no puede ejecutar el cambio de estado.
- Given un profesional Invitado, When se muestra el directorio, Then conserva su estado e invitación y no tiene toggle Activo/Inactivo.

## Definition of Done por tarea

- Se cumple cada escenario aprobado y se documentan límites o bloqueos.
- Se revisan escritorio y móvil, teclado/foco, contraste, carga, vacío y error; se comprueba ausencia de errores nuevos de consola y de peticiones relevantes.
- Se hace una pasada visual conjunta, se corrigen los hallazgos y se confirma con una segunda pasada solo si hubo correcciones.
- Frontend: `corepack yarn lint`, `corepack yarn build`, `corepack yarn i18n:check`, desde el repositorio. Las pruebas automatizadas cubren comportamiento y regresiones relevantes, no detalles de implementación.
- Si se modifica backend: build por proyecto, tests del módulo y pruebas de integración pertinentes. Nunca build/test de la solución raíz con referencias fantasma.
- Se actualizan documentación, tareas y evidencia sin marcar como ejecutadas pruebas pendientes. Sin commit, push, despliegue, sincronización o archivo implícitos.

## Registro de decisiones

- Preparar primero el agente y el entorno; después trabajar por módulo. Se rechaza implementar todo el listado en paralelo porque impide revisiones acotadas y mezcla dependencias.
- Mantener el sistema visual de producto como base. Impeccable en modo Operate guía el ERP; Design Taste se lee conforme al AGENTS.md, pero sus reglas de landing no se trasladan mecánicamente a tablas y dashboards.
- Los estilos globales se cambian solo cuando el patrón realmente es compartido y se revisan sus consumidores. Una corrección de profesionales no autoriza rediseñar el ERP entero.
- Las ambigüedades se resuelven al iniciar su fase, evitando pedir ahora decisiones de módulos que todavía no se van a trabajar.
