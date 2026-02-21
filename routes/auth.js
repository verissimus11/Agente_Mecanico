const express = require('express');
const rateLimit = require('express-rate-limit');
const { findUser, signUserToken, authenticate } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 10,  // máximo 10 intentos
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.'
  }
});

// POST /auth/login
// Valida credenciales de panel y devuelve JWT con rol + contexto de taller.
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        error: 'MISSING_CREDENTIALS',
        message: 'Usuario y contraseña son requeridos.'
      });
    }

    const user = await findUser(username, password);
    if (!user) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Credenciales inválidas.'
      });
    }

    const token = signUserToken(user);
    return res.json({
      success: true,
      token,
      user: {
        id: user.id || null,
        username: user.username,
        name: user.name || user.username,
        role: user.role,
        workshopSlug: user.workshopSlug || null
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor.'
    });
  }
});

// GET /auth/me
// Devuelve usuario autenticado para validar sesión en frontend.
router.get('/me', authenticate, (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
