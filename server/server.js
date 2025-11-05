import express from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { queryAll, queryOne, execute, itemExists } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
let db;
const dbPath = join(__dirname, 'database.sqlite');

async function initDatabase() {
  // Load sql.js WASM file
  const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
  const wasmBinary = readFileSync(wasmPath);
  
  const SQL = await initSqlJs({
    wasmBinary: wasmBinary
  });
  
  // Load existing database or create new one
  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create table if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS data_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Save database to file
  saveDatabase();
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(dbPath, buffer);
  }
}

// Initialize database and start server
try {
  await initDatabase();
  console.log('Database initialized successfully');
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}

// Helper function to validate ID parameter
function validateId(id) {
  const numId = parseInt(id, 10);
  if (isNaN(numId) || numId <= 0) {
    return null;
  }
  return numId;
}

// Helper function to validate input
function validateInput(name, description) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return 'Name is required and must be a non-empty string';
  }
  if (!description || typeof description !== 'string' || !description.trim()) {
    return 'Description is required and must be a non-empty string';
  }
  if (name.trim().length > 255) {
    return 'Name must be 255 characters or less';
  }
  if (description.trim().length > 1000) {
    return 'Description must be 1000 characters or less';
  }
  return null;
}

// Routes
// Get all items
app.get('/api/data', (req, res) => {
  try {
    const items = queryAll(db, 'SELECT * FROM data_items ORDER BY createdAt DESC');
    res.json(items);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Get single item
app.get('/api/data/:id', (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid ID parameter' });
    }
    
    const item = queryOne(db, 'SELECT * FROM data_items WHERE id = ?', [id]);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Create new item
app.post('/api/data', (req, res) => {
  try {
    const { name, description } = req.body;
    const validationError = validateInput(name, description);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    
    execute(db, 'INSERT INTO data_items (name, description) VALUES (?, ?)', [
      trimmedName,
      trimmedDescription,
    ]);
    saveDatabase();
    
    // Get the inserted item
    const newItem = queryOne(db, 'SELECT * FROM data_items WHERE id = last_insert_rowid()');
    
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Update item
app.put('/api/data/:id', (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid ID parameter' });
    }
    
    const { name, description } = req.body;
    const validationError = validateInput(name, description);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    
    // Check if item exists
    if (!itemExists(db, id)) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Update the item
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    
    execute(db, 'UPDATE data_items SET name = ?, description = ? WHERE id = ?', [
      trimmedName,
      trimmedDescription,
      id,
    ]);
    saveDatabase();
    
    // Get the updated item
    const updatedItem = queryOne(db, 'SELECT * FROM data_items WHERE id = ?', [id]);
    
    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete item
app.delete('/api/data/:id', (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid ID parameter' });
    }
    
    // Check if item exists
    if (!itemExists(db, id)) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Delete the item
    execute(db, 'DELETE FROM data_items WHERE id = ?', [id]);
    saveDatabase();
    
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please either:`);
    console.error(`  1. Kill the process using port ${PORT}: lsof -ti:${PORT} | xargs kill`);
    console.error(`  2. Use a different port: PORT=5002 npm run dev`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

