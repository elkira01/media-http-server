FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json ./
COPY src/ ./src/
RUN bun run build

FROM oven/bun:1-slim
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=build /app/dist/index.js ./dist/index.js
COPY migrations/ ./src/migrations/
COPY scripts/run-migrations.ts ./scripts/run-migrations.ts
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh

VOLUME /app/data

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
