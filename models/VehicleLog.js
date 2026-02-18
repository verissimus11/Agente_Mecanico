const { runQuery, allQuery } = require('../db/pg-connection');
const { v4: uuidv4 } = require('uuid');

class VehicleLog {
  // Crear entrada de historial
  static async create(vehicleId, status, note = null) {
    const id = uuidv4();
    const query = `
      INSERT INTO vehicle_logs (id, vehicle_id, status, note)
      VALUES ($1, $2, $3, $4)
    `;
    await runQuery(query, [id, vehicleId, status, note]);
    return { id, vehicle_id: vehicleId, status, note };
  }

  // Obtener historial de un vehículo (ordenado cronológicamente)
  static async findByVehicleId(vehicleId) {
    const query = `
      SELECT id, status, note, created_at
      FROM vehicle_logs
      WHERE vehicle_id = $1
      ORDER BY created_at ASC
    `;
    return await allQuery(query, [vehicleId]);
  }

  // Obtener historial público (sin IDs internos)
  static async findPublicByVehicleId(vehicleId) {
    const query = `
      SELECT status, note, created_at
      FROM vehicle_logs
      WHERE vehicle_id = $1
      ORDER BY created_at ASC
    `;
    return await allQuery(query, [vehicleId]);
  }
}

module.exports = VehicleLog;
