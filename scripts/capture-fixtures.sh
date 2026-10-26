#!/usr/bin/env bash
# Capture real API responses as JSON fixtures for the iOS tests.
#
# Usage:
#   BASE_URL=http://localhost:3000 TOKEN=<bearer> scripts/capture-fixtures.sh
#   BASE_URL=http://localhost:3000 USERNAME=me PASSWORD=secret scripts/capture-fixtures.sh
#
# Read-only: only GET requests (plus the login POST when USERNAME/PASSWORD are given).
# Needs bash, curl and node. Output: mobile/ios/GobblTests/Fixtures/<name>.json
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
BASE_URL="${BASE_URL%/}"
TOKEN="${TOKEN:-}"
USERNAME="${USERNAME:-}"
PASSWORD="${PASSWORD:-}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$REPO_ROOT/mobile/ios/GobblTests/Fixtures"
mkdir -p "$OUT_DIR"

# Pretty-print JSON from stdin to stdout (2-space indent, trailing newline).
pretty() {
  node -e '
    let s = "";
    process.stdin.on("data", (c) => (s += c));
    process.stdin.on("end", () => {
      try {
        process.stdout.write(JSON.stringify(JSON.parse(s), null, 2) + "\n");
      } catch (e) {
        process.stderr.write("response was not valid JSON: " + s.slice(0, 200) + "\n");
        process.exit(1);
      }
    });
  '
}

# save <name> <raw-json-file>: pretty-print into the fixtures dir and print a summary line.
save() {
  local name="$1" raw="$2" dest="$OUT_DIR/$1.json"
  pretty < "$raw" > "$dest.tmp"
  mv "$dest.tmp" "$dest"
  printf '%-28s %6s bytes  -> %s\n' "$name" "$(wc -c < "$dest" | tr -d ' ')" "mobile/ios/GobblTests/Fixtures/$name.json"
}

TMP="$(mktemp)"
trap 'rm -f "$TMP" "$TMP.login"' EXIT

# --- authentication ---------------------------------------------------------
if [ -z "$TOKEN" ]; then
  if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
    echo "Set TOKEN, or both USERNAME and PASSWORD." >&2
    exit 2
  fi
  # Build the JSON body with node so special characters in the password are escaped.
  LOGIN_BODY="$(U="$USERNAME" P="$PASSWORD" node -e 'process.stdout.write(JSON.stringify({username: process.env.U, password: process.env.P}))')"
  status="$(curl -sS -o "$TMP.login" -w '%{http_code}' -X POST \
    -H 'Content-Type: application/json' -d "$LOGIN_BODY" \
    "$BASE_URL/api/mobile/auth/login")"
  if [ "$status" != "200" ]; then
    echo "Login failed (HTTP $status): $(cat "$TMP.login")" >&2
    exit 1
  fi
  TOKEN="$(node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>process.stdout.write(JSON.parse(s).accessToken))' < "$TMP.login")"
  save "mobile-auth-login" "$TMP.login"
else
  echo "Using TOKEN from environment; skipping mobile-auth-login.json (no login call made)."
fi

# --- GET endpoints ----------------------------------------------------------
# fetch <name> <path-with-query> <auth: yes|no>
fetch() {
  local name="$1" path="$2" auth="$3" status
  if [ "$auth" = "yes" ]; then
    status="$(curl -sS -o "$TMP" -w '%{http_code}' -H "Authorization: Bearer $TOKEN" -H 'Accept: application/json' "$BASE_URL$path")"
  else
    status="$(curl -sS -o "$TMP" -w '%{http_code}' -H 'Accept: application/json' "$BASE_URL$path")"
  fi
  if [ "$status" != "200" ]; then
    echo "GET $path failed (HTTP $status): $(head -c 300 "$TMP")" >&2
    exit 1
  fi
  save "$name" "$TMP"
}

fetch "config"                  "/api/config"                                no
fetch "user"                    "/api/user"                                  yes
fetch "debates"                 "/api/debates"                               yes
fetch "leaderboard"             "/api/leaderboard?sort=xp"                   yes
fetch "modules"                 "/api/modules"                               yes
fetch "shop"                    "/api/shop"                                  yes
fetch "personas-preview"        "/api/personas/preview?tier=Friendly%20Cluck" yes

echo "Done. Fixtures are in $OUT_DIR"
