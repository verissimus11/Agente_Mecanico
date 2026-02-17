const { runQuery, getQuery, allQuery } = require('../db/sqlite-connection');
const { v4: uuidv4 } = require('uuid');

class Workshop {
  // Crear nuevo taller
  static async create(name, slug) {
    const id = uuidv4();
    const normalizedSlug = Workshop.normalizeSlug(slug);

    const query = `
      INSERT INTO workshops (id, name, slug, active)
      VALUES (?, ?, ?, 1)
    `;

    await runQuery(query, [id, name.trim(), normalizedSlug]);
    const created = await getQuery('SELECT * FROM workshops WHERE id = ?', [id]);
    return created;
  }

  // Buscar taller por slug
  static async findBySlug(slug) {
    const normalizedSlug = Workshop.normalizeSlug(slug);
    const query = `
      SELECT * FROM workshops
      WHERE slug = ? AND active = 1
    `;
    return await getQuery(query, [normalizedSlug]);
  }

  // Buscar taller por ID
  static async findById(id) {
    const query = `
      SELECT * FROM workshops
      WHERE id = ? AND active = 1
    `;
    return await getQuery(query, [id]);
  }

  // Listar talleres activos
  static async listActive() {
    const query = `
      SELECT * FROM workshops
      WHERE active = 1
      ORDER BY name ASC
    `;
    return await allQuery(query);
  }

  // Obtener o crear taller por defecto (para migración)
  static async getOrCreateDefault() {
    const DEFAULT_SLUG = 'taller-demo';
    let workshop = await Workshop.findBySlug(DEFAULT_SLUG);
    if (!workshop) {
      workshop = await Workshop.create('Taller Demo', DEFAULT_SLUG);
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

  // Validar slug
  static isValidSlug(slug) {
    const normalized = Workshop.normalizeSlug(slug);
    return normalized.length >= 2 && normalized.length <= 50 && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(normalized);
  }
}

module.exports = Workshop;
