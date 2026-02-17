const express = require('express');
const cors = require('cors');
const path = require('path');
const { testConnection } = require('./db/sqlite-connection');
const vehicleRoutes = require('./routes/vehicles');
const workshopRoutes = require('./routes/workshops');
const publicRoutes = require('./routes/public');

// Cargar variables de entorno
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rutas API
app.use('/vehicles', vehicleRoutes);
app.use('/workshops', workshopRoutes);
app.use('/api/public', publicRoutes);

// Ruta principal - servir el frontend admin
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta pública de seguimiento: /:slug/status/:plate
app.get('/:slug/status/:plate', (req, res) => {
  const { slug, plate } = req.params;
  // Sanitización básica
  if (!slug || !plate || slug.length > 50 || plate.length > 20) {
    return res.status(400).send('Solicitud inválida');
  }
  // Solo servir si el slug tiene formato válido (evitar colisión con rutas estáticas)
  if (/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || /^[a-z0-9]{2,}$/.test(slug)) {
    res.sendFile(path.join(__dirname, 'public', 'tracking.html'));
  } else {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Ruta no encontrada'
    });
  }
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Error interno del servidor'
  });
});

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'Ruta no encontrada'
  });
});

// Función para iniciar el servidor
const startServer = async () => {
  try {
    // Probar conexión a la base de datos
    await testConnection();
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`
    🚗 TallerFlow v0.3.0 - Multi-taller + Seguimiento Público
🟢 Servidor iniciado en http://localhost:${PORT}
📊 Base de datos SQLite conectada (3 tablas)
🏭 Soporte multi-taller activo
📍 Seguimiento público: /:slug/status/:plate
⚡ Sistema listo
      `);
    });
    
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error.message);
    process.exit(1);
  }
};

// Manejo de cierre graceful
process.on('SIGINT', () => {
  console.log('\n🔄 Cerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🔄 Cerrando servidor...');
  process.exit(0);
});

// Iniciar servidor
startServer();

module.exports = app;