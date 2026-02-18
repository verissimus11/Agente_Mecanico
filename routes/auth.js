const express = require('express');
const { findUser, signUserToken, authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /auth/login
// Valida credenciales de panel y devuelve JWT con rol + contexto de taller.
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      error: 'MISSING_CREDENTIALS',
      message: 'Usuario y contraseña son requeridos.'
    });
  }

  const user = findUser(username, password);
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
      username: user.username,
      role: user.role,
      workshopSlug: user.workshopSlug || null
    }
  });
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
