const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const { verificarToken, esAdmin, esCoordinadorOSuperior } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Crear usuario
router.post('/', esCoordinadorOSuperior, async (req, res) => {
  try {
    const { nombre, apellidos, cedula, cargo, area, usuario, contrasena, rol } = req.body;

    // Validar campos requeridos
    if (!nombre || !apellidos || !cedula || !cargo || !area || !usuario || !contrasena) {
      return res.status(400).json({ 
        success: false, 
        message: 'Todos los campos son requeridos' 
      });
    }

    // Validar que el área exista
    const Area = require('../models/Area');
    const areaExiste = await Area.findById(area);
    if (!areaExiste || !areaExiste.activo) {
      return res.status(400).json({ 
        success: false, 
        message: 'Área no válida o inactiva' 
      });
    }

    // Verificar que el usuario no exista
    const existeUsuario = await Usuario.findOne({ usuario });
    if (existeUsuario) {
      return res.status(400).json({ 
        success: false, 
        message: 'El usuario ya existe' 
      });
    }

    // Verificar que la cédula no exista
    const existeCedula = await Usuario.findOne({ cedula });
    if (existeCedula) {
      return res.status(400).json({ 
        success: false, 
        message: 'La cédula ya está registrada' 
      });
    }

    // Lógica de permisos según rol del creador
    let rolAsignado = rol || 'profesional';
    let areaAsignada = area;

    if (req.usuario.rol === 'coordinador') {
      // Coordinador solo puede crear profesionales de su área
      if (rol && rol !== 'profesional') {
        return res.status(403).json({ 
          success: false, 
          message: 'Los coordinadores solo pueden crear usuarios con rol de profesional' 
        });
      }
      
      if (area.toString() !== req.usuario.area.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: 'Solo puedes crear usuarios en tu área' 
        });
      }
      
      rolAsignado = 'profesional';
      areaAsignada = req.usuario.area;
    }

    const nuevoUsuario = new Usuario({
      nombre,
      apellidos,
      cedula,
      cargo,
      area: areaAsignada,
      usuario,
      contrasena,
      rol: rolAsignado,
      creado_por: req.usuario._id
    });

    await nuevoUsuario.save();

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      usuario: {
        id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        apellidos: nuevoUsuario.apellidos,
        cedula: nuevoUsuario.cedula,
        cargo: nuevoUsuario.cargo,
        area: nuevoUsuario.area,
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
    let filtro = {};
    
    // Filtrar según rol del usuario
    if (req.usuario.rol === 'coordinador') {
      // Coordinador solo ve usuarios de su área (comparar ObjectIds)
      filtro = {
        $or: [
          { area: req.usuario.area, rol: 'profesional' },
          { _id: req.usuario._id } // También puede verse a sí mismo
        ]
      };
    }
    // Administradores ven todos los usuarios
    
    const usuarios = await Usuario.find(filtro)
      .select('-contrasena')
      .populate('creado_por', 'nombre apellidos usuario')
      .populate('area', 'nombre codigo color')
      .sort({ createdAt: -1 });
    
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
    
    // Obtener el usuario a actualizar
    const usuarioAActualizar = await Usuario.findById(req.params.id);
    
    if (!usuarioAActualizar) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    // Verificar permisos
    if (req.usuario.rol === 'coordinador') {
      // Coordinador solo puede actualizar profesionales de su área (comparar ObjectIds)
      if (usuarioAActualizar.area.toString() !== req.usuario.area.toString() || usuarioAActualizar.rol !== 'profesional') {
        return res.status(403).json({ 
          success: false, 
          message: 'No tienes permisos para actualizar este usuario' 
        });
      }
      
      // Coordinador no puede cambiar el rol
      if (rol && rol !== 'profesional') {
        return res.status(403).json({ 
          success: false, 
          message: 'No puedes cambiar el rol del usuario' 
        });
      }
    }

    if (nombre) usuarioAActualizar.nombre = nombre;
    if (apellidos) usuarioAActualizar.apellidos = apellidos;
    if (cedula) usuarioAActualizar.cedula = cedula;
    if (cargo) usuarioAActualizar.cargo = cargo;
    if (area && req.usuario.rol === 'administrador') usuarioAActualizar.area = area;
    if (usuario) usuarioAActualizar.usuario = usuario;
    if (contrasena) usuarioAActualizar.contrasena = contrasena;
    if (rol && req.usuario.rol === 'administrador') usuarioAActualizar.rol = rol;
    if (typeof activo !== 'undefined') usuarioAActualizar.activo = activo;

    await usuarioAActualizar.save();

    const usuarioActualizado = usuarioAActualizar.toObject();
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
    const usuario = await Usuario.findByIdAndDelete(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

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
