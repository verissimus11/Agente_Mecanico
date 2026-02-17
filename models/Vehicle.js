const { runQuery, getQuery, allQuery } = require('../db/sqlite-connection');
const { v4: uuidv4 } = require('uuid');

class Vehicle {
  // Estados permitidos
  static STATUSES = {
    EN_REVISION: 'EN_REVISION',
    ESPERANDO_PIEZA: 'ESPERANDO_PIEZA', 
    PRESUPUESTO_PENDIENTE: 'PRESUPUESTO_PENDIENTE',
    LISTO: 'LISTO'
  };

  // Traducciones de estados
  static STATUS_TRANSLATIONS = {
    'EN_REVISION': 'En revisión',
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
  static async create(workshopId, plate, phone) {
    const id = uuidv4();
    const normalizedPlate = plate.trim().toUpperCase().replace(/\s+/g, '');
    
    const query = `
      INSERT INTO vehicles (id, workshop_id, plate, phone, status, active)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const values = [id, workshopId, normalizedPlate, phone, this.STATUSES.EN_REVISION, 1];
    await runQuery(query, values);
    
    const created = await getQuery('SELECT * FROM vehicles WHERE id = ?', [id]);
    return created;
  }

  // Obtener vehículos activos de un taller
  static async getActive(workshopId) {
    const query = `
      SELECT * FROM vehicles 
      WHERE workshop_id = ? AND active = 1 
      ORDER BY updated_at DESC
    `;
    return await allQuery(query, [workshopId]);
  }

  // Actualizar status del vehículo (filtrado por workshop_id)
  static async updateStatus(id, workshopId, status, lastEvent = null) {
    const query = `
      UPDATE vehicles 
      SET status = ?, last_event = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND workshop_id = ? AND active = 1
    `;
    
    const values = [status, lastEvent, id, workshopId];
    await runQuery(query, values);
    
    const updated = await getQuery('SELECT * FROM vehicles WHERE id = ? AND workshop_id = ?', [id, workshopId]);
    return updated;
  }

  // Buscar por teléfono (filtrado por workshop_id)
  static async findByPhone(workshopId, phone) {
    const query = `
      SELECT * FROM vehicles 
      WHERE workshop_id = ? AND phone = ? AND active = 1
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
      WHERE workshop_id = ? AND plate = ? AND active = 1
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    return await getQuery(query, [workshopId, normalizedPlate]);
  }

  // Obtener por ID (filtrado por workshop_id)
  static async findById(id, workshopId) {
    const query = `
      SELECT * FROM vehicles 
      WHERE id = ? AND workshop_id = ? AND active = 1
    `;
    return await getQuery(query, [id, workshopId]);
  }

  // Actualizar datos del vehículo (matrícula y/o teléfono)
  static async updateData(id, workshopId, updates) {
    const fields = [];
    const values = [];

    if (updates.plate !== undefined) {
      fields.push('plate = ?');
      values.push(updates.plate.trim().toUpperCase().replace(/\s+/g, ''));
    }
    if (updates.phone !== undefined) {
      fields.push('phone = ?');
      values.push(updates.phone);
    }

    if (fields.length === 0) return null;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id, workshopId);

    const query = `
      UPDATE vehicles
      SET ${fields.join(', ')}
      WHERE id = ? AND workshop_id = ? AND active = 1
    `;
    await runQuery(query, values);
    return await getQuery('SELECT * FROM vehicles WHERE id = ? AND workshop_id = ?', [id, workshopId]);
  }

  // Buscar por matrícula y workshop_id (para endpoint público)
  static async findActiveByPlateAndWorkshop(workshopId, plate) {
    const normalizedPlate = plate.trim().toUpperCase().replace(/\s+/g, '');
    const query = `
      SELECT id, plate, status, updated_at
      FROM vehicles 
      WHERE workshop_id = ? AND plate = ? AND active = 1
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    return await getQuery(query, [workshopId, normalizedPlate]);
  }
}

module.exports = Vehicle;