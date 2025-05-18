const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { validateRequest } = require('../middlewares/validationMiddleware');
const { protect } = require('../middlewares/authMiddleware');
const {
  registerUser,
  validateEmail,
  loginUser,
  getUserProfile,
  updateProfile,
  updateCompany,
  createCompany,
  forgotPassword,
  resetPassword,
  softDeleteUser,
  hardDeleteUser,
  inviteUser,
  acceptInvitation
} = require('../controllers/userController');

// --- Swagger Schemas ---

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID único del usuario
 *           example: "64a9eefaeb7c1e001a7e8e20"
 *         name:
 *           type: string
 *           description: Nombre del usuario
 *           example: "Juan Pérez"
 *         email:
 *           type: string
 *           format: email
 *           description: Correo electrónico del usuario (único)
 *           example: "juan.perez@example.com"
 *         role:
 *           type: string
 *           enum: [admin, user]
 *           description: Rol del usuario
 *           example: "user"
 *         company:
 *           type: string
 *           description: ID de la empresa a la que pertenece el usuario (si aplica)
 *           example: "64a9f0f8eb7c1e001a7e8e22"
 *         emailValidado:
 *           type: boolean
 *           description: Indica si el email del usuario ha sido validado
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación del usuario
 *     UserInputRegister:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           description: Nombre del usuario
 *           example: "Maria García"
 *         email:
 *           type: string
 *           format: email
 *           description: Correo electrónico para el registro
 *           example: "maria.garcia@example.com"
 *         password:
 *           type: string
 *           format: password
 *           description: Contraseña (mínimo 6 caracteres)
 *           example: "password123"
 *     UserLogin:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Correo electrónico del usuario
 *           example: "juan.perez@example.com"
 *         password:
 *           type: string
 *           format: password
 *           description: Contraseña del usuario
 *           example: "password123"
 *     UserLoginResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *         company:
 *           type: string
 *         token:
 *           type: string
 *           description: Token JWT para autenticación
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     UserUpdateProfile:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Nuevo nombre del usuario (opcional)
 *           example: "Juan Alberto Pérez"
 *         email:
 *           type: string
 *           format: email
 *           description: Nuevo email del usuario (opcional, requiere re-validación)
 *           example: "juan.a.perez@example.com"
 *     Company:
 *       type: object
 *       required:
 *         - name
 *         - CIF
 *       properties:
 *         _id:
 *           type: string
 *           description: ID único de la empresa
 *           example: "64a9f0f8eb7c1e001a7e8e22"
 *         name:
 *           type: string
 *           description: Nombre de la empresa
 *           example: "Consultores SL"
 *         CIF:
 *           type: string
 *           description: NIF/CIF de la empresa (único)
 *           example: "B12345678"
 *         direccion:
 *           type: object
 *           properties:
 *             calle:
 *               type: string
 *             ciudad:
 *               type: string
 *             CP:
 *               type: string
 *             pais:
 *               type: string
 *           example:
 *             calle: "Calle Falsa 123"
 *             ciudad: "Springfield"
 *             CP: "28000"
 *             pais: "España"
 *         telefono:
 *           type: string
 *           example: "910000000"
 *         email:
 *           type: string
 *           format: email
 *           example: "info@consultores.com"
 *         admin:
 *           type: string
 *           description: ID del usuario administrador de la empresa
 *         miembros:
 *           type: array
 *           items:
 *             type: string
 *           description: IDs de los usuarios miembros de la empresa
 *         createdAt:
 *           type: string
 *           format: date-time
 *     CompanyInput:
 *       type: object
 *       required:
 *         - name
 *         - CIF
 *       properties:
 *         name:
 *           type: string
 *           description: Nombre de la empresa
 *           example: "Tecno Soluciones SL"
 *         CIF:
 *           type: string
 *           description: NIF/CIF de la empresa
 *           example: "B98765432"
 *         direccion:
 *           $ref: '#/components/schemas/Company/properties/direccion'
 *         telefono:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *     TokenInput:
 *       type: object
 *       required:
 *         - token
 *       properties:
 *         token:
 *           type: string
 *           description: Token recibido (validación, reseteo, invitación)
 *           example: "a1b2c3d4e5f6..."
 *     PasswordResetInput:
 *       type: object
 *       required:
 *         - token
 *         - password
 *       properties:
 *         token:
 *           type: string
 *           description: Token de reseteo de contraseña
 *         password:
 *           type: string
 *           format: password
 *           description: Nueva contraseña (mínimo 6 caracteres)
 *     EmailInput:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Correo electrónico
 *           example: "usuario@example.com"
 *     CompanyIdInput:
 *       type: object
 *       required:
 *         - companyId
 *       properties:
 *         companyId:
 *           type: string
 *           description: ID de la empresa
 *           example: "64a9f0f8eb7c1e001a7e8e22"
 *     AcceptInvitationInput:
 *       type: object
 *       required:
 *         - token
 *         - userId
 *       properties:
 *         token:
 *           type: string
 *           description: Token de invitación recibido por email
 *         userId:
 *           type: string
 *           description: ID del usuario que acepta la invitación (debe coincidir con el usuario logueado)
 *           example: "64a9eefaeb7c1e001a7e8e20"
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */


// --- Rutas ---

/**
 * @swagger
 * /api/user/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInputRegister'
 *     responses:
 *       '201':
 *         description: Usuario creado, pendiente de validación de email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                 emailValidado:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       '400':
 *         description: Datos inválidos o el email ya existe
 *       '500':
 *         description: Error del servidor
 */
router.post('/register', [
  check('name', 'El nombre es obligatorio').not().isEmpty(),
  check('email', 'Introduzca un email válido').isEmail(),
  check('password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 })
], validateRequest, registerUser);

/**
 * @swagger
 * /api/user/validation:
 *   put:
 *     summary: Validar el email de un usuario usando un token
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TokenInput'
 *     responses:
 *       '200':
 *         description: Email validado correctamente
 *       '400':
 *         description: Token inválido
 *       '500':
 *         description: Error del servidor
 */
router.put('/validation', [
  check('token', 'El token es obligatorio').not().isEmpty()
], validateRequest, validateEmail);

/**
 * @swagger
 * /api/user/login:
 *   post:
 *     summary: Iniciar sesión de usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       '200':
 *         description: Inicio de sesión exitoso, devuelve datos del usuario y token JWT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserLoginResponse'
 *       '401':
 *         description: Credenciales incorrectas o email no validado
 *       '500':
 *         description: Error del servidor
 */
router.post('/login', [
  check('email', 'Introduzca un email válido').isEmail(),
  check('password', 'La contraseña es obligatoria').exists()
], validateRequest, loginUser);

/**
 * @swagger
 * /api/user/forgot-password:
 *   post:
 *     summary: Solicitar restablecimiento de contraseña
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailInput'
 *     responses:
 *       '200':
 *         description: Si el email existe, se enviará un correo con instrucciones
 *       '400':
 *         description: Email inválido
 *       '500':
 *         description: Error del servidor
 */
router.post('/forgot-password', [
  check('email', 'Introduzca un email válido').isEmail()
], validateRequest, forgotPassword);

/**
 * @swagger
 * /api/user/reset-password:
 *   put:
 *     summary: Restablecer la contraseña usando un token
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordResetInput'
 *     responses:
 *       '200':
 *         description: Contraseña actualizada correctamente
 *       '400':
 *         description: Token inválido o expirado, o contraseña inválida
 *       '500':
 *         description: Error del servidor
 */
router.put('/reset-password', [
  check('token', 'El token es obligatorio').not().isEmpty(),
  check('password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 })
], validateRequest, resetPassword);

/**
 * @swagger
 * /api/user/accept-invitation:
 *   post:
 *     summary: Aceptar una invitación para unirse a una empresa
 *     tags: [Usuarios, Empresas]
 *     security:
 *       - bearerAuth: [] # Requiere estar logueado para aceptar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AcceptInvitationInput'
 *     responses:
 *       '200':
 *         description: Invitación aceptada, usuario añadido a la empresa
 *       '400':
 *         description: Token inválido o datos incorrectos
 *       '401':
 *         description: No autorizado (usuario no logueado)
 *       '404':
 *         description: Usuario o empresa no encontrada
 *       '500':
 *         description: Error del servidor
 */
router.post('/accept-invitation', protect, [
  check('token', 'El token es obligatorio').not().isEmpty(),
  check('userId', 'El ID de usuario es obligatorio').isMongoId()
], validateRequest, acceptInvitation);


/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Obtener el perfil del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Datos del perfil del usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       '401':
 *         description: No autorizado (token inválido o ausente)
 *       '404':
 *         description: Usuario no encontrado
 *       '500':
 *         description: Error del servidor
 */
router.get('/profile', protect, getUserProfile);

/**
 * @swagger
 * /api/user/profile:
 *   patch:
 *     summary: Actualizar el perfil del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdateProfile'
 *     responses:
 *       '200':
 *         description: Perfil actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       '400':
 *         description: Datos inválidos o email ya en uso
 *       '401':
 *         description: No autorizado
 *       '404':
 *         description: Usuario no encontrado
 *       '500':
 *         description: Error del servidor
 */
router.patch('/profile', protect, [
  check('name', 'El nombre no puede estar vacío').optional().not().isEmpty(),
  check('email', 'Introduzca un email válido').optional().isEmail()
], validateRequest, updateProfile);

/**
 * @swagger
 * /api/user/company:
 *   patch:
 *     summary: Actualizar la empresa activa asociada al usuario
 *     tags: [Usuarios, Empresas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompanyIdInput'
 *     responses:
 *       '200':
 *         description: Empresa activa actualizada para el usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  _id:
 *                    type: string
 *                  name:
 *                    type: string
 *                  email:
 *                    type: string
 *                  company:
 *                    type: string
 *       '400':
 *         description: ID de empresa inválido
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: El usuario no pertenece a la empresa especificada
 *       '404':
 *         description: Usuario o empresa no encontrada
 *       '500':
 *         description: Error del servidor
 */
router.patch('/company', protect, [
  check('companyId', 'ID de empresa no válido').isMongoId()
], validateRequest, updateCompany);

/**
 * @swagger
 * /api/user/company:
 *   post:
 *     summary: Crear una nueva empresa
 *     tags: [Empresas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompanyInput'
 *     responses:
 *       '201':
 *         description: Empresa creada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Company'
 *       '400':
 *         description: Datos inválidos o NIF/CIF ya existente
 *       '401':
 *         description: No autorizado
 *       '500':
 *         description: Error del servidor
 */
router.post('/company', protect, [
  check('name', 'El nombre de la empresa es obligatorio').not().isEmpty(),
  check('CIF', 'El NIF/CIF es obligatorio').not().isEmpty()
], validateRequest, createCompany);

/**
 * @swagger
 * /api/user/invite:
 *   post:
 *     summary: Invitar a un usuario a unirse a la empresa del administrador
 *     tags: [Empresas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailInput'
 *     responses:
 *       '200':
 *         description: Invitación enviada correctamente (si el email es válido)
 *       '400':
 *         description: Email inválido o el usuario ya es miembro/invitado
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Solo el administrador de la empresa puede invitar
 *       '404':
 *         description: Empresa del administrador no encontrada
 *       '500':
 *         description: Error del servidor
 */
router.post('/invite', protect, [
  check('email', 'Introduzca un email válido').isEmail()
], validateRequest, inviteUser);

/**
 * @swagger
 * /api/user:
 *   delete:
 *     summary: Eliminar lógicamente (soft delete) la cuenta del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Usuario marcado como eliminado
 *       '401':
 *         description: No autorizado
 *       '404':
 *         description: Usuario no encontrado
 *       '500':
 *         description: Error del servidor
 */
router.delete('/', protect, softDeleteUser);

/**
 * @swagger
 * /api/user/permanent:
 *   delete:
 *     summary: Eliminar permanentemente (hard delete) la cuenta del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Usuario eliminado permanentemente
 *       '401':
 *         description: No autorizado
 *       '404':
 *         description: Usuario no encontrado
 *       '500':
 *         description: Error del servidor
 *     deprecated: true # Marcar como deprecated si se prefiere el soft delete
 */
router.delete('/permanent', protect, hardDeleteUser);


module.exports = router;