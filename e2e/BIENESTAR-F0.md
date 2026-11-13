# QA de organizar-experiencia-bienestar · Fase 0

El ejecutor escribe estas pruebas; el orquestador las ejecuta y valida. No se
considera cerrada 0.14 hasta que ambas suites estén verdes.

Con el frontend ya levantado en segundo plano, ejecutar:

```powershell
corepack yarn e2e bienestar-f0.spec.ts --project=chromium-desktop
corepack yarn e2e bienestar-f0-nutrition.spec.ts --project=chromium-desktop
corepack yarn e2e bienestar-f0-scope.spec.ts --project=chromium-desktop
```

`bienestar-f0.spec.ts` usa HTTP sintético explícito para validar navegación,
teclado, 390 px, inglés, compatibilidad de pestañas, botones y rótulos. No
acredita la autorización real. No escribe datos clínicos.

`bienestar-f0-nutrition.spec.ts` comparte la respuesta HTTP sintética con la ficha
de Nutrición y comprueba la tarjeta vigente de 0.8: ciclo, día, metas, enlace,
lectura, permisos, errores y ausencia de datos ajenos. Usa una zona de navegador
distinta de la del paciente para detectar cálculos de día basados en el equipo.

`bienestar-f0-scope.spec.ts` usa el backend real después de 0.10a y
0.11c/0.11d. Requiere estas variables de entorno del proceso:

- `E2E_F0_NUTRITIONIST_EMAIL` y `E2E_F0_NUTRITIONIST_PASSWORD`: cuenta de nutricionista.
- `E2E_F0_ASSIGNED_PATIENT_ID`: paciente existente asignado a esa cuenta.
- `E2E_F0_FOREIGN_PATIENT_ID`: otro paciente existente, sin asignación a esa cuenta.
- `E2E_BASE_URL`: opcional; por defecto `http://localhost:3000`.

Los pacientes deben existir previamente; la prueba no crea asignaciones ni cambia
planes. Las credenciales se inyectan al proceso, nunca se guardan en archivos.
La suite falla expresamente si falta configuración; no omite el caso de alcance.

Perfil 360 usa `Program.Profile360View`, alineado con 0.10a del backend
(`8e639b5`). `Program.View` sigue reservado a Plantillas y dashboards.
