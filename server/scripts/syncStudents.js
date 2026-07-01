require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { connectDB, sequelize } = require('../config/database');
const { Estudiante } = require('../models/index');

const CSV_PATH = path.join(__dirname, '../../estudiantes.csv');

async function syncStudents() {
  try {
    await connectDB();
    console.log('✅ Conectado a PostgreSQL');

    if (!fs.existsSync(CSV_PATH)) {
      console.error('❌ Archivo estudiantes.csv no encontrado en:', CSV_PATH);
      process.exit(1);
    }

    const readline = require('readline');
    const rl = readline.createInterface({
      input:  process.stdin,
      output: process.stdout
    });

    const periodo = await new Promise((resolve) => {
      rl.question('Ingresa el periodo académico (ej: 2025-I, 2025-II): ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });

    if (!periodo) {
      console.error('❌ El periodo es requerido');
      process.exit(1);
    }

    console.log(`📅 Sincronizando para el periodo: ${periodo}\n`);

    const estudiantes = [];
    let lineCount  = 0;
    let errorCount = 0;

    await new Promise((resolve, reject) => {
      fs.createReadStream(CSV_PATH, { encoding: 'utf8' })
        .pipe(csv({
          separator: ';',
          skipLines: 0,
          mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim()
        }))
        .on('data', (row) => {
          lineCount++;
          try {
            if (row.nombre && row.tipo_identificacion && row.identificacion &&
                row.codigo_carnet && row.email) {
              estudiantes.push({
                nombre:              row.nombre.trim(),
                tipo_identificacion: row.tipo_identificacion.trim(),
                identificacion:      row.identificacion.trim(),
                codigo_carnet:       row.codigo_carnet.trim().toUpperCase(),
                email:               row.email.trim().toLowerCase(),
                tipo_vinculacion:    row.tipo_vinculacion  ? row.tipo_vinculacion.trim()  : '',
                facultad:            row.facultad          ? row.facultad.trim()          : '',
                programa:            row.programa          ? row.programa.trim()          : '',
                sem:                 row.sem               ? row.sem.trim()               : '',
                circunscripcion:     row.circunscripcion   ? row.circunscripcion.trim()   : '',
                periodo,
                activo: true
              });
            } else {
              console.warn(`⚠️  Línea ${lineCount}: Datos incompletos, ignorando...`);
              errorCount++;
            }
          } catch (error) {
            console.error(`❌ Error en línea ${lineCount}:`, error.message);
            errorCount++;
          }
        })
        .on('end',   resolve)
        .on('error', reject);
    });

    console.log(`\n📊 Resumen de lectura del CSV:`);
    console.log(`   Total líneas leídas: ${lineCount}`);
    console.log(`   Estudiantes válidos: ${estudiantes.length}`);
    console.log(`   Errores/Omitidos:   ${errorCount}\n`);

    if (estudiantes.length === 0) {
      console.log('⚠️  No hay estudiantes para sincronizar');
      await sequelize.close();
      process.exit(0);
    }

    console.log('🔄 Sincronizando estudiantes con PostgreSQL...\n');

    let insertados  = 0;
    let actualizados = 0;
    let errores     = 0;

    for (const estudiante of estudiantes) {
      try {
        const [, created] = await Estudiante.upsert(estudiante, {
          conflictFields: ['codigo_carnet', 'periodo']
        });
        if (created) insertados++;
        else actualizados++;
      } catch (error) {
        console.error(`❌ Error con ${estudiante.codigo_carnet}:`, error.message);
        errores++;
      }
    }

    console.log('✅ Sincronización completada:');
    console.log(`   Insertados:       ${insertados}`);
    console.log(`   Actualizados:     ${actualizados}`);
    console.log(`   Errores:          ${errores}`);
    console.log(`   Total procesados: ${estudiantes.length}`);

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