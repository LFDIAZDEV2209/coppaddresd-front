#!/usr/bin/env bash
# e2e-local.sh — runner local de la suite E2E del ERP (F5).
#
# Requiere el stack backend levantado:
#   coppAddresdBack/scripts/dev-up.sh   (Postgres docker + Auth/Gateway/etc.)
# Este script aplica la migración de Telemedicina (dev-up.sh solo migra la API
# principal), corre los seeds y ejecuta Playwright.
#
# Uso: ./scripts/e2e-local.sh [args de playwright]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACK="${COPPADDRESD_BACK_DIR:-$ROOT/../coppAddresdBack}"

port_open() { (echo > "/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1; }

require_service() {
  local port="$1" name="$2"
  if ! port_open "$port"; then
    echo "Falta $name (:${port}). Levantá el stack con: $BACK/scripts/dev-up.sh" >&2
    exit 1
  fi
}

require_service 5123 auth
require_service 5130 telemedicine
require_service 5080 gateway

if [[ ! -d "$BACK" ]]; then
  echo "No se encontró coppAddresdBack en $BACK (podés setear COPPADDRESD_BACK_DIR)." >&2
  exit 1
fi

echo "== Migración de Telemedicina (dev-up.sh no la aplica) =="
(cd "$BACK" && dotnet run --project src/Services/CoppAddresd.Telemedicine -- --migrate)

echo "== Seeds =="
if [[ -f "$BACK/scripts/seed_unified_credentials.py" ]]; then
  (cd "$BACK/scripts" && python3 seed_unified_credentials.py) || \
    echo "aviso: seed_unified_credentials.py falló; seed-e2e.py continúa."
fi
python3 "$ROOT/e2e/seed/seed-e2e.py"

echo "== Suite Playwright =="
(cd "$ROOT" && yarn e2e "$@")

echo "== Listo. Reporte: yarn playwright show-report (playwright-report/) =="
