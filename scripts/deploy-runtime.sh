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

echo "==> 1/7 Typecheck"
pnpm --filter @staark/starter typecheck

echo
echo "==> 2/7 Git diff check"
git diff --check

echo
echo "==> 3/7 Git status"
git status --short

if [ -n "$(git status --porcelain)" ]; then
  echo
  echo "ERROR: working tree is not clean."
  echo "Commit/push your changes before deployment."
  exit 1
fi

echo
echo "==> 4/7 Verify local HEAD is pushed"
LOCAL_HEAD="$(git rev-parse HEAD)"
REMOTE_HEAD="$(git ls-remote origin refs/heads/main | awk '{print $1}')"

if [ "$LOCAL_HEAD" != "$REMOTE_HEAD" ]; then
  echo "ERROR: local HEAD is not the same as origin/main."
  echo "local : $LOCAL_HEAD"
  echo "remote: $REMOTE_HEAD"
  exit 1
fi

echo
echo "==> 5/7 Build Docker image"
sudo docker build \
  -f apps/starter/Dockerfile \
  -t "$IMAGE" \
  .

echo
echo "==> 6/7 Update runtime compose image"
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
echo "==> 7/7 Recreate runtime"
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
