# Diseño de asignación del programa

Registro de las decisiones construidas y verificadas el 4 de noviembre de 2026. Alcance: `/program/asignacion` y `/program/asignacion/[id]`, sus componentes de cola, ficha, perfil, catálogo y estado, tipos compatibles y traducciones español/inglés. Sin cambios de backend, dependencias ni despliegue.

## Dirección y jerarquía

Modo **Operate**: facilitar la revisión clínica dentro del ERP existente. Se conservan su tipografía, tokens semánticos y componentes shadcn sobre Base UI. La jerarquía prioriza paciente, perfil, sugerencia y decisión; la navegación por secciones y las acciones persistentes permiten acceder a cada paso en escritorio y móvil.

La cola usa tarjetas con identidad, condición principal, espera, evaluaciones registradas y acción de revisión. Los indicadores resumen explícitamente **esta página**, no toda la población. El progreso cuenta evaluaciones distintas registradas; no atribuye una finalización que los datos no confirman.

La ficha distingue mediciones, condiciones publicadas, resultados y contenido sugerido. Los nombres completos del plan y la actividad semanal permanecen visibles. El objetivo de decidir en menos de 15 segundos orientó la composición; no se realizó un estudio que mida ese tiempo.

## Datos y lenguaje clínico

El perfil admite tanto el formato anterior `tests` como `results`. En este último, los resultados de tipo `score` forman la vista principal y las subescalas se consultan en un desplegable. Las etiquetas conocidas se presentan en lenguaje clínico simple, con traducciones en ambos idiomas.

Los valores ausentes se muestran como «Sin registrar»: ausencia no significa normalidad. Las barras expresan el resultado respecto al máximo publicado de cada evaluación; las escalas son heterogéneas y no permiten comparar riesgos entre evaluaciones. Cuando un valor supera su máximo publicado, se muestra «Escala por confirmar», sin barra ni denominador engañoso, con ayuda al pasar el cursor o enfocar. No se inventan máximos, tipificaciones, diagnósticos ni fuentes.

La justificación de IA explica la sugerencia a partir del perfil y los criterios registrados; no elige el plan ni la rutina. Las fuentes existentes aparecen junto a los criterios y su ausencia se declara de forma explícita.

## Decisión y confirmación

Las acciones principales son aplicar la sugerencia, ajustar antes de aplicar y descartar con confirmación. Antes de activar, el modal muestra el plan nutricional, la rutina semanal, la fecha de inicio y la zona horaria del paciente. Aclara que se activarán las misiones definidas en la plantilla del programa; no promete una lista de misiones que la respuesta disponible no contiene.

Cancelar o cerrar la confirmación con Escape conserva la revisión sin enviar el POST de aplicación. El estado activo informa del inicio y del contenido aplicado, ofrece acceso al programa y bloquea las acciones de asignación.

## Evidencia y límites

Capturas comparativas y de estados en `qa-reports/assignment/`, a 1440 y 390 píxeles: `before-queue-*`, `before-detail-*`, `after-queue-*`, `after-queue-all-*`, `after-detail-*`, `after-suggestion-*`, `after-confirmation-*`, `after-active-*` y `after-active-profile-*`.

QA con Playwright en localhost verificó composición sin desbordamiento horizontal, navegación que cabe en ambos tamaños, resultados principales y subescalas, contenido completo del modal, cancelación y Escape sin POST, y bloqueo de acciones en el estado activo. No se ejecutó una aplicación real contra el backend ni una auditoría formal WCAG AA.

Validación final: lint, build de producción (90 páginas) e i18n sin claves faltantes finalizaron con exit 0. Los lanzadores de contexto/detector de Impeccable terminaron con exit 1 sin salida; se utilizaron auditoría visual propia y revisión independiente de cierre. Se respetó una tanda de ajustes y una confirmación final. Veredicto: **ship**.
