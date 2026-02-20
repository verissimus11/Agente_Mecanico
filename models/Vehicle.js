const { runQuery, getQuery, allQuery } = require('../db/pg-connection');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class Vehicle {
  static generateTrackingHash(vehicleId, status) {
    const secret = process.env.TRACKING_HASH_SECRET || process.env.JWT_SECRET || 'lance-workshop-tracking-secret';
    const entropy = crypto.randomBytes(16).toString('hex');
    return crypto
      .createHmac('sha256', secret)
      .update(`${vehicleId}|${status}|${Date.now()}|${entropy}`)
      .digest('hex');
  }

  // Estados permitidos
  static STATUSES = {
    ESPERANDO_REVISION: 'ESPERANDO_REVISION',
    EN_REVISION: 'EN_REVISION',
    MONTANDO_PIEZA: 'MONTANDO_PIEZA',
    ESPERANDO_PIEZA: 'ESPERANDO_PIEZA', 
    PRESUPUESTO_PENDIENTE: 'PRESUPUESTO_PENDIENTE',
    LISTO: 'LISTO'
  };

  // Traducciones de estados
  static STATUS_TRANSLATIONS = {
    'ESPERANDO_REVISION': 'Esperando revisión',
    'EN_REVISION': 'En revisión',
    'MONTANDO_PIEZA': 'Montando pieza',
    'ESPERANDO_PIEZA': 'Esperando pieza',
    'PRESUPUESTO_PENDIENTE': 'Presupuesto pendiente',
    'LISTO': 'Listo'
  };

  // Función determinista para generar mensaje de estado
  static generateStatusMessage(vehicle) {
    if (!vehicle) return '';
    
    const statusText = Vehicle.STATUS_TRANSLATIONS[vehicle.status] || vehicle.status;
    
    // Formatear fecha en español legible
    const updatedAt = new Date(vehicle.updated_at).toLocaleString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `Tu vehículo con matrícula ${vehicle.plate} está actualmente en estado ${statusText}. Última actualización: ${updatedAt}. Te avisaremos cuando haya cambios.`;
  }

  // Crear nuevo vehículo (requiere workshop_id)
  static async create(workshopId, plate, phone, actor = null) {
    const id = uuidv4();
    const normalizedPlate = plate.trim().toUpperCase().replace(/\s+/g, '');
    const actorUsername = actor?.username || null;
    const actorName = actor?.name || actor?.username || null;
    const trackingHash = this.generateTrackingHash(id, this.STATUSES.ESPERANDO_REVISION);
    
    const query = `
      INSERT INTO vehicles (
        id,
        workshop_id,
        plate,
        phone,
        status,
        created_by_username,
        created_by_name,
        last_status_by_username,
        last_status_by_name,
        tracking_hash,
        active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
    `;
    
    const values = [
      id,
      workshopId,
      normalizedPlate,
      phone,
      this.STATUSES.ESPERANDO_REVISION,
      actorUsername,
      actorName,
      actorUsername,
      actorName,
      trackingHash
    ];
    await runQuery(query, values);
    
    const created = await getQuery('SELECT * FROM vehicles WHERE id = $1', [id]);
    return created;
  }

  // Obtener vehículos activos de un taller
  static async getActive(workshopId) {
    const query = `
      SELECT * FROM vehicles 
      WHERE workshop_id = $1 AND active = TRUE 
      ORDER BY updated_at DESC
    `;
    return await allQuery(query, [workshopId]);
  }

  // Actualizar status del vehículo (filtrado por workshop_id)
  static async updateStatus(id, workshopId, status, lastEvent = null, actor = null) {
    const actorUsername = actor?.username || null;
    const actorName = actor?.name || actor?.username || null;
    const trackingHash = this.generateTrackingHash(id, status);
    const query = `
      UPDATE vehicles 
      SET
        status = $1,
        last_event = $2,
        last_status_by_username = $3,
        last_status_by_name = $4,
        tracking_hash = $5,
        updated_at = NOW()
      WHERE id = $6 AND workshop_id = $7 AND active = TRUE
    `;
    
    const values = [status, lastEvent, actorUsername, actorName, trackingHash, id, workshopId];
    await runQuery(query, values);
    
    const updated = await getQuery('SELECT * FROM vehicles WHERE id = $1 AND workshop_id = $2', [id, workshopId]);
    return updated;
  }

  // Registrar PDF de presupuesto por vehículo
  static async updateQuotePdf(id, workshopId, quotePdfPath) {
    const query = `
      UPDATE vehicles
      SET
        quote_pdf_path = $1,
        quote_pdf_uploaded_at = NOW(),
        updated_at = NOW()
      WHERE id = $2 AND workshop_id = $3 AND active = TRUE
    `;

    await runQuery(query, [quotePdfPath, id, workshopId]);
    return await getQuery('SELECT * FROM vehicles WHERE id = $1 AND workshop_id = $2', [id, workshopId]);
  }

  // Buscar por teléfono (filtrado por workshop_id)
  static async findByPhone(workshopId, phone) {
    const query = `
      SELECT * FROM vehicles 
      WHERE workshop_id = $1 AND phone = $2 AND active = TRUE
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    return await getQuery(query, [workshopId, phone]);
  }

  // Buscar por matrícula (filtrado por workshop_id)
  static async findByPlate(workshopId, plate) {
    const normalizedPlate = plate.trim().toUpperCase().replace(/\s+/g, '');
    const query = `
      SELECT * FROM vehicles 
      WHERE workshop_id = $1 AND plate = $2 AND active = TRUE
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    return await getQuery(query, [workshopId, normalizedPlate]);
  }

  // Obtener por ID (filtrado por workshop_id)
  static async findById(id, workshopId) {
    const query = `
      SELECT * FROM vehicles 
      WHERE id = $1 AND workshop_id = $2 AND active = TRUE
    `;
    return await getQuery(query, [id, workshopId]);
  }

  // Actualizar datos del vehículo (matrícula y/o teléfono)
  static async updateData(id, workshopId, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.plate !== undefined) {
      fields.push(`plate = $${paramIndex++}`);
      values.push(updates.plate.trim().toUpperCase().replace(/\s+/g, ''));
    }
    if (updates.phone !== undefined) {
      fields.push(`phone = $${paramIndex++}`);
      values.push(updates.phone);
    }

    if (fields.length === 0) return null;

    fields.push('updated_at = NOW()');
    values.push(id, workshopId);

    const query = `
      UPDATE vehicles
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex++} AND workshop_id = $${paramIndex++} AND active = TRUE
    `;
    await runQuery(query, values);
    return await getQuery('SELECT * FROM vehicles WHERE id = $1 AND workshop_id = $2', [id, workshopId]);
  }

  // Buscar por matrícula y workshop_id (para endpoint público)
  static async findActiveByPlateAndWorkshop(workshopId, plate) {
    const normalizedPlate = plate.trim().toUpperCase().replace(/\s+/g, '');
    const query = `
      SELECT id, plate, status, updated_at, tracking_hash
      FROM vehicles 
      WHERE workshop_id = $1 AND plate = $2 AND active = TRUE
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    return await getQuery(query, [workshopId, normalizedPlate]);
  }

  static async findActiveByPlateWorkshopAndHash(workshopId, plate, trackingHash) {
    const normalizedPlate = plate.trim().toUpperCase().replace(/\s+/g, '');
    const query = `
      SELECT id, plate, status, updated_at, tracking_hash
      FROM vehicles
      WHERE workshop_id = $1 AND plate = $2 AND tracking_hash = $3 AND active = TRUE
      LIMIT 1
    `;
    return await getQuery(query, [workshopId, normalizedPlate, trackingHash]);
  }

  // Estadísticas de rendimiento por mecánico
  static async getMechanicPerformance(workshopId) {
    const query = `
      SELECT
        v.last_status_by_username AS mechanic_username,
        v.last_status_by_name AS mechanic_name,
        v.status,
        COUNT(*)::int AS count
      FROM vehicles v
      WHERE v.workshop_id = $1 AND v.active = TRUE
        AND v.last_status_by_username IS NOT NULL
      GROUP BY v.last_status_by_username, v.last_status_by_name, v.status
      ORDER BY v.last_status_by_name ASC, v.status ASC
    `;
    return await allQuery(query, [workshopId]);
  }

  // Total de coches finalizados por mecánico (histórico)
  static async getMechanicFinalized(workshopId) {
    const query = `
      SELECT
        vl.actor_username AS mechanic_username,
        vl.actor_name AS mechanic_name,
        COUNT(DISTINCT vl.vehicle_id)::int AS finalized
      FROM vehicle_logs vl
      JOIN vehicles v ON v.id = vl.vehicle_id
      WHERE v.workshop_id = $1
        AND vl.status = 'LISTO'
        AND vl.actor_username IS NOT NULL
      GROUP BY vl.actor_username, vl.actor_name
      ORDER BY finalized DESC
    `;
    return await allQuery(query, [workshopId]);
  }
}

module.exports = Vehicle;