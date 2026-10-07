# Regresión de video y participantes

El placeholder remoto se muestra solo sin track de video habilitado; antes se
mostraba siempre y tapaba el video recibido. Se adjuntan también los tracks de
audio remoto. Los eventos enabled/disabled actualizan el estado visible.

La etiqueta remota usa la identidad Auth y `displayName`/`role` del endpoint de
sala. El supervisor no se presenta como el profesional de la cita, ni el paciente
como el profesional cuando el usuario local es supervisor.

Sin cambios de diseño, permisos ni inicio/finalización. Typecheck y ESLint de
la sala pasan. Pendiente despliegue y verificación de video/audio con iPhone.
