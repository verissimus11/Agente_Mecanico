// Resuelve SIEMPRE el contexto de taller para rutas operativas.
// - Mecánico: taller fijo desde token/.env
// - Owner: puede seleccionar taller por header/query
// Este middleware evita fuga de datos entre talleres.
const Workshop = require('../models/Workshop');

async function resolveWorkshopContext(req, res, next) {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    let workshopSlug;

    if (role === 'mechanic') {
      workshopSlug = req.user?.workshopSlug || process.env.MECHANIC_WORKSHOP_SLUG || 'alua-odon-motor';
    } else {
      // Owner o sin auth: leer de header/query/user
      workshopSlug = req.headers['x-workshop-slug'] || req.query.workshop || req.user?.workshopSlug;
    }

    let workshop;
    if (workshopSlug) {
      workshop = await Workshop.findBySlug(workshopSlug);
      if (!workshop) {
        // Si no existe el slug, usar default en vez de error 404
        workshop = await Workshop.getOrCreateDefault();
      }
    } else {
      workshop = await Workshop.getOrCreateDefault();
    }

    req.workshopId = workshop.id;
    req.workshop = workshop;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  resolveWorkshopContext
};
