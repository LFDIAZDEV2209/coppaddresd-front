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
