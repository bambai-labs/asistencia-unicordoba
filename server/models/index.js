const Area       = require('./Area');
const Usuario    = require('./Usuario');
const Estudiante = require('./Estudiante');
const Evento     = require('./Evento');
const Asistencia = require('./Asistencia');

// Usuario pertenece a un Area
Usuario.belongsTo(Area,    { foreignKey: 'area_id' });
Area.hasMany(Usuario,      { foreignKey: 'area_id' });

// Usuario fue creado por otro Usuario
Usuario.belongsTo(Usuario, { foreignKey: 'creado_por_id', as: 'creador' });

// Evento pertenece a Area y a Usuario (creado_por)
Evento.belongsTo(Area,     { foreignKey: 'area_id' });
Evento.belongsTo(Usuario,  { foreignKey: 'creado_por_id', as: 'creador' });
Area.hasMany(Evento,       { foreignKey: 'area_id' });

// Asistencia relaciona Evento + Estudiante + Usuario (registrado_por)
Asistencia.belongsTo(Evento,      { foreignKey: 'evento_id' });
Asistencia.belongsTo(Estudiante,  { foreignKey: 'estudiante_id' });
Asistencia.belongsTo(Usuario,     { foreignKey: 'registrado_por_id', as: 'registrador' });
Evento.hasMany(Asistencia,        { foreignKey: 'evento_id' });

module.exports = { Area, Usuario, Estudiante, Evento, Asistencia };