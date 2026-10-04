#!/usr/bin/env bash
set -Eeuo pipefail

CONTAINER="${1:-staark-saas-runtime}"
ATTEMPTS="${SMOKE_ATTEMPTS:-20}"
DELAY="${SMOKE_DELAY:-2}"

echo "[smoke] checking runtime container: $CONTAINER"

for attempt in $(seq 1 "$ATTEMPTS"); do
  STATUS="$(
    sudo docker inspect \
      --format '{{.State.Status}}' \
      "$CONTAINER" 2>/dev/null || true
  )"

  if [ "$STATUS" != "running" ]; then
    echo "[smoke] attempt $attempt/$ATTEMPTS: container status=$STATUS"
    sleep "$DELAY"
    continue
  fi

  if sudo docker exec "$CONTAINER" \
    node -e '
      fetch("http://127.0.0.1:3000/api/readiness", {
        signal: AbortSignal.timeout(3000),
      })
        .then(async (r) => {
          const body = await r.text();

          if (!r.ok) {
            console.error(body);
            process.exit(1);
          }

          console.log(body);
        })
        .catch((error) => {
          console.error(error);
          process.exit(1);
        });
    '
  then
    echo "[smoke] readiness passed"
    exit 0
  fi

  echo "[smoke] attempt $attempt/$ATTEMPTS failed"
  sleep "$DELAY"
done

echo "[smoke] ERROR: runtime did not become ready"
exit 1
