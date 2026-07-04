const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Usuario, Area } = require('../models/index');
const { verificarToken, esAdmin, esCoordinadorOSuperior } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Crear usuario
router.post('/', esCoordinadorOSuperior, async (req, res) => {
  try {
    const { nombre, apellidos, cedula, cargo, area, usuario, contrasena, rol } = req.body;

    if (!nombre || !apellidos || !cedula || !cargo || !area || !usuario || !contrasena) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    const areaExiste = await Area.findOne({
      where: { id: area, activo: true }
    });
    if (!areaExiste) {
      return res.status(400).json({
        success: false,
        message: 'Área no válida o inactiva'
      });
    }

    const existeUsuario = await Usuario.findOne({ where: { usuario } });
    if (existeUsuario) {
      return res.status(400).json({
        success: false,
        message: 'El usuario ya existe'
      });
    }

    const existeCedula = await Usuario.findOne({ where: { cedula } });
    if (existeCedula) {
      return res.status(400).json({
        success: false,
        message: 'La cédula ya está registrada'
      });
    }

    let rolAsignado = rol || 'profesional';
    let areaAsignada = area;

    if (req.usuario.rol === 'coordinador') {
      if (rol && rol !== 'profesional') {
        return res.status(403).json({
          success: false,
          message: 'Los coordinadores solo pueden crear usuarios con rol de profesional'
        });
      }
      if (parseInt(area) !== req.usuario.area_id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes crear usuarios en tu área'
        });
      }
      rolAsignado = 'profesional';
      areaAsignada = req.usuario.area_id;
    }

    const nuevoUsuario = await Usuario.create({
      nombre,
      apellidos,
      cedula,
      cargo,
      area_id: areaAsignada,
      usuario,
      contrasena,
      rol: rolAsignado,
      creado_por_id: req.usuario.id
    });

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      usuario: {
        id: nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        apellidos: nuevoUsuario.apellidos,
        cedula: nuevoUsuario.cedula,
        cargo: nuevoUsuario.cargo,
        area_id: nuevoUsuario.area_id,
        usuario: nuevoUsuario.usuario,
        rol: nuevoUsuario.rol
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear usuario',
      error: error.message
    });
  }
});

// Listar usuarios
router.get('/', async (req, res) => {
  try {
    let where = {};

    if (req.usuario.rol === 'coordinador') {
      where = {
        [Op.or]: [
          { area_id: req.usuario.area_id, rol: 'profesional' },
          { id: req.usuario.id }
        ]
      };
    }

    const usuarios = await Usuario.findAll({
      where,
      attributes: { exclude: ['contrasena'] },
      include: [
        { model: Area, as: 'Area', attributes: ['id', 'nombre', 'codigo', 'color'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      usuarios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios',
      error: error.message
    });
  }
});

// Actualizar usuario
router.put('/:id', esCoordinadorOSuperior, async (req, res) => {
  try {
    const { nombre, apellidos, cedula, cargo, area, usuario, contrasena, rol, activo } = req.body;

    const usuarioAActualizar = await Usuario.findByPk(req.params.id);

    if (!usuarioAActualizar) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (req.usuario.rol === 'coordinador') {
      if (usuarioAActualizar.area_id !== req.usuario.area_id || usuarioAActualizar.rol !== 'profesional') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para actualizar este usuario'
        });
      }
      if (rol && rol !== 'profesional') {
        return res.status(403).json({
          success: false,
          message: 'No puedes cambiar el rol del usuario'
        });
      }
    }

    const updateData = {};
    if (nombre) updateData.nombre = nombre;
    if (apellidos) updateData.apellidos = apellidos;
    if (cedula) updateData.cedula = cedula;
    if (cargo) updateData.cargo = cargo;
    if (area && req.usuario.rol === 'administrador') updateData.area_id = area;
    if (usuario) updateData.usuario = usuario;
    if (contrasena) updateData.contrasena = contrasena;
    if (rol && req.usuario.rol === 'administrador') updateData.rol = rol;
    if (typeof activo !== 'undefined') updateData.activo = activo;

    await usuarioAActualizar.update(updateData);

    const usuarioActualizado = usuarioAActualizar.toJSON();
    delete usuarioActualizado.contrasena;

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      usuario: usuarioActualizado
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario',
      error: error.message
    });
  }
});

// Eliminar usuario (solo administrador)
router.delete('/:id', esAdmin, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    await usuario.destroy();

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: error.message
    });
  }
});

module.exports = router;