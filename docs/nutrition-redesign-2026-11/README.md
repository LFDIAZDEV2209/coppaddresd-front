# Exploración UX de Nutrición — noviembre de 2026

## Estado final — Ciclo 4 completado

Etapas 0–5 implementadas y validadas en `feature/nutrition-ux-premium`, un commit por etapa, sin push ni deploy. [COMPARATIVA.md](COMPARATIVA.md) presenta los 11 hallazgos antes/después, métricas y límites; [PROGRESS.md](PROGRESS.md) registra commits y validación por etapa. [PROPUESTA.md](PROPUESTA.md) conserva el plan aprobado.

Lint, TypeScript, i18n y build pasan. Suite completa de Nutrición después del build: **38 passed, 1 skipped** (sonda live sin configuración). Recorrido real QA local completado; v1 publicada intacta y v2 existente Devuelto, sin nueva publicación. Red final y consola autenticada sin errores en las ventanas registradas. Contratos, cálculos, permisos y persistencia conservados.

Evidencia final: **41 PNG** en `screenshots/despues/` (32 reales, nueve sintéticos identificados), 25 mediciones y registro de red sin credenciales. Excepciones explícitas: contenido móvil bajo y650 con comentario largo y mayor altura total del editor a cambio de nutrientes completos/contexto persistente. Pre-ship impeccable detect terminó 127 sin salida; no se declara detector limpio ni certificación WCAG. Sin aprobación clínica ni generación IA nueva. Detalle de cobertura y límites en la comparativa.

## Registro histórico — ciclos 1 a 3

Las secciones siguientes preservan observaciones y disponibilidad de aquellos ciclos; sus estados pendientes y ausencia de cambios/pruebas corresponden a ese momento, no al cierre de Ciclo 4.

El diagnóstico consolidado del Ciclo 2 está en [DIAGNOSTICO.md](DIAGNOSTICO.md): severidades, frecuencia, impacto, propuestas UX/componentes y patrones a conservar. Las observaciones preliminares de este README se mantienen como registro del Ciclo 1; la clasificación del diagnóstico las sustituye.

## Estado y alcance

Ciclo 1 iniciado y completado el 9 de noviembre de 2026, tras resolver acceso y disponibilidad local. Se recorrieron Programas, Tests de salud, Citas y los flujos de Nutrición detallados abajo. No equivale a certificación WCAG ni validación clínica. Base comprobada: `c6410d6`, checkout inicialmente limpio; rama: `feature/nutrition-ux-premium`.

La misión requiere conservar identidad, contratos, cálculos, permisos y persistencia. Este ciclo no modifica código de producto. No se gestionaron panes, invocaron otros agentes, hicieron push ni despliegues. Las únicas mutaciones de datos se realizaron en una nueva versión de un paciente QA ficticio en localhost. Toda escritura de archivos queda dentro del front.

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

El inventario inicial procede del código. Las comprobaciones de estilos calculados, contraste y recorrido real se detallan en el cierre del ciclo más abajo.

## Observaciones iniciales y riesgos

| ID | Evidencia | Impacto / hipótesis | Siguiente comprobación |
|---|---|---|---|
| E01 | La referencia de Downloads incorpora Nuevo plan, exportación y cinco comidas; el código/SDD consultado no coincide | Copiarla literalmente ampliaría alcance y podría alterar semántica clínica | Contrastar con app real; usarla como dirección, no contrato funcional |
| E02 | Captura histórica del editor presenta scroll exterior y de ficha, con totales parcialmente bajo las pestañas | Posible pérdida de contexto al editar; severidad pendiente de reproducción | Medir scroll, sticky, foco y visibilidad del día/guardado |
| E03 | Captura histórica del editor trunca una línea de nutrientes y no muestra unidad junto a cada cantidad | Comparación y comprensión podrían requerir pasos adicionales | Inspeccionar nombre accesible, unidad y comportamiento con nombres largos |
| E04 | Captura histórica de ficha muestra Borrador IA y Auto-aprobado simultáneamente | Posible ambigüedad entre procedencia y estado clínico | Revisar semántica y contrato antes de proponer cambio de copy |
| E05 | DESIGN.md describe selección sin franja; implementación y notas posteriores incorporan barra persistente | Documento visual parcialmente desactualizado | Usar implementación actual como evidencia y documentar diferencias |

Estos son candidatos al diagnóstico del Ciclo 2, **no hallazgos funcionales reproducidos ni severidades definitivas**.

## Plan inicial de validación (ejecutado en la continuación)

Recorrido real de tres módulos y de Nutrición: bandeja, búsqueda/filtros/paginación, cambio de paciente, ciclos/versiones, resultados, programación, selector de 30 días, totales, estado vacío/error/carga reproducible, contenido largo y teclado. Mutaciones únicamente en entorno de prueba con identidades QA y autorización de la misión; nunca en producción.

Capturas y mediciones se completaron en la continuación. No se ejecutaron lint/build/typecheck ni la suite E2E de regresión porque no hay cambios de código; sí se ejecutaron interacciones y comprobaciones mediante Playwright MCP contra la aplicación y servicios locales reales. Ninguna prueba histórica se presenta como ejecutada en esta sesión.

## Limitaciones operativas

- Acceso inicial resuelto con el formulario demo local; no se guardaron credenciales en archivos ni capturas. Hubo HTTP 500 en inbox al principio, luego HTTP 200 durante el recorrido. No se atribuye la recuperación a cambios de este agente.
- `impeccable.cmd context --target features/nutrition` terminó con código 1 sin salida. No se declara detector limpio; auditoría manual documental únicamente.
- Cierre del workspace: no ejecutar el pipeline que escribe `.ai/` mientras la misión autoriza escrituras exclusivamente en `coppaddresd-front`. Este informe y PROGRESS constituyen el handoff al orquestador.
- Ciclo 1 finalizado; se espera instrucción del orquestador antes del Ciclo 2. No se implementa UI en esta entrega.

## Recorrido real de tres módulos

| Módulo | Recorrido / evidencia nueva | Patrones observados |
|---|---|---|
| Programas | `/program/dashboard`, indicadores, gráficos, listado biométrico, búsqueda; escritorio y móvil | PageHeader de marca, StatCard con acento superior, SectionHeader secundario azul suave, filtros y tabla; sans global Plus Jakarta en títulos. La captura de búsqueda no acredita estado vacío: fue tomada antes de confirmar su resultado |
| Tests de salud | `/health-tests` y navegación a `/health-tests/pacientes`; tabla maestra y búsqueda QA | Indicadores, mapa, alertas, tabla; densidad y tarjetas similares al ERP. En móvil se truncan encabezados; no trasladar esa limitación a Nutrición |
| Citas | `/appointments`; rango 60 días, agrupación Semana, scroll a próximas citas y estado sin próximas citas | Cabecera compartida, filtros de rango, gráficos y accesos. A 390px el h1 mide 0px de ancho: acciones desplazan el título; problema externo al alcance de implementación |

Capturas: `programas-*`, `tests-*`, `citas-*` en `screenshots/antes/`. Se inspeccionaron imágenes y DOM. No se modificaron datos de esos módulos.

## Matriz de flujos de Nutrición

| Flujo | Resultado observado |
|---|---|
| Bandeja sin selección | 297 pacientes, siete filtros con contadores; capturada en los cinco anchos |
| Búsqueda / vacío / limpiar | Búsqueda QA encuentra dos fixtures; cadena sin coincidencias muestra vacío; limpiar recupera lista |
| Paginación | Siguiente muestra página 2 de 30; búsqueda vuelve a resultados filtrados |
| Filtros | Sin plan y Todos consultados; Por aprobar activado por flecha + Espacio durante estado de error; contadores reales posteriores 200 |
| Selección y cambio | Ficha sin plan de un registro DEMO en solo lectura; apertura de ambos pacientes QA; retorno móvil conserva búsqueda QA |
| Resultados / ciclos | Calendario C1, hoy día 5, tabla y lecturas; historial abre disclosure y enfoca SUMMARY |
| Versión | Se creó v2 desde v1 aprobada del fixture; cambio v1↔v2 carga el estado correcto y conserva acceso a publicada |
| Programación | Fechas, zona America/Bogota, cuatro horarios, cuatro verificaciones y energía de 30 días |
| Navegación 30 días | Selector recorrido de 1 a 30; comprobación individual de 55 g en todos los días después de copia; flecha + Enter cambia día 1→2 |
| Macronutrientes / totales | Avena 50→55 g actualiza energía diaria 1.831,2→1.850,3 kcal y resumen de desayuno; valores observados, no validación independiente del motor |
| Agregar / quitar | Manzana de 80 g agregada a desayuno y posteriormente retirada; ambas persistencias responden 200 |
| Aplicar a 30 días | Alertdialog explica reemplazo de cuatro comidas, cantidades y agua; foco inicial Cancelar; confirmación explícita ejecutada en v2 QA |
| Autoguardado | Estado guardado y POST save 200; reload conserva 55 g en día 30; luego verificados los 30 días |
| Enviar a aprobación | POST submit 200; cambia a Por aprobar y pestaña Programación |
| Revisión | Checkbox crítico inicialmente desmarcado; Aprobar y publicar deshabilitado; revisado en desktop y móvil, cancelado sin publicar |
| Devolución | Motivo vacío bloquea confirmar; comentario QA explícito permite POST return 200 y estado Devuelto |
| Estados | Sin plan, Aprobado v1, Borrador IA v2, Por aprobar y Devuelto observados con datos locales reales |
| Error | HTTP 500 real reproducido con Reintentar antes de recuperación; alertas y botón accesibles; conservada evidencia inicial |

No se creó fixture adicional: ya existían dos QA documentados. No hubo mutaciones en producción ni uso de mocks HTTP. No se generó un plan IA nuevo ni se aprobó/publicó v2, operaciones no necesarias para comprobar estos flujos.

### Registro de datos QA modificados

- Paciente local: `ef59c692-d01a-4105-b3ea-05c07ff76279` (QA Nutricion Ola5 … Visual).
- Publicada anterior conservada: v1 `61bb9874-d51b-4214-90f7-3427b12e8c89`.
- Nueva v2: `c5002aaa-28ce-4ea6-982c-96e28b59a35a`, estado final **Devuelto**. Avena 55 g; día 1 copiado a los 30; Manzana retirada tras probar alta/baja. Dos envíos/devoluciones: el segundo permitió comprobar apertura directa del diálogo en móvil. Comentarios identifican expresamente una prueba QA sin decisión clínica real.
- No se borró historial ni se cambió la publicación. El segundo paciente QA se consultó únicamente.
- `network-nutrition.txt` contiene métodos, rutas y códigos, sin cabeceras, cookies, tokens ni cuerpos. Registra 500 iniciales y 200 posteriores; no constituye una prueba de rendimiento.

## Medidas y accesibilidad comprobadas

`measurements.json` contiene 15 muestras: tres pestañas × cinco anchos, altura 900px. Documento sin overflow horizontal en 1440/1280/1024/768/390; ancho interior de ficha 834/674/442/742/364px y scrollWidth idéntico. La bandeja también pasó esos cinco anchos. Esto no acredita todos los estados modales ni textos posibles.

En desktop hay scroll independiente de bandeja y ficha, además del textarea de indicaciones. A 1440, ficha visible 694px y contenido del editor 2.861px; a 1024 alcanza 3.399px. En móvil la ficha fluye por documento. La captura enfocada de comidas muestra que los nutrientes de cada alimento siguen truncados y las cantidades no tienen unidad visible inmediata, aunque sí nombre accesible «Gramos de …».

Teclado: Tab recorre búsqueda→grupo de filtros→reintento; flechas mueven foco en filtros y Espacio activa. Tabs usa activación manual: flechas mueven foco y Enter selecciona. Selector de día con label asociado y outline sólido navy de 2px. Catálogo abre con foco en SELECT; Escape cierra y devuelve foco al botón Agregar alimento a Desayuno. Historial abre y enfoca su SUMMARY.

Contraste de muestras claras calculado por luminancia sRGB: IA `#694500/#fff5d6` 7,86:1; texto secundario `#475569/blanco` 7,58:1; blanco/navy `#023467` 12,43:1. No es auditoría de todos los textos, estados, foco ni tema oscuro. Se capturó Programación en oscuro y se restauró claro. No se usó lector de pantalla ni se certifica WCAG completa.

## Hallazgos candidatos para Ciclo 2

| ID / prioridad preliminar | Evidencia actual | Impacto y propuesta para evaluar |
|---|---|---|
| UX01 / P1 | `comidas-390.png`: línea nutricional truncada; en desktop también hay elipsis | Comparar nutrientes exige información no visible; evaluar resumen por comida y detalle tabular/expandible sin perder cantidades |
| UX02 / P2 | Botones de día 32×44px; actualizar móvil 38×44; agua 32px de alto | No cumplen objetivo táctil 44×44 de la misión; ampliar blancos. No afirmar incumplimiento automático de WCAG 2.2 AA por esa sola medida |
| UX03 / P2 | `plan-1440.png` y `resultados-1024.png`: gran tramo de identidad/selector antes del trabajo | Compactar metadatos repetidos y mantener paciente, estado y guardado reconocibles |
| UX04 / P2 | `resultados-1024.png`: breadcrumb largo compite con buscador superior | Definir truncamiento del contexto del paciente sin modificar identidad clínica |
| UX05 / P1 por confirmar semántica | Capturas de v2 muestran Borrador IA junto a Auto-aprobado; después de editar hubo una vista sin ese chip | Ambigüedad de procedencia/estado; revisar contrato y actualización del modelo antes de cambiar copy |
| UX06 / P2 | Error real presenta dos alertas anidadas y ruta HTTP | Mensaje redundante/técnico para nutricionista; mantener reintento y llevar detalle técnico a disclosure si corresponde |
| UX07 / P2 | Exceso diario 0,3 kcal marcado en ámbar; inspector redondea a desviación +0 kcal | Inconsistencia de presentación/precisión; evaluar formato sin modificar reglas ni umbrales clínicos |
| UX08 / P2 | Barras de día muy estrechas (7,16px a 390) | Ya tienen selector equivalente de 44px: conservarlo; no contabilizar automáticamente como fallo táctil sin considerar equivalencia |
| UX09 / fuera de alcance | Citas h1 ancho 0 en móvil y Tests trunca secciones | Referencias del ERP tienen limitaciones: reutilizar componentes con adaptación, no replicar problemas |

Severidades preliminares para diagnóstico, no propuesta aprobada de implementación. Fortalezas a preservar: ausencia de overflow de ficha, desconocidos explícitos, controles de revisión, confirmación masiva, labels de gramos, persistencia y separación v1 publicada/v2 en revisión.

### Capturas transitorias y límites de evidencia

- `revision-390.png` registra redimensionado con diálogo abierto y recorte. `revision-390-apertura-directa.png` verifica apertura móvil directa dentro del viewport (clientWidth 356px); no se eleva el recorte transitorio a fallo responsive reproducido. Algunas capturas de pestañas conservan el subrayado durante transición; el estado seleccionado se verificó en DOM.
- No hay captura nueva dedicada al skeleton de carga: el estado de error real satisface la alternativa carga/vacío/error del briefing; no se introdujo latencia artificial.
- No hay datos de múltiples ciclos independientes para comparar C1/C2: se verificaron dos versiones del mismo C1. No se inventaron ciclos.
- La apertura y cancelación del diálogo de aprobación no certifica aprobación clínica. La edición de v2 fue QA local y permanece devuelta.
- Esta entrega es exploración. Comparativa después, cambios de UI y regresión completa corresponden a ciclos posteriores.
