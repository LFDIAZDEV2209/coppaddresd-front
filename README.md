# CoppAddresd Frontend

Frontend administrativo de la plataforma CoppAddresd — Next.js 16, React 19, Tailwind CSS 4, Yarn 4.

## Getting Started

```bash
yarn install
yarn dev            # http://localhost:3000
```

Requiere los servicios locales corriendo (ver workspace root). El frontend
consume una única URL pública: el **API Gateway** (`http://localhost:5080`), que
enruta por prefijo de path a los microservicios:

- API Gateway (YARP): `http://localhost:5080`
  - `/api/auth/*` → Auth Service
  - `/api/v1/*` → Backend API
  - `/api/v1/telemedicine/*` → Telemedicine
- AI Service (solo backend, no se expone): `http://localhost:8000`

Credenciales demo (solo desarrollo): `admin@coppaddresd.com` / `Test@1234`.

## Módulo de agentes

El frontend **nunca llama al AI Service directo**: todo pasa por el backend
(`/api/v1/agents` y `/api/v1/chat`). Estructura en `features/agents/`:

| Ruta | Descripción |
|---|---|
| `/agents` | Lista + CRUD de tipos de agente (icon picker visual) |
| `/agents/[id]` | Detalle: tabs Versiones / Conocimiento / Monitoreo |
| `/agents/[id]/playground` | Demo individual: chat streaming + panel debug |
| `/agents/knowledge` | Knowledge bases globales + documentos (upload con RAG) |
| `/agents/monitoring` | Ejecuciones globales (latencia, tokens, errores, feedback) |
| `/agents/playground` | Demo con selector de agente |

**Crear un agente es intuitivo** (`version-form-dialog.tsx`): instrucciones en
texto o subidas como `.md` (se indexan con RAG en la KB del agente), modelo,
temperatura (slider), tools (toggles), conocimiento (switch + KBs) y memoria
(switch + categorías). El JSON del runtime queda oculto tras "Configuración
avanzada".

**Playground**: el chat usa streaming SSE (`chat-service.ts`) con parser
robusto a chunks cortados; cada envío usa un thread nuevo del checkpointer para
evitar historial corrupto. El panel debug muestra nodos del grafo, fuentes RAG,
tools ejecutadas y uso (tokens/latencia) de la última ejecución.

## Comandos

```bash
yarn dev          # dev server (Turbopack)
yarn build        # production build
yarn lint         # ESLint
yarn start        # production server
npx tsc --noEmit  # typecheck
```
