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

VOLUME /app/data

EXPOSE 3000

CMD ["bun", "run", "dist/index.js"]
