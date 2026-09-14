# Codex: preparación del workspace

Fecha: 2026-09-13. Alcance: configuración del agente, entorno local y preparación del ERP.

## Configuración disponible

- Las skills compartidas ya están en `../.agents/skills/` y fueron expuestas en esta sesión de Codex. Incluyen Design Taste, Impeccable, frontend-design, React, Next.js, Tailwind, shadcn, accesibilidad y Caveman. No se duplicaron instalaciones.
- Caveman se usa para respuestas breves en español. Código, documentación y criterios conservan prosa clara; no se promete un porcentaje de ahorro de tokens.
- CodeGraph y Pencil estaban registrados. Usar CodeGraph para estructura y dependencias; Pencil para propuestas visuales cuando corresponda.
- Se registró Playwright MCP mediante `codex mcp add playwright -- npx.cmd -y @playwright/mcp@latest --headless --isolated` en la configuración personal de Codex. No instala dependencias en el ERP ni modifica sus lockfiles.
- Se descargó y verificó el ejecutable oficial: versión 0.0.80. La configuración usa `latest`, igual que OpenCode; la versión puede cambiar en posteriores instalaciones.
- La entrada quedó guardada; para exponer el nuevo MCP, reiniciar el servidor desde la configuración de MCP de Codex y comprobar sus herramientas. La sesión inicial verificó el login mediante el navegador integrado y su API Playwright, no mediante el MCP recién registrado.
- El agente general usa los AGENTS.md existentes y el plan secuencial enlazado abajo. No se cambiaron modelo, permisos de seguridad, credenciales ni configuración de OpenCode.

Referencias de configuración: [MCP de Codex](https://learn.chatgpt.com/docs/extend/mcp) y [Playwright MCP de Microsoft](https://github.com/microsoft/playwright-mcp).

## Procedimiento de trabajo

Consultar [el plan ERP](erp-plan-2026-09.md) para tarea activa, responsables y criterios. Leer las skills específicas antes de implementar y las guías locales de Next.js 16 antes de cambiar APIs del framework.

Las skills de SDD mencionadas por las instrucciones del workspace no se encontraron en los directorios de skills revisados. La gobernanza se obtiene por ahora del AGENTS.md raíz, `../openspec/config.yaml` y el CLI OpenSpec existente. No inventar comandos de skills ausentes ni editar `openspec/specs/` directamente.

## Arranque verificado

1. Desde el workspace: `docker compose up -d`. Se reutilizan los contenedores y volúmenes existentes de PostgreSQL y Valkey.
2. Desde `coppaddresd-front`: usar `corepack yarn dev` en un proceso oculto con `Start-Process`. Corepack resuelve Yarn 4.18.0 en este repositorio; ejecutarlo en el workspace raíz encuentra otro packageManager heredado.
3. Con el ERP ya escuchando en 3000, ejecutar `coppAddresdBack/scripts/dev-up.ps1` en un proceso PowerShell oculto. Compila cada uno de los cinco proyectos .NET, arranca AI Service y la app móvil, y reutiliza el ERP activo.
4. Food AI requiere su propio `.venv` y pip según sus requirements. El arranque es `.venv/Scripts/python.exe run_dev.py`, siempre oculto y con logs.
5. Verificar HTTP; un puerto abierto o el mensaje del script no demuestran salud funcional.

Todos los procesos iniciados deben registrar salida y errores en `../coppAddresdBack/scripts/logs/`. El arranque de esta sesión usa `session-start.log` y `session-start.err`; cada servicio tiene su log propio.

### Limitaciones detectadas del script existente

- No inicia Valkey: hacerlo con el compose del workspace antes del script.
- El comando interno del ERP es `npx next dev`: iniciar antes mediante Corepack/Yarn 4 para que el script reutilice el puerto.
- Puede imprimir «ALL SERVICES RUNNING» aunque Food AI falte y omitir AI Service del resumen. Comprobar ambos por HTTP.
- No aplica explícitamente migraciones de API/Telemedicina. Aplicarlas solo cuando se confirme que faltan y que la conexión corresponde al entorno local; Auth y Community migran al iniciar.

El script no fue modificado en esta fase.

### Endpoints de comprobación

| Componente | URL o comprobación | Resultado inicial |
| --- | --- | --- |
| PostgreSQL | Compose / puerto 5432 | Healthy |
| Valkey | Compose / 127.0.0.1:6379 | Healthy |
| Auth | `http://localhost:5123/health` | HTTP 200 |
| API | `http://localhost:5122/health` | HTTP 200 |
| Telemedicina | `http://localhost:5130/health` | HTTP 200 |
| Community | `http://localhost:5200/health` | HTTP 200 |
| Gateway | `http://localhost:5080/health` | HTTP 200 |
| AI Service | `http://localhost:8000/api/v1/health` | HTTP 200; `/health` sin prefijo devuelve 404 |
| ERP | `http://localhost:3000/login` | HTTP 200 y formulario visible en navegador |
| App móvil | `http://localhost:5173` | HTTP 200 |
| Food AI | `http://localhost:8010/health` | HTTP 200, healthy; detector, segmentador y clasificador básicos cargados |

Food AI se preparó en su propio `.venv` con Python 3.13.14 y `pip install -r requirements.txt -r requirements-dev.txt`. El arranque descargó los dos pesos YOLO requeridos desde el repositorio oficial de Ultralytics. Retrieval avanzado está desactivado con la configuración local por defecto; pipeline y nutrición aparecen como null en `/health`. No se habilitaron flags de funcionalidad ni se validó una inferencia completa.

La comprobación inicial no incluye login autenticado, llamada a proveedores de IA, videollamada, envío de SMS ni pruebas completas de módulos clínicos.

## Cierre de servicios

Desde backend: `./scripts/dev-down.ps1`; inspeccionar primero su alcance si otros procesos se iniciaron después. Revisar puertos al finalizar. No eliminar volúmenes ni usar `docker compose down -v`.
