#!/usr/bin/env bash

cd /home/debian/staark-next || exit 1

export DATABASE_URL='postgresql://staark:staark-local-dev@127.0.0.1:5433/staark_greenfield?schema=public'
export STAARK_DATA_SOURCE=postgres
export STAARK_SITE_KEY=test-prod-salon
export STAARK_DATA_FALLBACK=none
export STAARK_CONTENT_SOURCE=fixtures
export STAARK_STORAGE=fs
export STAARK_STORAGE_DIR='/home/debian/staark-next/apps/starter'

export ADMIN_USERNAME=admin
export ADMIN_PASSWORD='admin'
export ADMIN_CLIENT_USERNAME=client
export ADMIN_CLIENT_PASSWORD='StaarkClient-Test-2026!'
export ADMIN_SESSION_SECRET='staark-dev-session-secret-12345678901234567890'

export PORT=3200
export HOSTNAME=0.0.0.0

node apps/starter/.next/standalone/apps/starter/server.js
