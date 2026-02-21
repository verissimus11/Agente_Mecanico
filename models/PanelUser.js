const { runQuery, getQuery, allQuery } = require('../db/pg-connection');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

const BCRYPT_SALT_ROUNDS = 10;

class PanelUser {
  static normalizeUsername(username) {
    return String(username || '').trim().toLowerCase();
  }

  static async findByCredentials(username, password) {
    const normalizedUsername = PanelUser.normalizeUsername(username);
    const query = `
      SELECT pu.id, pu.username, pu.name, pu.role, pu.workshop_id, pu.password, w.slug AS workshop_slug
      FROM panel_users pu
      LEFT JOIN workshops w ON w.id = pu.workshop_id
      WHERE pu.username = $1
        AND pu.active = TRUE
      LIMIT 1
    `;
    const user = await getQuery(query, [normalizedUsername]);
    if (!user) return null;

    const plainPassword = String(password || '');
    const storedPassword = user.password || '';

    // Soportar bcrypt hash o texto plano (migración)
    let isValid = false;
    if (storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2a$')) {
      isValid = await bcrypt.compare(plainPassword, storedPassword);
    } else {
      // Password en texto plano → comparar y migrar a bcrypt
      isValid = (plainPassword === storedPassword);
      if (isValid) {
        try {
          const hashed = await bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
          await runQuery('UPDATE panel_users SET password = $1 WHERE id = $2', [hashed, user.id]);
          console.log(`🔒 Password migrado a bcrypt para usuario: ${user.username}`);
        } catch (migrationErr) {
          console.error('Error migrando password a bcrypt:', migrationErr.message);
        }
      }
    }

    if (!isValid) return null;

    // No devolver el password
    delete user.password;
    return user;
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
    return PanelUser.createUser(workshopId, name, username, password, 'mechanic');
  }

  static async createUser(workshopId, name, username, password, role = 'mechanic') {
    const id = uuidv4();
    const normalizedUsername = PanelUser.normalizeUsername(username);
    const validRoles = ['mechanic', 'dueño'];
    const safeRole = validRoles.includes(role) ? role : 'mechanic';
    const hashedPassword = await bcrypt.hash(String(password || ''), BCRYPT_SALT_ROUNDS);
    const query = `
      INSERT INTO panel_users (id, workshop_id, username, password, name, role, active)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE)
    `;
    await runQuery(query, [id, workshopId, normalizedUsername, hashedPassword, String(name || '').trim(), safeRole]);
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

  static async deactivateUser(userId) {
    const query = `UPDATE panel_users SET active = FALSE WHERE id = $1 AND active = TRUE`;
    await runQuery(query, [userId]);
  }

  static async findById(userId) {
    const query = `
      SELECT pu.id, pu.username, pu.name, pu.role, pu.workshop_id, pu.active, pu.created_at
      FROM panel_users pu
      WHERE pu.id = $1
    `;
    return await getQuery(query, [userId]);
  }
}

module.exports = PanelUser;
