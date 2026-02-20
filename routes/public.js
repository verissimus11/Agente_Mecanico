const express = require('express');
const PublicController = require('../controllers/publicController');

const router = express.Router();

// GET /api/public/subdomain-info - Resolver subdominio a taller
router.get('/subdomain-info', PublicController.getSubdomainInfo);

// GET /api/public/:slug/status/:plate/:trackingHash - Consulta pública de estado con historial
router.get('/:slug/status/:plate/:trackingHash', PublicController.getVehicleStatus);

module.exports = router;
