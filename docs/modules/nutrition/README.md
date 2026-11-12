# Nutricionista ERP

## Publicación automática (KAN-61, 2026-11-12)

El flujo vigente ya no exige aprobación de nutricionista. El worker del backend publica las generaciones válidas y conserva ciclo, versiones y bitácora. El ERP muestra `Publicado`/`Por publicar`; un usuario con `Nutrition.Manage` puede publicar un borrador completo mediante `/publish`, con revisión vigente y sin afirmar haber revisado personalmente las alertas. El código de revisión anterior se conserva para compatibilidad, pero no es el paso obligatorio de este flujo. El aviso completo solicitado aparece en la ficha y en la app. Las secciones siguientes documentan el rediseño histórico.

El calendario y el selector de ciclos usan también `Publicado / programado` y `Por publicar`. El gráfico mensual invita a comprobar porciones sin presentar la aprobación como requisito. Los estados del contrato (`aprobado`, `en_aprobacion`) se conservan por compatibilidad. La regresión `e2e/nutrition-publication-copy.spec.ts` comprueba calendario y programación mediante la UI con HTTP sintético.


## Revisión de diseño

La documentación canónica del cambio está fuera del Git frontend, en el OpenSpec
compartido del workspace. Este índice permite revisar los hitos por commit sin
duplicar la especificación.

- [Crítica dirigida](../../../../openspec/changes/plan-nutricional-erp/DESIGN-CRITIQUE.md): quince problemas contrastados con ocho capturas y componentes del ERP.
- Alcance: rediseño de presentación y composición; servicios, contrato HTTP y permisos existentes conservados.
- [Especificación visual](../../../../openspec/changes/plan-nutricional-erp/DESIGN-SPEC.md): dos paneles, tres pestañas y revisión mensual;1440/1280/390px, AA y controles clínicos existentes.
- Primitivas: PageHeader, SectionHeader, StatCard y Tabs del ERP; IBM Plex, tokens semánticos y densidad operativa. El detalle de decisiones permanece en OpenSpec.
- Implementación: mesa de trabajo en `features/nutrition`, ruta de detalle reutiliza la composición. Las operaciones conservan services/types existentes.
- [Capturas del rediseño](../../../../openspec/changes/plan-nutricional-erp/screenshots/rework/README.md): doce PNG reproducibles en1440×900 y390×844; `measurements.json` registra grilla/fuentes. Datos sintéticos explícitos para revisión visual, E1 real separado pasó32,4s.
- Crítica final: quince comparaciones medibles antes/después. Revisión independiente detectó siete ajustes aplicados; la nota canónica registra el veredicto y las comprobaciones finales.
- Regresión: `e2e/nutrition-rework.spec.ts` cubre dos paneles, tres pestañas, consulta de30 barras, edición/autoguardado, aprobación y fallback1280/390; specs de bandeja/editor adaptados a la navegación por pestañas.

## Ficheros del rediseño

- `app/(dashboard)/nutrition/[patientId]/page.tsx`
- `features/nutrition/components/nutrition-queue.tsx`
- `features/nutrition/components/nutrition-patient-detail.tsx`
- `features/nutrition/components/nutrition-plan-editor.tsx`
- `features/nutrition/components/nutrition-plan-verification.tsx` (nuevo)
- `features/nutrition/components/nutrition-review-dialog.tsx`
- `features/nutrition/nutrition.css`
- `features/nutrition/PRODUCT.md` (nuevo)
- `features/nutrition/DESIGN.md` y `features/nutrition/.impeccable/design.json` (nuevos)
- `providers/translations/es.json` y `providers/translations/en.json`
- `e2e/nutrition-queue.spec.ts` y `e2e/nutrition-editor.spec.ts`
- `e2e/nutrition-rework.spec.ts` (nuevo)
- `docs/modules/nutrition/README.md` (nuevo)

En el OpenSpec compartido: `DESIGN-CRITIQUE.md`, `DESIGN-SPEC.md`, `NOTES-frontend.md`,
`tasks.md` y `screenshots/rework/` (doce PNG, README y medidas). El cierre actualiza
OVERVIEW/OPEN-ITEMS y registra el handoff del workspace.
