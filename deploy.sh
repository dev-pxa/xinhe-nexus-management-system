#!/usr/bin/env sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$PROJECT_DIR"

[ -f .env ] || cp .env.example .env
docker compose --env-file .env config --quiet
docker compose --env-file .env up -d --build --remove-orphans
docker compose --env-file .env ps

