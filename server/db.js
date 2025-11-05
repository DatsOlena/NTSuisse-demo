/**
 * Database helper functions to reduce code repetition
 */

/**
 * Execute a SELECT query and return all results as objects
 */
export function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  
  const items = [];
  while (stmt.step()) {
    items.push(stmt.getAsObject());
  }
  stmt.free();
  
  return items;
}

/**
 * Execute a SELECT query and return the first result, or null
 */
export function queryOne(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  
  let item = null;
  if (stmt.step()) {
    item = stmt.getAsObject();
  }
  stmt.free();
  
  return item;
}

/**
 * Execute an INSERT, UPDATE, or DELETE query
 */
export function execute(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.run(params);
  } else {
    stmt.run();
  }
  stmt.free();
}

/**
 * Check if an item exists by ID
 */
export function itemExists(db, id) {
  const item = queryOne(db, 'SELECT id FROM data_items WHERE id = ?', [id]);
  return item !== null;
}

