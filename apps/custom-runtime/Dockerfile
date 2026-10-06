# Build with the repository root as context.
FROM node:24-bookworm-slim AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm --filter @staark/custom-runtime build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 \
    STAARK_CUSTOM_PROJECT_DIR=/data/project
WORKDIR /app
RUN useradd --create-home --uid 1001 staark
COPY --from=build --chown=staark:staark /repo/apps/custom-runtime/.next/standalone ./
COPY --from=build --chown=staark:staark /repo/apps/custom-runtime/.next/static ./apps/custom-runtime/.next/static
COPY --from=build --chown=staark:staark /repo/apps/custom-runtime/public ./apps/custom-runtime/public
COPY --from=build --chown=staark:staark /repo/apps/custom-runtime/project /data/project
USER staark
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/runtime/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/custom-runtime/server.js"]
