const express = require('express');
const VehicleController = require('../controllers/vehicleController');

const router = express.Router();

// POST /vehicles - Crear nuevo vehículo
router.post('/', VehicleController.create);

// GET /vehicles?active=true - Listar vehículos activos
router.get('/', VehicleController.list);

// PATCH /vehicles/:id/status - Actualizar status
router.patch('/:id/status', VehicleController.updateStatus);

// GET /vehicles/by-phone/:phone - Buscar por teléfono
router.get('/by-phone/:phone', VehicleController.findByPhone);

// GET /vehicles/by-plate/:plate - Buscar por matrícula
router.get('/by-plate/:plate', VehicleController.findByPlate);

// GET /vehicles/:id - Buscar por ID
router.get('/:id', VehicleController.findById);

module.exports = router;