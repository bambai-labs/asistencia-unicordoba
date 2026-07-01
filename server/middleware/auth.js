const jwt = require('jsonwebtoken');
const { Usuario } = require('../models/index');
const verificarToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Acceso denegado. No se proporcionó token.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findOne({ 
      where: { id: decoded.id, activo: true },
      attributes: { exclude: ['contrasena'] }
    });
    
    if (!usuario) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token inválido o usuario inactivo.' 
      });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Token inválido.' 
    });
  }
};

const esAdmin = (req, res, next) => {
  if (req.usuario.rol !== 'administrador') {
    return res.status(403).json({ 
      success: false, 
      message: 'Acceso denegado. Se requieren permisos de administrador.' 
    });
  }
  next();
};

const esCoordinadorOSuperior = (req, res, next) => {
  if (!['administrador', 'coordinador'].includes(req.usuario.rol)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Acceso denegado. Se requieren permisos de coordinador o administrador.' 
    });
  }
  next();
};

const puedeGestionarArea = (area) => {
  return (req, res, next) => {
    if (req.usuario.rol === 'administrador') return next();
    if (req.usuario.rol === 'coordinador' && req.usuario.area_id === area) return next();
    return res.status(403).json({ 
      success: false, 
      message: 'Acceso denegado. No tienes permisos para gestionar esta área.' 
    });
  };
};

module.exports = { verificarToken, esAdmin, esCoordinadorOSuperior, puedeGestionarArea };