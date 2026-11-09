# Capturas anteriores

56 PNG obtenidos con Playwright MCP contra localhost:3000, 9 de noviembre de 2026. Altura 900px; ancho indicado en nombre. Son capturas ANTES de cambios de UI, aunque los datos del fixture QA recorren estados distintos durante las pruebas.

| Grupo | Contenido |
|---|---|
| `programas-*`, `tests-*`, `citas-*` | Tres módulos de referencia: desktop/móvil, tabla y scroll. Programas-busqueda no acredita vacío |
| `bandeja-{ancho}` | Sin selección: 1440, 1280, 1024, 768, 390 |
| `bandeja-vacia-1440`, `sin-plan-1440` | Búsqueda sin coincidencias y paciente sin plan |
| `resultados-{ancho}`, `programacion-{ancho}`, `plan-{ancho}` | Tres pestañas en los cinco anchos |
| `comidas-{ancho}` | Editor desplazado hacia desayuno en los cinco anchos |
| `resultados-aprobado`, `borrador`, `por-aprobar`, `devuelto-*` | Estados del fixture local |
| `edicion-*`, `agregar-alimento-*`, `confirmar-30-dias-*` | Cantidades, catálogo y confirmación masiva |
| `revision-*` | Revisión cancelada, sin publicación. `revision-390` es transición al redimensionar; usar `revision-390-apertura-directa` para la apertura móvil |
| `nutricion-error-*`, `nutricion-teclado-*` | Error HTTP 500 inicial, cinco anchos y foco; no representa el estado final recuperado |
| `selector-dia-teclado-*`, `programacion-oscuro-*` | Selector/foco y muestra de tema oscuro |

No contienen formularios de login ni credenciales. Referencias históricas consultadas sin duplicarlas: `openspec/changes/plan-nutricional-erp/screenshots/prod-qa-1109/`.
