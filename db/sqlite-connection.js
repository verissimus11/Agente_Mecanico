const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crear conexión a SQLite
const dbPath = path.join(__dirname, 'taller_control.db');
const db = new sqlite3.Database(dbPath);

// Función para promisificar queries
const runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

const getQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const allQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Función para inicializar la base de datos
const initializeDatabase = async () => {
  try {
    // Crear tabla vehicles
    await runQuery(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        plate TEXT NOT NULL,
        phone TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'EN_REVISION',
        last_event TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        active INTEGER DEFAULT 1
      )
    `);

    // Crear índices
    await runQuery('CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate)');
    await runQuery('CREATE INDEX IF NOT EXISTS idx_vehicles_phone ON vehicles(phone)');
    await runQuery('CREATE INDEX IF NOT EXISTS idx_vehicles_active ON vehicles(active)');

    console.log('✅ Base de datos SQLite inicializada correctamente');
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    throw error;
  }
};

// Función para probar la conexión
const testConnection = async () => {
  try {
    await initializeDatabase();
    console.log('✅ Conexión a SQLite exitosa');
  } catch (error) {
    console.error('❌ Error conectando a SQLite:', error.message);
    process.exit(1);
  }
};

module.exports = {
  db,
  runQuery,
  getQuery,
  allQuery,
  testConnection,
  initializeDatabase
};