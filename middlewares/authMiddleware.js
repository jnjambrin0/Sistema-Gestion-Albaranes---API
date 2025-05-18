const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware para proteger rutas que necesitan autenticación
const protect = async (req, res, next) => {
  try {
    let token;
    
    // Verificamos si existe token en headers
    if (req.headers.authorization && 
        req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({
        message: 'No está autorizado para acceder a este recurso'
      });
    }
    
    try {
      // Verificamos token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({
          message: 'No está autorizado para acceder a este recurso'
        });
      }
      
      if (user.isDeleted) {
        return res.status(401).json({
          message: 'Esta cuenta ha sido desactivada'
        });
      }
      
      if (!user.emailValidado) {
        return res.status(401).json({
          message: 'Debe validar su email para acceder a este recurso'
        });
      }
      
      // Añadimos usuario a la solicitud
      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({
        message: 'Token no válido o expirado'
      });
    }
  } catch (error) {
    res.status(500).json({
      message: 'Error en la autenticación'
    });
  }
};

// Middleware para verificar roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'No tiene permiso para realizar esta acción'
      });
    }
    next();
  };
};

module.exports = { protect, authorize };