#!/usr/bin/env bash
# Lightweight smoke checks for local or deployed API (no Jest).
# Usage:
#   BASE_URL=https://your-backend.example.com/api ./scripts/smoke-e2e.sh
#   BASE_URL=http://localhost:8080/api ./scripts/smoke-e2e.sh
set -euo pipefail
BASE_URL="${BASE_URL:-http://localhost:8080/api}"
echo "Smoke: GET $BASE_URL/health"
code=$(curl -sS -o /tmp/okde_health.json -w "%{http_code}" "$BASE_URL/health")
if [[ "$code" != "200" ]]; then
  echo "FAIL health HTTP $code"
  exit 1
fi
python3 - <<'PY' || node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('/tmp/okde_health.json','utf8'));if(!j.ok)process.exit(1)"
import json
with open("/tmp/okde_health.json") as f:
    j = json.load(f)
assert j.get("ok") is True, j
print("OK:", j.get("service", "backend"))
PY
echo "Smoke passed."
