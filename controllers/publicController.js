const Vehicle = require('../models/Vehicle');
const VehicleLog = require('../models/VehicleLog');
const Workshop = require('../models/Workshop');

class PublicController {
  // GET /api/public/:slug/status/:plate - Consulta pública de estado
  static async getVehicleStatus(req, res) {
    try {
      const { slug, plate } = req.params;

      // Sanitizar inputs
      if (!slug || !plate || slug.length > 50 || plate.length > 20) {
        return res.status(400).json({
          error: 'INVALID_INPUT',
          message: 'Datos de consulta inválidos'
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
      const vehicle = await Vehicle.findActiveByPlateAndWorkshop(workshop.id, plate);
      if (!vehicle) {
        return res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'No se encontró un vehículo activo con esa matrícula.'
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
