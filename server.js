// TallerFlow by Lance Systems - entrypoint
// Arquitectura multi-producto: toda la app vive bajo BASE_PATH (/tallerflow)
// lancesystems.com/tallerflow → panel admin
// aluaodon.lancesystems.com/tallerflow → tracking del taller
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
const { subdomainDetector } = require('./middleware/subdomain');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_PATH = process.env.BASE_PATH || '/tallerflow';

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

// ====== Middleware global ======
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false
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

// Detección de subdominio global (antes del router)
app.use(subdomainDetector);

// Endpoint para que el frontend sepa el BASE_PATH y subdominio
app.get(`${BASE_PATH}/config.js`, (req, res) => {
  res.type('application/javascript');
  res.send(`window.__BASE_PATH=${JSON.stringify(BASE_PATH)};window.__SUBDOMAIN=${JSON.stringify(req.workshopSubdomain || null)};`);
});

// ====== Health check (fuera del router, accesible en /healthz) ======
app.get('/healthz', (req, res) => res.status(200).json({ status: 'ok' }));

// ====== Router principal montado en BASE_PATH ======
const tfRouter = express.Router();

// Health check dentro del router también
tfRouter.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Archivos estáticos del frontend
tfRouter.use(express.static(path.join(__dirname, 'public')));

// Rutas API
tfRouter.use('/auth', authRoutes);
tfRouter.use('/vehicles', vehicleRoutes);
tfRouter.use('/workshops', workshopRoutes);
tfRouter.use('/users', userRoutes);
tfRouter.use('/api/public', trackingRateLimiter, publicRoutes);

// Página principal
tfRouter.get('/', (req, res) => {
  if (req.workshopSubdomain) {
    return res.sendFile(path.join(__dirname, 'public', 'subdomain-landing.html'));
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Tracking por subdominio: /tallerflow/status/:plate/:trackingHash
tfRouter.get('/status/:plate/:trackingHash', trackingRateLimiter, (req, res) => {
  if (!req.workshopSubdomain) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Ruta no encontrada' });
  }
  const { plate, trackingHash } = req.params;
  if (!plate || !trackingHash || plate.length > 20 || trackingHash.length > 128) {
    return res.status(400).send('Solicitud inválida');
  }
  res.sendFile(path.join(__dirname, 'public', 'tracking.html'));
});

// Tracking clásico: /tallerflow/:slug/status/:plate/:trackingHash
tfRouter.get('/:slug/status/:plate/:trackingHash', trackingRateLimiter, (req, res) => {
  const { slug, plate, trackingHash } = req.params;
  if (!slug || !plate || !trackingHash || slug.length > 50 || plate.length > 20 || trackingHash.length > 128) {
    return res.status(400).send('Solicitud inválida');
  }
  if (/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || /^[a-z0-9]{2,}$/.test(slug)) {
    res.sendFile(path.join(__dirname, 'public', 'tracking.html'));
  } else {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Ruta no encontrada' });
  }
});

// Montar toda la app bajo BASE_PATH
app.use(BASE_PATH, tfRouter);

// Página principal de Lance Systems en la raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// ====== Manejo de errores ======
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

// 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'Ruta no encontrada'
  });
});

// ====== Arranque ======
const startServer = async () => {
  try {
    await testConnection();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
    🚗 TallerFlow v0.8.0 by Lance Systems
🟢 http://localhost:${PORT}${BASE_PATH}
🌐 LAN: http://TU_IP_LOCAL:${PORT}${BASE_PATH}
📊 PostgreSQL conectada
🏭 Multi-taller + subdominios activos
📍 Tracking: ${BASE_PATH}/:slug/status/:plate
⚡ Listo
      `);
    });
    
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error.message);
    process.exit(1);
  }
};

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

startServer();

module.exports = app;