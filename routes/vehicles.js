const express = require('express');
const VehicleController = require('../controllers/vehicleController');
const Workshop = require('../models/Workshop');

const router = express.Router();

// Middleware: inyectar workshop_id desde header o query
// En esta fase, se usa el taller por defecto si no se especifica
router.use(async (req, res, next) => {
  try {
    const workshopSlug = req.headers['x-workshop-slug'] || req.query.workshop;
    
    let workshop;
    if (workshopSlug) {
      workshop = await Workshop.findBySlug(workshopSlug);
      if (!workshop) {
        return res.status(404).json({
          error: 'WORKSHOP_NOT_FOUND',
          message: 'Taller no encontrado'
        });
      }
    } else {
      // Usar taller por defecto
      workshop = await Workshop.getOrCreateDefault();
    }
    
    req.workshopId = workshop.id;
    req.workshop = workshop;
    next();
  } catch (error) {
    console.error('Error resolviendo taller:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    });
  }
});

// POST /vehicles - Crear nuevo vehículo
router.post('/', VehicleController.create);

// GET /vehicles - Listar vehículos activos
router.get('/', VehicleController.list);

// PATCH /vehicles/:id - Editar datos del vehículo
router.patch('/:id', VehicleController.editVehicle);

// PATCH /vehicles/:id/status - Actualizar status
router.patch('/:id/status', VehicleController.updateStatus);

// GET /vehicles/by-phone/:phone - Buscar por teléfono
router.get('/by-phone/:phone', VehicleController.findByPhone);

// GET /vehicles/by-plate/:plate - Buscar por matrícula
router.get('/by-plate/:plate', VehicleController.findByPlate);

// GET /vehicles/:id - Buscar por ID
router.get('/:id', VehicleController.findById);

module.exports = router;