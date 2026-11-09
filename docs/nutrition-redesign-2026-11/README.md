# Exploración UX de Nutrición — noviembre de 2026

## Estado y alcance

Ciclo 1 iniciado el 9 de noviembre de 2026. **Exploración parcial, pendiente de acceso autenticado al ERP.** No se acredita recorrido completo, auditoría WCAG ni verificación funcional. Base comprobada: `c6410d6`, checkout inicialmente limpio; rama creada: `feature/nutrition-ux-premium`.

La misión requiere conservar identidad, contratos, cálculos, permisos y persistencia. Este ciclo no modifica código de producto. No se gestionan panes, invocan otros agentes, hacen push, despliegues ni mutaciones clínicas. Toda escritura de esta sesión queda dentro del front.

## Evidencia consultada

- Misión completa de `mission-nutricion-ux.md`, incluido Anexo 0; onboarding y AGENTS del front; PROJECTS y resumen del Context Broker.
- OpenSpec `plan-nutricional-erp`: NOTES-frontend, DESIGN-CRITIQUE, DESIGN-SPEC y CYCLES-DESIGN. La crítica histórica describe problemas ya corregidos: no se contabilizan automáticamente como defectos actuales.
- Código mediante CodeGraph: NutritionQueue, NutritionPatientDetail, PageHeader y SectionHeader. Tokens de `app/globals.css`, comienzo de `features/nutrition/nutrition.css` y documento `features/nutrition/DESIGN.md`.
- Dos imágenes de Downloads abiertas visualmente: `Nutrition Dashboard_ 30-Day Meal Plan-1.png` y `Panel nutricional E2E Ola8-2.png`.
- Capturas históricas de OpenSpec abiertas visualmente: `prod-qa-1109/bandeja-despues.png`, `editor-comidas-filas-despues.png` y `perfil-baseline-backend-fix.png`. Son evidencia heredada, no capturas obtenidas en esta sesión.
- Navegación real por Chrome DevTools: `http://localhost:3000/nutrition` devuelve `ERR_CONNECTION_REFUSED`; `https://erp.coppadresd.com/nutrition` redirige a `/login`. Playwright tiene únicamente una pestaña vacía. No hay sesión autenticada disponible en esos dos navegadores.

## Inventario inicial del sistema visual

| Elemento | Implementación comprobada | Criterio de continuidad |
|---|---|---|
| Marca | Navy `#023467`, navy `#142855`, teal `#035d4d`; gradiente oficial termina en `#0e5f63` | Reutilizar tokens; no introducir otra paleta |
| Superficies | Fondo `#eff2f7`, card blanco, texto `#1a1d2e`, texto secundario `#475569`, borde `#e2e8f0` | Jerarquía por superficie, borde y espacio |
| Tema oscuro | Variables globales y variantes locales de Nutrición | Pendiente inspección visual en vivo |
| Tipografía | Shell: Inter/Plus Jakarta y Geist Mono por variables; Nutrición: IBM Plex Sans/Mono | Conservar especialización existente; medir legibilidad real |
| PageHeader | Título 18px, descripción 12px, relleno 24px horizontal/16px vertical, gradiente compartido | No construir otra cabecera global |
| SectionHeader | Variantes primary, secondary, tertiary y destructive; título 13px, descripción 11px | Evaluar jerarquía por contexto, sin cambiar globalmente |
| Controles | Base UI/shadcn, Input, Button, Tabs, ToggleGroup; selectores nativos existentes | No añadir otra biblioteca |
| Estados | IA dorado; aprobación pendiente azul; aprobado verde; devuelto rojo; renovación violeta | Texto explícito, no solo color |
| Filtros | Siete opciones con contadores; activo semántico con `aria-pressed`; mínimo 44px declarado | Conservar búsqueda, filtros y paginación |
| Selección | `data-selected`, check, `aria-current` y scroll hacia seleccionado | Preservar al cambiar paciente/versión |
| Adaptación documentada | Dos paneles desde 1024px; rail 280/304px; lista o ficha bajo 1024px | Validar 1440, 1280, 1024, 768 y 390px |
| Flujo | Resultados y ciclos, Programación, Plan de 30 días; bloqueo de navegación durante guardado | Conservar URL, revisión profesional y estado guardado |

Los valores declarados no equivalen a estilos calculados ni a contraste medido. Falta recorrer tres módulos representativos del ERP autenticado (Programas, Tests de salud y Citas).

## Observaciones iniciales y riesgos

| ID | Evidencia | Impacto / hipótesis | Siguiente comprobación |
|---|---|---|---|
| E01 | La referencia de Downloads incorpora Nuevo plan, exportación y cinco comidas; el código/SDD consultado no coincide | Copiarla literalmente ampliaría alcance y podría alterar semántica clínica | Contrastar con app real; usarla como dirección, no contrato funcional |
| E02 | Captura histórica del editor presenta scroll exterior y de ficha, con totales parcialmente bajo las pestañas | Posible pérdida de contexto al editar; severidad pendiente de reproducción | Medir scroll, sticky, foco y visibilidad del día/guardado |
| E03 | Captura histórica del editor trunca una línea de nutrientes y no muestra unidad junto a cada cantidad | Comparación y comprensión podrían requerir pasos adicionales | Inspeccionar nombre accesible, unidad y comportamiento con nombres largos |
| E04 | Captura histórica de ficha muestra Borrador IA y Auto-aprobado simultáneamente | Posible ambigüedad entre procedencia y estado clínico | Revisar semántica y contrato antes de proponer cambio de copy |
| E05 | DESIGN.md describe selección sin franja; implementación y notas posteriores incorporan barra persistente | Documento visual parcialmente desactualizado | Usar implementación actual como evidencia y documentar diferencias |

Estos son candidatos al diagnóstico del Ciclo 2, **no hallazgos funcionales reproducidos ni severidades definitivas**.

## Validación pendiente

Recorrido real de tres módulos y de Nutrición: bandeja, búsqueda/filtros/paginación, cambio de paciente, ciclos/versiones, resultados, programación, selector de 30 días, totales, estado vacío/error/carga reproducible, contenido largo y teclado. Mutaciones únicamente en entorno de prueba con identidades QA y autorización de la misión; nunca en producción.

Capturas nuevas y mediciones DOM por los cinco anchos solicitados siguen pendientes. No se ejecutaron lint/build/typecheck/e2e porque no hay cambios de código; ninguna prueba histórica se presenta como ejecutada en esta sesión.

## Limitaciones operativas

- Acceso autenticado pendiente: se solicitó iniciar sesión en el navegador de QA o indicar una sesión disponible. No se solicitaron ni copiaron contraseñas.
- `impeccable.cmd context --target features/nutrition` terminó con código 1 sin salida. No se declara detector limpio; auditoría manual documental únicamente.
- Cierre del workspace: no ejecutar el pipeline que escribe `.ai/` mientras la misión autoriza escrituras exclusivamente en `coppaddresd-front`. Este informe y PROGRESS constituyen el handoff al orquestador.
- No se continúa al Ciclo 2 ni se implementa UI antes de completar la evidencia del Ciclo 1 y recibir la instrucción siguiente establecida por el Anexo 0.
