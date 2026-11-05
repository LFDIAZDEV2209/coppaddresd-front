# Nutricionista ERP

Herramienta clínica para profesionales con permisos Nutrition.Manage o
Nutrition.Approve. Su tarea es localizar un paciente, revisar resultados y ciclo,
ajustar un plan de30 días y aprobar o devolver con una decisión clínica explícita.

La dirección elegida por el owner es el ERP CoppAddresd existente: dos paneles en
escritorio, lista→ficha en móvil; tres pestañas Resultados y ciclos, Programación,
Plan de30 días editar. PageHeader, SectionHeader, StatCard y Tabs compartidos;
IBM Plex Sans/Mono cargadas, tokens vigentes, contraste AA, sin emojis ni fuentes nuevas.

Las barras mensuales y verificaciones ayudan a revisar, no certifican seguridad
clínica. Los datos ausentes se muestran como desconocidos; los errores son visibles.
La aprobación conserva consentimiento de críticas desmarcado y comentario al devolver.
Estados y revisiones son del backend. Esta intervención cambia presentación y
composición, conserva services/API, permisos y reglas existentes. Sin push/deploy.

Contrato canónico: `openspec/changes/plan-nutricional-erp/DESIGN-SPEC.md` del workspace.
