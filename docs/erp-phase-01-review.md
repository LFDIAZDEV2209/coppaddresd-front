# Revisión de fase 1 — Profesionales

## Corrección visual solicitada por Luis

Corrección responsive posterior: en pantallas menores de `md`, el directorio presenta siempre tarjetas completas y oculta el selector tabla/tarjetas; así no se recortan el estado ni las acciones. La tabla se conserva desde tablet/escritorio. Las tablas de catálogos de Super Admin usan desplazamiento horizontal contenido cuando exceden el ancho disponible. En 390 px no hay desbordamiento del documento; los contenedores de catálogo miden 314 px y exponen scroll para sus tablas de 494–615 px. Lint y build correctos tras el ajuste; la comprobación de dispositivo físico de Luis permanece pendiente.

Se reemplazó el busto rechazado por una familia 3D propia de objetos brillantes: maletín clínico azul, check verde, invitación naranja y pausa coral. Sprite transparente `public/images/professionals/directory-icons-3d.png`, generado con imagegen integrado; se usa en cabecera, cuatro estadísticas y encabezado del listado. Animaciones de entrada y saludo al hover/foco, sin bucles continuos, respetando reduced-motion.

Cabecera y encabezado de tabla ahora usan superficies claras; estadísticas sin barras laterales, números más legibles e iconos protagonistas. Badges Activo verde sólido #087d43/blanco, Invitado amarillo #ffc400/texto oscuro e Inactivo rojo #c83237/blanco. Se corrigió el conflicto entre translate de Tailwind y transform del switch: control de dominio con primitiva Base UI, círculo blanco de 20 px dentro de un rail de 46×26 px, movimiento por left. No cambia permisos ni coordinación backend.

Verificación de esta corrección: navegador a 362 px sin overflow del documento, círculo comprobado dentro del rail y translate=none. Lint, TypeScript y build correctos; TypeScript repetido tras el ajuste final de primitiva. La revisión visual de Luis sigue pendiente. Sin commits ni cambios al backend en esta corrección.

El registro siguiente corresponde a la primera entrega; el nuevo sprite sustituye visualmente a team-3d.png y la nueva cabecera sustituye las franjas de marca del directorio.

Ramas frontend/backend: `feature/erp-phase-01-professionals-toggle`. Implementación para revisión de Luis; no se hizo merge ni se inició otra fase.

## Resultado

Toggle visible en tabla y tarjetas. Estado textual, guardado, protección contra clics repetidos, reintento con identificador estable cuando no se conoce el resultado y reconciliación de cambios pendientes. Los invitados conservan su etiqueta. El propio acceso, usuarios sin permiso y profesionales sin cuenta vinculada no permiten cambios.

Desactivar afecta solo al ERP y a sus sesiones existentes; conserva acceso como paciente. El backend impide autodesactivación y cambios alternativos de Status en edición de profesionales vinculados. Reactivar exige una nueva sesión ERP.

Se reutiliza Switch de Base UI y el sistema visual existente. Superficies, bordes y controles del directorio usan colores sólidos; estilos globales nuevos acotados a `.professional-directory`. Movimiento del control breve, desactivado con reduced-motion. El icono 3D es un acento de cabecera; los controles conservan iconos funcionales y texto.

## Recurso 3D

Archivo `public/images/professionals/team-3d.png`, generado con imagegen integrado el 2026-09-13, transparente, renderizado con Next/Image a 64 px. Sin biblioteca ni dependencia de runtime nueva.

Dirección de generación: emblema compacto de equipo sanitario, dos bustos abstractos de cerámica marfil mate, estetoscopio teal #007f86, aqua #91d3cd, silueta legible a 64 px, fondo transparente, sin texto ni logotipos. No representa pacientes reales.

## Verificación realizada

- Login autenticado y directorio local; cambio Activo → Inactivo mediante clic, feedback Guardando y métricas 11/0 → 10/1.
- Reactivación con Espacio en el control; recarga conserva Activo y métricas 11/0. Profesional demo Ana restaurado al estado inicial.
- Presentación del control en tabla/tarjetas; Invitado sin switch.
- Interrupción real y breve de API local: aparece «Por confirmar», switch bloqueado y acción Reintentar. Tras restablecer API, el reintento confirma Inactivo; reactivación posterior confirmada en tarjetas. Servicios restaurados.
- Ancho disponible verificado de 910 px: document.scrollWidth=innerWidth, sin desbordamiento de documento.
- `corepack yarn lint`: correcto, sin advertencias. TypeScript y build de producción correctos.
- `corepack yarn i18n:check`: 111 claves ausentes, todas previas. Comparación de HEAD y árbol actual: 111/111, cero ausencias nuevas. Las claves nuevas están en ES/EN.
- Builds/tests de seguridad y persistencia: documentación backend `docs/modules/professionals/README.md`.

Pencil no pudo conectar con la aplicación de escritorio. Impeccable automatizado salió con código 127; se aplicó revisión manual conforme a las skills. No se presenta como auditoría automatizada aprobada.

## Revisión pendiente antes de cerrar

Validar con Luis escritorio amplio y móvil real (el navegador integrado comprobó 390 px sin desbordamiento y la alternativa de tarjetas; falta el dispositivo físico), foco visible, contraste en ambos temas y experiencia visual final. No se simuló doble clic mediante navegador; el bloqueo síncrono de operaciones está implementado y los fallos de coordinación se cubren en backend. La prueba de sesiones paciente/ERP es de integración aislada, no una videollamada ni envío de notificaciones reales.

La búsqueda previa no encuentra el texto concatenado «Ana Torres», pero permite buscar por campos individuales; registrar este límite para la fase de filtros, sin ampliar el cambio actual.

## Pasos para revisar

1. Abrir `/employees`, cambiar tabla/tarjetas y revisar invitados.
2. Con un profesional de prueba, desactivar, recargar y comprobar estado; reactivar al terminar.
3. Verificar bloqueo ERP con sesión profesional y continuidad de la sesión paciente. El propio toggle debe estar protegido.
4. Revisar a 390 px y escritorio, con teclado y movimiento reducido.
5. Aprobar esta fase antes de avanzar. Luis realiza merge; sync/archive de OpenSpec requiere petición explícita.

Despliegue requiere las migraciones y AuthService__BaseUrl en todos los consumidores; consultar documentación backend antes del merge que dispara CI.
