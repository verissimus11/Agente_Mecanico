// Controlador público de tracking.
// Importante: responde solo datos operativos mínimos, nunca información interna sensible.
const Vehicle = require('../models/Vehicle');
const VehicleLog = require('../models/VehicleLog');
const Workshop = require('../models/Workshop');

class PublicController {
  // GET /api/public/:slug/status/:plate - Consulta pública de estado
  static async getVehicleStatus(req, res) {
    try {
      const { slug, plate, trackingHash } = req.params;

      // Sanitizar inputs
      if (!slug || !plate || !trackingHash || slug.length > 50 || plate.length > 20 || trackingHash.length > 128) {
        return res.status(400).json({
          error: 'INVALID_INPUT',
          message: 'Datos de consulta inválidos'
        });
      }

      if (!/^[a-f0-9]{32,128}$/i.test(trackingHash)) {
        return res.status(400).json({
          error: 'INVALID_TRACKING_HASH',
          message: 'Token de seguimiento inválido'
        });
      }

      // Buscar taller por slug
      const workshop = await Workshop.findBySlug(slug);
      if (!workshop) {
        return res.status(404).json({
          error: 'WORKSHOP_NOT_FOUND',
          message: 'Taller no encontrado'
        });
      }

      // Buscar vehículo activo (solo datos públicos)
      const vehicle = await Vehicle.findActiveByPlateWorkshopAndHash(workshop.id, plate, trackingHash);
      if (!vehicle) {
        return res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'No se encontró un vehículo activo con esos datos de seguimiento.'
        });
      }

      // Obtener historial público (sin IDs internos)
      const logs = await VehicleLog.findPublicByVehicleId(vehicle.id);

      res.json({
        success: true,
        workshop: {
          name: workshop.name,
          slug: workshop.slug
        },
        vehicle: {
          plate: vehicle.plate,
          status: vehicle.status,
          updated_at: vehicle.updated_at
        },
        logs: logs
      });

    } catch (error) {
      console.error('❌ Error en consulta pública:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = PublicController;
