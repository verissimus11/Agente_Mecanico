const express = require('express');
const PanelUser = require('../models/PanelUser');
const { authenticate, requireRole } = require('../middleware/auth');
const { resolveWorkshopContext } = require('../middleware/workshopContext');

const router = express.Router();

router.use(authenticate);
router.use(requireRole(['owner']));
router.use(resolveWorkshopContext);

// GET /users - Listar usuarios mecánicos del taller activo
router.get('/', async (req, res) => {
  try {
    const users = await PanelUser.listByWorkshop(req.workshopId);
    return res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('Error listando usuarios del panel:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    });
  }
});

// POST /users - Crear usuario mecánico para el taller activo
router.post('/', async (req, res) => {
  try {
    const { username, password, name } = req.body || {};

    const normalizedUsername = String(username || '').trim().toLowerCase();
    const normalizedName = String(name || '').trim();
    const normalizedPassword = String(password || '');

    if (!normalizedUsername || !normalizedPassword || !normalizedName) {
      return res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'Usuario, contraseña y nombre de mecánico son requeridos.'
      });
    }

    if (!/^[a-z0-9._-]{3,30}$/.test(normalizedUsername)) {
      return res.status(400).json({
        error: 'INVALID_USERNAME',
        message: 'El usuario debe tener 3-30 caracteres y solo letras, números, punto, guion o guion bajo.'
      });
    }

    if (normalizedPassword.length < 6 || normalizedPassword.length > 60) {
      return res.status(400).json({
        error: 'INVALID_PASSWORD',
        message: 'La contraseña debe tener entre 6 y 60 caracteres.'
      });
    }

    if (normalizedName.length < 2 || normalizedName.length > 60) {
      return res.status(400).json({
        error: 'INVALID_NAME',
        message: 'El nombre del mecánico debe tener entre 2 y 60 caracteres.'
      });
    }

    const existing = await PanelUser.findByUsername(normalizedUsername);
    if (existing && existing.active) {
      return res.status(409).json({
        error: 'USERNAME_EXISTS',
        message: `El usuario "${normalizedUsername}" ya existe.`
      });
    }

    const created = await PanelUser.createMechanic(req.workshopId, normalizedName, normalizedUsername, normalizedPassword);
    return res.status(201).json({
      success: true,
      data: created,
      message: 'Usuario mecánico creado correctamente.'
    });
  } catch (error) {
    console.error('Error creando usuario mecánico:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;
