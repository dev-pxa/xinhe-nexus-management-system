#!/usr/bin/env bash
# Deploy the management web UI to the shared server without using training's web port.
set -euo pipefail

SSH_HOST="${SSH_HOST:-49.232.34.105}"
SSH_USER="${SSH_USER:-root}"
SSH_PORT="${SSH_PORT:-22}"
SSH_KEY_PATH="${SSH_KEY_PATH:-}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/xinhe-nexus-management-system}"
WEB_PORT="${WEB_PORT:-18080}"
SERVER_NAME="${SERVER_NAME:-nexus.glowlink.ren}"
BACKEND_URL="${BACKEND_URL:-http://host.docker.internal:18081}"
APP_BACKEND_URL="${APP_BACKEND_URL:-http://host.docker.internal:18083}"
WEB_DOCKERFILE="${WEB_DOCKERFILE:-Dockerfile}"
ARCHIVE_NAME="xinhe-nexus-management-system-release.tgz"
LOCAL_ARCHIVE="/tmp/${ARCHIVE_NAME}"
REMOTE_ARCHIVE="/tmp/${ARCHIVE_NAME}"
STATUS_ONLY="false"

SCP_CMD=(scp -P "$SSH_PORT")
SSH_CMD=(ssh -p "$SSH_PORT")
if [[ -n "$SSH_KEY_PATH" ]]; then
  SCP_CMD=(scp -i "$SSH_KEY_PATH" -P "$SSH_PORT")
  SSH_CMD=(ssh -i "$SSH_KEY_PATH" -p "$SSH_PORT")
fi

if [[ "${1:-}" == "--status" ]]; then
  STATUS_ONLY="true"
elif [[ $# -gt 0 ]]; then
  echo "Usage: scripts/deploy-ssh.sh [--status]" >&2
  exit 1
fi

if [[ -z "$DEPLOY_PATH" || "$DEPLOY_PATH" == "/" ]]; then
  echo "Invalid DEPLOY_PATH: $DEPLOY_PATH" >&2
  exit 1
fi
if [[ "$WEB_PORT" != "18080" || "$SERVER_NAME" != "nexus.glowlink.ren" || "$BACKEND_URL" != "http://host.docker.internal:18081" || "$APP_BACKEND_URL" != "http://host.docker.internal:18083" ]]; then
  echo "Xinhe Nexus deployment must use domain nexus.glowlink.ren, WEB_PORT=18080, and backend ports 18081/18083" >&2
  exit 1
fi
if [[ "$WEB_DOCKERFILE" != "Dockerfile" && "$WEB_DOCKERFILE" != "Dockerfile.release" ]]; then
  echo "WEB_DOCKERFILE must be Dockerfile or Dockerfile.release" >&2
  exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

if [[ "$STATUS_ONLY" == "true" ]]; then
  "${SSH_CMD[@]}" "${SSH_USER}@${SSH_HOST}" "cd '$DEPLOY_PATH' && (docker compose ps || docker-compose ps)"
  exit 0
fi

echo "Packing management web release..."
rm -f "$LOCAL_ARCHIVE"
TAR_EXCLUDES=(
  --exclude='.git' \
  --exclude='.github' \
  --exclude='.codex' \
  --exclude='node_modules' \
  --exclude='.swc' \
  --exclude='.umi' \
  --exclude='.umi-production' \
  --exclude='.cache' \
  --exclude='.pnpm-store' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='.DS_Store'
)
if [[ "$WEB_DOCKERFILE" == "Dockerfile" ]]; then
  TAR_EXCLUDES+=(--exclude='dist')
elif [[ ! -d dist ]]; then
  echo "dist/ is required when WEB_DOCKERFILE=Dockerfile.release" >&2
  exit 1
fi
tar "${TAR_EXCLUDES[@]}" -czf "$LOCAL_ARCHIVE" .
cleanup() { rm -f "$LOCAL_ARCHIVE"; }
trap cleanup EXIT

echo "Uploading release to ${SSH_USER}@${SSH_HOST}:${DEPLOY_PATH}..."
"${SCP_CMD[@]}" "$LOCAL_ARCHIVE" "${SSH_USER}@${SSH_HOST}:${REMOTE_ARCHIVE}"

"${SSH_CMD[@]}" "${SSH_USER}@${SSH_HOST}" \
  "DEPLOY_PATH='$DEPLOY_PATH' WEB_PORT='$WEB_PORT' SERVER_NAME='$SERVER_NAME' BACKEND_URL='$BACKEND_URL' APP_BACKEND_URL='$APP_BACKEND_URL' WEB_DOCKERFILE='$WEB_DOCKERFILE' REMOTE_ARCHIVE='$REMOTE_ARCHIVE' bash -s" <<'REMOTE'
set -euo pipefail
mkdir -p "$DEPLOY_PATH"
find "$DEPLOY_PATH" -mindepth 1 -maxdepth 1 ! -name '.env' -exec rm -rf {} +
tar -xzf "$REMOTE_ARCHIVE" -C "$DEPLOY_PATH"
rm -f "$REMOTE_ARCHIVE"
cd "$DEPLOY_PATH"

cat > .env <<EOF
WEB_PORT=$WEB_PORT
SERVER_NAME=$SERVER_NAME
BACKEND_URL=$BACKEND_URL
APP_BACKEND_URL=$APP_BACKEND_URL
WEB_DOCKERFILE=$WEB_DOCKERFILE
EOF

# The shared server's training UI uses port 80; this stack intentionally uses 18080.
grep -q 'WEB_PORT:-18080' docker-compose.yml
grep -q 'SERVER_NAME:-nexus.glowlink.ren' docker-compose.yml
grep -q 'host.docker.internal:18081' docker-compose.yml
grep -q 'host.docker.internal:18083' docker-compose.yml
[[ "$WEB_DOCKERFILE" == "Dockerfile" || "$WEB_DOCKERFILE" == "Dockerfile.release" ]]
[[ -f "$WEB_DOCKERFILE" ]]
docker compose --env-file .env config --quiet
for attempt in $(seq 1 3); do
  echo "Building and starting web container (attempt ${attempt}/3)..."
  if docker compose --env-file .env up -d --build --remove-orphans; then
    break
  fi
  if [[ "$attempt" == "3" ]]; then
    echo "Web image build failed after 3 attempts." >&2
    exit 1
  fi
  echo "Docker BuildKit failed; retrying in 15 seconds..." >&2
  sleep 15
done
docker compose --env-file .env ps
curl -fsS "http://127.0.0.1:${WEB_PORT}/" >/dev/null
REMOTE

echo "Deploy completed: http://${SSH_HOST}:18080"
