const { runQuery, getQuery, allQuery } = require('../db/pg-connection');
const { v4: uuidv4 } = require('uuid');

class PanelUser {
  static normalizeUsername(username) {
    return String(username || '').trim().toLowerCase();
  }

  static async findByCredentials(username, password) {
    const normalizedUsername = PanelUser.normalizeUsername(username);
    const query = `
      SELECT pu.id, pu.username, pu.name, pu.role, pu.workshop_id, w.slug AS workshop_slug
      FROM panel_users pu
      LEFT JOIN workshops w ON w.id = pu.workshop_id
      WHERE pu.username = $1
        AND pu.password = $2
        AND pu.active = TRUE
      LIMIT 1
    `;
    return await getQuery(query, [normalizedUsername, String(password || '')]);
  }

  static async findByUsername(username) {
    const normalizedUsername = PanelUser.normalizeUsername(username);
    const query = `
      SELECT id, username, name, role, workshop_id, active, created_at
      FROM panel_users
      WHERE username = $1
      LIMIT 1
    `;
    return await getQuery(query, [normalizedUsername]);
  }

  static async createMechanic(workshopId, name, username, password) {
    const id = uuidv4();
    const normalizedUsername = PanelUser.normalizeUsername(username);
    const query = `
      INSERT INTO panel_users (id, workshop_id, username, password, name, role, active)
      VALUES ($1, $2, $3, $4, $5, 'mechanic', TRUE)
    `;
    await runQuery(query, [id, workshopId, normalizedUsername, String(password || ''), String(name || '').trim()]);
    return await getQuery(
      `
      SELECT pu.id, pu.username, pu.name, pu.role, pu.workshop_id, pu.active, pu.created_at, w.slug AS workshop_slug
      FROM panel_users pu
      LEFT JOIN workshops w ON w.id = pu.workshop_id
      WHERE pu.id = $1
      `,
      [id]
    );
  }

  static async listByWorkshop(workshopId) {
    const query = `
      SELECT pu.id, pu.username, pu.name, pu.role, pu.active, pu.created_at
      FROM panel_users pu
      WHERE pu.workshop_id = $1 AND pu.active = TRUE
      ORDER BY pu.name ASC
    `;
    return await allQuery(query, [workshopId]);
  }
}

module.exports = PanelUser;
