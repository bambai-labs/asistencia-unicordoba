const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models/index');
const { verificarToken } = require('../middleware/auth');

// Login
router.post('/login', async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;

    if (!usuario || !contrasena) {
      return res.status(400).json({ 
        success: false, 
        message: 'Usuario y contraseña son requeridos' 
      });
    }

    const user = await Usuario.findOne({ 
      where: { usuario, activo: true } 
    });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales inválidas' 
      });
    }

    const esValido = await user.compararContrasena(contrasena);
    
    if (!esValido) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales inválidas' 
      });
    }

    const token = jwt.sign(
      { id: user.id, rol: user.rol }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      usuario: {
        id: user.id,
        usuario: user.usuario,
        rol: user.rol
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor', 
      error: error.message 
    });
  }
});

// Obtener usuario actual
router.get('/me', verificarToken, async (req, res) => {
  res.json({
    success: true,
    usuario: {
      id: req.usuario.id,
      usuario: req.usuario.usuario,
      rol: req.usuario.rol
    }
  });
});

module.exports = router;