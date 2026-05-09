import { Hono } from 'hono'
import { db } from '../db'
import { uuidv7 } from '../uuid'

const app = new Hono()

// List folders (optionally by parent)
app.get('/', (c) => {
  const parentId = c.req.query('parent_id')
  let rows
  if (parentId) {
    rows = db.query('SELECT * FROM folders WHERE parent_id = ?').all(parentId)
  } else {
    rows = db.query('SELECT * FROM folders WHERE parent_id IS NULL').all()
  }
  return c.json(rows)
})

// Create folder
app.post('/', async (c) => {
  const body = await c.req.json<{ name: string; parent_id?: string | null }>()
  if (!body.name?.trim()) {
    return c.json({ error: 'name is required' }, 400)
  }
  const id = uuidv7()
  const stmt = db.query(
    'INSERT INTO folders (id, name, parent_id) VALUES (?, ?, ?) RETURNING *'
  )
  const row = stmt.get(id, body.name.trim(), body.parent_id ?? null) as Record<string, unknown>
  return c.json(row, 201)
})

// Get single folder
app.get('/:id', (c) => {
  const id = c.req.param('id')
  const row = db.query('SELECT * FROM folders WHERE id = ?').get(id) as Record<string, unknown> | null
  if (!row) return c.json({ error: 'not found' }, 404)
  return c.json(row)
})

// Delete folder (cascades children + sets media folder_id NULL)
app.delete('/:id', (c) => {
  const id = c.req.param('id')
  const existing = db.query('SELECT id FROM folders WHERE id = ?').get(id)
  if (!existing) return c.json({ error: 'not found' }, 404)
  db.run('DELETE FROM folders WHERE id = ?', [id])
  return c.json({ success: true })
})

export default app
