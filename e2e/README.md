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
| `room-gating.spec.ts` | Fuera de ventana: aviso «La sala todavía no está abierta», join ausente y **cero** requests a `sdk.twilio.com`. Fuera de gracia: sin reabrir. Corre también en proyecto móvil 390 px. |
| `room-call.spec.ts` | Prejoin → «Conectando…» → conectado (SDK stub), toggles de mic/cámara y finalización real (`session/end`). |
| `reopen-grace.spec.ts` | Dentro de la gracia: botón visible con el copy «hasta {minutes} minutos» con el default del backend (60, el seed no configura la gracia); fuera: sin botón. La reapertura exitosa requiere Twilio real (ver límites). |
| `dashboard-metrics.spec.ts` | `calls` en `/me/analytics` y `expect.poll` (≤ 10 s) del incremento de `sessionsStarted` vía API. |

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

