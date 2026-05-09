import { Hono } from 'hono'
import { db } from '../db'

const app = new Hono()

// Serve file by filename (inline display)
app.get('/:filename', async (c) => {
  const filename = c.req.param('filename')
  const row = db.query('SELECT * FROM media WHERE filename = ?').get(filename) as {
    storage_path: string
    mime_type: string
    media_type: string
  } | null

  if (!row) return c.json({ error: 'not found' }, 404)

  const bunFile = Bun.file(row.storage_path)

  if (row.media_type === 'video') {
    const range = c.req.header('range')
    const fileSize = bunFile.size

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      c.header('Content-Range', `bytes ${start}-${end}/${fileSize}`)
      c.header('Accept-Ranges', 'bytes')
      c.header('Content-Length', String(chunkSize))
      c.header('Content-Type', row.mime_type)
      c.status(206)
      return c.body(bunFile.slice(start, end + 1).stream())
    }

    c.header('Content-Length', String(fileSize))
    c.header('Content-Type', row.mime_type)
    c.header('Accept-Ranges', 'bytes')
    return c.body(bunFile.stream())
  }

  // Images/documents: serve inline with caching
  c.header('Content-Type', row.mime_type)
  c.header('Cache-Control', 'public, max-age=31536000')
  return c.body(bunFile.stream())
})

export default app
