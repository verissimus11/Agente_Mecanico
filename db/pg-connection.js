const { Pool } = require('pg');

// Configurar pool de conexiones PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Opciones de pool
  max: 10,                   // máximo de conexiones en el pool
  idleTimeoutMillis: 30000,  // cerrar conexiones idle tras 30s
  connectionTimeoutMillis: 5000 // timeout al conectar
});

// Log de conexión/desconexión del pool
pool.on('error', (err) => {
  console.error('❌ Error inesperado en cliente PostgreSQL idle:', err);
});

// ====== Funciones compatibles con la API anterior ======

/**
 * Ejecuta una query de escritura (INSERT, UPDATE, DELETE)
 * Retorna { rowCount, rows }
 */
const runQuery = async (query, params = []) => {
  const result = await pool.query(query, params);
  return { changes: result.rowCount, rows: result.rows };
};

/**
 * Ejecuta una query y devuelve la primera fila (o undefined)
 */
const getQuery = async (query, params = []) => {
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

/**
 * Ejecuta una query y devuelve todas las filas
 */
const allQuery = async (query, params = []) => {
  const result = await pool.query(query, params);
  return result.rows;
};

// ====== Inicialización de tablas ======

const initializeDatabase = async () => {
  try {
    // 1. Crear tabla workshops
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workshops (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_workshops_slug ON workshops(slug)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_workshops_active ON workshops(active)');

    // 2. Crear tabla vehicles
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        workshop_id TEXT NOT NULL REFERENCES workshops(id),
        plate TEXT NOT NULL,
        phone TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'EN_REVISION',
        created_by_username TEXT,
        created_by_name TEXT,
        last_status_by_username TEXT,
        last_status_by_name TEXT,
        last_event TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        active BOOLEAN DEFAULT TRUE
      )
    `);
    await pool.query('ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_by_username TEXT');
    await pool.query('ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_by_name TEXT');
    await pool.query('ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_status_by_username TEXT');
    await pool.query('ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_status_by_name TEXT');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_vehicles_phone ON vehicles(phone)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_vehicles_active ON vehicles(active)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_vehicles_workshop ON vehicles(workshop_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_vehicles_workshop_active_updated ON vehicles(workshop_id, active, updated_at DESC)');
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS uniq_vehicles_active_plate_per_workshop ON vehicles(workshop_id, plate) WHERE active = TRUE');

    // 3. Crear tabla vehicle_logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicle_logs (
        id TEXT PRIMARY KEY,
        vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
        status TEXT NOT NULL,
        note TEXT,
        actor_username TEXT,
        actor_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query('ALTER TABLE vehicle_logs ADD COLUMN IF NOT EXISTS actor_username TEXT');
    await pool.query('ALTER TABLE vehicle_logs ADD COLUMN IF NOT EXISTS actor_name TEXT');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_vehicle_logs_vehicle ON vehicle_logs(vehicle_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_vehicle_logs_created ON vehicle_logs(created_at)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_vehicle_logs_vehicle_created ON vehicle_logs(vehicle_id, created_at)');

    // 4. Crear tabla de usuarios del panel (mecánicos gestionados por owner)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS panel_users (
        id TEXT PRIMARY KEY,
        workshop_id TEXT REFERENCES workshops(id),
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'mechanic',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_panel_users_workshop ON panel_users(workshop_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_panel_users_role_active ON panel_users(role, active)');

    console.log('✅ Base de datos PostgreSQL inicializada correctamente (4 tablas)');

  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    throw error;
  }
};

// Probar conexión
const testConnection = async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Conexión a PostgreSQL exitosa');
    await initializeDatabase();
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    process.exit(1);
  }
};

// Cerrar pool al salir
const closePool = async () => {
  await pool.end();
};

module.exports = {
  pool,
  runQuery,
  getQuery,
  allQuery,
  initializeDatabase,
  testConnection,
  closePool
};
