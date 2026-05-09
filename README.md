# media-manager

Lightweight media API built with Bun + Hono.

## Stack
- **Runtime:** Bun
- **Framework:** Hono
- **Database:** SQLite (`bun:sqlite`)
- **Storage:** Local filesystem

## Getting started

```bash
bun install
bun run dev
```

Server runs on `http://localhost:3000`.

## Endpoints

### Folders
- `GET /folders?parent_id=` — List folders (root if no `parent_id`)
- `POST /folders` — Create folder `{ name, parent_id? }`
- `GET /folders/:id` — Get folder
- `DELETE /folders/:id` — Delete folder (cascades children)

### Media
- `GET /media?folder_id=&media_type=` — List media items
- `POST /media` — Upload file (`multipart/form-data` with `file`, optional `folder_id`)
- `GET /media/:id` — Get media metadata
- `GET /media/:id/download` — Download / serve file (supports video range requests)
- `DELETE /media/:id` — Delete media
- `PATCH /media/:id/move` — Move to folder `{ folder_id }`

## Storage
- Database: `./data/media.db`
- Uploads: `./data/uploads/`
