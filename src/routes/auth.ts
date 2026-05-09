import { Hono } from 'hono'
import { db } from '../db'
import { uuidv7 } from '../uuid'
import { hashPassword, verifyPassword, generateTokenPair, findRefreshToken, revokeRefreshToken } from '../auth'

const app = new Hono()

// Register
app.post('/register', async (c) => {
  const body = await c.req.json<{ username: string; password: string }>()

  if (!body.username?.trim() || !body.password) {
    return c.json({ error: 'username and password are required' }, 400)
  }

  if (body.password.length < 6) {
    return c.json({ error: 'password must be at least 6 characters' }, 400)
  }

  const existing = db.query('SELECT id FROM users WHERE username = ?').get(body.username.trim())
  if (existing) {
    return c.json({ error: 'username already taken' }, 409)
  }

  const id = uuidv7()
  const passwordHash = await hashPassword(body.password)

  db.query('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(id, body.username.trim(), passwordHash)

  const tokens = await generateTokenPair(id)

  return c.json({
    user: { id, username: body.username.trim() },
    ...tokens,
  }, 201)
})

// Login
app.post('/login', async (c) => {
  const body = await c.req.json<{ username: string; password: string }>()

  if (!body.username || !body.password) {
    return c.json({ error: 'username and password are required' }, 400)
  }

  const row = db.query('SELECT * FROM users WHERE username = ?').get(body.username) as {
    id: string
    username: string
    password_hash: string
  } | null

  if (!row) {
    return c.json({ error: 'invalid credentials' }, 401)
  }

  const valid = await verifyPassword(body.password, row.password_hash)
  if (!valid) {
    return c.json({ error: 'invalid credentials' }, 401)
  }

  const tokens = await generateTokenPair(row.id)

  return c.json({
    user: { id: row.id, username: row.username },
    ...tokens,
  })
})

// Refresh
app.post('/refresh', async (c) => {
  const body = await c.req.json<{ refresh_token: string }>()

  if (!body.refresh_token) {
    return c.json({ error: 'refresh_token is required' }, 400)
  }

  const stored = await findRefreshToken(body.refresh_token)
  if (!stored) {
    return c.json({ error: 'invalid or expired refresh token' }, 401)
  }

  // Revoke old refresh token (rotation)
  await revokeRefreshToken(body.refresh_token)

  // Issue new token pair
  const tokens = await generateTokenPair(stored.user_id)

  return c.json(tokens)
})

// Logout (revoke refresh token)
app.post('/logout', async (c) => {
  const body = await c.req.json<{ refresh_token: string }>()

  if (body.refresh_token) {
    await revokeRefreshToken(body.refresh_token)
  }

  return c.json({ success: true })
})

export default app
