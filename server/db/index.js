import initSqlJs from 'sql.js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

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

export function execute(db, sql, params = []) {
  const stmt = db.prepare(sql)
  if (params.length > 0) {
    stmt.run(params)
  } else {
    stmt.run()
  }
  stmt.free()
}

export function itemExists(db, id) {
  const item = queryOne(db, 'SELECT id FROM data_items WHERE id = ?', [id])
  return item !== null
}
