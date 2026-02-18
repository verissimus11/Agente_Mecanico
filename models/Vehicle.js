const { runQuery, getQuery, allQuery } = require('../db/pg-connection');
const { v4: uuidv4 } = require('uuid');

class Vehicle {
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
        active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
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
      actorName
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
    const query = `
      UPDATE vehicles 
      SET
        status = $1,
        last_event = $2,
        last_status_by_username = $3,
        last_status_by_name = $4,
        updated_at = NOW()
      WHERE id = $5 AND workshop_id = $6 AND active = TRUE
    `;
    
    const values = [status, lastEvent, actorUsername, actorName, id, workshopId];
    await runQuery(query, values);
    
    const updated = await getQuery('SELECT * FROM vehicles WHERE id = $1 AND workshop_id = $2', [id, workshopId]);
    return updated;
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
      SELECT id, plate, status, updated_at
      FROM vehicles 
      WHERE workshop_id = $1 AND plate = $2 AND active = TRUE
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    return await getQuery(query, [workshopId, normalizedPlate]);
  }
}

module.exports = Vehicle;