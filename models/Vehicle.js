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

  // Función determinista para generar mensaje de estado
  static generateStatusMessage(vehicle) {
    if (!vehicle) return '';
    
    const statusTranslations = {
      'EN_REVISION': 'en revisión',
      'ESPERANDO_PIEZA': 'esperando pieza', 
      'PRESUPUESTO_PENDIENTE': 'con presupuesto pendiente',
      'LISTO': 'listo'
    };

    const statusText = statusTranslations[vehicle.status] || vehicle.status.toLowerCase();
    const updatedAt = new Date(vehicle.updated_at).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `Tu vehículo con matrícula ${vehicle.plate} está actualmente en estado ${statusText}. Última actualización: ${updatedAt}. Te avisaremos cuando haya cambios.`;
  }

  // Crear nuevo vehículo
  static async create(plate, phone) {
    const id = uuidv4();
    const query = `
      INSERT INTO vehicles (id, plate, phone, status, active)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const values = [id, plate.toUpperCase(), phone, this.STATUSES.EN_REVISION, 1];
    await runQuery(query, values);
    
    // Obtener el registro creado
    const created = await getQuery('SELECT * FROM vehicles WHERE id = ?', [id]);
    return created;
  }

  // Obtener vehículos activos
  static async getActive() {
    const query = `
      SELECT * FROM vehicles 
      WHERE active = 1 
      ORDER BY updated_at DESC
    `;
    
    const result = await allQuery(query);
    return result;
  }

  // Actualizar status del vehículo
  static async updateStatus(id, status, lastEvent = null) {
    const query = `
      UPDATE vehicles 
      SET status = ?, last_event = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND active = 1
    `;
    
    const values = [status, lastEvent, id];
    await runQuery(query, values);
    
    // Obtener el registro actualizado
    const updated = await getQuery('SELECT * FROM vehicles WHERE id = ?', [id]);
    return updated;
  }

  // Buscar por teléfono
  static async findByPhone(phone) {
    const query = `
      SELECT * FROM vehicles 
      WHERE phone = ? AND active = 1
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    
    const result = await getQuery(query, [phone]);
    return result;
  }

  // Buscar por matrícula
  static async findByPlate(plate) {
    const query = `
      SELECT * FROM vehicles 
      WHERE plate = ? AND active = 1
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    
    const result = await getQuery(query, [plate.toUpperCase()]);
    return result;
  }

  // Obtener por ID
  static async findById(id) {
    const query = `
      SELECT * FROM vehicles 
      WHERE id = ? AND active = 1
    `;
    
    const result = await getQuery(query, [id]);
    return result;
  }
}

module.exports = Vehicle;