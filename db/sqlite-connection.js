const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crear conexión a SQLite
const dbPath = path.join(__dirname, 'taller_control.db');
const db = new sqlite3.Database(dbPath);

// Habilitar foreign keys
db.run('PRAGMA foreign_keys = ON');

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
    // 1. Crear tabla workshops
    await runQuery(`
      CREATE TABLE IF NOT EXISTS workshops (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await runQuery('CREATE UNIQUE INDEX IF NOT EXISTS idx_workshops_slug ON workshops(slug)');
    await runQuery('CREATE INDEX IF NOT EXISTS idx_workshops_active ON workshops(active)');

    // 2. Crear tabla vehicles (con workshop_id FK)
    await runQuery(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        workshop_id TEXT NOT NULL,
        plate TEXT NOT NULL,
        phone TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'EN_REVISION',
        last_event TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        active INTEGER DEFAULT 1,
        FOREIGN KEY (workshop_id) REFERENCES workshops(id)
      )
    `);
    await runQuery('CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate)');
    await runQuery('CREATE INDEX IF NOT EXISTS idx_vehicles_phone ON vehicles(phone)');
    await runQuery('CREATE INDEX IF NOT EXISTS idx_vehicles_active ON vehicles(active)');
    await runQuery('CREATE INDEX IF NOT EXISTS idx_vehicles_workshop ON vehicles(workshop_id)');

    // 3. Crear tabla vehicle_logs (historial de estados)
    await runQuery(`
      CREATE TABLE IF NOT EXISTS vehicle_logs (
        id TEXT PRIMARY KEY,
        vehicle_id TEXT NOT NULL,
        status TEXT NOT NULL,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
      )
    `);
    await runQuery('CREATE INDEX IF NOT EXISTS idx_vehicle_logs_vehicle ON vehicle_logs(vehicle_id)');
    await runQuery('CREATE INDEX IF NOT EXISTS idx_vehicle_logs_created ON vehicle_logs(created_at)');

    console.log('✅ Base de datos SQLite inicializada correctamente (3 tablas)');
    
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