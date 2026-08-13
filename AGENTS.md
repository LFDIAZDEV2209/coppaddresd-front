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

- **Flujo**: login → access token en memoria (Bearer) + refresh token en cookie HttpOnly del Auth Service. Restauración de sesión al recargar: `POST /api/auth/refresh` (cookie) → `GET /api/me`. Logout revoca tokens server-side y limpia la cookie.
- **Capas**: `lib/config/env.ts` (URLs por env vars `NEXT_PUBLIC_*`), `lib/api/http.ts` (cliente con refresh single-flight, retry único tras 800ms para raza multi-pestaña, timeout, `ApiError` tipado), `lib/api/auth-service.ts` (login/restore/logout), `providers/auth-provider.tsx` (sesión en memoria — **sin localStorage**, seguro contra XSS e hidratación), `hooks/use-session-timeout.ts` (logout por inactividad, default 30 min vía `NEXT_PUBLIC_SESSION_IDLE_MINUTES`).
- **Sesión**: `AuthSession { id, email, firstName, lastName, name, initials, roles, permissions }` con `hasPermission(code)` / `hasRole(role)` — permisos listos para autorización granular por UI.
- **Errores**: `ApiError` con códigos (`unauthorized`, `forbidden`, `rate-limit`, `network`, `timeout`, `server`); el banner de "sesión expirada" (`/login?expired=1`) solo aparece cuando el header `X-Refresh-Status` es `invalid` (cookie corrupta/expirada), no en visitantes nuevos.
- **Mocks**: el login page muestra credenciales demo del admin SOLO en desarrollo. No reintroducir `localStorage` para tokens.

## OBLIGATORIO: Flujo de trabajo frontend

1. **Cargar skills ANTES de escribir codigo**:
   - `frontend-design` + `react-best-practices` + `next-best-practices`
   - `tailwind-css-patterns` + `shadcn` + `composition-patterns`
   - `accessibility` + `modern-web-guidance` + `seo`
   - `typescript-advanced-types` + `next-cache-components`

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

| Tipo de trabajo | Skills a cargar |
|---|---|
| Cualquier UI/Componente | `frontend-design` + `react-best-practices` + `next-best-practices` |
| Estilos/Tailwind | `tailwind-css-patterns` + `modern-web-guidance` |
| Componentes shadcn | `shadcn` + `composition-patterns` |
| Accesibilidad | `accessibility` |
| SEO | `seo` |
| TypeScript avanzado | `typescript-advanced-types` |
| Caching/Performance | `next-cache-components` |
| Testing E2E | Usar **Playwright MCP** |
| Diseno visual | Usar **Pencil MCP** |

## MCPs disponibles

| MCP | Uso |
|---|---|
| **pencil** | Diseno visual, mockups, prototipos UI/UX |
| **playwright** | QA, testing E2E, verificacion visual |
| **codegraph** | Entender codigo, buscar simbolos |
