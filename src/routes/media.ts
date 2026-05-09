import { Hono } from 'hono'
import { db } from '../db'
import { uuidv7 } from '../uuid'
import {
  generateFilename,
  saveFile,
  deleteFile,
  readFileBuffer,
  detectMediaType,
} from '../storage'

const app = new Hono()

// List media (optionally filter by folder_id and/or media_type)
app.get('/', (c) => {
  const folderId = c.req.query('folder_id')
  const mediaType = c.req.query('media_type')

  let sql = 'SELECT * FROM media WHERE 1=1'
  const params: (string | number | null)[] = []

  if (folderId !== undefined) {
    sql += ' AND folder_id = ?'
    params.push(folderId)
  }
  if (mediaType) {
    sql += ' AND media_type = ?'
    params.push(mediaType)
  }

  sql += ' ORDER BY created_at DESC'
  const rows = db.query(sql).all(...params)
  return c.json(rows)
})

// Upload media
app.post('/', async (c) => {
  const form = await c.req.formData()
  const file = form.get('file') as File | null
  if (!file) {
    return c.json({ error: 'file is required' }, 400)
  }

  const folderIdRaw = form.get('folder_id')
  const folderId = folderIdRaw ? String(folderIdRaw) : null

  if (folderId) {
    const folder = db.query('SELECT id FROM folders WHERE id = ?').get(folderId)
    if (!folder) return c.json({ error: 'folder not found' }, 400)
  }

  const id = uuidv7()
  const filename = generateFilename(file.name)
  const mediaType = detectMediaType(file.type || 'application/octet-stream')
  const storagePath = await saveFile(file, filename)
  const size = file.size

  const stmt = db.query(
    `INSERT INTO media
     (id, filename, original_name, mime_type, size, folder_id, storage_path, media_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING *`
  )
  const row = stmt.get(
    id,
    filename,
    file.name,
    file.type || 'application/octet-stream',
    size,
    folderId,
    storagePath,
    mediaType
  ) as Record<string, unknown>

  return c.json(row, 201)
})

// Get single media metadata
app.get('/:id', (c) => {
  const id = c.req.param('id')
  const row = db.query('SELECT * FROM media WHERE id = ?').get(id) as Record<string, unknown> | null
  if (!row) return c.json({ error: 'not found' }, 404)
  return c.json(row)
})

// Download / serve file
app.get('/:id/download', async (c) => {
  const id = c.req.param('id')
  const row = db.query('SELECT * FROM media WHERE id = ?').get(id) as {
    storage_path: string
    original_name: string
    mime_type: string
    media_type: string
  } | null

  if (!row) return c.json({ error: 'not found' }, 404)

  const filepath = row.storage_path
  const bunFile = Bun.file(filepath)

  if (row.media_type === 'video') {
    // Stream with range support
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

  // For images/documents, just serve the whole file
  const buffer = await readFileBuffer(filepath)
  c.header('Content-Type', row.mime_type)
  c.header('Content-Disposition', `attachment; filename="${row.original_name}"`)
  return c.body(buffer.buffer as ArrayBuffer)
})

// Delete media
app.delete('/:id', (c) => {
  const id = c.req.param('id')
  const row = db.query('SELECT storage_path FROM media WHERE id = ?').get(id) as { storage_path: string } | null
  if (!row) return c.json({ error: 'not found' }, 404)

  deleteFile(row.storage_path)
  db.run('DELETE FROM media WHERE id = ?', [id])
  return c.json({ success: true })
})

// Move media to another folder
app.patch('/:id/move', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ folder_id: string | null }>()
  const folderId = body.folder_id ?? null

  if (folderId) {
    const folder = db.query('SELECT id FROM folders WHERE id = ?').get(folderId)
    if (!folder) return c.json({ error: 'folder not found' }, 400)
  }

  db.run('UPDATE media SET folder_id = ? WHERE id = ?', [folderId, id])
  const row = db.query('SELECT * FROM media WHERE id = ?').get(id) as Record<string, unknown> | null
  if (!row) return c.json({ error: 'not found' }, 404)
  return c.json(row)
})

export default app
