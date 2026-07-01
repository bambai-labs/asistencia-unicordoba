const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Estudiante = sequelize.define('Estudiante', {
  nombre:            { type: DataTypes.STRING, allowNull: false },
  tipo_identificacion: { type: DataTypes.STRING, allowNull: false },
  identificacion:    { type: DataTypes.STRING, allowNull: false },
  codigo_carnet:     { type: DataTypes.STRING, allowNull: false },
  email:             { type: DataTypes.STRING, allowNull: false },
  tipo_vinculacion:  { type: DataTypes.STRING, defaultValue: '' },
  facultad:          { type: DataTypes.STRING, defaultValue: '' },
  programa:          { type: DataTypes.STRING, defaultValue: '' },
  sem:               { type: DataTypes.STRING, defaultValue: '' },
  circunscripcion:   { type: DataTypes.STRING, defaultValue: '' },
  periodo:           { type: DataTypes.STRING, allowNull: false },
  activo:            { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'estudiantes',
  underscored: true,
  indexes: [
    { unique: true, fields: ['codigo_carnet', 'periodo'] },
    { unique: true, fields: ['identificacion', 'periodo'] }
  ]
});

module.exports = Estudiante;