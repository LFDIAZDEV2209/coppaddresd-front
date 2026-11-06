# ASTRA — ciclos nutricionales, pre-work 8.6

Fecha: 2026-11-06. Alcance: frontend exclusivamente, rama `feature/nutrition-cycles`, desde `dev` actualizado y árbol limpio. No se cierra 8.6: sigue dependiendo del P0 y de operaciones clínicas pendientes. El HTML es mapa funcional; el ERP desplegado es la autoridad visual.

## A. Auditoría y matriz de diferencias

Fuentes: REDESIGN-UX §§1–3,5–6, DESIGN-SPEC, DESIGN-CRITIQUE, tasks 8.6, CONTRACT §§4,19,20, PROMPT_PLAN_NUTRICIONAL §§5–6 y HTML funcional (lecturas, programa, lotes y decisiones). Auditoría por código de features/nutrition y fixtures HTTP existentes; no acredita producción.

| Mock | ERP actual | Problema | Corrección propuesta |
|---|---|---|---|
| Calendario C1/C2/C3 y hoy dorado | Vigencia de una prescripción | No permite comparar períodos | Una franja de 30 días por ciclo, selección vinculada a tabla; hoy solo con zona conocida |
| Completo/en curso/programado/por aprobar/sin plan | Chip clínico único | Aprobado no equivale a vigente | Separar estado clínico y estado temporal; fechas no prueban cumplimiento clínico |
| Plan por ciclo, kcal/C/P/G | Resumen de versión publicada | Se pierde cycleId y el resto de cabeceras | Retener cabeceras ya descargadas; agrupar por cycleId, versiones dentro del ciclo |
| Ver y ver historial | Editor y bitácora del seleccionado | No hay entrada por ciclo | Selección local sin perder bandeja; abrir prescripción explícita e historial |
| Crear/Añadir ciclos/asistente | Crear propuesta/nueva versión | Confundir versión con ciclo duplicaría intención | Crear primera propuesta existente; nuevas decisiones en exploración local hasta contrato |
| Repetir con variación | Aplicar día y regenerar | No crea sucesor con procedencia | Prototipo aislado y especificación de fuente/semanas/revisión |
| Recalcular metas | Metas editables | No hay simulación clínica autorizada | Comparación anterior/propuesta pendiente de motor; sin fórmulas paralelas |
| Mantenimiento/cerrar | Sin operaciones | Mutación clínica sin contrato | Diálogos exploratorios, nunca publicación o cierre falso |
| Registrar mediciones | Lecturas parciales, Tests de salud | No existe captura longitudinal en Nutrition | Diálogo exploratorio con unidades y fecha; backend como bloqueo explícito |
| IMC/glicemia/grasa/adherencia y línea base/delta | IMC/HbA1c y faltantes explícitos | No hay serie real ni línea base | Conservar datos reales; sin ceros ni evolución sintética en producto |
| Lectura IA/siguiente paso | Indicaciones y alertas | Narrativa no es decisión clínica | Diseñar lectura fechada y recomendación revisable; sin inventar texto clínico |
| Historial de lecturas | Bitácora de eventos | Evento no equivale a medición | Tabla longitudinal independiente pendiente de endpoint |
| Generación IA + vigencia en bandeja | Estados §4 vigentes | Último borrador no prueba vigencia | Mantener chips actuales; preparar firma TODO y reglas §19/20 |

Identidad bloqueada: PageHeader/SectionHeader/StatCard, dos paneles y tres pestañas Base UI, Plex Sans/Mono, superficies y tokens actuales, botones de 44 px. No portar emojis, púrpuras, mediciones calculadas del demo ni aprobaciones automáticas. Resultados y ciclos es la PRIMERA pestaña vigente; no moverla por la referencia a «tercera» del encargo.

## B. Pantallas y decisiones de diseño

Orden de lectura: cabecera de paciente y guardado → pestañas existentes → calendario del programa → plan por ciclo → lecturas disponibles, alertas y perfil → bitácora. En móvil se muestra lista o ficha; se conserva el retorno y la búsqueda. Cada ciclo tiene etiqueta C1/C2/C3 de presentación, nunca identidad persistida. La identidad es cycleId; las versiones no incrementan el ciclo. Orden por primera aparición histórica (cabeceras llegan más recientes primero), sin inventar ciclos intermedios ausentes.

Calendario: una línea por período real con fechas, chip y 30 divisiones decorativas. Una línea dorada señala hoy únicamente si se conoce la zona del paciente y hoy cae en ese período. El texto «Hoy · día N de 30» es la alternativa accesible. No se toma la zona del ordenador como zona del paciente. Si falta: «Zona del paciente pendiente: hoy no se representa». Las cabeceras anteriores a hoy se llaman «Período finalizado», no se afirma adherencia ni finalización clínica. Leyenda: completo (período finalizado), en curso, aprobado/programado, por aprobar, sin plan. Un borrador sin vigencia no recibe fechas ficticias; se conserva la copia publicada del mismo ciclo.

Tabla Plan por ciclo: ciclo/versión, fechas, estado clínico, meta kcal y C/P/G en gramos, adherencia/resultado y acciones. Desktop permite comparación; el ancho DEL PANEL, no el viewport, activa filas apiladas con etiquetas visibles. Sin scroll horizontal a 1366/390. «Ver» abre la prescripción explícita; «Ver historial» abre su bitácora. Ambas respetan el bloqueo de guardado y mantienen la bandeja. Versiones anteriores se consultan en disclosure. Sin series reales se indica «Sin dato registrado». Crear primer plan lleva al formulario existente. «Crear nuevo ciclo» solo se ofrece en la exploración local hasta resolver semántica y persistencia.

### Flujos propuestos (exploratorios, sin escrituras)

Entrada común: Añadir ciclos / Abrir el asistente / Añadir ciclo → decisión explícita. Dialog Base UI con título, descripción, cuerpo desplazable, footer fijo, cancelar y confirmación. Foco inicial en primer campo, Escape/cerrar descarta, retorno al disparador. El prototipo confirma solo «Vista previa local. No se guardaron cambios»; ningún éxito simula persistencia. Sin permiso Manage no hay acciones de programa. No se conecta desde la ficha de producción.

| Diálogo | Campos y validaciones | Confirmación es / en |
|---|---|---|
| Repetir con variación / Repeat with variation | Ciclo fuente inmutable; 1 ciclo de 30 días; variación semanas 1–4 y días 29–30; mantener metas o solicitar recálculo; motivo. Exigir fuente y al menos un bloque seleccionado. No afirmar equivalencia sin validación del motor. | Revisar variación / Review variation |
| Recalcular metas / Recalculate targets | Fecha y origen de medición; mostrar peso/talla medidos o faltante; objetivo perder/mantener; motivo obligatorio. Vista anterior/propuesta sin valores hasta respuesta autorizada. No aceptar glicemia/grasa inferidas. | Revisar metas / Review targets |
| Pasar a mantenimiento / Move to maintenance | Ciclo fuente, fecha local de inicio propuesta, motivo obligatorio y confirmación humana; previa del motor pendiente. No convertir déficit=0 en regla propia. | Revisar mantenimiento / Review maintenance |
| Cerrar programa / Close program | Motivo obligatorio, fecha de cierre, confirmación desmarcada y resumen de ciclos afectados. No borrar historial; decisión sobre vigente y futuros requiere contrato del owner. | Revisar cierre / Review closure |
| Registrar mediciones / Record measurements | Fecha/hora y origen obligatorio, peso kg, talla cm, glicemia mg/dL, HbA1c %, grasa %, adherencia % opcionales; exigir al menos una. Valores finitos positivos; porcentajes 0–100, no fecha futura. Rangos clínicos finales y permisos los valida servidor. Vacío no equivale a cero. | Revisar mediciones / Review measurements |

Estados: sin ciclo fuente → explicación y Crear primera propuesta; sin mediciones → Registrar mediciones, nunca rellenar defaults; error de carga → error visible/reintentar; conflicto 409 → recargar y revisar; validación → error asociado al campo y foco en primer inválido; petición pendiente → impedir doble envío y navegación; éxito real futuro → invalidar ficha/bandeja con id/revision devueltos. El prototipo no realiza peticiones ni registra mediciones.

Indicadores futuros: IMC, glicemia, grasa y adherencia con valor/unidad/fecha/fuente, línea base y delta desde inicio solo si hay dos medidas comparables del mismo tipo. Peso y HbA1c figuran en Historial de lecturas, junto con IMC/glicemia/grasa/adherencia; fechas locales descendentes, faltantes explícitos. Lectura IA incluye fecha, procedencia/fallback y siguiente paso recomendado revisable. No confundir adherencia del test con adherencia al plan. Estas pantallas quedan especificadas, pendientes de series reales y contrato.

### Bandeja: proceso IA y vigencia son ejes independientes

Firma prevista (TODO comentado en wire, sin ampliar mapper hasta integración): `generationState: "pending" | "generating" | "ready" | "failed" | null`, `generationFallback: boolean`, `generationReason: string | null`, `generationUpdatedAt: string | null`, `hasPublishedToday: boolean`, `publishedCycleStart: string | null`, `publishedCycleEnd: string | null`, `latestDraftState: "borrador_ia" | "en_aprobacion" | "devuelto" | null`, `hasFutureDraft: boolean`. Los cuatro primeros están documentados en §4/20.1. El builder añadió §20.2 durante esta misión: la lectura final confirma los últimos cinco por fila, fechas null sin vigente y latestDraftState limitado a borrador_ia/en_aprobacion/devuelto. Se actualizó el TODO exacto; su consumo sigue reservado a la integración posterior.

| Campo | Copy es / en | Regla |
|---|---|---|
| pending | En cola IA / AI queued | Dorado, no spinner perpetuo ni creación manual paralela |
| generating | Generando propuesta / Generating proposal | Dorado, actualización discreta y estado accesible |
| ready | Propuesta lista / Proposal ready | No sustituye el estado clínico; abrir prescriptionId confirmado |
| failed | No se generó la propuesta / Proposal generation failed | Error legible; Recuperar propuesta / Retry proposal con Manage cuando esté integrado |
| generationFallback | Propuesta de respaldo / Fallback proposal | Mostrar revisión profesional; nunca aprobación automática |
| generationReason/UpdatedAt | Motivo / Reason; Actualizado / Updated | Traducir códigos conocidos; desconocido → explicación genérica, nunca código técnico crudo |
| hasPublishedToday | Vigente hoy / Active today | Mostrar rango publicado, independiente del último borrador |
| hasFutureDraft | Próximo ciclo en preparación / Next cycle in preparation | No implica publicación ni activación |
| latestDraftState | Etiquetas clínicas existentes | Segundo eje; no reemplazar vigente por último borrador |

Hoy sin publicado → «Sin plan vigente hoy / No plan active today» SOLO cuando el backend lo confirme. Ausencia de campo en versión anterior no significa false. En esta entrega la bandeja conserva exclusivamente los chips actuales §4; no deriva vigencia a partir del último plan.

### Componentes y accesibilidad

Reutilizar Button, Tabs, Dialog/Header/Body/Footer, Input y SectionHeader Base UI/shadcn del repo. Calendario y tabla comparten selección, datos y semántica; sin dependencia nueva. Tabla HTML con caption y th/scope; alternativa apilada con etiquetas DOM traducidas. Fechas ISO sin parseo UTC que cambie el día; números Intl y Plex Mono. Teclado: Tab/Shift+Tab, Enter/Espacio en controles, flechas propias de Tabs, Escape y retorno de foco en Dialog. Objetivos 44px, foco ≥3:1 y texto ≥4.5:1; hoy dorado usa token IA con texto y línea. Respetar reduced-motion y forced-colors. No se certifica WCAG completa sin lector de pantalla.

## Frontera de implementación

Se conectan solo las cabeceras de GET prescriptions ya usado y el detalle/history existente. No hay nueva petición por tarjeta de bandeja ni carga de 30 días por cada ciclo. Decisiones en `features/nutrition/exploration`, accesibles únicamente por `/nutrition/cycles-preview` en Development y host loopback, sin enlaces desde la ficha. Los fixtures HTTP de E2E no se importan desde app. Proxy con matcher exclusivo de esa ruta responde 404 antes del stream en producción o host remoto; la página conserva una segunda guarda. No hay mutaciones nuevas. Snapshot versionado de este documento en `coppaddresd-front/docs/nutrition/CYCLES-DESIGN.md`, porque openspec está fuera de Git.

## C. Implementación entregada

- Cabeceras existentes conservadas como `NutritionCycleHeader[]`: ciclo/versión, publicación, fechas y cuatro metas. Se actualiza la cabecera tras guardar/crear versión/aprobar para evitar un resumen obsoleto. Se mantiene el rechazo de página llena de 100 cabeceras: no afirmar historial completo cuando no se conoce el total.
- Calendario y tabla conectados en Resultados y ciclos; seleccionar calendario destaca su fila. Ver abre Plan de 30 días; Ver historial abre y enfoca la bitácora de la prescripción correcta. Navegación bloqueada durante guardado/conflicto. Las cabeceras no descargan menús para renderizar filas.
- Cinco diálogos Base UI exploratorios con validación nativa, validaciones cruzadas y feedback explícitamente local; mediciones incluyen fecha/hora/origen y seis campos opcionales. Recalcular expone objetivo; mantenimiento y cierre requieren confirmación desmarcada. No se usa el motor demo.
- Bandeja mantiene estados clínicos actuales; los nueve campos nuevos quedan comentados con firma TODO, sin asumir null como false ni hacer llamadas al endpoint nuevo.

## D. Autocrítica y verificación

La entrega es pre-work P1; **no completa 8.6**. Las decisiones de programa, series de mediciones, narrativa longitudinal y estados nuevos requieren integrar contratos tras el merge del builder. No se simula persistencia en la ficha real.

| Severidad / fallo encontrado | Corrección o límite | Evidencia |
|---|---|---|
| P1: cada versión podía convertirse visualmente en otro ciclo | Agrupar por cycleId y ordenar versiones dentro | Dos ciclos con tres cabeceras en E2E |
| P1: historial abría sin desplegar contenido | Ref real del disclosure, apertura y foco de summary | Prueba consulta evento aprobado del ciclo anterior |
| P1: confundir publicado con vigente hoy | Eje temporal separado, requiere fecha local de zona conocida | Ficha sin zona informa límite; fixture fijo muestra día 17 |
| P1: fixture podía servirse como HTTP 200 tras notFound por streaming | Guarda anterior al stream en proxy con matcher exclusivo | Host remoto 404; verificación de build de producción |
| P1: selector de origen con asociación implícita poco robusta | id/htmlFor explícitos | Formulario de mediciones validado por etiqueta |
| P1: éxito de maqueta podía parecer escritura real | Copy local y ausencia de cliente API en exploración | Cero POST Nutrition durante cinco decisiones |
| P1: tabla podía exceder el panel aunque viewport fuera ancho | Container query, filas apiladas y etiquetas DOM | Medidas 1440/1366/390 sin overflow |
| P2: fecha desconocida duplicada en calendario | Mostrar chip clínico junto a fecha sin definir | Captura C3 por aprobar |
| P2: cabecera podía quedar obsoleta después de mutación existente | Actualizar snapshot local de cabeceras con resultado confirmado | Regresión de edición/aprobación/nueva versión |
| P2: caracteres acentuados se corrompían al pasar script por PowerShell | Script UTF-8 en archivo y adiciones puntuales sin reserializar diccionarios heredados | i18n 0 faltantes, sin claves nuevas con interrogación corrupta |
| P2: captura escritorio recortaba título por scroll interno | Restablecer scroll del panel antes de captura de ficha | Captura ficha-ciclos desktop |
| P2: footer de mediciones podía perderse en móvil | Cuerpo con scroll, header/footer fuera del scroll | Revisar mediciones visible en 390×844 |
| Pendiente: línea base/delta y resultados clínicos | Sin endpoint de serie real no se implementan indicadores ficticios | Celdas «Sin dato registrado» y especificación B |

Verificación local con HTTP sintético; no acredita backend ni producción clínica. Lint, i18n y build/TypeScript ejecutados con corepack yarn. Regresión bandeja/editor/ciclos: 20 aprobadas, 1 sonda de gateway omitida por modo; luego suite nueva ampliada a cuatro casos (incluye vacío y host remoto) con capturas regeneradas. Capturas de ficha, calendario exploratorio, cinco decisiones, vacío y variante inglés/oscuro en `screenshots/cycles-design/`; pares desktop 1440×900 / móvil 390×844 y medidas de overflow en JSON. Se conserva copia versionada en docs/nutrition/screenshots/cycles-design.

No se certifica auditoría completa WCAG ni uso con lector de pantalla. Teclado, Escape, retorno de foco, footer visible, es/en, claro/oscuro y contraste IA heredado se comprobaron en el lote automatizado. El launcher local de Impeccable devolvió exit 1 sin diagnóstico: se aplicó crítica manual apoyada en capturas y mediciones, sin afirmar un detector verde.

Bloqueos concretos para merge/integración: conectar generación y vigencia confirmadas en §20.1/20.2; consumir workspace §19 con zona y perfil medido; conectar recuperación §20.1; definir y exponer repetición/variación/recalcular/mantenimiento/cierre y mediciones/lecturas longitudinales. Mantener revisión profesional y publicación actual hasta una aprobación real. Sin push, deploy, servicios backend, Docker ni cambios de otros repos.

Cierre QA: suite ampliada 4/4 verde; caso de capturas de decisiones repetido tras añadir vistas enfocadas de tabla (1/1 verde). Total: **19 PNG**, con ambos tamaños solicitados y una variante inglés/oscuro. Build/TypeScript y lint finales verdes, i18n 0 claves ausentes. Prueba HTTP del build de producción en loopback: `/nutrition/cycles-preview` responde **404**. Los procesos frontend de QA se retiran al cierre; no se arrancaron ni reiniciaron servicios backend.
