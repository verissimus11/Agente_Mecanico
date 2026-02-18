const Vehicle = require('../models/Vehicle');
const VehicleLog = require('../models/VehicleLog');

class VehicleController {
  static handleControllerError(res, error, fallbackMessage = 'Error interno del servidor') {
    if (error?.code === '23505') {
      return res.status(409).json({
        error: 'CONFLICT',
        message: 'Conflicto de datos: ya existe un registro con esos valores.'
      });
    }

    if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Token inválido o expirado.'
      });
    }

    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: fallbackMessage
    });
  }

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
      return VehicleController.handleControllerError(res, error, 'Error interno del servidor');
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
      return VehicleController.handleControllerError(res, error, 'Error interno del servidor');
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
      return VehicleController.handleControllerError(res, error, 'Error al actualizar. Intenta nuevamente.');
    }
  }

  // PATCH /vehicles/:id - Editar datos del vehículo (matrícula/teléfono)
  static async editVehicle(req, res) {
    try {
      const { id } = req.params;
      const { plate, phone } = req.body;
      const workshopId = req.workshopId;

      if (!plate && !phone) {
        return res.status(400).json({
          error: 'MISSING_FIELDS',
          message: 'Debes enviar al menos matrícula o teléfono para editar'
        });
      }

      const updates = {};

      if (plate) {
        const normalizedPlate = plate.trim().toUpperCase().replace(/\s+/g, '');
        if (normalizedPlate.length < 3 || normalizedPlate.length > 15) {
          return res.status(400).json({
            error: 'INVALID_PLATE',
            message: 'La matrícula debe tener entre 3 y 15 caracteres'
          });
        }
        // Comprobar que no haya otro vehículo activo con la misma matrícula
        const existing = await Vehicle.findByPlate(workshopId, normalizedPlate);
        if (existing && existing.id !== id) {
          return res.status(409).json({
            error: 'VEHICLE_ALREADY_ACTIVE',
            message: `Ya existe un vehículo activo con la matrícula ${normalizedPlate}`
          });
        }
        updates.plate = normalizedPlate;
      }

      if (phone) {
        const normalizedPhone = VehicleController.normalizeSpanishPhone(phone);
        if (!normalizedPhone) {
          return res.status(400).json({
            error: 'INVALID_PHONE',
            message: 'Teléfono inválido. Debe ser un número español válido (9 dígitos).'
          });
        }
        updates.phone = normalizedPhone;
      }

      const vehicle = await Vehicle.updateData(id, workshopId, updates);

      if (!vehicle) {
        return res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'Vehículo no encontrado'
        });
      }

      console.log(`✏️ Vehículo editado: ${vehicle.plate} - ${vehicle.phone}`);

      res.json({
        success: true,
        data: vehicle,
        message: 'Datos del vehículo actualizados correctamente'
      });

    } catch (error) {
      console.error('❌ Error editando vehículo:', error);
      return VehicleController.handleControllerError(res, error, 'Error interno del servidor');
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
      return VehicleController.handleControllerError(res, error, 'Error interno del servidor');
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
      return VehicleController.handleControllerError(res, error, 'Error interno del servidor');
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
      return VehicleController.handleControllerError(res, error, 'Error interno del servidor');
    }
  }
}

module.exports = VehicleController;