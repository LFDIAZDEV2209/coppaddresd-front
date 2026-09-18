# QA por módulos — ERP (iniciado 2026-09-18)

Tracker vivo del testing E2E con Playwright sobre
`https://erp.coppadresd.com` (admin@cooppaddresd.com — doble `p`).
Metodología completa en `/PROMPT_TESTING.md`.

## Reglas de la sesión

- Una rama `qa/faseN-<modulo>` por módulo en `coppaddresd-front`. **Nunca push**:
  el usuario mergea a `dev` (el deploy a ECS sale del push a `dev`).
- Datos de prueba SOLO `qa.*@coppaddresd.com` / `Qa*`; eliminar al cerrar cada fase.
- Baseline lista de usuarios: **53**. Si difiere, hay rastro QA sin limpiar.
- Login con slider manual: lo completa el usuario en la ventana de Playwright.

## Estado

| Fase | Módulo (ruta)                                                                                 | Estado                                                                         | Rama                                 | Reporte         |
| ---- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------ | --------------- |
| 1    | Resumen (`/dashboard`)                                                                        | ⚠️ Validado con observaciones                                                  | — (sin cambios)                      | chat 2026-09-18 |
| 2    | Usuarios (`/users`, `/people/new`, `/people/importar`)                                        | ✅ Validado y corregido, **pendiente re-validar en desplegado**                | `qa/fase2-usuarios` (3 commits)      | chat 2026-09-18 |
| 3    | Profesionales (`/employees`)                                                                  | 🔨 En curso (flag clínicas implementado, pendiente deploy+re-test flujo nuevo) | `qa/fase3-profesionales` (2 commits) | ver abajo       |
| 4    | Pacientes (`/patients`)                                                                       | pendiente                                                                      | —                                    | —               |
| 5    | Roles y permisos (`/roles`)                                                                   | pendiente                                                                      | —                                    | —               |
| 6+   | Citas, Tests, Inventario, Tienda, Agentes, Contenido, Bienestar, Programa, Comunidad, Sistema | pendiente (orden sidebar en `lib/config/navigation.ts`)                        | —                                    | —               |

## Fase 2 — detalle (para no repetir trabajo)

- CRUD probado E2E con usuarios `qa.borrar/qa.import/qa.grant` (creados y eliminados).
- Round-trip permisos directos: grant en wizard (0→1) → detalle (1 directo) →
  diálogo Permisos revoke (1→0) → persistencia verificada → usuario eliminado.
- Import CSV E2E: plantilla, upload 1 fila, corrección en línea (1 error→2 válidas),
  confirmar, credenciales temporales, archivo inválido (banner), email duplicado
  (`POST → 400 "Email ya está registrado"` con `role="alert"` visible).
- Commits en `qa/fase2-usuarios`: `ad3ecb4` (redirect `?action=create`→`/people/new?mode=user`
  - plural usuario), `0cd8bf1` (Volver contextual `?from=` + aria-labels paginación ES),
    `e5c4c9e` (singulares importar + botón resultado contextual).
- **Re-validar post-deploy**: `?action=create`, Volver desde Users, "1 usuario
  encontrado", "Importar 1 persona", "Ir a usuarios", aria-labels ES.
- Deploy verificado AUSENTE el 2026-09-18 16:07 UTC (`/users?action=create` no redirige).

## Fase 3 — detalle

- Decisión usuario: ocultar clínicas (profesional+empleado; pacientes igual),
  rol global Professional automático, horario único semanal.
- Flag `features/professionals/config.ts` (`PROFESSIONAL_CLINICS_ENABLED=false`).
  Revertir = `true`. Backend intacto (acepta `clinics: []`, scope `Global` soportado).
- Flujo anterior probado E2E (pre-flag): crear profesional + invitación,
  roles por clínica (cambio+reversión), directorio, filtros, búsqueda, detalle.
- Remanente dev: empleado `QaProf Borrar` (qa.prof@) Invitado sin usuario
  (sin borrar-empleados por UI; expira invitación 72h). Usuario qa.prof eliminado (53 OK).
- Hallazgos nuevos: invitation link con `http://localhost:3000` en prod ✅ CORREGIDO
  en AWS (causa: `Auth__Email__FrontendUrl` nunca bindeaba — la sección es `Email`
  raíz; rev45 con `Email__FrontendUrl=https://erp.coppadresd.com`, verificado E2E);
  org muestra UUID (dato seed); Base UI Select no cerraba ✅ CORREGIDO en
  `components/ui/select.tsx` (causa: `data-[align-trigger=true]:animate-none`
  mataba exit-animation→unmount + `modal=true` por defecto bloqueaba todo;
  fix: sin animate-none + `modal={false}`, wrapper genérico preserva tipos);
  fila "01a03..." UUID visible en detalle (pendiente verificar visual);
  "1 profesionales visibles" corregido; placeholders EN→ES en wizard identidad.
- Flujo end-user verificado: invitación → aceptar → password → login como
  profesional → onboarding (profesión+especialidad+perfil) → dashboard con menú
  limitado + guards ("Acceso denegado" en /users) ✅. PERO dashboard muestra KPIs
  globales + acciones admin a un profesional de clínica (pendiente: gatear por
  permiso + KPIs por alcance — backlog).
- **[ALTO] /me ignoraba roles con scope** (descubierto como QaE2E: `roles:[]`,
  `permissions:[]` con rol Professional Global asignado): fix en rama backend
  `qa/auth-me-scoped-permissions` (coppAddresdBack, 1 commit, sin push) —
  nuevo `GetUserEffectivePermissionCodesAsync` (union laxa SOLO para UI;
  los claims JWT siguen estrictos para no globalizar permisos de clínica),
  `/me` une nombres de roles scoped, `CurrentContext` autoriza scope Global.
  Tests nuevos (2) + 84 Auth en verde. ⚠️ Requiere tu merge+push de backend
  y re-login del profesional para verificar menús.
- Remanente: usuario `qa.enduser` ✅ ELIMINADO (53 OK 2026-09-18); empleado huérfano
  sin usuario (sin borrar-empleados por UI).
- UUID en detalle (`01a03fcf...` en vez de "Professional" en el trigger): el scope
  y el catálogo traen el MISMO id (verificado por red), el lookup debería
  funcionar; fix defensivo en rama (label explícito en SelectValue). Re-verificar
  visual post-deploy.

## Deuda cross-módulo (no re-descubrir)

- `/settings/audit` → 404 (3 links). Página+endpoint van en módulo Sistema.
- `?action=create` en `/agents` sin soporte (va en módulo Agentes).
- Buscador topbar decorativo + campana sin onClick (backlog global).
- Mezcla voseo/tuteo sin convención ("Gestioná" vs "Selecciona"). Definir antes de Fase 5.
- Sidebar no oscurece en modo oscuro (`sidebar.tsx:88` `bg-white` fijo).
- "Último acceso" es mock (`features/users/services/users-mock.ts`); backend Auth no expone
  el campo. Org del import muestra UUID (dato seed de dev).
- Menú de fila a veces no abre al primer click con mouse sintético (con JS/teclado OK).
