const { runQuery, allQuery } = require('../db/pg-connection');
const { v4: uuidv4 } = require('uuid');

class VehicleLog {
  // Crear entrada de historial
  static async create(vehicleId, status, note = null, actor = null) {
    const id = uuidv4();
    const actorUsername = actor?.username || null;
    const actorName = actor?.name || actor?.username || null;
    const query = `
      INSERT INTO vehicle_logs (id, vehicle_id, status, note, actor_username, actor_name)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await runQuery(query, [id, vehicleId, status, note, actorUsername, actorName]);
    return { id, vehicle_id: vehicleId, status, note, actor_username: actorUsername, actor_name: actorName };
  }

  // Obtener historial de un vehículo (ordenado cronológicamente)
  static async findByVehicleId(vehicleId) {
    const query = `
      SELECT id, status, note, actor_username, actor_name, created_at
      FROM vehicle_logs
      WHERE vehicle_id = $1
      ORDER BY created_at ASC
    `;
    return await allQuery(query, [vehicleId]);
  }

  // Obtener historial público (sin IDs internos)
  static async findPublicByVehicleId(vehicleId) {
    const query = `
      SELECT status, note, actor_name, created_at
      FROM vehicle_logs
      WHERE vehicle_id = $1
      ORDER BY created_at ASC
    `;
    return await allQuery(query, [vehicleId]);
  }
}

module.exports = VehicleLog;
