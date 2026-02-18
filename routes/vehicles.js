const express = require('express');
const VehicleController = require('../controllers/vehicleController');
const { authenticate } = require('../middleware/auth');
const { resolveWorkshopContext } = require('../middleware/workshopContext');

const router = express.Router();

// Todas las rutas de vehículos son internas (panel) y requieren token.
// El contexto de taller se resuelve en backend para evitar fuga entre talleres.
router.use(authenticate);
router.use(resolveWorkshopContext);

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