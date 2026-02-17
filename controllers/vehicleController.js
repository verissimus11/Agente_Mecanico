const Vehicle = require('../models/Vehicle');
const VehicleLog = require('../models/VehicleLog');
const Workshop = require('../models/Workshop');

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
      const workshopId = req.workshopId;

      if (!workshopId) {
        return res.status(400).json({
          error: 'MISSING_WORKSHOP',
          message: 'Contexto de taller no disponible'
        });
      }

      // Validación básica
      if (!plate || !phone) {
        return res.status(400).json({
          error: 'MISSING_FIELDS',
          message: 'Matrícula y teléfono son requeridos'
        });
      }

      // Normalizar matrícula
      const normalizedPlate = plate.trim().toUpperCase().replace(/\s+/g, '');

      if (normalizedPlate.length < 3 || normalizedPlate.length > 15) {
        return res.status(400).json({
          error: 'INVALID_PLATE',
          message: 'La matrícula debe tener entre 3 y 15 caracteres'
        });
      }

      const normalizedPhone = VehicleController.normalizeSpanishPhone(phone);
      if (!normalizedPhone) {
        return res.status(400).json({
          error: 'INVALID_PHONE',
          message: 'Teléfono inválido. Debe ser un número español válido (9 dígitos).'
        });
      }

      // Verificar duplicados activos (dentro del mismo taller)
      const existingVehicle = await Vehicle.findByPlate(workshopId, normalizedPlate);
      if (existingVehicle) {
        return res.status(409).json({
          error: 'VEHICLE_ALREADY_ACTIVE',
          message: `Ya existe un vehículo activo con la matrícula ${normalizedPlate}`
        });
      }

      const vehicle = await Vehicle.create(workshopId, normalizedPlate, normalizedPhone);

      // Crear log inicial
      await VehicleLog.create(vehicle.id, Vehicle.STATUSES.EN_REVISION, 'Vehículo recibido');
      
      console.log(`✅ Vehículo creado: ${vehicle.plate} - ${vehicle.phone} (taller: ${workshopId})`);
      
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

  // GET /vehicles - Listar vehículos activos del taller
  static async list(req, res) {
    try {
      const workshopId = req.workshopId;
      const vehicles = await Vehicle.getActive(workshopId);
      
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

  // PATCH /vehicles/:id/status - Actualizar status + crear log
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, last_event } = req.body;
      const workshopId = req.workshopId;

      // Validar que el status sea válido
      if (!Object.values(Vehicle.STATUSES).includes(status)) {
        return res.status(400).json({
          error: 'INVALID_STATUS',
          message: 'Estado inválido',
          validStatuses: Object.values(Vehicle.STATUSES)
        });
      }

      const vehicle = await Vehicle.updateStatus(id, workshopId, status, last_event);

      if (!vehicle) {
        return res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'Vehículo no encontrado'
        });
      }

      // Crear log de cambio de estado (ATÓMICO con la actualización)
      const note = last_event || `Estado cambiado a ${Vehicle.STATUS_TRANSLATIONS[status] || status}`;
      await VehicleLog.create(vehicle.id, status, note);

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

  // GET /vehicles/by-phone/:phone
  static async findByPhone(req, res) {
    try {
      const workshopId = req.workshopId;
      const normalizedPhone = VehicleController.normalizeSpanishPhone(req.params.phone);
      if (!normalizedPhone) {
        return res.status(400).json({
          error: 'INVALID_PHONE',
          message: 'Teléfono inválido. Debe ser un número español válido (9 dígitos).'
        });
      }

      const vehicle = await Vehicle.findByPhone(workshopId, normalizedPhone);

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

  // GET /vehicles/by-plate/:plate
  static async findByPlate(req, res) {
    try {
      const workshopId = req.workshopId;
      const { plate } = req.params;
      const vehicle = await Vehicle.findByPlate(workshopId, plate);

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

  // GET /vehicles/:id
  static async findById(req, res) {
    try {
      const workshopId = req.workshopId;
      const { id } = req.params;
      const vehicle = await Vehicle.findById(id, workshopId);

      if (!vehicle) {
        return res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'Vehículo no encontrado'
        });
      }

      // Incluir historial
      const logs = await VehicleLog.findByVehicleId(vehicle.id);

      res.json({
        success: true,
        data: { ...vehicle, logs },
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