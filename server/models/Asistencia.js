const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Asistencia = sequelize.define('Asistencia', {
  codigo_carnet_escaneado: { type: DataTypes.STRING, allowNull: false },
  tipo_registro: {
    type: DataTypes.ENUM('manual_qr', 'manual_documento'),
    defaultValue: 'manual_qr'
  },
  fecha_registro: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },

}, {
  tableName: 'asistencias',
  underscored: true,
  indexes: [
    { unique: true, fields: ['evento_id', 'estudiante_id'] },
    { fields: ['evento_id', 'fecha_registro'] }
  ]
});

module.exports = Asistencia;