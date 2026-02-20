const Vehicle = require('../models/Vehicle');
const VehicleLog = require('../models/VehicleLog');
const path = require('path');
const fs = require('fs');

class VehicleController {
  static getActorLabel(user = {}) {
    const actorName = user?.name || user?.username || 'Sistema';
    if (String(user?.role || '').toLowerCase() === 'owner') {
      return `${actorName} (owner)`;
    }
    return actorName;
  }

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
      const actor = {
        username: req.user?.username || null,
        name: req.user?.name || req.user?.username || null
      };

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

      const vehicle = await Vehicle.create(workshopId, normalizedPlate, normalizedPhone, actor);

      // Crear log inicial
      const actorLabel = VehicleController.getActorLabel(req.user);
      await VehicleLog.create(vehicle.id, Vehicle.STATUSES.ESPERANDO_REVISION, `Vehículo recibido por ${actorLabel}`, actor);
      
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
      const actor = {
        username: req.user?.username || null,
        name: req.user?.name || req.user?.username || null
      };

      // Validar que el status sea válido
      if (!Object.values(Vehicle.STATUSES).includes(status)) {
        return res.status(400).json({
          error: 'INVALID_STATUS',
          message: 'Estado inválido',
          validStatuses: Object.values(Vehicle.STATUSES)
        });
      }

      const vehicle = await Vehicle.updateStatus(id, workshopId, status, last_event, actor);

      if (!vehicle) {
        return res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'Vehículo no encontrado'
        });
      }

      // Crear log de cambio de estado (ATÓMICO con la actualización)
      const actorLabel = VehicleController.getActorLabel(req.user);
      const rawLastEvent = typeof last_event === 'string' ? last_event.trim() : '';
      const isLegacyGenericNote = /^Estado cambiado a\b/i.test(rawLastEvent);
      const alreadyHasActorInfo = /cambiado por\b/i.test(rawLastEvent);
      const note = !rawLastEvent || isLegacyGenericNote
        ? `Estado cambiado por ${actorLabel}`
        : (alreadyHasActorInfo ? rawLastEvent : `${rawLastEvent} · Cambiado por ${actorLabel}`);
      await VehicleLog.create(vehicle.id, status, note, actor);

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

  // POST /vehicles/:id/quote-pdf - Subir PDF de presupuesto
  static async uploadQuotePdf(req, res) {
    try {
      const workshopId = req.workshopId;
      const { id } = req.params;
      const actor = {
        username: req.user?.username || null,
        name: req.user?.name || req.user?.username || null
      };

      const vehicle = await Vehicle.findById(id, workshopId);
      if (!vehicle) {
        return res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'Vehículo no encontrado'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: 'MISSING_PDF',
          message: 'Debes adjuntar un archivo PDF.'
        });
      }

      if (vehicle.status !== Vehicle.STATUSES.PRESUPUESTO_PENDIENTE) {
        return res.status(400).json({
          error: 'INVALID_STATUS_FOR_QUOTE',
          message: 'Solo puedes subir presupuesto cuando el vehículo está en Presupuesto pendiente.'
        });
      }

      if (vehicle.quote_pdf_path) {
        const previousAbsolutePath = path.join(process.cwd(), vehicle.quote_pdf_path);
        if (fs.existsSync(previousAbsolutePath)) {
          fs.unlinkSync(previousAbsolutePath);
        }
      }

      const fileRelativePath = path.join('uploads', 'quotes', req.file.filename).replace(/\\/g, '/');
      const updatedVehicle = await Vehicle.updateQuotePdf(id, workshopId, fileRelativePath);

      const actorLabel = VehicleController.getActorLabel(req.user);
      await VehicleLog.create(
        updatedVehicle.id,
        updatedVehicle.status,
        `Presupuesto PDF subido\nCambiado por ${actorLabel}`,
        actor
      );

      return res.json({
        success: true,
        data: updatedVehicle,
        message: 'PDF de presupuesto subido correctamente.'
      });
    } catch (error) {
      console.error('❌ Error subiendo PDF de presupuesto:', error);
      return VehicleController.handleControllerError(res, error, 'No se pudo subir el PDF del presupuesto.');
    }
  }

  // GET /vehicles/:id/quote-pdf - Descargar PDF de presupuesto
  static async downloadQuotePdf(req, res) {
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

      if (!vehicle.quote_pdf_path) {
        return res.status(404).json({
          error: 'QUOTE_PDF_NOT_FOUND',
          message: 'Este vehículo no tiene presupuesto PDF cargado.'
        });
      }

      const absolutePath = path.join(process.cwd(), vehicle.quote_pdf_path);
      if (!fs.existsSync(absolutePath)) {
        return res.status(404).json({
          error: 'QUOTE_PDF_FILE_MISSING',
          message: 'No se encontró el archivo PDF en disco.'
        });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="presupuesto-${vehicle.plate}.pdf"`);
      return res.sendFile(absolutePath);
    } catch (error) {
      console.error('❌ Error descargando PDF de presupuesto:', error);
      return VehicleController.handleControllerError(res, error, 'No se pudo descargar el PDF del presupuesto.');
    }
  }

  // GET /vehicles/stats/mechanics - Performance de mecánicos
  static async mechanicPerformance(req, res) {
    try {
      const workshopId = req.workshopId;
      const callerRole = String(req.user?.role || '').toLowerCase();

      // Solo owner y dueño pueden ver performance
      if (callerRole !== 'owner' && callerRole !== 'dueño') {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'No tienes permisos para ver el rendimiento de mecánicos.'
        });
      }

      const [statusCounts, finalizedCounts] = await Promise.all([
        Vehicle.getMechanicPerformance(workshopId),
        Vehicle.getMechanicFinalized(workshopId)
      ]);

      // Agrupar por mecánico
      const mechanicsMap = {};

      statusCounts.forEach((row) => {
        const key = row.mechanic_username;
        if (!mechanicsMap[key]) {
          mechanicsMap[key] = {
            username: row.mechanic_username,
            name: row.mechanic_name || row.mechanic_username,
            statuses: {},
            active_total: 0,
            finalized: 0
          };
        }
        mechanicsMap[key].statuses[row.status] = row.count;
        mechanicsMap[key].active_total += row.count;
      });

      finalizedCounts.forEach((row) => {
        const key = row.mechanic_username;
        if (!mechanicsMap[key]) {
          mechanicsMap[key] = {
            username: row.mechanic_username,
            name: row.mechanic_name || row.mechanic_username,
            statuses: {},
            active_total: 0,
            finalized: 0
          };
        }
        mechanicsMap[key].finalized = row.finalized;
      });

      const mechanics = Object.values(mechanicsMap).sort((a, b) => a.name.localeCompare(b.name));

      return res.json({
        success: true,
        data: mechanics
      });
    } catch (error) {
      console.error('❌ Error obteniendo performance de mecánicos:', error);
      return VehicleController.handleControllerError(res, error, 'Error al obtener rendimiento de mecánicos.');
    }
  }
}

module.exports = VehicleController;