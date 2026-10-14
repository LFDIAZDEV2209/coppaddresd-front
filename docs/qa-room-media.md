# Regresión de video y participantes

El placeholder remoto se muestra solo sin track de video habilitado; antes se
mostraba siempre y tapaba el video recibido. Se adjuntan también los tracks de
audio remoto. Los eventos enabled/disabled actualizan el estado visible.

La etiqueta remota usa la identidad Auth y `displayName`/`role` del endpoint de
sala. El supervisor no se presenta como el profesional de la cita, ni el paciente
como el profesional cuando el usuario local es supervisor.

Sin cambios de diseño, permisos ni inicio/finalización. Typecheck y ESLint de
la sala pasan. Pendiente despliegue y verificación de video/audio con iPhone.

## Revisión de tres cuentas — 2026-10-14 (local)

El ERP descartaba publicaciones con `isTrackEnabled=false` al entrar. Activar esa cámara después solo sincronizaba el indicador, sin recuperar ni adjuntar su track. Ahora se registran también tracks inicialmente deshabilitados y `trackEnabled` vuelve a visitar las publicaciones; se evita registrar dos veces el mismo objeto de track.

Validación: TypeScript y lint focalizados. Pendiente prueba real supervisor + profesional + paciente con cámara del supervisor inicialmente apagada y encendida después. No finalizar ni recrear una sesión activa para este retest.

## Emisión de cámara del supervisor — 2026-10-14 (local)

Reporte: ninguno de los otros dos participantes recibe la cámara del supervisor. Esto cambia el foco a publicación/captura del emisor; no confirma por sí solo que falle la recepción.

La cámara local ya no se da por activa solo por solicitar `video=true`: se verifica la publicación local y el estado del track. Se informa `trackPublicationFailed` y la detención de la cámara. «Restablecer cámara» despublica y libera solo la cámara, adquiere y publica una nueva, y conserva micrófono, pantalla compartida y sala. Si falla la publicación o el usuario sale durante la operación, se libera el nuevo track. El diagnóstico registra únicamente nombre y código de error, sin tokens.

Pruebas unitarias de reemplazo, error y salida durante publicación. Pendiente validar en el dispositivo del supervisor con los otros dos participantes presentes; no se afirma resuelto en producción.

También se bloquea el ingreso mientras el preflight sigue capturando/soltando dispositivos, evitando iniciar el SDK en paralelo con la sonda de cámara. Es una prevención de carrera, no una causa confirmada del incidente actual.

### Retiro de pantalla compartida

Por decisión de producto se retiraron el botón, la captura, la publicación y los paneles de pantalla compartida del ERP. Se ignoran publicaciones `screen` de clientes antiguos para evitar mezclarlas con la cámara del participante. Las verificaciones históricas de pantalla compartida ya no forman parte del alcance.
