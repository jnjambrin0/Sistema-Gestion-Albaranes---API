const User = require('../models/User');
const Company = require('../models/Company');
const Client = require('../models/Client');
const Project = require('../models/Project');
const { generateToken } = require('../config/jwt');
const crypto = require('crypto');
const { sendValidationEmail, sendPasswordResetEmail, sendInvitationEmail } = require('../utils/emailSender');

// POST /api/user/register - Registramos un nuevo usuario
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Verificamos si el usuario ya existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'El usuario ya está registrado' });
    }

    // Generamos un token de validación
    const validationToken = crypto.randomBytes(20).toString('hex');
    console.log(`[*] Token de validación para ${email}: ${validationToken}`);

    // Creamos el usuario
    const user = await User.create({
      name,
      email,
      password,
      validationToken
    });

    await sendValidationEmail(user.email, validationToken);

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailValidado: user.emailValidado,
        message: 'Usuario creado correctamente. Por favor, valide su email.'
      });
    } else {
      res.status(400).json({ message: 'Datos de usuario inválidos' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar usuario', error: error.message });
  }
};

// PUT /api/user/validation - Validamos el email del usuario
exports.validateEmail = async (req, res) => {
  try {
    const { token } = req.body;
    
    const user = await User.findOne({ validationToken: token });
    
    if (!user) {
      return res.status(400).json({ message: 'Token de validación inválido' });
    }
    
    user.emailValidado = true;
    user.validationToken = undefined;
    await user.save();
    
    res.status(200).json({ message: 'Email validado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al validar email', error: error.message });
  }
};

// POST /api/user/login - Iniciamos sesión
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Buscamos el usuario por email e incluimos la contraseña
    const user = await User.findOne({ email, isDeleted: false }).select('+password');
    
    if (!user) {
      return res.status(401).json({ message: 'Email o contraseña incorrectos' });
    }
    
    if (!user.emailValidado) {
      return res.status(401).json({ message: 'Debe validar su email antes de iniciar sesión' });
    }
    
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email o contraseña incorrectos' });
    }
    
    // Generamos un token JWT
    const token = generateToken(user._id);
    
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al iniciar sesión', error: error.message });
  }
};

// GET /api/user - Obtenemos el perfil del usuario
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('company');
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      emailValidado: user.emailValidado
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener perfil', error: error.message });
  }
};

// PATCH /api/user - Actualizamos el perfil del usuario
exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Actualizamos los campos
    if (name) user.name = name;
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: 'El email ya está en uso' });
      }
      
      // Generamos un nuevo token de validación
      user.emailValidado = false;
      user.validationToken = crypto.randomBytes(20).toString('hex');
      user.email = email;
      
      await sendValidationEmail(user.email, user.validationToken);
    }
    
    await user.save();
    
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailValidado: user.emailValidado,
      company: user.company
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar perfil', error: error.message });
  }
};

// PATCH /api/user/company - Actualizamos la empresa asociada
exports.updateCompany = async (req, res) => {
  try {
    const { companyId } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Verificamos que la empresa existe y el usuario pertenece a ella
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }
    
    const isMember = company.admin.equals(user._id) || 
                     company.miembros.some(member => member.equals(user._id));
    
    if (!isMember) {
      return res.status(403).json({ message: 'No tiene permisos para esta empresa' });
    }
    
    user.company = companyId;
    await user.save();
    
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      company: user.company
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar empresa', error: error.message });
  }
};

// POST /api/user/company - Creamos una nueva empresa
exports.createCompany = async (req, res) => {
  try {
    const { name, CIF, direccion, telefono, email } = req.body;
    
    // Verificamos si ya existe una empresa con el mismo NIF/CIF
    const companyExists = await Company.findOne({ CIF });
    if (companyExists) {
      return res.status(400).json({ message: 'Ya existe una empresa con ese NIF/CIF' });
    }
    
    // Creamos la empresa
    const company = await Company.create({
      name,
      CIF,
      direccion,
      telefono,
      email,
      admin: req.user.id,
      miembros: [req.user.id]
    });
    
    const user = await User.findById(req.user.id);
    user.company = company._id;
    await user.save();
    
    res.status(201).json({
      _id: company._id,
      name: company.name,
      CIF: company.CIF,
      admin: company.admin,
      message: 'Empresa creada correctamente'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear empresa', error: error.message });
  }
};

// POST /api/user/forgot-password - Solicitamos el restablecimiento de contraseña
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No hay ningún usuario con ese email' });
    }
    
    // Generamos un token y establecemos la expiración
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
      
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutos
    
    await user.save();
    
    await sendPasswordResetEmail(user.email, resetToken);
    
    res.status(200).json({ message: 'Email enviado con instrucciones para restablecer contraseña' });
  } catch (error) {
    res.status(500).json({ message: 'Error al procesar la solicitud', error: error.message });
  }
};

// PUT /api/user/reset-password - Restablecemos la contraseña
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    
    // Hash el token recibido
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
      
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Token inválido o expirado' });
    }
    
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    
    res.status(200).json({ message: 'Contraseña restablecida correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al restablecer contraseña', error: error.message });
  }
};

// DELETE /api/user - Desactivamos el usuario
exports.softDeleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    user.isDeleted = true;
    await user.save();
    
    res.status(200).json({ message: 'Usuario desactivado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al desactivar usuario', error: error.message });
  }
};

// DELETE /api/user/permanent - Eliminamos permanentemente el usuario
exports.hardDeleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    await User.deleteOne({ _id: req.user.id });
    
    res.status(200).json({ message: 'Usuario eliminado permanentemente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar usuario', error: error.message });
  }
};

// POST /api/user/invite - Invitamos a un usuario a la empresa
exports.inviteUser = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    if (!user.company) {
      return res.status(400).json({ message: 'El usuario no pertenece a ninguna empresa' });
    }
    
    const company = await Company.findById(user.company);
    if (!company) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }
    
    if (!company.admin.equals(user._id)) {
      return res.status(403).json({ message: 'No tiene permisos para invitar usuarios' });
    }
    
    const token = crypto.randomBytes(20).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 días
    
    company.pendingInvitations.push({
      email,
      token,
      expiresAt
    });
    
    await company.save();
    
    await sendInvitationEmail(email, token, company.name);
    
    res.status(200).json({ message: 'Invitación enviada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al enviar invitación', error: error.message });
  }
};

// POST /api/user/accept-invitation - Aceptamos una invitación a la empresa
exports.acceptInvitation = async (req, res) => {
  try {
    const { token, userId } = req.body;
    
    const company = await Company.findOne({
      'pendingInvitations.token': token,
      'pendingInvitations.expiresAt': { $gt: Date.now() }
    });
    
    if (!company) {
      return res.status(400).json({ message: 'Invitación inválida o expirada' });
    }
    
    const invitation = company.pendingInvitations.find(inv => inv.token === token);
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    if (user.email !== invitation.email) {
      return res.status(400).json({ message: 'Esta invitación no está dirigida a su cuenta' });
    }
    
    // Añadimos usuario a la empresa
    if (!company.miembros.includes(user._id)) {
      company.miembros.push(user._id);
    }
    
    company.pendingInvitations = company.pendingInvitations.filter(
      inv => inv.token !== token
    );
    
    await company.save();
    
    // Actualizamos el usuario con la empresa
    user.company = company._id;
    await user.save();
    
    res.status(200).json({
      message: 'Invitación aceptada correctamente',
      company: {
        _id: company._id,
        name: company.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al aceptar invitación', error: error.message });
  }
};