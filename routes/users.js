const express = require('express');
const PanelUser = require('../models/PanelUser');
const { authenticate, requireRole } = require('../middleware/auth');
const { resolveWorkshopContext } = require('../middleware/workshopContext');

const router = express.Router();

router.use(authenticate);
router.use(requireRole(['owner', 'dueño']));
router.use(resolveWorkshopContext);

// GET /users - Listar usuarios del taller activo
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

// POST /users - Crear usuario para el taller activo
router.post('/', async (req, res) => {
  try {
    const { username, password, name, role } = req.body || {};
    const callerRole = String(req.user?.role || '').toLowerCase();

    const normalizedUsername = String(username || '').trim().toLowerCase();
    const normalizedName = String(name || '').trim();
    const normalizedPassword = String(password || '');
    const requestedRole = String(role || 'mechanic').toLowerCase();

    // Solo owner puede crear dueños
    if (requestedRole === 'dueño' && callerRole !== 'owner') {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Solo el administrador puede crear usuarios con rol Dueño.'
      });
    }

    // Validar rol permitido
    const allowedRoles = ['mechanic', 'dueño'];
    if (!allowedRoles.includes(requestedRole)) {
      return res.status(400).json({
        error: 'INVALID_ROLE',
        message: 'Rol inválido. Debe ser mechanic o dueño.'
      });
    }

    if (!normalizedUsername || !normalizedPassword || !normalizedName) {
      return res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'Usuario, contraseña y nombre son requeridos.'
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
        message: 'El nombre debe tener entre 2 y 60 caracteres.'
      });
    }

    const existing = await PanelUser.findByUsername(normalizedUsername);
    if (existing && existing.active) {
      return res.status(409).json({
        error: 'USERNAME_EXISTS',
        message: `El usuario "${normalizedUsername}" ya existe.`
      });
    }

    const created = await PanelUser.createUser(req.workshopId, normalizedName, normalizedUsername, normalizedPassword, requestedRole);
    const roleLabel = requestedRole === 'dueño' ? 'Dueño' : 'Mecánico';
    return res.status(201).json({
      success: true,
      data: created,
      message: `Usuario ${roleLabel} creado correctamente.`
    });
  } catch (error) {
    console.error('Error creando usuario:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /users/:id - Eliminar usuario del taller
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const callerRole = String(req.user?.role || '').toLowerCase();
    const targetUser = await PanelUser.findById(id);

    if (!targetUser || !targetUser.active) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'Usuario no encontrado.'
      });
    }

    // Verificar que el usuario pertenece al taller activo
    if (targetUser.workshop_id !== req.workshopId) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'No puedes eliminar usuarios de otro taller.'
      });
    }

    // Dueño solo puede eliminar mecánicos, no otros dueños
    if (callerRole === 'dueño' && targetUser.role !== 'mechanic') {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Solo puedes eliminar usuarios mecánicos.'
      });
    }

    await PanelUser.deactivateUser(id);

    return res.json({
      success: true,
      message: `Usuario "${targetUser.name}" eliminado correctamente.`
    });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;
