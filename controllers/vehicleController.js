const Vehicle = require('../models/Vehicle');

class VehicleController {
  static normalizeSpanishPhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    let normalized = digits;

    if (digits.length === 9) {
      normalized = `34${digits}`;
    }

    if (!normalized.startsWith('34') || normalized.length !== 11) {
      return null;
    }

    const nationalNumber = normalized.slice(2);
    if (!/^[6789]\d{8}$/.test(nationalNumber)) {
      return null;
    }

    return `+34 ${nationalNumber.slice(0, 3)} ${nationalNumber.slice(3, 6)} ${nationalNumber.slice(6)}`;
  }

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

      // Normalizar matrícula: mayúsculas y sin espacios
      const normalizedPlate = plate.trim().toUpperCase().replace(/\s+/g, '');

      // Validar formato de matrícula (básico)
      if (normalizedPlate.length < 3 || normalizedPlate.length > 15) {
        return res.status(400).json({
          error: 'INVALID_PLATE',
          message: 'La matrícula debe tener entre 3 y 15 caracteres'
        });
      }

      const normalizedPhone = this.normalizeSpanishPhone(phone);
      if (!normalizedPhone) {
        return res.status(400).json({
          error: 'INVALID_PHONE',
          message: 'Teléfono inválido. Debe ser un número español válido (9 dígitos).'
        });
      }

      // Verificar duplicados activos
      const existingVehicle = await Vehicle.findByPlate(normalizedPlate);
      if (existingVehicle) {
        return res.status(409).json({
          error: 'VEHICLE_ALREADY_ACTIVE',
          message: `Ya existe un vehículo activo con la matrícula ${normalizedPlate}`
        });
      }

      const vehicle = await Vehicle.create(normalizedPlate, normalizedPhone);
      
      // Logging mínimo
      console.log(`✅ Vehículo creado: ${vehicle.plate} - ${vehicle.phone}`);
      
      res.status(201).json({
        success: true,
        data: vehicle,
        message: Vehicle.generateStatusMessage(vehicle)
      });

    } catch (error) {
      console.error('❌ Error creando vehículo:', error);
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

      // Logging mínimo
      console.log(`🔄 Estado actualizado: ${vehicle.plate} → ${status}`);

      res.json({
        success: true,
        data: vehicle,
        message: 'Estado actualizado correctamente',
        statusMessage: Vehicle.generateStatusMessage(vehicle)
      });

    } catch (error) {
      console.error('❌ Error actualizando estado:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Error al actualizar. Intenta nuevamente.'
      });
    }
  }

  // GET /vehicles/by-phone/:phone - Buscar por teléfono
  static async findByPhone(req, res) {
    try {
      const normalizedPhone = this.normalizeSpanishPhone(req.params.phone);
      if (!normalizedPhone) {
        return res.status(400).json({
          error: 'INVALID_PHONE',
          message: 'Teléfono inválido. Debe ser un número español válido (9 dígitos).'
        });
      }

      const vehicle = await Vehicle.findByPhone(normalizedPhone);

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

  // GET /vehicles/:id - Buscar por ID
  static async findById(req, res) {
    try {
      const { id } = req.params;
      const vehicle = await Vehicle.findById(id);

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
      console.error('❌ Error buscando por ID:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR', 
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = VehicleController;