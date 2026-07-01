const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Area = sequelize.define('Area', {
  nombre:      { type: DataTypes.STRING, allowNull: false, unique: true },
  descripcion: { type: DataTypes.TEXT },
  codigo:      { type: DataTypes.STRING, allowNull: false, unique: true },
  color:       { type: DataTypes.STRING, defaultValue: '#4CAF50' },
  activo:      { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'areas', underscored: true });

module.exports = Area;