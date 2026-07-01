require('dotenv').config();
const { connectDB } = require('../config/database');
const { sequelize } = require('../config/database');
const { Usuario, Area } = require('../models/index');

async function createAdmin() {
  try {
    await connectDB();
    console.log('✅ Conectado a PostgreSQL');

    // Verificar si ya existe un admin
    const adminExistente = await Usuario.findOne({ 
      where: { usuario: 'admin' } 
    });

    if (adminExistente) {
      console.log('⚠️  El usuario admin ya existe');
      await sequelize.close();
      process.exit(0);
    }

    // El admin necesita un area_id — buscar o crear área por defecto
    let areaPorDefecto = await Area.findOne({ 
      where: { codigo: 'ADMIN' } 
    });

    if (!areaPorDefecto) {
      areaPorDefecto = await Area.create({
        nombre:      'Administración',
        codigo:      'ADMIN',
        descripcion: 'Área administrativa por defecto',
        color:       '#1976D2',
        activo:      true
      });
      console.log('✅ Área administrativa creada');
    }

    const admin = await Usuario.create({
      nombre:    'Administrador',
      apellidos: 'Sistema',
      cedula:    '0000000000',
      cargo:     'Administrador del Sistema',
      area_id:   areaPorDefecto.id,
      usuario:   'admin',
      contrasena: 'admin123', // CAMBIAR EN PRODUCCIÓN
      rol:       'administrador',
      activo:    true
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Usuario administrador creado exitosamente');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   Usuario:   admin');
    console.log('   Contraseña: admin123');
    console.log('   Rol:       administrador');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  IMPORTANTE: Cambia esta contraseña en producción\n');

    await sequelize.close();

  } catch (error) {
    console.error('❌ Error al crear admin:', error);
    await sequelize.close();
    process.exit(1);
  }
}

createAdmin();