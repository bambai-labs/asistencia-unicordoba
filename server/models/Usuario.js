const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const Usuario = sequelize.define('Usuario', {
  nombre:     { type: DataTypes.STRING, allowNull: false },
  apellidos:  { type: DataTypes.STRING, allowNull: false },
  cedula:     { type: DataTypes.STRING, allowNull: false, unique: true },
  cargo:      { type: DataTypes.STRING, allowNull: false },
  usuario:    { type: DataTypes.STRING, allowNull: false, unique: true },
  contrasena: { type: DataTypes.STRING, allowNull: false },
  rol:        { type: DataTypes.ENUM('administrador','coordinador','profesional'), defaultValue: 'profesional' },
  activo:     { type: DataTypes.BOOLEAN, defaultValue: true },

}, { tableName: 'usuarios', underscored: true });

// Relaciones — se definen en models/index.js

Usuario.prototype.compararContrasena = async function(ingresada) {
  return bcrypt.compare(ingresada, this.contrasena);
};

Usuario.addHook('beforeSave', async (usuario) => {
  if (usuario.changed('contrasena')) {
    usuario.contrasena = await bcrypt.hash(usuario.contrasena, 10);
  }
});

module.exports = Usuario;