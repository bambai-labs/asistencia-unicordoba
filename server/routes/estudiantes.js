const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { Estudiante } = require('../models/index');
const { verificarToken } = require('../middleware/auth');
const multer = require('multer');
const ExcelJS = require('exceljs');
const upload = multer({ storage: multer.memoryStorage() });

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

// Descargar plantilla de Excel
router.get('/plantilla/descargar', async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Estudiantes');

    worksheet.columns = [
      { header: 'nombre',              key: 'nombre',              width: 40 },
      { header: 'tipo_identificacion', key: 'tipo_identificacion', width: 20 },
      { header: 'identificacion',      key: 'identificacion',      width: 15 },
      { header: 'codigo_carnet',       key: 'codigo_carnet',       width: 15 },
      { header: 'email',               key: 'email',               width: 35 },
      { header: 'tipo_vinculacion',    key: 'tipo_vinculacion',    width: 20 },
      { header: 'facultad',            key: 'facultad',            width: 35 },
      { header: 'programa',            key: 'programa',            width: 50 },
      { header: 'sem',                 key: 'sem',                 width: 10 },
      { header: 'circunscripcion',     key: 'circunscripcion',     width: 25 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF43a047' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.addRow({
      nombre:              'JUAN PEREZ GOMEZ',
      tipo_identificacion: 'CC',
      identificacion:      '1234567890',
      codigo_carnet:       '1234567890',
      email:               'juan.perez@example.com',
      tipo_vinculacion:    'Estudiante',
      facultad:            'Ingeniería',
      programa:            'Ingeniería de Sistemas',
      sem:                 '5',
      circunscripcion:     'Montería'
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=plantilla_estudiantes.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al generar plantilla', 
      error: error.message 
    });
  }
});

// Sincronizar estudiantes desde Excel
router.post('/sincronizar', upload.single('archivo'), async (req, res) => {
  try {
    const { periodo } = req.body;

    if (!periodo) {
      return res.status(400).json({ success: false, message: 'El periodo es requerido' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se ha subido ningún archivo' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);

    const estudiantes = [];
    const errores = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const rowData = {
        nombre:              row.getCell(1).value?.toString().trim() || '',
        tipo_identificacion: row.getCell(2).value?.toString().trim() || '',
        identificacion:      row.getCell(3).value?.toString().trim() || '',
        codigo_carnet:       row.getCell(4).value?.toString().trim().toUpperCase() || '',
        email:               row.getCell(5).value?.toString().trim().toLowerCase() || '',
        tipo_vinculacion:    row.getCell(6).value?.toString().trim() || '',
        facultad:            row.getCell(7).value?.toString().trim() || '',
        programa:            row.getCell(8).value?.toString().trim() || '',
        sem:                 row.getCell(9).value?.toString().trim() || '',
        circunscripcion:     row.getCell(10).value?.toString().trim() || '',
        periodo
      };

      if (!rowData.nombre || !rowData.tipo_identificacion || !rowData.identificacion ||
          !rowData.codigo_carnet || !rowData.email) {
        errores.push(`Línea ${rowNumber}: Faltan campos obligatorios`);
        return;
      }

      estudiantes.push(rowData);
    });

    if (errores.length > 0) {
      return res.status(400).json({ success: false, message: 'Errores en el archivo', errores });
    }

    let insertados = 0;
    let actualizados = 0;
    const errorSync = [];

    for (const estudiante of estudiantes) {
      try {
        const existente = await Estudiante.findOne({
          where: {
            codigo_carnet: estudiante.codigo_carnet,
            periodo:       estudiante.periodo
          }
        });

        if (existente) {
          await existente.update(estudiante);
          actualizados++;
        } else {
          await Estudiante.create(estudiante);
          insertados++;
        }
      } catch (error) {
        errorSync.push(`Error con estudiante ${estudiante.codigo_carnet}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: 'Sincronización completada',
      resultado: {
        insertados,
        actualizados,
        total: insertados + actualizados,
        errores: errorSync
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al sincronizar estudiantes', 
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
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['nombre', 'ASC']]
    });

    res.json({
      success: true,
      estudiantes,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
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