const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Area = require('../models/Area');
const { verificarToken, esAdmin } = require('../middleware/auth');

// Obtener todas las áreas
router.get('/', verificarToken, async (req, res) => {
  try {
    const { activo } = req.query;

    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';

    const areas = await Area.findAll({
      where,
      order: [['nombre', 'ASC']]
    });

    res.json({
      success: true,
      count: areas.length,
      areas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener áreas',
      error: error.message
    });
  }
});

// Obtener área por ID
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const area = await Area.findByPk(req.params.id);

    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Área no encontrada'
      });
    }

    res.json({ success: true, area });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener área',
      error: error.message
    });
  }
});

// Crear área (solo admin)
router.post('/', verificarToken, esAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, codigo, color } = req.body;

    if (!nombre || !codigo) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y código son requeridos'
      });
    }

    const existeNombre = await Area.findOne({ where: { nombre } });
    if (existeNombre) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un área con ese nombre'
      });
    }

    const existeCodigo = await Area.findOne({
      where: { codigo: codigo.toUpperCase() }
    });
    if (existeCodigo) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un área con ese código'
      });
    }

    const area = await Area.create({
      nombre,
      descripcion,
      codigo: codigo.toUpperCase(),
      color: color || '#4CAF50'
    });

    res.status(201).json({
      success: true,
      message: 'Área creada exitosamente',
      area
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear área',
      error: error.message
    });
  }
});

// Actualizar área (solo admin)
router.put('/:id', verificarToken, esAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, codigo, color, activo } = req.body;

    const area = await Area.findByPk(req.params.id);

    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Área no encontrada'
      });
    }

    if (nombre && nombre !== area.nombre) {
      const existeNombre = await Area.findOne({
        where: { nombre, id: { [Op.ne]: req.params.id } }
      });
      if (existeNombre) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un área con ese nombre'
        });
      }
    }

    if (codigo && codigo.toUpperCase() !== area.codigo) {
      const existeCodigo = await Area.findOne({
        where: {
          codigo: codigo.toUpperCase(),
          id: { [Op.ne]: req.params.id }
        }
      });
      if (existeCodigo) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un área con ese código'
        });
      }
    }

    const updateData = {};
    if (nombre) updateData.nombre = nombre;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (codigo) updateData.codigo = codigo.toUpperCase();
    if (color) updateData.color = color;
    if (typeof activo !== 'undefined') updateData.activo = activo;

    await area.update(updateData);

    res.json({
      success: true,
      message: 'Área actualizada exitosamente',
      area
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar área',
      error: error.message
    });
  }
});

// Eliminar área (solo admin)
router.delete('/:id', verificarToken, esAdmin, async (req, res) => {
  try {
    const { Area } = require('../models/index');
    const Evento = require('../models/Evento');

    const usuariosConArea = await Usuario.count({
      where: { area_id: req.params.id }
    });
    if (usuariosConArea > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el área porque tiene ${usuariosConArea} usuario(s) asociado(s)`
      });
    }

    const eventosConArea = await Evento.count({
      where: { area_id: req.params.id }
    });
    if (eventosConArea > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el área porque tiene ${eventosConArea} evento(s) asociado(s)`
      });
    }

    const area = await Area.findByPk(req.params.id);
    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Área no encontrada'
      });
    }

    await area.destroy();

    res.json({
      success: true,
      message: 'Área eliminada exitosamente'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar área',
      error: error.message
    });
  }
});

module.exports = router;