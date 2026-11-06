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

Firma prevista (TODO comentado en wire, sin ampliar mapper hasta integración): `generationState: "pending" | "generating" | "ready" | "failed" | null`, `generationFallback: boolean`, `generationReason: string | null`, `generationUpdatedAt: string | null`, `hasPublishedToday: boolean`, `publishedCycleStart: string | null`, `publishedCycleEnd: string | null`, `latestDraftState: NutritionViewWire["state"] | null`, `hasFutureDraft: boolean`. Los cuatro primeros están documentados en §4/20.1. Los últimos cinco son la firma solicitada por el owner; en el corte leído §20 aún no los publica: confirmar nesting/nullabilidad literal con builder antes de integrar.

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

Se conectan solo las cabeceras de GET prescriptions ya usado y el detalle/history existente. No hay nueva petición por tarjeta de bandeja ni carga de 30 días por cada ciclo. Decisiones de programa en componentes exploratorios y fixtures de E2E, sin importarlos desde app. No se agregan rutas de demo accesibles en producción, ni mutaciones nuevas. Snapshot versionado de este documento en `coppaddresd-front/docs/nutrition/CYCLES-DESIGN.md`, porque openspec está fuera de Git.
