const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { validateRequest } = require('../middlewares/validationMiddleware');
const { protect } = require('../middlewares/authMiddleware');
const {
  createClient,
  getClients,
  getClientById,
  updateClient,
  archiveClient,
  unarchiveClient,
  softDeleteClient,
  hardDeleteClient
} = require('../controllers/clientController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Client:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID único del cliente
 *           example: "64aa1234eb7c1e001a7e8f01"
 *         name:
 *           type: string
 *           description: Nombre del cliente
 *           example: "Empresa Ejemplo S.A."
 *         CIF:
 *           type: string
 *           description: NIF/CIF del cliente
 *           example: "A12345678"
 *         PersonaContacto:
 *           type: string
 *           description: Nombre de la persona de contacto
 *           example: "Ana López"
 *         email:
 *           type: string
 *           format: email
 *           description: Correo electrónico de contacto
 *           example: "contacto@empresa-ejemplo.com"
 *         telefono:
 *           type: string
 *           description: Teléfono de contacto
 *           example: "911234567"
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
 *             calle: "Paseo de la Castellana 100"
 *             ciudad: "Madrid"
 *             CP: "28046"
 *             pais: "España"
 *         propietario:
 *           type: string
 *           description: ID del usuario o empresa propietaria
 *         propietarioModel:
 *           type: string
 *           enum: [User, Company]
 *           description: Modelo del propietario (User o Company)
 *         isArchived:
 *           type: boolean
 *           description: Indica si el cliente está archivado
 *           example: false
 *         isDeleted:
 *           type: boolean
 *           description: Indica si el cliente está eliminado lógicamente
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *     ClientInput:
 *       type: object
 *       required:
 *         - name
 *         - CIF
 *       properties:
 *         name:
 *           type: string
 *           description: Nombre del cliente
 *           example: "Nuevo Cliente S.L."
 *         CIF:
 *           type: string
 *           description: NIF/CIF del cliente
 *           example: "B87654321"
 *         PersonaContacto:
 *           type: string
 *           description: Persona de contacto (opcional)
 *         email:
 *           type: string
 *           format: email
 *           description: Email de contacto (opcional)
 *         telefono:
 *           type: string
 *           description: Teléfono de contacto (opcional)
 *         direccion:
 *           $ref: '#/components/schemas/Client/properties/direccion' # Reutilizar la parte del esquema de dirección
 */

// Aplicamos el middleware de autenticación a todas las rutas de clientes
router.use(protect);

/**
 * @swagger
 * /api/client:
 *   get:
 *     summary: Obtener la lista de clientes del usuario o su empresa
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Término de búsqueda para filtrar por nombre, CIF, contacto o email
 *       - in: query
 *         name: includeArchived
 *         schema:
 *           type: boolean
 *         description: 'Incluir clientes archivados en los resultados (default: false)'
 *     responses:
 *       '200':
 *         description: Lista de clientes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Client'
 *       '401':
 *         description: No autorizado
 *       '500':
 *         description: Error del servidor
 */
router.get('/', getClients);

/**
 * @swagger
 * /api/client/{id}:
 *   get:
 *     summary: Obtener detalles de un cliente específico
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cliente a obtener
 *     responses:
 *       '200':
 *         description: Detalles del cliente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Client'
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Permisos insuficientes (el cliente no pertenece al usuario/empresa)
 *       '404':
 *         description: Cliente no encontrado
 *       '500':
 *         description: Error del servidor
 */
router.get('/:id', getClientById);

/**
 * @swagger
 * /api/client:
 *   post:
 *     summary: Crear un nuevo cliente
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientInput'
 *     responses:
 *       '201':
 *         description: Cliente creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Client' # Normalmente devuelve el objeto creado
 *       '400':
 *         description: Datos inválidos o cliente ya existente con ese CIF para el propietario
 *       '401':
 *         description: No autorizado
 *       '500':
 *         description: Error del servidor
 */
router.post(
  '/',
  [
    check('name', 'El nombre es obligatorio').not().isEmpty(),
    check('CIF', 'El NIF/CIF es obligatorio').not().isEmpty(),
    check('email', 'Introduzca un email válido').optional().isEmail()
  ],
  validateRequest,
  createClient
);

/**
 * @swagger
 * /api/client/{id}:
 *   put:
 *     summary: Actualizar un cliente existente
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cliente a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientInput' # Se puede reutilizar el esquema de entrada, quizás añadiendo campos opcionales
 *     responses:
 *       '200':
 *         description: Cliente actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Client'
 *       '400':
 *         description: Datos inválidos o intento de editar cliente archivado
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Permisos insuficientes
 *       '404':
 *         description: Cliente no encontrado
 *       '500':
 *         description: Error del servidor
 */
router.put(
  '/:id',
  [
    // Validation for update can be slightly different (all optional)
    check('name', 'El nombre no puede estar vacío').optional().not().isEmpty(),
    check('CIF', 'El NIF/CIF no puede estar vacío').optional().not().isEmpty(),
    check('email', 'Introduzca un email válido').optional().isEmail()
  ],
  validateRequest,
  updateClient
);

/**
 * @swagger
 * /api/client/{id}/archive:
 *   patch:
 *     summary: Archivar un cliente
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cliente a archivar
 *     responses:
 *       '200':
 *         description: Cliente archivado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Client'
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Permisos insuficientes
 *       '404':
 *         description: Cliente no encontrado
 *       '500':
 *         description: Error del servidor
 */
router.patch('/:id/archive', archiveClient);

/**
 * @swagger
 * /api/client/{id}/unarchive:
 *   patch:
 *     summary: Recuperar un cliente archivado
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cliente a recuperar
 *     responses:
 *       '200':
 *         description: Cliente recuperado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Client'
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Permisos insuficientes
 *       '404':
 *         description: Cliente no encontrado
 *       '500':
 *         description: Error del servidor
 */
router.patch('/:id/unarchive', unarchiveClient);

/**
 * @swagger
 * /api/client/{id}:
 *   delete:
 *     summary: Eliminar lógicamente (soft delete) un cliente
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cliente a eliminar
 *     responses:
 *       '200':
 *         description: Cliente marcado como eliminado
 *       '400':
 *         description: No se puede eliminar cliente con proyectos activos asociados
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Permisos insuficientes
 *       '404':
 *         description: Cliente no encontrado
 *       '500':
 *         description: Error del servidor
 */
router.delete('/:id', softDeleteClient);

/**
 * @swagger
 * /api/client/{id}/permanent:
 *   delete:
 *     summary: Eliminar permanentemente (hard delete) un cliente
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cliente a eliminar permanentemente
 *     responses:
 *       '200':
 *         description: Cliente eliminado permanentemente
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Permisos insuficientes
 *       '404':
 *         description: Cliente no encontrado
 *       '500':
 *         description: Error del servidor
 *     deprecated: true # Marcar como deprecated si se prefiere el soft delete
 */
router.delete('/:id/permanent', hardDeleteClient); // Ensure hardDeleteClient controller exists

module.exports = router;