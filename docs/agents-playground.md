# Agents Playground (`/agents/playground`)

Playground de agentes del ERP: seleccionar agente → ver su flujo → inspeccionar nodos → probar en vivo (streaming) → revisar resultado y trazabilidad.

## Componentes (`features/agents/components/`)

| Componente | Rol |
|---|---|
| `global-playground-page.tsx` | Ruta `/agents/playground`: selector de agente (dropdown) + Playground. |
| `playground-page.tsx` | Ruta `/agents/[id]/playground` (demo individual desde el detalle). |
| `playground.tsx` | Núcleo: chat streaming + panel derecho (flujo en vivo / detalle). |
| `agent-flow-diagram.tsx` | **Canvas interactivo** del grafo (SVG + `foreignObject`): zoom (botones + rueda), paneo por arrastre, reorganización de nodos con drag (solo sesión), selección de nodo, **pantalla completa** y estados en vivo (`running/done/skipped/error`, duración, runs). Exporta `NODE_LABEL_KEYS` y `KIND_ACCENT`. |
| `agent-node-drawer.tsx` | Drawer lateral (Sheet) con el detalle del nodo: configuración efectiva (meta del descriptor), conexiones entrantes/salientes, estado en vivo (runs/duración/pasos) y entrada/salida de la última ejecución. |
| `hooks/use-agent-flow.ts` | Máquina de estados del flujo a partir de los eventos SSE `flow` (start/end por nodo con duración). |

## Flujo de datos

1. `GET {apiUrl}/api/v1/agents?page&pageSize` → selector de agentes (`useAgents`).
2. `GET {apiUrl}/api/v1/agents/{id}/graph` → descriptor (nodos/aristas + config efectiva). Requiere permiso `Agents.View`. Error → estado con botón **Reintentar**; vacío → mensaje `Sin grafo disponible`.
3. `POST {apiUrl}/api/v1/chat/stream` (SSE) → ejecución en vivo. Los eventos `flow` (`{node, phase: start|end, step, ts, duration_ms}`) alimentan el canvas; `done` trae `execution_id`.
4. `GET {apiUrl}/api/v1/agents/executions/{executionId}` → detalle (tokens, latencia, modelo, RAG, tools, `output.flow_trace`) para la pestaña **Detalle** y el drawer.

El backend (`.NET`) proxya el AI Service (`/internal/agents/{id}/graph`, `/api/v1/chat/stream`, `/api/v1/admin/executions`); el frontend nunca llama al AI Service directo. Cada envío usa un thread fresco del checkpointer (evita historial corrupto tras un stream fallido).

## Interacciones del canvas

- **Distribución**: desktop ≥ `lg` → grid 50/50 (conversación ≈ 50% | flujo ≈ 50%); móvil apilado (chat arriba, flujo con altura propia).
- **Zoom**: botones +/−, rueda del mouse centrada en el cursor (0.3×–2.5×). `↻ Restablecer vista` = fit + reset del layout manual.
- **Panear**: arrastrar el fondo del canvas (delta relativo desde el offset inicial — no destructivo).
- **Reorganizar**: arrastrar un nodo; solo afecta la vista (no persiste).
- **Detalle**: click en un nodo (sin arrastre) abre el drawer lateral (`z-[80]`, visible también en fullscreen); cerrar lo deselecciona.
- **Fit**: al cargar un agente y al entrar en pantalla completa el viewport se ajusta automáticamente (fitView equivalente con cap de escala legible 1.25×).
- **Pantalla completa**: `⛶` abre overlay `fixed inset-0` (100vw/100vh, z-70) con encabezado (nombre del agente + estado de ejecución + controles + cerrar). **Misma instancia**: no hay remount — zoom/offset/overrides/selección/estados/tiempos se conservan. Al salir restaura el viewport previo (snapshot) y `ESC` también cierra. Bloquea el scroll del body mientras dura.
- Layout automático: DFS memoizado por profundidad (seguro ante ciclos); los loops (`tools → agent`) se dibujan como retornos laterales.

## Trazabilidad

- **En vivo**: lista `Pasos de la ejecución` (eventos `flow` end) con duración por nodo.
- **Persistida**: `Trazabilidad del flujo` en la pestaña Detalle, desde `output.flow_trace` de `ai.agent_executions` (la escribe `ExecutionTracker` en el AI Service).
- **Métricas**: tokens in/out, latencia, modelo, tools ejecutadas, fuentes RAG.

## i18n

Todas las strings visibles usan `t()` (`useT`); las nuevas keys están en `providers/translations/es.json` y `en.json` (`yarn i18n:check` pasa).
