const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { Estudiante } = require('../models/index');
const { verificarToken } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Obtener periodos disponibles
router.get('/periodos', async (req, res) => {
  try {
    const resultados = await Estudiante.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('periodo')), 'periodo']],
      order: [['periodo', 'DESC']]
    });
    const periodos = resultados.map(r => r.periodo);
    res.json({ success: true, periodos });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener periodos', 
      error: error.message 
    });
  }
});

// Listar estudiantes
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, periodo } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (periodo) where.periodo = periodo;

    if (search) {
      where[Op.or] = [
        { nombre:         { [Op.iLike]: `%${search}%` } },
        { codigo_carnet:  { [Op.iLike]: `%${search}%` } },
        { identificacion: { [Op.iLike]: `%${search}%` } },
        { email:          { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: estudiantes } = await Estudiante.findAndCountAll({
      where,
      limit:  parseInt(limit),
      offset: parseInt(offset),
      order:  [['nombre', 'ASC']]
    });

    res.json({
      success: true,
      estudiantes,
      totalPages:  Math.ceil(count / limit),
      currentPage: parseInt(page),
      total:       count
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener estudiantes', 
      error: error.message 
    });
  }
});

// Obtener estudiante por código de carnet (periodo más reciente)
router.get('/codigo/:codigo', async (req, res) => {
  try {
    const estudiante = await Estudiante.findOne({
      where: { codigo_carnet: req.params.codigo.toUpperCase() },
      order: [['periodo', 'DESC']]
    });

    if (!estudiante) {
      return res.status(404).json({ success: false, message: 'Estudiante no encontrado' });
    }

    res.json({ success: true, estudiante });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener estudiante', 
      error: error.message 
    });
  }
});

// Obtener estudiante por ID
router.get('/:id', async (req, res) => {
  try {
    const estudiante = await Estudiante.findByPk(req.params.id);

    if (!estudiante) {
      return res.status(404).json({ success: false, message: 'Estudiante no encontrado' });
    }

    res.json({ success: true, estudiante });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener estudiante', 
      error: error.message 
    });
  }
});

// Actualizar estudiante
router.put('/:id', async (req, res) => {
  try {
    const estudiante = await Estudiante.findByPk(req.params.id);

    if (!estudiante) {
      return res.status(404).json({ success: false, message: 'Estudiante no encontrado' });
    }

    await estudiante.update(req.body);

    res.json({
      success: true,
      message: 'Estudiante actualizado exitosamente',
      estudiante
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar estudiante', 
      error: error.message 
    });
  }
});

module.exports = router;