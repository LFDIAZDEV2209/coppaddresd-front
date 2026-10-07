# Comunidad: revisión de producción (2026-10-07)

## Fallos reproducidos por computer use

- `/community/members`: `[Network] Unexpected end of JSON input`.
- `/community/moderation`: no se pueden cargar los reportes.
- Otras pantallas muestran datos vacíos; no se consideran validadas.

## Corrección de configuración

El workflow de producción definía `NEXT_PUBLIC_COMMUNITY_API_URL` como
`https://erp.coppadresd.com/api/v1/community`. El cliente agrega las rutas
`/api/v1/community/graphql` y `/api/v1/community/subscriptions`, generando un
prefijo duplicado en ambas. La variable debe ser el origen del gateway:
`https://erp.coppadresd.com`.

El workflow ahora valida los orígenes antes del build con
`node scripts/check-service-urls.mjs`. La prueba de regresión comprueba el
workflow real y rechaza el valor anterior (`yarn config:test`).

La corrección requiere reconstruir y desplegar el frontend: las variables
`NEXT_PUBLIC_*` quedan embebidas en el bundle. La causa observada en el código
es compatible con los errores de producción; todavía falta confirmar el
endpoint efectivo del bundle desplegado y repetir la prueba tras el deploy.

## Validación pendiente

1. Miembros y moderación cargan sus datos o un estado vacío válido.
2. Panel, publicaciones, feed, clubes y analíticas no ocultan errores de carga.
3. Una publicación sintética se refleja en la app del paciente; comprobar
   comentarios y reacciones con cuentas de prueba autorizadas.
4. Las suscripciones actualizan ambas interfaces sin recarga.
5. Verificar permisos con una cuenta de alcance limitado.

No se desplegó desde esta revisión ni se publicaron mensajes de comunidad.

## Resultados de las comprobaciones locales

- Cuatro pruebas de regresión: pasan.
- ESLint completo del ERP: pasa.
- `next build`: bloqueado por descargas fallidas de Google Fonts en este
  entorno (Geist Mono, IBM Plex Mono/Sans, Inter, Plus Jakarta Sans). No se
  considera validado el build completo.
- El dashboard recibe `dashboardError` del proveedor, pero no lo consume;
  una falla puede aparecer como gráficos vacíos. Pendiente de corrección UI.
- App: el usuario confirmó que el servidor se inició contra producción;
  los reintentos por computer use siguen en login. No se verificó aún el
  resultado de un inicio de sesión manual.
