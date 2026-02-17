const Vehicle = require('../models/Vehicle');

class VehicleController {
  // POST /vehicles - Crear nuevo vehículo
  static async create(req, res) {
    try {
      const { plate, phone } = req.body;

      // Validación básica
      if (!plate || !phone) {
        return res.status(400).json({
          error: 'MISSING_FIELDS',
          message: 'Matrícula y teléfono son requeridos'
        });
      }

      // Validar formato de matrícula (básico)
      if (plate.length < 3 || plate.length > 20) {
        return res.status(400).json({
          error: 'INVALID_PLATE',
          message: 'Formato de matrícula inválido'
        });
      }

      // Validar formato de teléfono (básico)
      if (phone.length < 8 || phone.length > 20) {
        return res.status(400).json({
          error: 'INVALID_PHONE',
          message: 'Formato de teléfono inválido'
        });
      }

      const vehicle = await Vehicle.create(plate, phone);
      
      res.status(201).json({
        success: true,
        data: vehicle,
        message: Vehicle.generateStatusMessage(vehicle)
      });

    } catch (error) {
      console.error('Error creando vehículo:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Error interno del servidor'
      });
    }
  }

  // GET /vehicles?active=true - Listar vehículos activos
  static async list(req, res) {
    try {
      const vehicles = await Vehicle.getActive();
      
      res.json({
        success: true,
        data: vehicles,
        count: vehicles.length
      });

    } catch (error) {
      console.error('Error listando vehículos:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Error interno del servidor'
      });
    }
  }

  // PATCH /vehicles/:id/status - Actualizar status
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, last_event } = req.body;

      // Validar que el status sea válido
      if (!Object.values(Vehicle.STATUSES).includes(status)) {
        return res.status(400).json({
          error: 'INVALID_STATUS',
          message: 'Estado inválido',
          validStatuses: Object.values(Vehicle.STATUSES)
        });
      }

      const vehicle = await Vehicle.updateStatus(id, status, last_event);

      if (!vehicle) {
        return res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'Vehículo no encontrado'
        });
      }

      res.json({
        success: true,
        data: vehicle,
        message: Vehicle.generateStatusMessage(vehicle)
      });

    } catch (error) {
      console.error('Error actualizando estado:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Error interno del servidor'
      });
    }
  }

  // GET /vehicles/by-phone/:phone - Buscar por teléfono
  static async findByPhone(req, res) {
    try {
      const { phone } = req.params;
      const vehicle = await Vehicle.findByPhone(phone);

      if (!vehicle) {
        return res.status(404).json({
          error: 'NO_ACTIVE_VEHICLE',
          message: 'No se encontró vehículo activo para este teléfono'
        });
      }

      res.json({
        success: true,
        data: vehicle,
        message: Vehicle.generateStatusMessage(vehicle)
      });

    } catch (error) {
      console.error('Error buscando por teléfono:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Error interno del servidor'
      });
    }
  }

  // GET /vehicles/by-plate/:plate - Buscar por matrícula
  static async findByPlate(req, res) {
    try {
      const { plate } = req.params;
      const vehicle = await Vehicle.findByPlate(plate);

      if (!vehicle) {
        return res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'No se encontró vehículo con esta matrícula'
        });
      }

      res.json({
        success: true,
        data: vehicle,
        message: Vehicle.generateStatusMessage(vehicle)
      });

    } catch (error) {
      console.error('Error buscando por matrícula:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR', 
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = VehicleController;