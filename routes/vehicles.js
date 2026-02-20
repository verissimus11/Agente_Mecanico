const express = require('express');
const VehicleController = require('../controllers/vehicleController');
const { authenticate } = require('../middleware/auth');
const { resolveWorkshopContext } = require('../middleware/workshopContext');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const quoteUploadDir = path.join(process.cwd(), 'uploads', 'quotes');
if (!fs.existsSync(quoteUploadDir)) {
	fs.mkdirSync(quoteUploadDir, { recursive: true });
}

const quotePdfUpload = multer({
	storage: multer.diskStorage({
		destination: (req, file, cb) => cb(null, quoteUploadDir),
		filename: (req, file, cb) => {
			const safeVehicleId = String(req.params.id || 'vehicle').replace(/[^a-zA-Z0-9-_]/g, '');
			cb(null, `${safeVehicleId}-${Date.now()}.pdf`);
		}
	}),
	limits: { fileSize: 8 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		if ((file.mimetype || '').toLowerCase() !== 'application/pdf') {
			return cb(new Error('Solo se permiten archivos PDF.'));
		}
		return cb(null, true);
	}
});

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

// POST /vehicles/:id/quote-pdf - Subir PDF de presupuesto
router.post('/:id/quote-pdf', (req, res, next) => {
	quotePdfUpload.single('quote_pdf')(req, res, (error) => {
		if (error) {
			if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
				return res.status(400).json({ error: 'FILE_TOO_LARGE', message: 'El PDF supera el tamaño máximo de 8MB.' });
			}
			return res.status(400).json({ error: 'INVALID_FILE', message: error.message || 'Archivo inválido.' });
		}
		return next();
	});
}, VehicleController.uploadQuotePdf);

// GET /vehicles/:id/quote-pdf - Descargar PDF de presupuesto
router.get('/:id/quote-pdf', VehicleController.downloadQuotePdf);

// GET /vehicles/by-phone/:phone - Buscar por teléfono
router.get('/by-phone/:phone', VehicleController.findByPhone);

// GET /vehicles/stats/mechanics - Performance de mecánicos
router.get('/stats/mechanics', VehicleController.mechanicPerformance);

// GET /vehicles/by-plate/:plate - Buscar por matrícula
router.get('/by-plate/:plate', VehicleController.findByPlate);

// GET /vehicles/:id - Buscar por ID
router.get('/:id', VehicleController.findById);

module.exports = router;