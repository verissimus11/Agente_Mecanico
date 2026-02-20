// Middleware de autenticación para panel interno (owner/mecánico).
// Emite y valida JWT, y aplica control de rol por ruta.
const jwt = require('jsonwebtoken');
const PanelUser = require('../models/PanelUser');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET no está configurado o es demasiado corto (mínimo 16 caracteres).');
  }
  return secret;
}

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

function getConfiguredUsers() {
  return [
    {
      username: process.env.OWNER_USERNAME || 'owner',
      password: process.env.OWNER_PASSWORD || 'owner12345',
      role: 'owner',
      workshopSlug: process.env.OWNER_WORKSHOP_SLUG || null
    },
    {
      username: process.env.DUENO_USERNAME || 'dueno',
      password: process.env.DUENO_PASSWORD || 'dueno12345',
      role: 'dueño',
      workshopSlug: process.env.DUENO_WORKSHOP_SLUG || 'alua-odon-motor'
    },
    {
      username: process.env.MECHANIC_USERNAME || 'mecanico',
      password: process.env.MECHANIC_PASSWORD || 'mecanico12345',
      role: 'mechanic',
      workshopSlug: process.env.MECHANIC_WORKSHOP_SLUG || 'alua-odon-motor'
    }
  ];
}

async function findUser(username, password) {
  const u = String(username || '').trim();
  const p = String(password || '');

  try {
    const dbUser = await PanelUser.findByCredentials(u, p);
    if (dbUser) {
      return {
        id: dbUser.id,
        username: dbUser.username,
        name: dbUser.name,
        role: normalizeRole(dbUser.role),
        workshopSlug: dbUser.workshop_slug || null
      };
    }
  } catch (error) {
    console.error('Error consultando usuarios de panel en BD:', error.message);
  }

  return getConfiguredUsers().find((user) => user.username === u && user.password === p) || null;
}

function signUserToken(user) {
  const payload = {
    uid: user.id || null,
    sub: user.username,
    name: user.name || user.username,
    role: normalizeRole(user.role),
    workshopSlug: user.workshopSlug || null
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

function authenticate(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const [scheme, token] = auth.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Autenticación requerida para acceder al panel.'
      });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    req.user = {
      id: decoded.uid || null,
      username: decoded.sub,
      name: decoded.name || decoded.sub,
      role: normalizeRole(decoded.role),
      workshopSlug: decoded.workshopSlug || null
    };
    return next();
  } catch (error) {
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Token inválido o expirado.'
    });
  }
}

function requireRole(roles = []) {
  const allowed = new Set((roles || []).map(normalizeRole));
  return (req, res, next) => {
    const role = normalizeRole(req.user?.role);
    if (!allowed.has(role)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'No tienes permisos para realizar esta acción.'
      });
    }
    return next();
  };
}

module.exports = {
  authenticate,
  requireRole,
  signUserToken,
  findUser,
  getConfiguredUsers
};
