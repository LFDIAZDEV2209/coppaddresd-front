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
- **Yarn 4** usa PnP por defecto — no `node_modules` tradicional
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
