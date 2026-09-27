# Staark Next — production image (monorepo, Next.js standalone)
# Build from the repo root:  docker build -f apps/starter/Dockerfile -t staark-next .

# 1. Dependencies (cached unless manifests change)
FROM node:22-slim AS deps
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY themes ./themes
COPY apps/starter/package.json ./apps/starter/package.json
RUN pnpm install --frozen-lockfile

# 2. Build the standalone server
FROM node:22-slim AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo
# Copy the installed workspace, not only root/starter node_modules.
# pnpm creates package-local node_modules symlinks for workspace dependencies
# (for example @staark/platform -> @staark/core and themes -> theme-light).
COPY --from=deps /repo ./
COPY . .
RUN pnpm --filter @staark/starter build

# 3. Minimal runtime — only the standalone output + static assets + content
FROM node:22-slim AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
RUN useradd -m -u 1001 staark

# Standalone server (traced deps included), static assets, public folder and seed content.
# The packaged content is a read-only seed; fixture mode copies it through the
# storage driver on first boot when persistent storage is still empty.
COPY --from=build /repo/apps/starter/.next/standalone ./
COPY --from=build /repo/apps/starter/.next/static ./apps/starter/.next/static
COPY --from=build /repo/apps/starter/public ./apps/starter/public
COPY --from=build /repo/apps/starter/content ./apps/starter/content

# Writable state lives on a mounted volume (fs driver) or S3 (s3 driver).
RUN mkdir -p /data && chown -R staark:staark /app /data
ENV STAARK_STORAGE=fs STAARK_STORAGE_DIR=/data
VOLUME /data

USER staark
EXPOSE 3000
# The standalone entrypoint for this app inside the monorepo:
CMD ["node", "apps/starter/server.js"]
