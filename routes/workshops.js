const express = require('express');
const Workshop = require('../models/Workshop');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// GET /workshops - Listar talleres activos
router.get('/', requireRole(['owner', 'mechanic']), async (req, res) => {
  try {
    const workshops = await Workshop.listActive();
    res.json({
      success: true,
      data: workshops,
      count: workshops.length
    });
  } catch (error) {
    console.error('Error listando talleres:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    });
  }
});

// POST /workshops - Crear nuevo taller
router.post('/', requireRole(['owner']), async (req, res) => {
  try {
    const { name, slug } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'Nombre y slug son requeridos'
      });
    }

    if (!Workshop.isValidSlug(slug)) {
      return res.status(400).json({
        error: 'INVALID_SLUG',
        message: 'Slug inválido. Usa entre 2-50 caracteres: letras, números y guiones.'
      });
    }

    // Verificar que el slug no exista
    const existing = await Workshop.findBySlug(slug);
    if (existing) {
      return res.status(409).json({
        error: 'SLUG_ALREADY_EXISTS',
        message: `Ya existe un taller con el slug "${Workshop.normalizeSlug(slug)}"`
      });
    }

    const workshop = await Workshop.create(name, slug);
    console.log(`🏭 Taller creado: ${workshop.name} (${workshop.slug})`);

    res.status(201).json({
      success: true,
      data: workshop
    });

  } catch (error) {
    console.error('Error creando taller:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    });
  }
});

// GET /workshops/:slug - Obtener taller por slug
router.get('/:slug', requireRole(['owner', 'mechanic']), async (req, res) => {
  try {
    const workshop = await Workshop.findBySlug(req.params.slug);
    if (!workshop) {
      return res.status(404).json({
        error: 'WORKSHOP_NOT_FOUND',
        message: 'Taller no encontrado'
      });
    }

    res.json({
      success: true,
      data: workshop
    });

  } catch (error) {
    console.error('Error buscando taller:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /workshops/:slug - Desactivar taller (soft delete)
router.delete('/:slug', requireRole(['owner']), async (req, res) => {
  try {
    const workshop = await Workshop.findBySlug(req.params.slug);
    if (!workshop) {
      return res.status(404).json({
        error: 'WORKSHOP_NOT_FOUND',
        message: 'Taller no encontrado'
      });
    }

    await Workshop.deactivate(workshop.id);
    console.log(`🗑️ Taller desactivado: ${workshop.name} (${workshop.slug})`);

    res.json({
      success: true,
      message: `Taller "${workshop.name}" eliminado correctamente`
    });

  } catch (error) {
    console.error('Error eliminando taller:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;
