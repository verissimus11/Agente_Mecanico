const express = require('express');
const PublicController = require('../controllers/publicController');

const router = express.Router();

// GET /api/public/:slug/status/:plate/:trackingHash - Consulta pública de estado con historial
router.get('/:slug/status/:plate/:trackingHash', PublicController.getVehicleStatus);

module.exports = router;
