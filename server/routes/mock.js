const express = require('express');
const router = express.Router();

// Base de datos simulada de estudiantes
const estudiantesSimulados = [
  {
    nombre:              'JUAN CARLOS PEREZ GOMEZ',
    tipo_identificacion: 'CC',
    identificacion:      '1234567890',
    codigo_carnet:       '1234567890',
    email:               'juan.perez@unicordoba.edu.co',
    tipo_vinculacion:    'Estudiante',
    facultad:            'Ingeniería',
    programa:            'Ingeniería de Sistemas',
    sem:                 '5',
    circunscripcion:     'Montería',
    activo:              true
  },
  {
    nombre:              'MARIA PAULA RODRIGUEZ SILVA',
    tipo_identificacion: 'CC',
    identificacion:      '0987654321',
    codigo_carnet:       '0987654321',
    email:               'maria.rodriguez@unicordoba.edu.co',
    tipo_vinculacion:    'Estudiante',
    facultad:            'Ciencias de la Salud',
    programa:            'Medicina',
    sem:                 '3',
    circunscripcion:     'Montería',
    activo:              true
  },
  {
    nombre:              'CARLOS ANDRES MARTINEZ LOPEZ',
    tipo_identificacion: 'CC',
    identificacion:      '1122334455',
    codigo_carnet:       '1122334455',
    email:               'carlos.martinez@unicordoba.edu.co',
    tipo_vinculacion:    'Estudiante',
    facultad:            'Ciencias Básicas',
    programa:            'Biología',
    sem:                 '7',
    circunscripcion:     'Montería',
    activo:              true
  }
];

// Consultar estudiante por cédula
// Este endpoint simula lo que entregará la API real de la universidad
router.get('/estudiante/:cedula', (req, res) => {
  const estudiante = estudiantesSimulados.find(
    e => e.identificacion === req.params.cedula
  );

  if (!estudiante) {
    return res.status(404).json({
      success: false,
      message: 'Estudiante no encontrado en el sistema universitario',
      identificacion: req.params.cedula
    });
  }

  res.json({
    success: true,
    estudiante
  });
});

// Consultar padrón completo por periodo
// Este endpoint simula la descarga masiva de estudiantes por semestre
router.get('/padron/:periodo', (req, res) => {
  res.json({
    success:     true,
    periodo:     req.params.periodo,
    total:       estudiantesSimulados.length,
    estudiantes: estudiantesSimulados.map(e => ({
      ...e,
      periodo: req.params.periodo
    }))
  });
});

module.exports = router;