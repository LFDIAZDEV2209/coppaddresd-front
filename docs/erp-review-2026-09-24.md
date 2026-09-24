# Review — Fases 7, 8, 4.3, 4.4 y módulo Redes (rama `carlos`)

Fecha: 2026-09-24. Rama: `carlos`. Sin tocar OpenSpec (flujo directo autorizado por Carlos).

## Fase 7 — `/health-tests/pacientes`

- 4 KPIs en una fila en escritorio (`lg:grid-cols-4`) con layout centrado nuevo
  (`StatCard.centered`): icono arriba, label/valor/contexto centrados.
- Fix i18n: "batería activa"/"baterías activas" ahora pasan por `t()`.
- Los filtros ya funcionaban (riesgo/profesional/batería/test/búsqueda); sin cambios.

## Fase 8 — Dashboard de tests

- Mapa pastel: `#A7F3D0 / #FDE68A / #FCA5A5 / #E2E8F0` (`mapRiskPalette`).
- Hover más presente: halo 0.22, pop `scale(1.022)`, sombra suave, anillo 2.75.
- Selector acumulado por estados ya existía y sigue acotando KPIs, tabla y gráficas.
- Redistribución: fila 1 = Evolución (2/3) + Cobertura pie (1/3); fila 2 =
  Distribución de riesgo + Cobertura por categoría; Alertas al final (sin cambios).

## Módulo Redes (NUEVO — mock, backend pendiente)

- `/redes/radicaciones`: las redes prestadores solicitan autorizaciones.
  NIT → consulta de datos → diagnóstico CIE-10 (nivel urgencias por defecto) →
  CUPS/CUMS manual **o** cotización adjunta que se "analiza" y devuelve líneas →
  valores editables inline → total → radicar → historial con estados y detalle.
- `/redes/facturacion`: dashboard (KPIs + facturaciones/RIPS expandibles) →
  Nuevo cargue: validación de **CUV** autocompleta prestador/factura/valores
  (todo editable) → registros reportados por tipo RIPS → archivos con **carga
  rápida** (muestra la estructura de nombres esperada + lote) y **carga manual**
  (archivo por archivo, con o sin archivo).
- Nav: nuevo módulo "Redes" + "Solicitudes" renombrada a **Bandeja** (4.1).
- `features/redes/`: types, data/mock-data, services (latencia simulada,
  contratos listos para `apiFetch` cuando exista el backend), i18n completo.

## Fase 4.3 — Sala virtual clara

- Previa/fin/carga/error en blanco (tokens del tema); header, chips y controles
  blancos. Los tiles de video permanecen oscuros (superficie de video).
- Panel inferior (participantes + formularios) en `bg-card`.
- `form-ui.tsx`: primitivas claras (`formInput`/`formTextarea`, antes
  `darkInput`/`darkTextarea`), `FormHeader` con tints suaves.
- `ClinicalEncounterPanel`: variante única clara + búsqueda CIE-10 siempre
  disponible (antes solo en dark).

## Fase 4.4 — Agendar desde la agenda

- Botón "Nueva cita" en el header de la agenda (profesional y admin);
  reutiliza `CreateAppointmentDialog` del calendario.

## Fases ya implementadas por otro agente (verificado, sin cambios)

- 11.x alertas health-tests: cockpit con selección, filtros por anomalía
  (indicador/severidad/fecha), canales community/SMS, plantillas con versiones,
  historial de notificaciones con gráficas.
- 4.1 parcial: workspace agenda+calendario consolidado; `/appointments/calendario`
  ya redirige; requests = Bandeja.
- Fase 2 pacientes, Fase 9 renombrado Antares→Copp Adresd, Fase 10/10b pacientes
  y baterías.

## Verificación

- `yarn tsc --noEmit` ✓ · `yarn lint` ✓ · `yarn build` ✓ (90/90 rutas, incl.
  `/redes/radicaciones` y `/redes/facturacion`) · `yarn i18n:check` missing = 0.

## Fase 6 — Catálogo CPT (EE. UU.)

- Backend (rama `carlos` de `coppAddresdBack`, commit `344f2a1`): tabla
  `app.cpt_codes` con code único + GIN trigram, seed curado idempotente
  (~50 códigos comunes), `GET /api/v1/catalogs/cpt-codes?search=` y migración
  `AddCptCatalog` con GRANT a `app_user`. 766 unit tests ✓.
- Frontend (commit `0653bc6`): `searchCptCodes` en `catalogs-service` +
  buscador CPT por fila en las órdenes de procedimientos de la sala.
- Nota de licenciamiento: CPT® es propiedad de la AMA; el seed es un subset
  informativo común, ampliable por script sin tocar la tabla.

## Fases cerradas por otro flujo (verificadas, sin cambios)

- Fase 1: toggle visible de profesionales (decisión de Luis, no three-dots).
- Fase 2: dashboard general de pacientes con tabs `Vista general / Mapa
  geográfico / Estado clínico` enlazables por `?tab=` y `?state=` compartido.
- Fase 10/10b, Fase 9, Fase 11.x: ya implementadas.
- 4.5: alertas de citas ya integran eventos de sesión y `NoShow` con
  notificaciones.

## Bloqueadas (requieren definición de producto)

- **Fase 5 (stream → community)**: el plan exige identificar proveedor,
  credenciales y contrato del «Stream service» antes de integrar. La comunidad
  hoy tiene transmisiones mock («Transmisión estilo broadcast»). Pendiente de
  definición de Lucho/Luis: proveedor (Twilio Live/LiveKit/Mux?) y credenciales.
- **Iconos 3D transversales**: esperar assets de Byron.
- **Radicaciones/RIPS backend**: los mocks del módulo Redes definen el contrato
  esperado; falta exponerlo en `coppAddresdBack`.

## Pendiente

- Backend real para Redes (mock expone los contratos esperados).
- Fase 4.2/4.5 fino (calendario ya muestra todas las citas por defecto).

