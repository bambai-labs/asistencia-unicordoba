const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Evento = sequelize.define('Evento', {
  nombre:            { type: DataTypes.STRING,   allowNull: false },
  descripcion:       { type: DataTypes.TEXT },
  fecha_hora_inicio: { type: DataTypes.DATE,     allowNull: false },
  fecha_hora_fin:    { type: DataTypes.DATE,     allowNull: false },
  fecha:             { type: DataTypes.DATEONLY, allowNull: false },
  hora_inicio:       { type: DataTypes.STRING,   allowNull: false },
  hora_fin:          { type: DataTypes.STRING,   allowNull: false },
  lugar:             { type: DataTypes.STRING,   allowNull: false },
  imagen_url:        { type: DataTypes.STRING },
  fotos_evidencia:   { type: DataTypes.JSONB,    defaultValue: [] },
  periodo:           { type: DataTypes.STRING,   allowNull: false },
  activo:            { type: DataTypes.BOOLEAN,  defaultValue: true },
  finalizado:        { type: DataTypes.BOOLEAN,  defaultValue: false }
}, {
  tableName: 'eventos',
  underscored: true,
  indexes: [
    { fields: ['area_id', 'periodo'] },
    { fields: ['creado_por_id'] },
    { fields: ['fecha_hora_fin', 'finalizado'] }
  ]
});

module.exports = Evento;