const Workshop = require('../models/Workshop');

async function resolveWorkshopContext(req, res, next) {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    let workshopSlug;

    if (role === 'mechanic') {
      workshopSlug = req.user?.workshopSlug || process.env.MECHANIC_WORKSHOP_SLUG || 'taller-demo';
    } else {
      workshopSlug = req.headers['x-workshop-slug'] || req.query.workshop || req.user?.workshopSlug;
    }

    let workshop;
    if (workshopSlug) {
      workshop = await Workshop.findBySlug(workshopSlug);
      if (!workshop) {
        return res.status(404).json({
          error: 'WORKSHOP_NOT_FOUND',
          message: 'Taller no encontrado'
        });
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
