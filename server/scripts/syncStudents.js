require('dotenv').config();
const https = require('https');
const http  = require('http');
const { connectDB, sequelize } = require('../config/database');
const { Estudiante } = require('../models/index');

const API_BASE_URL = process.env.API_UNIVERSIDAD_URL || 'http://localhost:3000/api/mock';
const TIMEOUT_MS = 10000;

// HTTP GET con soporte para Timeout
function fetchConTimeout(url) {
  return new Promise((resolve, reject) => {
    const cliente = url.startsWith('https') ? https : http;
    const req = cliente.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Respuesta inválida de la API'));
        }
      });
    });
    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy();
      reject(new Error(`Timeout: la API no respondió en ${TIMEOUT_MS/1000}s`));
    });
    req.on('error', reject);
  });
}

async function syncStudents() {
  try {
    await connectDB();
    console.log('✅ Conectado a PostgreSQL');

    // Solicitar el periodo por consola
    const readline = require('readline');
    const rl = readline.createInterface({
      input:  process.stdin,
      output: process.stdout
    });

    const periodo = await new Promise((resolve) => {
      rl.question('Ingresa el periodo académico (ej: 2026-I, 2026-II): ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });

    if (!periodo) {
      console.error('❌ El periodo es requerido');
      process.exit(1);
    }

    console.log(`📅 Sincronizando para el periodo: ${periodo}`);
    console.log(`🌐 Consultando API: ${API_BASE_URL}/padron/${periodo}\n`);

    let respuesta;
    try {
      respuesta = await fetchConTimeout(`${API_BASE_URL}/padron/${periodo}`);
    } catch (error) {
      console.error('❌ Error al consultar la API universitaria:', error.message);
      await sequelize.close();
      process.exit(1);
    }

    if (!respuesta.success || !respuesta.estudiantes) {
      console.error('❌ La API no devolvió datos válidos');
      await sequelize.close();
      process.exit(1);
    }

    const estudiantes = respuesta.estudiantes;
    console.log(`📊 Estudiantes recibidos de la API: ${estudiantes.length}\n`);

    if (estudiantes.length === 0) {
      console.log('⚠️  No hay estudiantes para sincronizar en este periodo');
      await sequelize.close();
      process.exit(0);
    }

    console.log('🔄 Sincronizando con PostgreSQL...\n');

    // Mapear y normalizar la estructura de datos
    const estudiantesData = estudiantes.map(est => ({
      nombre:              est.nombre,
      tipo_identificacion: est.tipo_identificacion,
      identificacion:      est.identificacion,
      codigo_carnet:       est.codigo_carnet?.toUpperCase(),
      email:               est.email?.toLowerCase(),
      tipo_vinculacion:    est.tipo_vinculacion    || '',
      facultad:            est.facultad            || '',
      programa:            est.programa            || '',
      sem:                 est.sem                 || '',
      circunscripcion:     est.circunscripcion     || '',
      periodo,
      activo: true
    }));

    // Inserción masiva: Crea nuevos o actualiza si ya existen (Upsert)
    const resultado = await Estudiante.bulkCreate(estudiantesData, {
      updateOnDuplicate: [
        'nombre', 'email', 'tipo_vinculacion',
        'facultad', 'programa', 'sem', 
        'circunscripcion', 'activo'
      ]
    });

    console.log('✅ Sincronización completada:');
    console.log(`   Procesados (Totales): ${resultado.length}`);

    const totalEnDB = await Estudiante.count();
    console.log(`\n📈 Total de estudiantes en la base de datos: ${totalEnDB}`);

    await sequelize.close();
    console.log('\n✅ Proceso finalizado. Conexión cerrada.');

  } catch (error) {
    console.error('❌ Error durante la sincronización:', error);
    await sequelize.close();
    process.exit(1);
  }
}

syncStudents();