# Informe de revisión — Fase 09: marca «Antares» → «Copp Adresd»

**Rama:** `feature/erp-phase-09-brand-coppadresd` (misma rama en los 3 repos, partiendo de `origin/dev`)
**Worktrees:** `worktrees/coppaddresd-front-phase-09`, `worktrees/antares-paciente-phase-09`, `worktrees/coppAddresdBack-phase-09`
**Alcance aprobado:** solo copy visible (UI y datos sembrados visibles).
**Fuera de alcance (intacto):** bundle IDs/appId (`com.antares.paciente`), nombres de paquetes y repos, códigos técnicos (`bateria-antares`), namespaces GUID (`antares-community-demo:`, `antares-patient-account:`), correos demo (`@demo.antares.co`), handles (`@antares*`), URLs (`antares.bio`, `portal.antares.health`), claves de `localStorage`, comentarios y documentación.

## Front ERP (`coppaddresd-front`)

- `providers/translations/es.json` y `en.json`: renombre de claves y valores (es: 16 líneas; en: 20). `i18n:check` sin claves faltantes.
- Call sites y textos visibles: comunidad (redes, clubes, feed, grupos, miembros, dashboard, seeds), etiquetas de navegación (`Redes Copp Adresd`), `communityBrand` → `Copp Adresd · ERP Comunidad`, health-tests (análisis IA, perfil, mock de batería).
- **21 archivos, 65 líneas.** Verificación: `lint`, `build` y `i18n:check` verdes (0 errores).
- Restos `rg -i antares`: 20 coincidencias, todas comentarios, handles y el documento de plan (excluidas por alcance).

## App paciente (`antares-paciente`)

- i18n `es.json`/`en.json` (31 líneas cada uno) y textos visibles hardcodeados (AppContext, TestsPage, model, onboarding, academia, voz, perfil, wearables, programa, comunidad, data demo).
- Capacitor `appName` + permisos de cámara/micrófono/fotos; iOS `CFBundleDisplayName` + usage strings. `appId`/bundle ID intactos.
- **24 archivos.** Verificación: `lint`, `build`, `i18n:check` verdes; `npm test`: 313 pasan y 18 fallos **preexistentes** (reproducidos sobre `origin/dev` limpio: jsdom sin `localStorage` y aserciones de homeCards ajenas).
- Restos: 147 coincidencias, todas identificadores técnicos (localStorage, `bateria-antares`, appId/bundle ID), handles/URLs, rutas Windows de scripts y artefactos de validación en `docs/`.

## Backend (`coppAddresdBack`)

- Textos visibles: `CommunitySeeder`, `CommunityContentSeeder`, `ClubSeeder`, `CommunityQuery`, `ClubMutation`, `ProgramProgressSeeder`; seed SQL de baterías y scripts de siembra. Tests actualizados: `SystemSenderTests`, `ClubSeederTests`.
- Migraciones de datos (SQL `replace`, reversibles, sin cambios de esquema):
  - `20260917164021_RenameAntaresBrandInAppData` — esquema `app`: instruments, batteries, questions, program_templates.
  - `20260917164102_RenameAntaresBrandInCommunityData` — esquema `community`: profiles, posts, comments, messages, live_chat_messages, feed_events, chat_groups, clubs, club_events, live_sessions, network_channels (columna `handle` intacta).
- Aplicadas en la DB local de dev: barrido dinámico post-migración = **0 restos**; spot-checks: `Propósito · Copp Adresd`, `Batería de evaluación inicial Copp Adresd`, `Chat Copp Adresd general`, `Equipo Copp Adresd`, plantilla del programa.
- Nota: al regenerar `CommunityDbContextModelSnapshot.cs`, EF corrigió una desincronización preexistente de `origin/dev` (faltaba la entidad `CommunityDailyMetric` y había una línea `ToTable` intrusa).
- Verificación: `dotnet build` 0 errores / 74 warnings; Community.UnitTests 115 ok / 5 skip; Community.IntegrationTests 63 ok y 4 fallos **preexistentes** (reproducidos sobre `origin/dev`).
- Restos: 315 coincidencias, todas comentarios, docstrings, logs, scripts/docs históricos, códigos `bateria-antares`, namespaces GUID y correos demo.

## Pendientes

- QA visual de la fase 03 (`/patients/prescriptions` → `/patients`): navegador MCP ocupado; verificación estática verde.
- **Sin commit ni push:** ramas listas para revisión y commit manual.
