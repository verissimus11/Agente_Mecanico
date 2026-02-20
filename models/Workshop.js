const { runQuery, getQuery, allQuery } = require('../db/pg-connection');
const { v4: uuidv4 } = require('uuid');

class Workshop {
  // Crear nuevo taller
  static async create(name, slug) {
    const id = uuidv4();
    const normalizedSlug = Workshop.normalizeSlug(slug);

    const query = `
      INSERT INTO workshops (id, name, slug, active)
      VALUES ($1, $2, $3, TRUE)
    `;

    await runQuery(query, [id, name.trim(), normalizedSlug]);
    const created = await getQuery('SELECT * FROM workshops WHERE id = $1', [id]);
    return created;
  }

  // Buscar taller por slug
  static async findBySlug(slug) {
    const normalizedSlug = Workshop.normalizeSlug(slug);
    const query = `
      SELECT * FROM workshops
      WHERE slug = $1 AND active = TRUE
    `;
    return await getQuery(query, [normalizedSlug]);
  }

  // Buscar taller por ID
  static async findById(id) {
    const query = `
      SELECT * FROM workshops
      WHERE id = $1 AND active = TRUE
    `;
    return await getQuery(query, [id]);
  }

  // Listar talleres activos
  static async listActive() {
    const query = `
      SELECT * FROM workshops
      WHERE active = TRUE
      ORDER BY name ASC
    `;
    return await allQuery(query);
  }

  // Obtener o crear taller por defecto para primer piloto
  // Este taller se usa cuando no se especifica contexto y para inicializar entorno.
  static async getOrCreateDefault() {
    const DEFAULT_SLUG = 'alua-odon-motor';
    let workshop = await Workshop.findBySlug(DEFAULT_SLUG);
    if (!workshop) {
      workshop = await Workshop.create('Alua Odón Motor', DEFAULT_SLUG);
      console.log(`🏭 Taller por defecto creado: ${workshop.name} (${workshop.slug})`);
    }
    return workshop;
  }

  // Normalizar slug: minúsculas, solo letras/números/guiones
  static normalizeSlug(slug) {
    return String(slug || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')   // reemplazar caracteres no válidos
      .replace(/-+/g, '-')            // colapsar guiones múltiples
      .replace(/^-|-$/g, '');         // quitar guiones al inicio/final
  }

  // Desactivar taller (soft delete) - renombra slug para liberar constraint único
  static async deactivate(id) {
    const ts = Math.floor(Date.now() / 1000);
    const query = `UPDATE workshops SET active = FALSE, slug = slug || '-del-' || $2 WHERE id = $1`;
    await runQuery(query, [id, String(ts)]);
  }

  // Habilitar / deshabilitar taller (suscripción)
  static async setEnabled(id, enabled) {
    const query = `UPDATE workshops SET enabled = $2 WHERE id = $1 AND active = TRUE`;
    await runQuery(query, [id, enabled]);
    return await getQuery('SELECT * FROM workshops WHERE id = $1', [id]);
  }

  // Buscar taller por subdomain
  static async findBySubdomain(subdomain) {
    if (!subdomain) return null;
    const clean = subdomain.toLowerCase().trim();
    // Primero buscar por campo subdomain explícito
    let workshop = await getQuery(
      'SELECT * FROM workshops WHERE subdomain = $1 AND active = TRUE',
      [clean]
    );
    if (workshop) return workshop;

    // Fallback: buscar slug que coincida con el subdominio (sin guiones)
    // Ejemplo: subdomain "aluaodon" → slug "alua-odon-motor" (busca LIKE)
    workshop = await getQuery(
      `SELECT * FROM workshops WHERE REPLACE(slug, '-', '') LIKE $1 || '%' AND active = TRUE ORDER BY LENGTH(slug) ASC LIMIT 1`,
      [clean]
    );
    return workshop || null;
  }

  // Asignar subdomain a un taller
  static async setSubdomain(id, subdomain) {
    const clean = subdomain ? subdomain.toLowerCase().trim().replace(/[^a-z0-9]/g, '') : null;
    await runQuery('UPDATE workshops SET subdomain = $2 WHERE id = $1 AND active = TRUE', [id, clean]);
    return await getQuery('SELECT * FROM workshops WHERE id = $1', [id]);
  }

  // Validar slug
  static isValidSlug(slug) {
    const normalized = Workshop.normalizeSlug(slug);
    return normalized.length >= 2 && normalized.length <= 50 && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(normalized);
  }
}

module.exports = Workshop;
