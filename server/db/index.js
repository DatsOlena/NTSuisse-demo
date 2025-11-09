// Database helper module. Wraps sql.js initialisation and exposes tiny query helpers.
import initSqlJs from 'sql.js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Boots the in-process SQLite database and ensures the schema exists.
export async function initDatabase(dbFilePath) {
  const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm')
  const wasmBinary = readFileSync(wasmPath)

  const SQL = await initSqlJs({
    wasmBinary,
  })

  let db
  if (existsSync(dbFilePath)) {
    const buffer = readFileSync(dbFilePath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  const saveDatabase = () => {
    const data = db.export()
    const buffer = Buffer.from(data)
    writeFileSync(dbFilePath, buffer)
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS data_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  saveDatabase()

  return { db, saveDatabase }
}

// Executes a SELECT returning all rows as JS objects.
export function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql)
  if (params.length > 0) {
    stmt.bind(params)
  }

  const items = []
  while (stmt.step()) {
    items.push(stmt.getAsObject())
  }
  stmt.free()

  return items
}

// Executes a SELECT returning the first row or null.
export function queryOne(db, sql, params = []) {
  const stmt = db.prepare(sql)
  if (params.length > 0) {
    stmt.bind(params)
  }

  let item = null
  if (stmt.step()) {
    item = stmt.getAsObject()
  }
  stmt.free()

  return item
}

// Executes INSERT/UPDATE/DELETE statements.
export function execute(db, sql, params = []) {
  const stmt = db.prepare(sql)
  if (params.length > 0) {
    stmt.run(params)
  } else {
    stmt.run()
  }
  stmt.free()
}

// Convenience helper to check if an ID exists without pulling the entire row.
export function itemExists(db, id) {
  const item = queryOne(db, 'SELECT id FROM data_items WHERE id = ?', [id])
  return item !== null
}
