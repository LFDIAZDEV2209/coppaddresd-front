# Reorganización del ERP — 2026-11

> Origen: instrucciones de Luis (13-11-2026) para organizar la administración de datos
> del ERP con respecto a la app. Este documento registra lo ejecutado, lo pendiente y
> las decisiones abiertas que alimentarán el plan con Claude Code (vía Herdr).

## 1. Contexto

El ERP erp.coppadresd.com acumuló módulos legacy que hoy duplican o confunden la
operación: el módulo de Nutrición ya cubre lo que hacían los planes de alimentación y
las asignaciones de Bienestar, y varios módulos (Inventario, Tienda) no están en uso
operativo. Además, el módulo Comunidad delega a una vista independiente con sidebar
propio, lo que rompe la coherencia de navegación. La reorganización será progresiva:
primero ocultar ( reversible), después reorganizar con plan aprobado.

## 2. Ejecutado — ocultamiento del sidebar (13-11-2026)

**Alcance**: solo navegación. Las rutas, páginas y permisos backend quedan intactos
(ocultar menú NO equivale a retirar autorización — lección de la fase 3 del plan ERP).

| Elemento ocultado        | Tipo              | Motivo                                                          |
| ------------------------ | ----------------- | --------------------------------------------------------------- |
| Inventario (módulo)      | Módulo completo   | Fuera de uso operativo; se reactivará cuando el negocio lo pida |
| Tienda de bienestar      | Módulo completo   | Fuera de uso operativo                                          |
| Planes de alimentación   | Ítem de Bienestar | Sustituido por el módulo Nutrición                              |
| Asignaciones (Bienestar) | Ítem de Bienestar | Sustituido por el módulo Nutrición                              |
| Clínica (Programa)       | Ítem de Programa  | Pendiente de reorganización del módulo Programa                 |

**Estado resultante del sidebar**: Bienestar muestra solo «Rutinas de ejercicio»;
Programa muestra Dashboard General, Adherencia & Rachas y Gestión del programa;
Nutrición, Inicio, Gestión, Tests de salud, Agentes AI, Contenido, Comunidad y
Sistema sin cambios.

### Implementación

- `lib/config/feature-visibility.ts` — cinco flags nuevos siguiendo el patrón
  existente de `APPOINTMENTS_ENABLED` (env var `NEXT_PUBLIC_*_ENABLED`, default
  deshabilitado). En Next 16 las `NEXT_PUBLIC_*` se hornean en el build.
- `lib/config/navigation.ts` — `hidden: !FLAG` en los 5 elementos. El sidebar
  (`components/layout/sidebar.tsx`) y la búsqueda global
  (`components/layout/global-search.tsx`) ya filtran por `visibleNavModules`
  (`lib/config/navigation.ts`), así que el ocultamiento aplica en ambas superficies
  sin código extra.

### Reactivación

Poner la variable correspondiente en `true` antes del build
(`.env.local` en dev; variables del task def ECS en prod):

```bash
NEXT_PUBLIC_INVENTORY_ENABLED=true
NEXT_PUBLIC_STORE_ENABLED=true
NEXT_PUBLIC_WELLNESS_NUTRITION_PLANS_ENABLED=true
NEXT_PUBLIC_WELLNESS_ASSIGNMENTS_ENABLED=true
NEXT_PUBLIC_PROGRAM_CLINICA_ENABLED=true
```

### Validación

- `corepack yarn lint` ✅ · `corepack yarn build` ✅ (90+ rutas intactas, incluidas
  las ocultadas) · `corepack yarn i18n:check` ✅ (0 claves faltantes; los orphans
  son preexistentes).
- Verificación funcional con script efímero (tsx) sobre `visibleNavModules`:
  estado default oculta los 5 elementos; con las env vars en `true` reaparecen
  (reactivación probada).
- Los e2e (`e2e/*.spec.ts`) navegan por URL directa (`page.goto`), no por clicks
  del sidebar: sin impacto.

### Entrega

- Rama `feature/erp-sidebar-reorg` desde `origin/dev` (front, 13-11-2026).
- Commit único con los dos ficheros. Luis revisa y hace merge a `dev` (el agente
  no mergea). El push a `dev` dispara Deploy Frontend (erp.coppadresd.com).

## 3. Pendiente — para el plan con Claude Code (Herdr)

Instrucciones de Luis aún no ejecutadas, a resolver en la planeación:

1. **Programa**: revisar el módulo poco a poco (Dashboard General, Adherencia &
   Rachas, Gestión del programa). «Tenemos que organizar bien el tema del programa;
   lo miraremos e iremos poco a poco revisando.»
2. **Comunidad**: hoy el ítem «Comunidad» del sidebar principal lleva a
   `/community/dashboard`, una vista independiente («ERP Comunidad», tabla en
   `features/community/navigation.ts`) con sidebar propio (Panel, Publicaciones,
   Moderación, Feed en vivo, Miembros, Sin publicar, Rachas y logros, Por región,
   Por diagnóstico, Clubes, Reconocimientos, Grupos/Chats, Redes Copp Adresd).
   Luis: «está mal que al darle click mande a otra parte». Dos caminos a decidir:
   - **A**: configurar los submódulos de Comunidad dentro del sidebar principal
     (los 12 ítems ya existen en `navModules` marcados `hidden: true`).
   - **B**: mejorar el diseño de la vista `/community/*` para que se parezca más a
     la del ERP general.
     Decisión de diseño/UX pendiente; la propuesta debe incluir el Inventario de
     rutas/permisos antes de mover navegación (lección fase 4.1).
3. **Organización y administración de datos ERP ↔ app**: objetivo general de la
   sesión; se detallará módulo por módulo en el plan.

## 4. Reglas de ejecución que se mantienen

- Una tarea funcional activa a la vez, con aprobación explícita de Luis.
- Feature no trivial → propuesta OpenSpec antes de implementar; sin sincronizar
  ni archivar OpenSpec sin petición explícita.
- Rama descriptiva por tarea desde `origin/dev`; Luis prueba y mergea.
- Lint, build e i18n en front; build y tests por proyecto si se toca backend.
- Sin push ni despliegue implícitos.
