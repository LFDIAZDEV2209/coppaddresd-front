#!/usr/bin/env python3
"""Seed idempotente de fixtures para la suite E2E del ERP (F5).

Crea/actualiza un profesional determinista (password demo), su settings de
telemedicina con los defaults del backend (no toca `reopen_grace_minutes`:
el E2E corre con el default 60) y citas propias con ids fijos por corrida
para que los specs no dependan de datos demo preexistentes.

Escribe `e2e/.fixtures.json` (ruta override con `E2E_FIXTURES_PATH`), que los
specs de Playwright leen para conocer las credenciales y los ids.

Uso:
    python3 e2e/seed/seed-e2e.py

Requisitos: Python 3.10+ con psycopg (`pip install "psycopg[binary]"`) y el
stack local levantado (Postgres + Auth en :5123). Idempotente: borra solo lo
que este seed creó (marcado con `E2E_SEED_USER_ID`) y lo recrea.

Convenciones tomadas de `coppAddresdBack/scripts/seed_telemedicine.py` (misma
DSN por defecto, mismos INSERT a tele.*, mismo marcador created_by); a
diferencia de ese seed, este no toca datos de otros orígenes y escribe el
fixtures JSON para la suite.
"""

from __future__ import annotations

import json
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib import request as urlrequest

try:
    import psycopg
except ImportError:  # pragma: no cover - mensaje accionable
    print(
        'Falta psycopg. Instalalo con: pip install "psycopg[binary]"',
        file=sys.stderr,
    )
    raise SystemExit(2)

# ---------------------------------------------------------------------------
# Configuración (mismas convenciones que seed_telemedicine.py)
# ---------------------------------------------------------------------------

DB_DSN = os.environ.get(
    "E2E_DB_DSN",
    "host=localhost port=5432 dbname=coppaddresd user=app_user password=CoppAddresdDev!2026",
)
AUTH_URL = os.environ.get("E2E_AUTH_URL", "http://localhost:5123")
AUTH_SEED_URL = f"{AUTH_URL}/api/auth/internal/seed-demo-password"
PASSWORD = os.environ.get("E2E_PASSWORD", "Demo1234!")
PREFERRED_EMAIL = os.environ.get(
    "E2E_PROFESSIONAL_EMAIL", "lucia.mendez@coppaddresd.com"
)
# La gracia de reapertura NO se configura desde el E2E: se usa el default del
# backend (tele.telemedicine_settings.reopen_grace_minutes = 60). Evita la
# carrera con la caché de settings (TTL 5 min) y la configurabilidad ya está
# cubierta por los unit tests del backend.
DEFAULT_REOPEN_GRACE_MINUTES = 60

# Marca de origen: todo lo que crea este seed la usa para limpiarse sin tocar
# datos ajenos (mismo patrón que SEED_USER_ID de seed_telemedicine.py).
E2E_SEED_USER_ID = uuid.UUID("b5e2e000-0000-4000-8000-000000000001")

# Solicitud dedicada al flujo repetible bandeja -> confirmar y agendar ->
# agenda -> verificación (Misión 3.4). Motivo determinista para localizarla
# en la bandeja sin depender de datos demo preexistentes.
E2E_REQUEST_REASON = "E2E flujo citas bandeja agenda"

REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURES_PATH = Path(
    os.environ.get("E2E_FIXTURES_PATH", REPO_ROOT / "e2e" / ".fixtures.json")
)


def main() -> None:
    with psycopg.connect(DB_DSN) as conn:
        wipe_seed(conn)
        professional = load_professional(conn, datetime.now(timezone.utc))
        patient = load_patient(conn)
        context = load_clinical_context(conn, professional["id"])

        # El guard de /onboarding del ERP exige el wizard completado para que el
        # profesional vea su agenda (fixture, no flujo de producto).
        conn.execute(
            """
            UPDATE erp.professionals
            SET onboarding_completed_at = now()
            WHERE id = %s AND onboarding_completed_at IS NULL
            """,
            (professional["id"],),
        )

        # Disponibilidad garantizada L-V 08:00-17:00 para el profesional E2E
        # (el endpoint /availability cruza erp.professional_schedules).
        ensure_professional_schedules(conn, professional["id"])

        settings = upsert_settings(conn, context)
        reset_password(professional["email"])
        ensure_spanish_preference(professional["email"])
        ensure_spanish_preference(
            os.environ.get("E2E_ADMIN_EMAIL", "admin@coppaddresd.com"),
            password=os.environ.get("E2E_ADMIN_PASSWORD", "Test@1234"),
            best_effort=True,
        )

        appointments = create_appointments(conn, professional, patient, context)
        create_rooms(conn, appointments)
        pending_request_id = create_pending_request(
            conn, professional, patient, context
        )
        conn.commit()

    fixtures = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "professional": {
            "id": str(professional["id"]),
            "email": professional["email"],
            "password": PASSWORD,
        },
        "patient": {"id": str(patient["id"]), "name": patient["name"]},
        "settings": {"reopenGraceMinutes": settings},
        "appointments": {key: str(value) for key, value in appointments.items()},
        "context": {
            "organizationId": str(context["organization_id"]),
            "clinicId": str(context["clinic_id"]),
            "locationId": str(context["location_id"]),
            "specialtyId": str(context["specialty_id"]),
        },
        "requests": {"inboxPending": str(pending_request_id)},
    }
    FIXTURES_PATH.parent.mkdir(parents=True, exist_ok=True)
    FIXTURES_PATH.write_text(
        json.dumps(fixtures, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(f"  profesional: {professional['email']}")
    print(f"  gracia de reapertura: {settings} min")
    print(f"  fixtures: {FIXTURES_PATH}")
    print("Seed E2E completo.")


# ---------------------------------------------------------------------------
# Resolución de entidades
# ---------------------------------------------------------------------------


def load_professional(conn: psycopg.Connection, now: datetime) -> dict:
    """Elige un profesional autenticable sin citas activas en la ventana E2E.

    La exclusión GiST se mantiene intacta: el seed solo limpia sus propias
    citas y escoge un profesional libre para no colisionar con datos ajenos.
    """
    query = """
        SELECT p.id, u."UserName" AS email, e.first_name, e.last_name
        FROM erp.professionals p
        JOIN erp.employees e ON e.id = p.employee_id
        JOIN auth."Users" u ON u."Id" = e.user_id
        WHERE NOT EXISTS (
            SELECT 1
            FROM tele.appointments a
            WHERE a.professional_id = p.id
              AND a.status IN ('Requested', 'Confirmed', 'InProgress')
              AND a.scheduled_start < %s
              AND a.scheduled_end > %s
        )
        ORDER BY (u."UserName" = %s) DESC, u."UserName"
        LIMIT 1
    """
    window_start = now - timedelta(minutes=95)
    window_end = now + timedelta(minutes=215)
    row = conn.execute(query, (window_end, window_start, PREFERRED_EMAIL)).fetchone()
    if row is None:
        print(
            "  aviso: no hay profesionales autenticables libres en la ventana "
            f"E2E [{window_start.isoformat()}, {window_end.isoformat()}]."
        )
        raise SystemExit(
            "No se puede sembrar sin reutilizar una ventana ocupada. "
            "Liberá un profesional de prueba o agrega otro profesional dedicado."
        )
    if row[1] != PREFERRED_EMAIL:
        print(
            f"  aviso: {PREFERRED_EMAIL} está ocupado; se usa profesional dedicado "
            f"libre {row[1]}."
        )
    print(f"Profesional: {row[1]} ({row[2]}, {row[3]})")
    return {"id": row[0], "email": row[1]}


def load_patient(conn: psycopg.Connection) -> dict:
    row = conn.execute(
        """
        SELECT id, first_name, COALESCE(middle_name, ''), last_name
        FROM app.patient_profiles
        ORDER BY md5(id::text)
        LIMIT 1
        """
    ).fetchone()
    if row is None:
        raise SystemExit(
            "No hay pacientes en app.patient_profiles. Corré los seeds de pacientes."
        )
    # Nombre completo igual que el backend (first + middle + last): la agenda
    # lista citas con el FullName del ERP y el spec busca por este nombre.
    full_name = " ".join(part for part in (row[1], row[2], row[3]) if part)
    return {"id": row[0], "name": full_name}


def load_clinical_context(conn: psycopg.Connection, professional_id: uuid.UUID) -> dict:
    """Sede/clínica/organización y especialidad del profesional (o catálogo)."""
    row = conn.execute(
        """
        SELECT l.id, c.id, c.organization_id
        FROM erp.professional_locations pl
        JOIN erp.locations l ON l.id = pl.location_id
        JOIN erp.clinics c ON c.id = l.clinic_id
        WHERE pl.professional_id = %s
        ORDER BY l.created_at
        LIMIT 1
        """,
        (professional_id,),
    ).fetchone()
    if row is None:
        row = conn.execute(
            """
            SELECT l.id, c.id, c.organization_id
            FROM erp.locations l
            JOIN erp.clinics c ON c.id = l.clinic_id
            ORDER BY c.created_at, l.created_at
            LIMIT 1
            """
        ).fetchone()
    if row is None:
        raise SystemExit("No hay sedes/clínicas en erp.*; no se puede sembrar.")
    location_id, clinic_id, organization_id = row

    specialty_id = conn.execute(
        "SELECT specialty_id FROM erp.professional_specialties WHERE professional_id = %s LIMIT 1",
        (professional_id,),
    ).fetchone()
    if specialty_id is None:
        specialty_id = conn.execute(
            "SELECT id FROM erp.specialties ORDER BY name LIMIT 1"
        ).fetchone()
    if specialty_id is None:
        raise SystemExit("No hay especialidades en erp.specialties.")

    return {
        "organization_id": organization_id,
        "clinic_id": clinic_id,
        "location_id": location_id,
        "specialty_id": specialty_id[0],
    }


def upsert_settings(conn: psycopg.Connection, context: dict) -> int:
    """Settings de clínica: defaults del backend + ventana amplia para el E2E.

    No escribe `reopen_grace_minutes`: una fila nueva nace con el default de la
    migración (60) y una existente lo conserva; así el valor efectivo del
    backend nunca compite con la caché de settings (TTL 5 min).
    """
    columns = (
        "id, organization_id, clinic_id, default_appointment_duration_minutes, "
        "min_advance_booking_hours, max_advance_booking_days, max_reschedules, "
        "room_open_before_minutes, room_close_after_minutes, access_token_ttl_seconds, "
        "max_participants, created_at"
    )
    values = (
        uuid.uuid4(),
        context["organization_id"],
        context["clinic_id"],
        30,
        2,
        30,
        2,
        10,
        15,
        900,
        3,
        datetime.now(timezone.utc),
    )
    placeholders = ", ".join(["%s"] * len(values))
    conn.execute(
        f"""
        INSERT INTO tele.telemedicine_settings ({columns})
        VALUES ({placeholders})
        ON CONFLICT (organization_id, clinic_id)
        DO UPDATE SET updated_at = now()
        """,
        values,
    )
    return DEFAULT_REOPEN_GRACE_MINUTES


def reset_password(email: str) -> None:
    key = os.environ.get("AUTH_INTERNAL_KEY") or locate_internal_key()
    payload = json.dumps({"email": email, "password": PASSWORD}).encode("utf-8")
    req = urlrequest.Request(
        AUTH_SEED_URL,
        data=payload,
        headers={"Content-Type": "application/json", "X-Internal-Key": key},
        method="POST",
    )
    try:
        with urlrequest.urlopen(req, timeout=15) as response:
            result = json.loads(response.read().decode("utf-8"))
        print(f"  password demo aplicada a {result.get('email', email)}")
    except Exception as exc:  # noqa: BLE001 - mensaje accionable
        raise SystemExit(
            f"No se pudo resetear la password demo de {email} en {AUTH_SEED_URL}: {exc}. "
            "Verificá que el Auth Service esté levantado (:5123) y en Development "
            "(el endpoint seed-demo-password solo está activo en Development)."
        ) from exc


def ensure_spanish_preference(
    email: str, password: str | None = None, best_effort: bool = False
) -> None:
    """Fija la preferencia de idioma del usuario a `es` (UI determinista en E2E).

    El I18nProvider aplica la preferencia del servidor al iniciar sesión; sin
    normalizarla, un usuario con `en` guardado corre la suite en inglés.
    """
    password = password or PASSWORD
    try:
        token = auth_request(
            "POST",
            "/api/auth/login",
            {
                "email": email,
                "password": password,
                "application": "erp",
                "rememberMe": False,
            },
        )["accessToken"]
        auth_request(
            "PUT",
            "/api/auth/me/preferences",
            {"lang": "es"},
            token=token,
        )
        print(f"  idioma es aplicado a {email}")
    except Exception as exc:  # noqa: BLE001 - best-effort opcional
        message = f"  aviso: no se pudo fijar el idioma de {email}: {exc}"
        if best_effort:
            print(message)
        else:
            raise SystemExit(message) from exc


def auth_request(
    method: str,
    path: str,
    payload: dict | None = None,
    token: str | None = None,
) -> dict:
    """Llamada JSON simple al Auth Service (sin dependencias extra)."""
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urlrequest.Request(
        f"{AUTH_URL}{path}", data=body, headers=headers, method=method
    )
    with urlrequest.urlopen(req, timeout=15) as response:
        raw = response.read().decode("utf-8")
    return json.loads(raw) if raw else {}


def locate_internal_key() -> str:
    """Lee Auth:InternalApiKey del appsettings local del backend (o env)."""
    env_key = os.environ.get("AUTH_INTERNAL_KEY")
    if env_key:
        return env_key
    candidates: list[Path] = []
    backend_env = os.environ.get("COPPADDRESD_BACK_DIR")
    if backend_env:
        candidates.append(Path(backend_env))
    candidates.append(REPO_ROOT / "coppAddresdBack")
    candidates.extend(parent / "coppAddresdBack" for parent in REPO_ROOT.parents)
    for root in candidates:
        auth_dir = root / "src/Services/CoppAddresd.Auth"
        for name in ("appsettings.json", "appsettings.Development.json"):
            appsettings = auth_dir / name
            if appsettings.exists():
                config = json.loads(appsettings.read_text(encoding="utf-8"))
                key = config.get("Auth", {}).get("InternalApiKey")
                if key:
                    return key
    raise SystemExit(
        "No se encontró AUTH_INTERNAL_KEY ni Auth:InternalApiKey en el appsettings "
        "del backend. Exportá AUTH_INTERNAL_KEY o COPPADDRESD_BACK_DIR."
    )


# ---------------------------------------------------------------------------
# Limpieza idempotente y creación de citas
# ---------------------------------------------------------------------------


def wipe_seed(conn: psycopg.Connection) -> None:
    """Borra solo lo creado por el seed (citas y solicitudes E2E).

    Las salas/sesiones de las citas caen por cascada. Los horarios
    profesionales (erp.*) no se tocan: son catálogo compartido.
    """
    deleted_requests = conn.execute(
        "DELETE FROM tele.telemedicine_requests WHERE created_by = %s",
        (E2E_SEED_USER_ID,),
    ).rowcount
    deleted = conn.execute(
        "DELETE FROM tele.appointments WHERE created_by = %s", (E2E_SEED_USER_ID,)
    ).rowcount
    print(
        f"  limpieza previa: {deleted} citas y {deleted_requests} solicitudes del seed"
    )


def ensure_professional_schedules(
    conn: psycopg.Connection, professional_id: uuid.UUID
) -> None:
    """Garantiza franja L-V 08:00-17:00 para el profesional E2E (idempotente).

    Sin horario semanal, /availability retorna vacío y el diálogo
    "Confirmar y agendar cita" no ofrece slots (evidencia qa-citas-3_1).
    """
    for weekday in (1, 2, 3, 4, 5):
        conn.execute(
            "INSERT INTO erp.professional_schedules "
            "(professional_id, weekday, start_time, end_time) "
            "VALUES (%s, %s, %s::time, %s::time) "
            "ON CONFLICT (professional_id, weekday) DO NOTHING",
            (professional_id, weekday, "08:00", "17:00"),
        )


def next_preferred_start(now: datetime) -> datetime:
    """Fecha preferida del request E2E: +3 días hábiles a las 15:00 UTC.

    Respeta la anticipación mínima (2 h) y cae en día con horario L-V.
    """
    candidate = now + timedelta(days=3)
    candidate = candidate.replace(hour=15, minute=0, second=0, microsecond=0)
    while candidate.weekday() >= 5:
        candidate += timedelta(days=1)
    return candidate


def create_pending_request(
    conn: psycopg.Connection,
    professional: dict,
    patient: dict,
    context: dict,
) -> uuid.UUID:
    """Solicitud Pending dedicada al flujo bandeja -> agenda (repetible).

    Se recrea en cada seed (wipe previo por created_by), así la suite puede
    confirmarla sin depender de datos demo preexistentes.
    """
    now = datetime.now(timezone.utc)
    request_id = uuid.uuid4()
    conn.execute(
        """
        INSERT INTO tele.telemedicine_requests
            (id, patient_id, professional_id, specialty_id, organization_id,
             clinic_id, location_id, preferred_start, reason, status, notes,
             created_by, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            request_id,
            patient["id"],
            professional["id"],
            context["specialty_id"],
            context["organization_id"],
            context["clinic_id"],
            context["location_id"],
            next_preferred_start(now),
            E2E_REQUEST_REASON,
            "Pending",
            "Solicitud E2E del flujo bandeja -> confirmar y agendar -> agenda",
            E2E_SEED_USER_ID,
            now - timedelta(hours=1),
        ),
    )
    print(f"  solicitud pendiente E2E: {request_id}")
    return request_id


def create_appointments(
    conn: psycopg.Connection,
    professional: dict,
    patient: dict,
    context: dict,
) -> dict[str, uuid.UUID]:
    """Citas deterministas: sala abierta/cerrada, métricas y gracia de reapertura."""
    now = datetime.now(timezone.utc)
    ids = {
        "roomOpen": uuid.uuid4(),
        "metrics": uuid.uuid4(),
        "roomClosed": uuid.uuid4(),
        "reopenRecent": uuid.uuid4(),
        "reopenOld": uuid.uuid4(),
    }

    def insert(
        appointment_id: uuid.UUID,
        start: datetime,
        end: datetime,
        status: str,
        completed_at: datetime | None = None,
    ) -> None:
        duration_minutes = int((end - start).total_seconds() // 60)
        conn.execute(
            """
            INSERT INTO tele.appointments
                (id, request_id, patient_id, professional_id, specialty_id,
                 organization_id, clinic_id, location_id,
                 scheduled_start, scheduled_end, duration_minutes, status,
                 reschedule_count, cancellation_reason, cancelled_by,
                 cancelled_at, completed_at, reopen_count, created_by, created_at)
            VALUES (%s, NULL, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    0, NULL, NULL, NULL, %s, 0, %s, %s)
            """,
            (
                appointment_id,
                patient["id"],
                professional["id"],
                context["specialty_id"],
                context["organization_id"],
                context["clinic_id"],
                context["location_id"],
                start,
                end,
                duration_minutes,
                status,
                completed_at,
                E2E_SEED_USER_ID,
                now - timedelta(days=1),
            ),
        )

    # Ventana de sala abierta (start - 10 min .. end + 15 min): en curso y a futuro.
    insert(
        ids["roomOpen"],
        now - timedelta(minutes=5),
        now + timedelta(minutes=25),
        "Confirmed",
    )
    # `metrics` también con la ventana abierta al terminar el seed (duración 45):
    # /session/start debe funcionar de inmediato. Termina justo cuando empieza
    # `roomOpen` para no violar la exclusión GiST de solapamiento del backend.
    insert(
        ids["metrics"],
        now - timedelta(minutes=50),
        now - timedelta(minutes=5),
        "Confirmed",
    )
    insert(
        ids["roomClosed"],
        now + timedelta(minutes=185),
        now + timedelta(minutes=215),
        "Confirmed",
    )

    # Completadas: ancla de la ventana de reapertura dentro y fuera de la gracia.
    insert(
        ids["reopenRecent"],
        now - timedelta(minutes=35),
        now - timedelta(minutes=5),
        "Completed",
        completed_at=now - timedelta(minutes=5),
    )
    insert(
        ids["reopenOld"],
        now - timedelta(minutes=125),
        now - timedelta(minutes=95),
        "Completed",
        completed_at=now - timedelta(minutes=95),
    )
    return ids


def create_rooms(conn: psycopg.Connection, appointments: dict[str, uuid.UUID]) -> None:
    """Sala activa para las citas en ventana; salas terminadas para las completadas.

    La sala pre-creada evita que el backend llame al proveedor de video en
    `session/start` y `join-token` (el E2E no usa credenciales Twilio reales).
    """
    now = datetime.now(timezone.utc)
    for key in ("roomOpen", "metrics"):
        room_id = uuid.uuid4()
        conn.execute(
            """
            INSERT INTO tele.virtual_rooms
                (id, appointment_id, provider, provider_room_sid, provider_room_name,
                 status, scheduled_open_at, scheduled_close_at, max_participants,
                 created_by, created_at)
            VALUES (%s, %s, 'Twilio', %s, %s, 'Active', %s, %s, 3, %s, %s)
            """,
            (
                room_id,
                appointments[key],
                f"RM{str(appointments[key])[:8].upper()}",
                f"apt-{appointments[key]}",
                now - timedelta(minutes=15),
                now + timedelta(hours=2),
                E2E_SEED_USER_ID,
                now - timedelta(minutes=10),
            ),
        )

    for key in ("reopenRecent", "reopenOld"):
        room_id = uuid.uuid4()
        conn.execute(
            """
            INSERT INTO tele.virtual_rooms
                (id, appointment_id, provider, provider_room_sid, provider_room_name,
                 status, scheduled_open_at, scheduled_close_at, max_participants,
                 created_by, created_at)
            VALUES (%s, %s, 'Twilio', %s, %s, 'Ended', %s, %s, 3, %s, %s)
            """,
            (
                room_id,
                appointments[key],
                f"RM{str(appointments[key])[:8].upper()}",
                f"apt-{appointments[key]}",
                now - timedelta(hours=2),
                now - timedelta(minutes=30),
                E2E_SEED_USER_ID,
                now - timedelta(hours=3),
            ),
        )
        conn.execute(
            """
            INSERT INTO tele.telemedicine_sessions
                (id, appointment_id, room_id, status, started_at, ended_at,
                 duration_seconds, ended_by, end_reason, created_by, created_at)
            VALUES (%s, %s, %s, 'Ended', %s, %s, 600, NULL, 'Completed', %s, %s)
            """,
            (
                uuid.uuid4(),
                appointments[key],
                room_id,
                now - timedelta(minutes=45),
                now - timedelta(minutes=35),
                E2E_SEED_USER_ID,
                now - timedelta(hours=3),
            ),
        )


if __name__ == "__main__":
    main()
