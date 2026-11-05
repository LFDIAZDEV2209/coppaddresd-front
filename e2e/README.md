# Suite E2E del ERP (Playwright)

Suite Playwright del módulo de Citas/Telemedicina (F5). Corre contra el stack
real (Next.js + gateway + Auth + Telemedicina + Postgres) y stubbea **solo** el
SDK de Twilio por intercepción del CDN, para validar estados de llamada sin
credenciales ni media real.

## Journeys cubiertos

| Spec | Qué valida |
| --- | --- |
| `login.spec.ts` | Credenciales demo (Enter), credenciales del profesional y error con credenciales inválidas. |
| `booking-lead-time.spec.ts` | El alta manual prellena el primer hueco (≥ 2 h 30 min, bloques de 30) y el guard local de reprogramación. |
| `room-gating.spec.ts` | Fuera de ventana: el personal ve el join disponible (sin aviso «La sala todavía no está abierta»). Fuera de gracia: sin reabrir. Corre también en proyecto móvil 390 px. |
| `room-call.spec.ts` | Prejoin → «Conectando…» → conectado (SDK stub), toggles de mic/cámara y finalización real (`session/end`). |
| `reopen-grace.spec.ts` | Dentro de la gracia: botón visible con el copy «hasta {minutes} minutos» con el default del backend (60, el seed no configura la gracia); fuera: sin botón. La reapertura exitosa requiere Twilio real (ver límites). |
| `dashboard-metrics.spec.ts` | `calls` en `/me/analytics` y `expect.poll` (≤ 10 s) del incremento de `sessionsStarted` vía API. |
| `citas-flujo.spec.ts` | Flujo repetible Misión 3.4: bandeja → «Confirmar y agendar» (`AvailabilitySlotPicker` real de `/availability`) → cita en la agenda del día → detalle «Confirmada»/«Sala virtual» → verificación API (request `Converted`, cita `Confirmed`, 201 Created). |

## Requisitos y comandos

```bash
# 1. Stack backend (Postgres docker + Auth/Community/Gateway/Telemedicine/Api)
../coppAddresdBack/scripts/dev-up.sh

# 2. Suite completa (migra Telemedicina, siembra fixtures y corre Playwright)
./scripts/e2e-local.sh

# 3. O manualmente
yarn e2e:seed          # fixtures deterministas (e2e/.fixtures.json)
yarn e2e               # playwright test (levanta `next dev` si no está arriba)
yarn e2e:ui            # modo UI
yarn test:e2e          # alias de `yarn e2e`
```

Variables de entorno útiles:

| Variable | Default | Uso |
| --- | --- | --- |
| `E2E_BASE_URL` | `http://localhost:3000` | URL del ERP. |
| `E2E_GATEWAY_URL` | `http://localhost:5080` | Gateway para los checks API-level. |
| `E2E_DB_DSN` | DSN de `seed_telemedicine.py` | Seed de fixtures. |
| `E2E_AUTH_URL` | `http://localhost:5123` | Reset de password demo (requiere Auth en Development). |
| `AUTH_INTERNAL_KEY` | `Auth:InternalApiKey` del backend | Header `X-Internal-Key` del seed. |
| `E2E_FIXTURES_PATH` | `e2e/.fixtures.json` | Contrato seed ↔ specs. |
| `E2E_TWILIO_REAL` | `0` | `1` habilita el test de reapertura exitosa (QA con Twilio real). |

`yarn e2e:seed` requiere `psycopg` (`pip install "psycopg[binary]"`) y es
idempotente: borra solo las citas marcadas con `E2E_SEED_USER_ID` y las recrea.

## Stub de Twilio

`e2e/stubs/twilio-video.stub.js` se sirve en lugar de
`https://sdk.twilio.com/js/video/releases/2.36.0/twilio-video.min.js`. El
loader de producción (`lib/twilio/twilio-loader.ts`) no se modifica. El stub
simula `connect`, tracks locales de audio/video (toggles), `disconnect` y
expone `window.__fakeTwilio` para emitir eventos/espiar la conexión. Las salas
de las citas del seed están pre-creadas, así que el backend no llama a
`CreateRoom` (solo firma el join-token localmente).

## CI

`.github/workflows/e2e-frontend.yml` (nightly + `workflow_dispatch`):

- Runner `ubuntu-latest` con Docker (para `docker compose up postgres` de
  `dev-up.sh`), Node 22 (corepack Yarn 4) y .NET 10.
- Checkout del ERP + `LFDIAZDEV2209/coppAddresdBack` (usa
  `secrets.CROSS_REPO_TOKEN`; con repo público alcanza `github.token`).
- Genera `appsettings.json` mínimos (están gitignoreados) y usa credenciales
  Twilio **falsas** para firmar el join-token sin llamadas reales.
- Corre `dev-up.sh`, migra Telemedicina (`--migrate`), siembra y ejecuta
  `yarn e2e`; publica `test-results/`, `playwright-report/` y los logs del
  backend con `if: always()`.

## Lo que NO se prueba en CI (fallback)

| Fuera de CI | Motivo | Fallback |
| --- | --- | --- |
| Media real de Twilio (tracks/calidad) | Sin credenciales ni egress estable al CDN | QA manual con Twilio real; el stub solo valida estados/transiciones. |
| Webhooks entrantes (`room-ended`, `participant-connected`) | Twilio necesita URL pública y firma válida | Tests de integración del backend con `IVideoProvider` fake. |
| Reapertura exitosa (`ReopenSession`) | El comando crea una sala nueva en el proveedor | `E2E_TWILIO_REAL=1 yarn e2e reopen-grace` (QA manual con Twilio real). |
| Cámara/micrófono en WKWebView (iOS) y permisos Android | Requiere dispositivo físico | QA manual en dispositivo. |
| Screen share real (picker del navegador) | Headless depende de flags frágiles | QA manual; el botón oculto sin `getDisplayMedia` es teóricamente testeable. |
| Webhooks/push/SMS (F2) | Requiere tokens/dispositivos reales | Tests unitarios del backend. |

## Notas

- `workers: 1`: el seed es único y comparte estado en el backend (las specs
  mutan citas). Para re-correr una spec mutante, volvé a sembrar.
- Los timestamps del seed son relativos a `now` (p. ej. completada hace 5 min,
  gracia por defecto 60): corré el seed inmediatamente antes de la suite.
- **Sala/detalle/reapertura corren como admin** (`admin@coppaddresd.com`): el
  fetch inicial de un deep-link no lleva `X-Clinic-Id` (el ContextProvider lo
  setea en un efecto posterior), así que un usuario con permisos solo scoped
  recibe 403 al abrir la sala directo. Queda como hallazgo de producto; la
  suite usa permisos globales para no acoplarse a esa carrera.
- El formulario de login **no tiene botón submit**: Enter dentro de los inputs
  no envía el formulario. La suite confirma con la alternativa de teclado del
  slider (focus + `End`), documentada en `slide-to-confirm.tsx`. Hallazgo:
  el comentario del componente afirma que Enter funciona, pero no hay default
  button que lo dispare.

### Contrato de disponibilidad (QA)

`citas-availability-contract.spec.ts` queda preparado para validar 1.1/1.1a
contra el Gateway real cuando exec-backend publique `/availability`. La spec
es opt-in y se omite explícitamente mientras el contrato o los fixtures no
estén publicados:

```powershell
$env:E2E_AVAILABILITY_READY = "1"
$env:E2E_ACCESS_TOKEN = "<token de prueba>"
$env:E2E_AVAILABILITY_DATE = "2026-10-05"
$env:E2E_AVAILABILITY_PROFESSIONAL_ID = "<uuid>"
$env:E2E_AVAILABILITY_SPECIALTY_ID = "<uuid>"
$env:E2E_AVAILABILITY_ORGANIZATION_ID = "<uuid>"
$env:E2E_AVAILABILITY_NO_SCHEDULE_PROFESSIONAL_ID = "<uuid>"
corepack yarn e2e --grep "contrato de disponibilidad"
```

La prueba de especialidad verifica el veredicto D1: consulta agregada sin
asignar profesional ni reservar un slot. El contrato requiere `organizationId`
en este modo. Los UUID y el token se inyectan por entorno y no se almacenan en
el repositorio.

### Nutrición ERP: HTTP simulado y E1 real

El producto usa exclusivamente `lib/api/http.ts`. Las fixtures sintéticas viven
en `e2e/fixtures/`; Playwright intercepta HTTP explícitamente, sin activar mocks
en la aplicación. La suite de cierre ejecutó 14/14 casos sobre build de producción
local. Cubre E1, permisos, ausencia de N+1, errores 404/contrato/409, revisiones,
edición, publicación, devolución y agua nullable. No certifica persistencia real
ni cálculo clínico del motor.

Con el frontend servido en background y disponible en el puerto elegido:

```powershell
$env:E2E_BASE_URL = "http://localhost:3107"
$env:NUTRITION_E2E_MODE = "mock"
corepack yarn playwright test e2e/nutrition-queue.spec.ts e2e/nutrition-editor.spec.ts --project chromium-desktop
```

Para E1 real, configurar `NUTRITION_E2E_MODE=live` y ejecutar la spec de bandeja
con `--grep "E1 sin plan provisional"`. Ese caso no intercepta peticiones.
Acepta `NUTRITION_E2E_STORAGE_STATE` (archivo de sesión fuera del repositorio),
`NUTRITION_E2E_PATIENT_ID`, `NUTRITION_E2E_SEARCH`, `NUTRITION_E2E_WEIGHT`,
`NUTRITION_E2E_HEIGHT`, `NUTRITION_E2E_BIRTH_DATE` (YYYY-MM-DD) y
`NUTRITION_E2E_SEX` (female/male). Usar un paciente QA sin plan ni tests, con
alertas críticas previstas; el caso genera y aprueba una prescripción.

Al cierre de Ola3 no había backend local en5080/5122. En Ola4B las propuestas
anteriores se sustituyen por `GET /api/v1/nutrition/inbox` y `GET /api/v1/nutrition/foods`.
La ficha usa la colección de prescripciones del paciente y el detalle por id;
no existe un alias Nutrition de perfil por paciente. Errores, contrato y evidencia en
`../openspec/changes/plan-nutricional-erp/NOTES-frontend.md` del workspace.

#### Ola 4: ejecución real local (2026-11-05)

El stack está iniciado mediante `scripts/dev-up.ps1`, con ERP `corepack yarn dev`
en3000 y gateway5080/API5122. PostgreSQL Docker ya estaba healthy. Se aplicó
`dotnet run --no-build --project src/CoppAddresd.Api -- --migrate` en Development:
tablas nuevas y35 alimentos disponibles, sin prescripciones creadas por esta QA.

`CONTRACT.md` faltó en ambos intentos, separados por cinco minutos. El Swagger
real solo expone prescripciones/acciones; faltan las tres lecturas anteriores.
La UI autenticada registra404 en bandeja y ficha. No se inventa una ruta alternativa.
E1 real queda bloqueado antes de generar. `PRUEBA NOMBRE` tiene11 evaluaciones
completadas; el paciente sintético existente `Test E2E` (documento88888888,
id `2ab93970-b240-4122-b1ba-74aa9769ac38`) tiene0 evaluaciones completadas y0
prescripciones. No se ejecuta el seed legacy masivo ni el seed de asignación:
no proporcionan el escenario nuevo y afectarían datos fuera de esta QA.

E1 acepta una sesión externa mediante `NUTRITION_E2E_STORAGE_STATE`; si falta,
usa el login real del admin QA ya existente (`loginAsAdmin`, variables
`E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`). No se intercepta HTTP en ese caso.
`NUTRITION_E2E_SCREENSHOTS` habilita las ocho capturas por etapa en el directorio
elegido, en1440×900 y390×844. Se generan únicamente al alcanzar cada etapa.
Los otros cinco casos de la spec siguen siendo regresiones HTTP simuladas y
se informan por separado del único journey real. La expansión del sidebar usa
teclado para evitar el indicador de Next dev que se superpone al botón inferior.
Resultado final del comando `corepack yarn e2e e2e/nutrition-queue.spec.ts
--project=chromium-desktop` con `NUTRITION_E2E_MODE=live`: **5 passed,1 failed**
(13,7s). Las cinco regresiones simuladas pasan; E1 falla explícitamente al
esperar200 y recibir404 del GET global. No se omite ni se convierte el fallo en éxito.

#### Ola4B: contrato exacto y routing real

Se leyó `CONTRACT.md`. Acciones POST bajo
`/api/v1/nutrition/patients/{patientId}/prescriptions/{id}/{verb}`:
`save`, `apply-day`, `create-version`, `submit`, `approve`, `return`, `regenerate`.
Generar es POST a la colección, no `/generate`. Cada respuesta sustituye id y
revision; nueva versión también actualiza el query `prescriptionId` de la URL.
Al abrir desde bandeja se conserva el id seleccionado; un deep-link con solo
paciente usa la primera cabecera en el orden que devuelve la API. Las comidas
se leen del detalle, nunca de las cabeceras vacías del listado. El GET móvil
`/api/v1/me/nutrition-plan` queda solo como referencia al contrato congelado.

La bandeja apunta a `/inbox`; el DTO observado en el backend en preparación es
`{items:[{patientId,patientName,state,prescription}],total,page,pageSize}`.
`prescription` incluye `k` y `revision`; no hay documento, contadores globales
ni `totalPages`. Solo se calcula paginación y total del filtro consultado;
los otros contadores no se muestran ni se solicitan por separado. Se omite
`state` para Todos y `search` busca por nombre. Usar `NUTRITION_E2E_SEARCH="Test E2E"`,
no el documento del fixture. `/foods` sigue pendiente de entrega HTTP.

Demografía opcional: DTO existente `/api/v1/patients/{id}`. Su403/404 no bloquea
una prescripción ya autorizada por Nutrition: se muestra error y UUID, sin
inventar datos clínicos. El DTO de prescripción no incluye perfil completo,
timezone ni número de tests. Una página llena de100 cabeceras no se asume como
historial entero: ese caso requiere ampliar navegación y da error explícito.

Regresiones: ProblemDetails.detail visible, recarga409 antes de nuevo envío,
id nuevo/revision1 al versionar, y apply-day con
`edit:{sourceDay,confirmManualEdits:true}`. La recarga también está dentro del
diálogo para que el modal no impida resolver el conflicto. Suite simulada final:
**15 aprobadas y1 sonda real omitida**,40,8s; incluye identidad403/404 opcional.

Spec con modo live: **6 aprobadas,1 fallida**,20,1s. Son **5 regresiones simuladas**,
**1 sonda real aprobada** y **E1 real fallido** (`GET /inbox`404). La sonda verifica
GET de prescripciones200 tanto en API5122 como gateway5080. Artefactos reales
en `qa-reports/nutrition/wave4b-live/`; simulados en `wave4b-simulated/`.

Health: Api/Auth/Telemedicine Unhealthy, Community Healthy. Los logs registran
`HttpClient.Timeout` de2s en las sondas; HTTP directo responde200 en aproximadamente
2,5–3s. No se determinó la causa final de esa latencia ni se modificó el gateway.
Cuatro capturas reales renovadas documentan /inbox404 y /foods404. Editor y
aprobación siguen inaccesibles y no se sustituyen con capturas simuladas.

