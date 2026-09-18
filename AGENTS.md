<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CoppAddresd Frontend — Agent Guide

Next.js 16, React 19, Tailwind CSS 4, Yarn 4. Frontend de la plataforma CoppAddresd.

## Commands

```bash
cd coppaddresd-front
yarn dev                                    # dev server (http://localhost:3000)
yarn build                                  # production build
yarn start                                  # production server
yarn lint                                   # ESLint
yarn typecheck                              # TypeScript check (si configurado)
```

## Architecture

- **Next.js 16** con App Router
- **React 19** con Server Components
- **Tailwind CSS 4** para estilos
- **shadcn/ui** como base de componentes
- **Yarn 4** como package manager

## Autenticación (integrada con Auth Service)

- **Flujo**: login → access token en memoria (Bearer) + refresh token en cookie HttpOnly del Auth Service. Restauración de sesión al recargar: `POST /api/auth/refresh` (cookie) → `GET /api/auth/me`. Logout revoca tokens server-side y limpia la cookie.
- **Capas**: `lib/config/env.ts` (URLs por env vars `NEXT_PUBLIC_*`), `lib/api/http.ts` (cliente con refresh single-flight, retry único tras 800ms para raza multi-pestaña, timeout, `ApiError` tipado), `lib/api/auth-service.ts` (login/restore/logout), `providers/auth-provider.tsx` (sesión en memoria — **sin localStorage**, seguro contra XSS e hidratación), `hooks/use-session-timeout.ts` (logout por inactividad, default 30 min vía `NEXT_PUBLIC_SESSION_IDLE_MINUTES`).
- **Sesión**: `AuthSession { id, email, firstName, lastName, name, initials, roles, permissions }` con `hasPermission(code)` / `hasRole(role)` — permisos listos para autorización granular por UI.
- **Errores**: `ApiError` con códigos (`unauthorized`, `forbidden`, `rate-limit`, `network`, `timeout`, `server`); el banner de "sesión expirada" (`/login?expired=1`) solo aparece cuando el header `X-Refresh-Status` es `invalid` (cookie corrupta/expirada), no en visitantes nuevos.
- **Mocks**: el login page muestra credenciales demo del admin SOLO en desarrollo. No reintroducir `localStorage` para tokens.

## Módulo de agentes (fase 8-9 — conectado al backend real)

- **Rutas**: `/agents` (lista + CRUD tipos), `/agents/[id]` (detalle con tabs Versiones / Conocimiento / Monitoreo), `/agents/[id]/playground` (demo individual con streaming), `/agents/knowledge` (KBs globales + upload), `/agents/monitoring` (ejecuciones globales), `/agents/playground` (demo con selector de agente).
- **Capas**: `features/agents/` — `types/` (espejo de DTOs del backend), `services/agents-service.ts` (apiFetch contra `{apiUrl}/api/v1/agents`), `services/chat-service.ts` (chat sync + **streaming SSE con parser robusto**: acumula líneas JSON cortadas entre chunks y emite eventos tipados token/node/done/error), `services/version-config-utils.ts` (conversión form ↔ JSON config del runtime), `services/upload-agent-document.ts` (PUT blob → storage + register + upload de instrucciones .md), `hooks/` (refresh-key, nunca setState síncrono en efecto), `components/` (listas, dialogs, tabs, playground).
- **UX intuitiva sin JSON**: el form de versión (`version-form-dialog.tsx`) usa campos amigables — instrucciones (textarea o **upload de .md** que se indexa con RAG en la KB del agente), modelo (select), temperatura (slider), tools (toggles), conocimiento RAG (switch + selector de KBs), memoria (switch + categorías) — con JSON avanzado oculto tras un toggle. El icon picker (`agent-icon-picker.tsx`) ofrece 16 iconos visuales con nombres en español.
- **Playground**: chat streaming con bubbles en vivo, panel debug con nodos del grafo, fuentes RAG, tools ejecutadas y uso (tokens/latencia). **Thread nuevo por envío** — el checkpointer de LangGraph reenvía historial completo y un stream fallido deja `tool_use` huérfanos que Anthropic rechaza (400); thread fresco lo evita. Las respuestas assistant y el panel "Respuesta del estado" se renderizan con `<Markdown>` (react-markdown + remark-gfm) — nunca usar `whitespace-pre-wrap` sobre contenido markdown ni envolver `<Markdown>` en `<p>` (genera `<p>` anidado → hydration error). Las fuentes RAG se formatean con `formatRagSource` (`archivo · Título (score)`), nunca `String(source)` (`[object Object]`).
- **El frontend NUNCA llama al AI Service directo** — el backend proxya ejecuciones (`GET /api/v1/agents/executions`) y el chat (`POST /api/v1/chat` + `/stream` con `agentTypeId`/`userId`). El upload de documentos: PUT `{apiUrl}/api/v1/storage/{key}` + register en la KB (el backend dispara chunking+embeddings).
- **Versionado**: crear una versión es generar un JSON config desde el form; la primera se activa automáticamente; las versiones son inmutables (solo activar/desactivar). El backend sincroniza la activación al AI Service (`/internal/agents/sync-config`).
- **Flujos en vivo (playground)**: `playground.tsx` tiene tabs **Flujo en vivo** (default) / **Detalle**; `agent-flow-diagram.tsx` dibuja el grafo (SVG + `foreignObject`, layout por capas con canal lateral para el loop `agent ⇄ tools`) y `use-agent-flow.ts` mantiene el estado por nodo (`pendiente → corriendo → completado/omitido/error`, contador de runs, duración) alimentado por los eventos SSE `flow`. Descriptor: `GET /api/v1/agents/{id}/graph` (`fetchAgentGraph`); al terminar la corrida el detalle sigue viniendo de `fetchExecution`.

## OBLIGATORIO: Flujo de trabajo frontend — UX/UI expert mode

> **Actúa como UX/UI expert con 15+ años.** Toda tarea frontend carga `design-taste-frontend` v2 + `impeccable` como disciplina obligatoria. Brief inference (§0) + locks §4 + bans §9 + pre-flight §14 antes de ship.

1. **Cargar skills ANTES de escribir codigo**:
   - `design-taste-frontend` (v2 taste-skill: brief inference, design system map, locks, bans, hero discipline) + `impeccable` (23 comandos, detector 61 reglas)
   - `frontend-design` + `react-best-practices` + `next-best-practices` (base técnica)
   - `tailwind-css-patterns` + `shadcn` + `composition-patterns`
   - `accessibility` + `modern-web-guidance` + `seo`
   - `typescript-advanced-types` + `next-cache-components`
   - Ver `.agents/skills/design-taste-frontend/SKILL.md` y `.agents/skills/impeccable/SKILL.md` — la skill es la fuente de verdad, no el README resumido.

2. **Leer docs de Next.js 16**: `node_modules/next/dist/docs/` — APIs cambiaron vs training data.

3. **Design workflow**:
   - **Pencil MCP** para mockups/diseno visual antes de codificar
   - **Playwright MCP** para QA y verificacion visual despues de implementar

4. **Component composition**: Preferir compound components, render props, hooks. NO prop drilling.

5. **Performance**: Lazy load, code splitting, `next/image`, `next/font`, caching strategies.

6. **Accessibility**: WCAG 2.2 AA minimo. Semantic HTML, ARIA cuando necesario, keyboard navigation.

7. **Responsive**: Mobile-first. Usar breakpoints de Tailwind consistentemente.

8. **State management**: React state/context para estado local. Server components para data fetching.

9. **Error boundaries**: Siempre wrap secciones criticas. Mostrar estados de error user-friendly.

10. **Loading states**: Skeletons > spinners. Usar Suspense boundaries.

11. **SEO**: Metadata apropiado, structured data, semantic HTML.

12. **Testing**: Playwright MCP para E2E. Component tests para logica critica.

## Gotchas

- **Next.js 16 APIs difieren** de training data — SIEMPRE leer `node_modules/next/dist/docs/`
- **Tailwind 4** tiene cambios vs v3 — verificar sintaxis
- **Yarn 4** con `nodeLinker: node-modules` (ver `.yarnrc.yml`) — hay `node_modules` normal, no PnP
- **shadcn/ui sobre Base UI** (`@base-ui/react`, style `base-nova` en `components.json`) — no usar primitivas Radix
- **Server Components** son default en App Router — usar `"use client"` solo cuando necesario
- **Comentarios/docs en espanol** por convencion

## Skills (MANDATORY antes de trabajo sustancial)

| Tipo de trabajo         | Skills a cargar                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| Cualquier UI/Componente | `design-taste-frontend` + `impeccable` + `frontend-design` + `react-best-practices` + `next-best-practices` |
| Estilos/Tailwind        | `tailwind-css-patterns` + `modern-web-guidance`                                                             |
| Componentes shadcn      | `shadcn` + `composition-patterns`                                                                           |
| Accesibilidad           | `accessibility`                                                                                             |
| SEO                     | `seo`                                                                                                       |
| TypeScript avanzado     | `typescript-advanced-types`                                                                                 |
| Caching/Performance     | `next-cache-components`                                                                                     |
| Testing E2E             | Usar **Playwright MCP**                                                                                     |
| Diseno visual           | `design-taste-frontend` + `impeccable` + **Pencil MCP**                                                     |
| Pre-ship                | `npx impeccable detect` o `/impeccable audit/polish`                                                        |

## MCPs disponibles

| MCP            | Uso                                      |
| -------------- | ---------------------------------------- |
| **pencil**     | Diseno visual, mockups, prototipos UI/UX |
| **playwright** | QA, testing E2E, verificacion visual     |
| **codegraph**  | Entender codigo, buscar simbolos         |

## i18n (internacionalizacion)

Cada string visible al usuario debe envolver con `t()` del hook `useT()` (providers/i18n-provider.tsx). Las keys son el texto en espanol; la traduccion al ingles vive en `providers/translations/en.json`. Cargar la skill `i18n-translations` antes de agregar texto visible.

```bash
yarn i18n:check   # escanea t() vs en.json — exit 1 si faltan keys
yarn i18n:apply   # aplica traducciones revisadas de pending-review.json
```

Regla de oro: toda string visible vive en `t("...")` y tiene key en AMBOS `es.json` y `en.json`.
