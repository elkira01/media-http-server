#!/bin/sh
set -e
bun run scripts/run-migrations.ts
exec bun run dist/index.js
