const express = require('express');
const PublicController = require('../controllers/publicController');

const router = express.Router();

// GET /api/public/:slug/status/:plate - Consulta pública de estado con historial
router.get('/:slug/status/:plate', PublicController.getVehicleStatus);

module.exports = router;
