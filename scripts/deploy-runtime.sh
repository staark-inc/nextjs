#!/usr/bin/env bash
set -Eeuo pipefail

TAG="${1:-}"

if [ -z "$TAG" ]; then
  echo "Usage: $0 <tag>"
  echo "Example: $0 b2.3.2"
  exit 1
fi

REPO_DIR="/home/debian/staark-next"
COMPOSE_DIR="/srv/saas/runtime"
COMPOSE_FILE="$COMPOSE_DIR/docker-compose.yml"
IMAGE="staark-saas-runtime:$TAG"

echo
echo "==> Staark Runtime deploy"
echo "    tag: $TAG"
echo

cd "$REPO_DIR"

echo "==> 1/8 Generate Prisma client"
DATABASE_URL=postgresql://staark:build-only@127.0.0.1:5432/staark   pnpm --filter @staark/starter db:generate

echo
echo "==> 2/8 Typecheck"
pnpm --filter @staark/starter typecheck

echo
echo "==> 3/8 Git diff check"
git diff --check

echo
echo "==> 4/8 Git status"
git status --short

if [ -n "$(git status --porcelain)" ]; then
  echo
  echo "ERROR: working tree is not clean."
  echo "Commit/push your changes before deployment."
  exit 1
fi

echo
echo "==> 5/8 Verify local HEAD is pushed"
LOCAL_HEAD="$(git rev-parse HEAD)"
REMOTE_HEAD="$(git ls-remote origin refs/heads/main | awk '{print $1}')"

if [ "$LOCAL_HEAD" != "$REMOTE_HEAD" ]; then
  echo "ERROR: local HEAD is not the same as origin/main."
  echo "local : $LOCAL_HEAD"
  echo "remote: $REMOTE_HEAD"
  exit 1
fi

echo
echo "==> 6/8 Build Docker image"
sudo docker build \
  -f apps/starter/Dockerfile \
  -t "$IMAGE" \
  .

echo
echo
echo "==> 6/8 Build migration image"
MIGRATION_IMAGE="staark-saas-runtime-migrate:$TAG"

sudo docker build   --target build   -f apps/starter/Dockerfile   -t "$MIGRATION_IMAGE"   .

echo
echo "==> 7/8 Run Prisma migrations"

CURRENT_CONTAINER="$(
  cd "$COMPOSE_DIR"
  sudo docker compose ps -q runtime
)"

if [ -z "$CURRENT_CONTAINER" ]; then
  echo "ERROR: current runtime container not found."
  exit 1
fi

DATABASE_URL="$(
  sudo docker inspect     "$CURRENT_CONTAINER"     --format '{{range .Config.Env}}{{println .}}{{end}}'     | sed -n 's/^DATABASE_URL=//p'     | head -1
)"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not found on current runtime container."
  exit 1
fi

RUNTIME_NETWORK="$(
  sudo docker inspect     "$CURRENT_CONTAINER"     --format '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}'     | head -1
)"

if [ -z "$RUNTIME_NETWORK" ]; then
  echo "ERROR: runtime Docker network not found."
  exit 1
fi

sudo docker run   --rm   --network "$RUNTIME_NETWORK"   -e DATABASE_URL="$DATABASE_URL"   "$MIGRATION_IMAGE"   pnpm --filter @staark/starter db:migrate:deploy

echo
echo "==> 8/8 Update runtime compose image"
sudo python3 - "$COMPOSE_FILE" "$IMAGE" <<'PY2'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
image = sys.argv[2]

text = path.read_text()

updated, count = re.subn(
    r'image:\s*staark-saas-runtime:[^\s]+',
    f'image: {image}',
    text,
    count=1,
)

if count != 1:
    raise SystemExit(
        "ERROR: runtime image line not found exactly once"
    )

path.write_text(updated)
print(f"runtime image -> {image}")
PY2

echo
echo "==> Recreate runtime"
cd "$COMPOSE_DIR"

sudo docker compose up -d --force-recreate runtime

echo
echo "==> Container status"
sudo docker compose ps runtime

echo
echo "==> Running image"
CONTAINER_ID="$(sudo docker compose ps -q runtime)"

sudo docker inspect \
  "$CONTAINER_ID" \
  --format 'IMAGE={{.Config.Image}} ID={{.Image}}'

echo
echo "==> Last runtime logs"
sudo docker compose logs --tail=60 runtime

echo
echo "========================================"
echo " Runtime deploy complete: $IMAGE"
echo "========================================"
