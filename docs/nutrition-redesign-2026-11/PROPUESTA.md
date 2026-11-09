# Ciclo 3 — propuesta de mejora de Nutrición

Fecha: 9 de noviembre de 2026. Se propone sobre los 11 hallazgos de [DIAGNOSTICO.md](DIAGNOSTICO.md), la evidencia de `47ac3db` y el diagnóstico `74c3bdf`. **Documento para revisión del orquestador; no autoriza ni ejecuta el Ciclo 4.** No se cambió código de producto ni datos.

## Objetivo y dirección

Permitir que el nutricionista identifique paciente, versión y estado, revise el aporte nutricional y edite cantidades sin perder contexto. Modo Operate: continuidad con el ERP, navy/teal, superficies actuales, IBM Plex Sans/Mono y controles Base UI existentes. No hay nueva identidad, biblioteca, fuente ni dependencia.

Interpreto la prioridad solicitada como **beneficio esperado frente a esfuerzo y riesgo de regresión**. La rentabilidad aquí es cualitativa: no se han medido tiempos de trabajo ni errores con usuarios. Primero se entregan mejoras acotadas que pueden comprobarse por separado; después se reorganizan bandeja/header y editor. N07 sigue siendo una prioridad alta aunque requiera la etapa estructural más costosa.

## Priorización

| Orden | Hallazgos | Tipo | Beneficio / esfuerzo estimado | Riesgo | Decisión |
|---|---|---|---|---|---|
| 1 | N04, N08, N10, N11 | Ajustes visuales y semánticos acotados | Alto / bajo–medio | Bajo–medio | Aclarar procedencia, mostrar gramos, ampliar blancos y simplificar error. Retorno rápido y verificable |
| 2 | N05, N06 | Consistencia de presentación | Medio / bajo–medio | Medio por fechas y precisión | Unificar fechas y cifras sin tocar cálculo ni persistencia |
| 3 | N03 | Corrección acotada en componente compartido | Medio / bajo | Medio–alto por alcance ERP | Truncamiento correcto de breadcrumb; commit separado y comprobación en otros módulos |
| 4 | N01, N02 | Reorganización de bandeja y cabecera | Alto / medio | Medio | Filtro único compacto y cabecera en dos niveles; preservar estructura lista/ficha |
| 5 | N07, N09 | Editor y contexto durante scroll | Muy alto / alto | Alto por proximidad a edición/autoguardado | Detalle nutricional accesible y una sola zona de contexto sticky. Sin reescribir el estado del editor |

No se suman beneficios de N02 y N09: uno libera espacio al entrar y otro conserva contexto durante scroll. El incidente I01 de HTTP 500 y las hipótesis transitorias no generan trabajo de producto en este plan.

## Decisiones concretas de diseño

### D1. Estado actual y procedencia humana separados — N04

**Decisión:** retirar el chip “Auto-aprobado” de la cabecera del paciente. Conservar el estado clínico actual, la marca Provisional y el aviso de copia publicada. En el evento de aprobación de la bitácora, sustituir el término por **“Aprobado por el mismo profesional que creó la versión”** cuando el evento tenga `autoApproved:true`. No añadir un nuevo badge positivo junto a un borrador o un devuelto.

- **Justificación visual:** un solo estado clínico principal; elimina la competencia entre chip verde y borrador/devuelto.
- **Funcional:** el contrato define autoaprobación como coincidencia de creador/aprobador, no como aprobación por IA. La información sigue accesible en su contexto histórico.
- **Técnica:** `CONTRACT.md` del change, §9, líneas 600–602, y §12 establecen esa semántica. `nutrition-patient-detail.tsx` obtiene actualmente el badge de `patient.audit.some(...)`; el cambio propuesto es de presentación y copy. No corregir el mapper ni el audit recibido para hacer coincidir una captura. Si un evento parece vinculado a una versión incorrecta, documentar ese defecto por separado.
- **Componente:** reutilizar header y bitácora de `nutrition-patient-detail.tsx`, `NutritionStateChip` y tokens existentes. Sin componente nuevo. Traducción es/en de la nueva frase.

### D2. Cantidades y blancos táctiles legibles — N08/N10

**Decisión:** cada cantidad de alimento tendrá sufijo visible `g`, conservando el label “Gramos de {alimento}”. Agua mantendrá “Agua (vasos)”. Anterior/siguiente, actualizar, Ver y entradas de agua tendrán área interactiva mínima 44×44px; no reducir texto para recuperar espacio.

- **Visual:** cifra/unidad juntas, cantidades tabulares y controles alineados.
- **Funcional:** evita inferir la unidad y facilita interacción táctil sin introducir conversiones.
- **Técnica:** componer Input con un sufijo no interactivo; el label accesible ya contiene la unidad, por lo que el sufijo puede ser `aria-hidden`. Conservar tipo number, límites, valor y handlers. Mínimos locales dentro de `.nutrition-module`; no modificar Button/Input globales.
- **Componentes:** `nutrition-plan-editor.tsx`, `nutrition-queue.tsx`, `nutrition-program-cycles.tsx`, `nutrition.css`; reutilizar Button/Input. Las barras mensuales conservan su selector equivalente y no se amplían a 44px por barra.

### D3. Error con una recuperación clara — N11

**Decisión:** un único anuncio de error, título “No pudimos cargar Nutrición”, explicación de que los datos no están disponibles y botón Reintentar. Ruta/método/status bajo disclosure **“Detalles del error”**, sin anuncio de alerta adicional dentro de él.

- **Visual:** una superficie de error en vez de cajas y mensajes anidados.
- **Funcional:** prioriza la acción de recuperación; distingue fallo de búsqueda vacía. Counts desconocidos permanecen como tales.
- **Técnica:** reutilizar `NutritionError` y la información de error actual. Una región `role="alert"` para el mensaje principal. Disclosure semántico del repo; no cambiar apiFetch, retry, códigos ni tratamiento de autenticación.
- **Componentes:** `nutrition-feedback.tsx`, su integración en `nutrition-queue.tsx` y CSS local. Si el bloque interno compartido impone otro alert, usar su variante de presentación existente o composición local; no cambiar globalmente errores de otros módulos.

### D4. Fechas y precisión coherentes — N05/N06

**Fechas:** presentar rangos completos con año en calendario, tabla, selector y programación: ejemplo es `5 nov 2026 – 4 dic 2026`, y equivalente según locale en inglés. Zona del paciente visible en Programación. Ausencia sigue siendo “Sin definir”; la fecha fuente ISO no se modifica.

**Cifras:** inspector mensual y resumen diario comparten formato de hasta un decimal, incluida desviación. Una diferencia positiva no puede aparecer como `+0 kcal`: si es menor a la precisión visible, mostrar “Menos de 0,1 kcal sobre la meta” (equivalente para déficit). Para diferencias ≥0,1, mostrar valor con un decimal máximo. Los valores y la comparación `actual > meta` siguen intactos; no se crea umbral de tolerancia clínica. Las barras pueden conservar ejes compactos enteros, pero su nombre accesible e inspector deben expresar la precisión acordada.

- **Visual:** misma notación y unidades entre contextos; no alternar fechas ISO con fechas de lectura.
- **Funcional:** elimina contradicción “0,3 sobre meta” frente a “+0”. No altera advertencias ni seguridad clínica.
- **Técnica:** reutilizar `useNutritionNumber`, `NutritionValidity` y formateo de fechas de calendario/selector; extraer un helper **exclusivamente de presentación** si evita duplicación. Para fechas date-only, preservar día mediante parsing explícito de partes y formato en zona fija; el patrón existente UTC→UTC es válido si nunca se transforma a zona del navegador. No introducir fechas derivadas de su reloj.
- **Componentes:** `nutrition-shared.tsx`, `nutrition-plan-verification.tsx`, `nutrition-program-cycles.tsx`, `nutrition-cycle-switcher.tsx`; posible nuevo `features/nutrition/lib/nutrition-formatters.ts`, sin dependencias ni motor paralelo.

### D5. Breadcrumb que cede espacio sin perder identidad — N03

**Decisión:** permitir que el último segmento flexione y trunque dentro del espacio disponible. Los ancestros y separadores conservan su legibilidad. El nombre completo permanece en el DOM y en el header clínico; no se abrevia ni cambia en el provider.

- **Visual:** el buscador y las acciones dejan de dibujarse sobre el nombre.
- **Funcional:** conserva orientación y búsqueda sin ocultar el paciente de la ficha.
- **Técnica:** `topbar.tsx` contiene `shrink-0` en todos los segmentos; el último necesita `min-w-0` y capacidad de encoger, con límite del nav. Cambio de clases/composición, sin alterar `resolvedSegments`, rutas, contexto de clínica, búsqueda o autenticación.
- **Componente:** reutilizar `components/layout/topbar.tsx`; no nuevo Topbar de Nutrición. Es el único ajuste compartido previsto y se aísla para poder revertirlo sin revertir el módulo.

### D6. Bandeja compacta con acceso a todos los estados — N01

**Decisión:** conservar búsqueda de 44px y sustituir la cuadrícula permanente de siete filtros por un **selector nativo etiquetado “Estado del plan”**, de 44px, con las siete opciones y su count: “Todos (297)”, “Por aprobar (0)”, etc. El estado activo siempre queda visible; cambiarlo usa el mismo setter actual. Mantener paginación y fila seleccionada con barra/check. No añadir favoritos, ordenamiento nuevo ni panel colapsable en este alcance.

- **Visual:** búsqueda + selector ocupan dos filas compactas; elimina unas tres filas de filtros sin empequeñecer blancos. Rail conserva 280/304px inicialmente.
- **Funcional:** añade una apertura para cambiar estado a cambio de mostrar más pacientes; decisión deliberada de densidad, sin eliminar acceso a ningún filtro. Counts no se duplican como nuevos indicadores.
- **Técnica:** mismo `query.state`, `setState`, counts y paginación; no estado paralelo ni nuevas consultas. El repo ya usa selectores nativos en Nutrición; no instalar combobox.
- **Componentes:** `nutrition-queue.tsx` y `nutrition.css`; reutilizar estilos `.nutrition-select`. No extraer un componente de un solo uso salvo que simplifique claramente el archivo.

### D7. Cabecera clínica de dos niveles — N02

**Decisión:** nivel principal con nombre/documento, estado+Provisional, guardado y acción contextual. Nivel secundario compacto con ciclo/versión y aviso de la publicación vigente. Si hay selector de varias versiones, su etiqueta/opción contiene el contexto; no repetir el mismo ciclo/versión como otra insignia. Con una sola versión se conserva el texto estático actual. Volver a la bandeja permanece visible.

En desktop, identidad y acción comparten fila cuando caben; en móvil el nombre puede envolver, luego estado/acción. No se trunca el nombre clínico. Espacios internos de 8/12px y entre niveles de 16px, con padding de ficha existente 20/14px como punto de partida. Aviso de devolución conserva su texto y visibilidad; no comprimirlo a una elipsis.

- **Visual:** elimina una banda separadora amplia y repetición de metadatos; jerarquía paciente→estado→versión→tarea.
- **Funcional:** deja más contenido disponible al entrar y conserva qué se edita frente a qué está publicado.
- **Técnica:** reorganización del JSX, sin mover la propiedad del estado ni efectos de remount/refetch. `NutritionCycleSwitcher` mantiene `onOpen`, `locked` y selección real por prescriptionId.
- **Componentes:** reutilizar `nutrition-patient-detail.tsx`, `nutrition-cycle-switcher.tsx` y CSS. No crear un segundo workspace/provider.

### D8. Editor con detalle accesible y contexto persistente — N07/N09

**Decisión de lectura:** mantener las cuatro comidas y todos sus inputs operativos. Cada comida abre con nombre, horario y totales compactos; el usuario puede revisar antes de entrar al detalle. No ocultar por defecto todas las comidas ni obligar a navegar otra pestaña para editar.

Cada alimento presenta nombre (wrap), cantidad `g`, quitar y energía. En panel con ancho interior **≥720px**, mostrar también C/P/G/fibra en columnas alineadas con encabezados explícitos. Bajo ese ancho, usar disclosure **“Ver nutrientes de {alimento}”** que revela un `dl` con las cinco etiquetas/unidades. No usar tooltip ni elipsis como único acceso. El input de cantidad permanece en el mismo lugar y árbol de React; abrir detalle no guarda ni cambia el alimento. Container query por ancho de panel, no solo viewport, porque a 1024 la ficha mide 442px.

**Decisión de contexto:** una sola zona sticky de contexto dentro del scroller efectivo, compuesta por las pestañas y, únicamente en Plan, una fila de día/anterior/siguiente, kcal del día y estado de guardado. Evitar tres barras independientes. Identidad completa permanece en el header y breadcrumb desktop; en móvil la zona puede incluir un nombre abreviado visualmente, conservando nombre completo accesible. Aplicar a 30 días permanece como acción secundaria del editor con su confirmación, no gana prioridad por ser sticky.

- **Visual:** números comparables en ancho suficiente y detalle legible en móvil; menos viajes al encabezado. Zona sticky con fondo card opaco, borde y jerarquía sobria, sin nueva sombra pesada.
- **Funcional:** acceso a todos los nutrientes, día y estado de guardado durante la edición; no se pierde el foco ni el valor al expandir o cambiar tamaño.
- **Técnica:** reutilizar `NutritionNutrients`, datos/totales ya calculados y callbacks actuales. Nuevo componente de presentación **`nutrition-food-row.tsx`** para una fila y su detalle; recibe alimento, cantidades/totales y handlers, sin fetch, debounce ni copia local de la prescripción. La zona sticky se compone en el workspace/editor; no extraer un nuevo hook de negocio. Selección de día conserva un único propietario y una única instancia de control; no duplicar inputs desktop/móvil.
- **Componentes:** `nutrition-plan-editor.tsx`, nuevo `nutrition-food-row.tsx`, `nutrition-shared.tsx`, `nutrition-patient-detail.tsx`, `nutrition.css`. Si para la zona sticky hace falta conectar piezas distantes, usar composición/slot y estado existente; no añadir un store, duplicar `day` ni basarse en consultas imperativas al DOM.
- **Límite:** `scroll-margin` debe proteger foco y encabezados de comidas; adaptar offset al scroller del shell en móvil, no asumir que es `window`. La altura máxima objetivo de la zona es 144px a 390; si no cabe, llevar solo kcal (otros macros siguen en contenido), sin reducir controles de 44px.

## Frontera que no se toca

| Dominio | Invariante |
|---|---|
| Contratos y datos | Ningún cambio de rutas, DTO wire, mapper, payload, revision, endpoints o consultas. No cambiar `features/nutrition/services/**`, `types/**` ni backend |
| Cálculos | No editar `lib/nutrition-calculations` ni fórmulas, catálogo, objetivos, comparaciones de exceso o validaciones clínicas. Solo formato de valores ya calculados |
| Estados/permisos | Estados clínicos, transiciones, `canManage/canApprove`, revisión crítica, motivo obligatorio y publicación intactos. Provisional sigue siendo marca independiente |
| Persistencia | Misma cola/debounce de guardado, bloqueo durante mutación, conflictos/409, navegación y refresh. Sin guardados al expandir detalle ni cambiar tamaño |
| Publicación | Cambiar versión no aprueba, crea ciclo ni sustituye publicación. Aplicar día conserva confirmación y alcance actual |
| Datos reales | No importar producción, mutar pacientes reales ni fabricar series/ciclos/mediciones. QA local exclusivamente; fixtures sintéticas se declaran como tales |
| Alcance visual | No rediseñar Programas/Tests/Citas, no alterar paleta global, shell completo, fuentes o dependencias. Solo ajuste acotado de breadcrumb compartido |
| Entrega | Solo front; commits incrementales en la rama dedicada, sin push/deploy. OpenSpec se consulta, no se sincroniza ni archiva en esta misión |

Si una propuesta exige tocar estos dominios, se registra el conflicto y se presenta al orquestador; no se disfraza de ajuste visual. El resto de etapas independientes puede avanzar cuando Ciclo 4 esté autorizado.

## Ciclo 4 propuesto: etapas y archivos estimados

Rutas relativas a `coppaddresd-front`. `C/` abrevia `features/nutrition/components/`; `T/` abrevia `providers/translations/`. Los archivos nuevos están marcados. Cambios de es/en e instrucciones en español en cada etapa que agregue copy. Antes de escribir código: completar skills obligatorias del AGENTS frontend, leer docs locales relevantes de Next 16 y referencias de composición/accesibilidad; esta propuesta no sustituye ese requisito.

| Etapa / orden | Alcance y archivos estimados | Criterios de aceptación específicos | Riesgo y contención | Verificación al cerrar |
|---|---|---|---|---|
| **0 · Preparar baseline** | Solo `docs/nutrition-redesign-2026-11/` para evidencia; revisar árbol compartido, estado local y contratos. No restaurar fixtures de producción | Identificar cambios ajenos; stack HTTP accesible; comparar capturas asentadas de modal/contadores/tabs; registrar qué hipótesis siguen sin confirmación | Riesgo de trabajar sobre checkout movido o datos alterados por otra sesión: registrar HEAD y fixture antes de continuar | Baseline lint, tsc, i18n y suite de Nutrición una vez; errores previos documentados, sin atribuirlos al rediseño |
| **1 · Ajustes de retorno rápido** | D1–D3: `C/nutrition-patient-detail.tsx`, `C/nutrition-plan-editor.tsx`, `C/nutrition-program-cycles.tsx`, `C/nutrition-queue.tsx`, `C/nutrition-feedback.tsx`, `features/nutrition/nutrition.css`, `T/es.json`, `T/en.json`. Ajustar E2E existentes afectados por labels | Sin “Auto-aprobado” en header; etiqueta histórica precisa. `g` visible en cada fila. Controles de tarea identificados ≥44×44. Error con un anuncio principal, reintento y detalle disponible; ningún cero ficticio | Medio: copy de auditoría y anuncio accesible. No tocar mapper, servicios ni primitives globales. Commit independiente de estructura | Playwright focalizado: estados, labels, error/recuperación, blancos 1440/390; lint de archivos, i18n, tsc |
| **2 · Formato coherente** | D4: `C/nutrition-shared.tsx`, `C/nutrition-plan-verification.tsx`, `C/nutrition-program-cycles.tsx`, `C/nutrition-cycle-switcher.tsx`, posible `features/nutrition/lib/nutrition-formatters.ts` **nuevo**, traducciones; `e2e/nutrition-plan-review.spec.ts` / `nutrition-cycles.spec.ts` | Mismo rango y año en vistas; día no cambia entre zonas de navegador. 1850,3 frente a 1850 produce +0,3, nunca +0; diferencia subdecimal se expresa sin inventar tolerancia. Ausencia no se convierte en fecha/valor | Medio: cambio de día por zona y redondeos. Helper puro de presentación; valores/payloads de cálculo idénticos | Casos es/en, cambio de año, fechas null, exceso/defecto/igualdad y diferencia <0,1; lint, tsc, i18n |
| **3 · Breadcrumb aislado** | D5: `components/layout/topbar.tsx`; nuevo caso en `e2e/nutrition-ux-capture.spec.ts` o spec de composición existente. Sin cambiar provider | Bounding boxes de breadcrumb y buscador no se intersectan a 1024/1280 con nombre largo; nombre completo accesible y visible en ficha. Menú/acciones disponibles en móvil | Medio–alto: componente compartido. Modificación mínima del último segmento; commit separado para reversión selectiva | Playwright Nutrición + smoke de Programas, Tests y Citas a 1440/1024/390; lint y tsc |
| **4 · Bandeja y header** | D6–D7: `C/nutrition-queue.tsx`, `C/nutrition-patient-detail.tsx`, `C/nutrition-cycle-switcher.tsx`, CSS, traducciones; `e2e/nutrition-queue.spec.ts`, `nutrition-cycles.spec.ts`, `nutrition-rework.spec.ts` | Siete estados y counts conservados; filtro y búsqueda al volver; selección/URL/versiones intactas. En fixture comparable de 1440×900, lista visible ≥400px (antes 283). A 390×900 primer paciente antes de y450 (antes ~550). Con fixture de nombre largo y dos versiones, contenido de pestaña empieza antes de y650 (antes ~770), sin ocultar nombre/acción/vigencia | Medio: remount, setState o reset de filtros accidental. No cambiar hooks ni claves de identidad; metas de geometría subordinadas a legibilidad y 44px, no trucos de recorte | Playwright cinco anchos, teclado/es/en, vacío/error, cambio de paciente/versión y back/forward; suite queue/cycles/rework, lint, tsc, i18n |
| **5 · Editor y contexto** | D8: `C/nutrition-plan-editor.tsx`, `C/nutrition-food-row.tsx` **nuevo**, `C/nutrition-patient-detail.tsx`, `C/nutrition-shared.tsx`, CSS, traducciones; `e2e/nutrition-editor.spec.ts`, `nutrition-rework.spec.ts`, `nutrition-ux-capture.spec.ts` | Todos los nutrientes consultables sin elipsis como única vía; un input por alimento, valores/foco conservados al abrir detalle y resize; layout por ancho de panel. Día+guardado visibles al editar primera/última comida; zona sticky ≤144px a 390. Sin overflow horizontal en cinco anchos, foco no oculto. Editar/agregar/quitar/aplicar día mantienen resultados y confirmación | Alto: foco, callbacks y scrollers. Fila presentacional sin estado de negocio; no remount al expandir. Comprobar peticiones: abrir detalle/resize no escribe. Sin 30 solicitudes nuevas por cambiar modo visual | Playwright editor/review, regresión completa de Nutrición y recorrido local QA; lint/tsc/i18n completos, build final, capturas después y comparación |

Cada etapa deja commit revisable, resumen y resultados; no se mezcla el arreglo compartido con el editor. Estimación orientativa: etapas 1–3 de 30–60 min cada una; etapa 4 de 60–90 min; etapa 5 de 90–150 min más validación final 30–60 min. Sustituye la estimación inicial genérica de implementación: el alcance ahora incluye pruebas y editor responsive concreto. No es compromiso temporal ni justificación para omitir validación.

## Validación prevista

### Comandos verificados contra el repositorio

`package.json` ofrece lint/build/i18n/e2e; **no tiene script typecheck**. `tsconfig.json` incluye tipos generados de Next. Desde el front:

```powershell
corepack yarn lint
corepack yarn i18n:check
corepack yarn tsc --noEmit
corepack yarn build
corepack yarn e2e --project=chromium-desktop e2e/nutrition-queue.spec.ts e2e/nutrition-cycles.spec.ts e2e/nutrition-editor.spec.ts e2e/nutrition-plan-review.spec.ts e2e/nutrition-rework.spec.ts e2e/nutrition-ux-capture.spec.ts
```

Ejecutar secuencialmente build y tsc cuando compartan `.next`; si faltan tipos generados, generarlos mediante el flujo local soportado de Next antes de repetir tsc y registrar la causa. No omitir ni deshabilitar tipos para obtener verde. En etapas intermedias usar lint focalizado y las specs afectadas; la batería completa se ejecuta al final o ante cambio que lo justifique, sin repetir builds por cada ajuste reversible.

La configuración actual usa un worker y `reuseExistingServer` fuera de CI. El servidor se inicia/verifica en background conforme al workspace antes de la suite. **El proyecto `mobile-390` filtra solo `room-gating.spec.ts`: ejecutarlo no valida Nutrición.** Los casos nutricionales establecerán explícitamente los viewports dentro de las specs de Chromium o mediante Playwright MCP; no se reportará cobertura móvil inexistente.

### Matriz Playwright

| Grupo | Comprobaciones y evidencia prevista |
|---|---|
| Visual | 1440/1280/1024/768/390×900 comparables con baseline, más 390×844 para viewport menor. Capturas tras respuesta/estado esperado y fin de animaciones finitas; no `networkidle` como única prueba de UI lista. Pares bandeja, resultados, programación, plan, comida y revisión; JSON de dimensiones/overflow y controles |
| Datos/edición | Nueva versión QA local sin sobrescribir la publicada; editar cantidad, agregar/quitar, cambiar día 1/30, confirmar/cancelar copia y recargar. Comparar cantidades/totales y comprobar estado guardado. No capturar credenciales ni login |
| Navegación | Siete filtros, counts, búsqueda, vacío, paginación, selección persistente, versión publicada/borrador, URL y volver/adelante. Mantener bloqueo de navegación mientras guarda y recuperación de conflicto existente |
| Estados y permisos | Sin plan, borrador, pendiente, devuelto, aprobado, provisional, lectura sin Manage/Approve; valores desconocidos; loading/error con reintento. Fixtures HTTP explícitas para escenarios no disponibles, separadas del recorrido real |
| Teclado/a11y | Tab/Shift+Tab, flechas/Enter en tabs y select, Escape/retorno de foco, disclosure de nutrientes, labels g/vasos, una región de error, foco no oculto por sticky, confirmación masiva y validaciones de revisión intactas |
| Presentación | Fechas date-only con zonas diferentes, es/en, claro/oscuro con controles habilitados/deshabilitados, 200% zoom, reduced-motion. Muestras de texto ≥4,5:1 y controles/foco ≥3:1 cuando corresponda; no certificar WCAG completa por estas pruebas |
| Red y consola | Nuevo registro acotado por etapa de errores de consola/pageerror y status de red sin secretos; separar fallos previos de regresiones. Sin writes al expandir detalle/resize; sin aumento injustificado de consultas. Si hay 500, registrar y detener solo pruebas dependientes, no enmascarar con mocks |
| Alcance compartido | Tras Topbar: Programas, Tests y Citas con títulos largos/acciones. No arreglar sus problemas independientes durante el smoke |

Los E2E nuevos deben probar comportamiento relevante —acceso al detalle sin perder cantidad, filtro conservado, foco y precisión—, no repetir el JSX. Reutilizar fixtures y specs existentes; no crear otra suite de fixtures clínica. La revisión puede abrirse/cancelarse para preservar v1; una publicación real solo se ejecutaría en fixture local desechable preparado explícitamente, nunca en producción.

## Criterios de cierre y handoff

- Los 11 IDs quedan ligados a decisión y etapa: N01→4; N02→4; N03→3; N04→1; N05/N06→2; N07/N09→5; N08/N10/N11→1 (conservados en 5).
- Diff sin cambios en contratos, servicios, tipos wire, cálculo y persistencia; si aparece necesidad real, se detalla al orquestador antes de ampliar alcance.
- Lint, i18n, tsc, build y regresión de Nutrición con resultados explícitos; distinguir QA real, fixtures y pruebas omitidas con su motivo.
- Capturas y mediciones posteriores en `screenshots/despues/`, comparación por ID y riesgos pendientes; README/PROGRESS actualizados por etapa. No sobrescribir las 56 capturas anteriores.
- El orquestador revisa esta propuesta y habilita Ciclo 4. No se implementó ninguna de estas decisiones en el Ciclo 3.
