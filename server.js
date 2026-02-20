// Lance Workshop - entrypoint
// Este servidor expone:
// - Panel interno (owner/mecánico) protegido por JWT
// - API pública de tracking limitada a slug + matrícula
// - Middleware global de seguridad (helmet/cors/rate-limit)
// Cargar variables de entorno PRIMERO
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { testConnection, closePool } = require('./db/pg-connection');
const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const workshopRoutes = require('./routes/workshops');
const userRoutes = require('./routes/users');
const publicRoutes = require('./routes/public');

const app = express();
const PORT = process.env.PORT || 3000;

const isProduction = process.env.NODE_ENV === 'production';
const forceHttps = process.env.FORCE_HTTPS === 'true';

const trackingRateLimiter = rateLimit({
  windowMs: Number(process.env.TRACKING_RATE_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.TRACKING_RATE_MAX || 80),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Demasiadas consultas de seguimiento. Intenta de nuevo en unos minutos.'
  }
});

// Middleware
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false   // Desactivar CSP para permitir onclick inline
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (isProduction && forceHttps) {
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'];
    if (proto && proto !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    }
    return next();
  });
}

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rutas API
app.use('/auth', authRoutes);
app.use('/vehicles', vehicleRoutes);
app.use('/workshops', workshopRoutes);
app.use('/users', userRoutes);
app.use('/api/public', trackingRateLimiter, publicRoutes);

// Ruta principal - servir el frontend admin
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta pública de seguimiento: /:slug/status/:plate/:trackingHash
app.get('/:slug/status/:plate/:trackingHash', trackingRateLimiter, (req, res) => {
  const { slug, plate, trackingHash } = req.params;
  // Sanitización básica
  if (!slug || !plate || !trackingHash || slug.length > 50 || plate.length > 20 || trackingHash.length > 128) {
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

  if (err && err.code === '23505') {
    return res.status(409).json({
      error: 'CONFLICT',
      message: 'Conflicto de datos: ya existe un registro con esos valores.'
    });
  }

  if (err && err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Token inválido.'
    });
  }

  if (err && err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'TOKEN_EXPIRED',
      message: 'Token expirado.'
    });
  }

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
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
    🚗 Lance Workshop v0.5.1 - Piloto listo (mínimo seguro)
🟢 Servidor iniciado en http://localhost:${PORT}
🌐 Acceso LAN: http://TU_IP_LOCAL:${PORT}
📊 Base de datos PostgreSQL conectada (3 tablas)
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
process.on('SIGINT', async () => {
  console.log('\n🔄 Cerrando servidor...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Cerrando servidor...');
  await closePool();
  process.exit(0);
});

// Iniciar servidor
startServer();

module.exports = app;