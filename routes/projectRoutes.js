const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { validateRequest } = require('../middlewares/validationMiddleware');
const { protect } = require('../middlewares/authMiddleware');
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  archiveProject,
  unarchiveProject,
  softDeleteProject,
  hardDeleteProject
} = require('../controllers/projectController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID único del proyecto
 *           example: "64ab1234eb7c1e001a7e9f02"
 *         name:
 *           type: string
 *           description: Nombre del proyecto
 *           example: "Desarrollo Web Corporativa"
 *         description:
 *           type: string
 *           description: Descripción detallada del proyecto
 *           example: "Creación de la nueva página web para Cliente X"
 *         client:
 *           type: string # Podría ser también un objeto si está poblado
 *           description: ID del cliente asociado
 *           example: "64aa1234eb7c1e001a7e8f01"
 *         startDate:
 *           type: string
 *           format: date
 *           description: Fecha de inicio del proyecto
 *           example: "2023-07-01"
 *         endDate:
 *           type: string
 *           format: date
 *           description: Fecha de finalización estimada del proyecto
 *           example: "2023-12-31"
 *         status:
 *           type: string
 *           enum: [active, completed, canceled]
 *           description: Estado actual del proyecto
 *           example: "active"
 *         propietario:
 *           type: string
 *           description: ID del usuario o empresa propietaria
 *         propietarioModel:
 *           type: string
 *           enum: [User, Company]
 *           description: Modelo del propietario (User o Company)
 *         usuariosAsignados:
 *           type: array
 *           items:
 *             type: string # Podría ser también un array de objetos User si está poblado
 *           description: IDs de los usuarios asignados al proyecto
 *           example: ["64a9eefaeb7c1e001a7e8e20", "64a9f0f8eb7c1e001a7e8e21"]
 *         isArchived:
 *           type: boolean
 *           description: Indica si el proyecto está archivado
 *           example: false
 *         isDeleted:
 *           type: boolean
 *           description: Indica si el proyecto está eliminado lógicamente
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *     ProjectInput:
 *       type: object
 *       required:
 *         - name
 *         - clientId
 *       properties:
 *         name:
 *           type: string
 *           description: Nombre del proyecto
 *           example: "Campaña Marketing Digital Q4"
 *         clientId:
 *           type: string
 *           description: ID del cliente al que pertenece el proyecto
 *           example: "64aa1234eb7c1e001a7e8f01"
 *         description:
 *           type: string
 *           description: Descripción del proyecto (opcional)
 *         startDate:
 *           type: string
 *           format: date
 *           description: Fecha de inicio (opcional, ISO8601 YYYY-MM-DD)
 *           example: "2023-10-01"
 *         endDate:
 *           type: string
 *           format: date
 *           description: Fecha de fin (opcional, ISO8601 YYYY-MM-DD)
 *           example: "2023-12-31"
 *         usuariosAsignados:
 *           type: array
 *           items:
 *             type: string
 *           description: IDs de usuarios a asignar (opcional, deben pertenecer a la empresa si aplica)
 *           example: ["64a9eefaeb7c1e001a7e8e20"]
 *     ProjectUpdateInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Nuevo nombre del proyecto (opcional)
 *         clientId:
 *           type: string
 *           description: Nuevo ID de cliente (opcional)
 *         description:
 *           type: string
 *           description: Nueva descripción (opcional)
 *         startDate:
 *           type: string
 *           format: date
 *           description: Nueva fecha de inicio (opcional)
 *         endDate:
 *           type: string
 *           format: date
 *           description: Nueva fecha de fin (opcional)
 *         status:
 *           type: string
 *           enum: [active, completed, canceled]
 *           description: Nuevo estado (opcional)
 *         usuariosAsignados:
 *           type: array
 *           items:
 *             type: string
 *           description: Nueva lista de IDs de usuarios asignados (opcional, reemplaza la anterior)
 */

// Aplicamos el middleware de autenticación
router.use(protect);

/**
 * @swagger
 * /api/project:
 *   get:
 *     summary: Obtener la lista de proyectos del usuario o su empresa
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Término de búsqueda para filtrar por nombre o descripción
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *         description: Filtrar proyectos por ID de cliente
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, completed, canceled]
 *         description: Filtrar proyectos por estado
 *       - in: query
 *         name: includeArchived
 *         schema:
 *           type: boolean
 *         description: 'Incluir proyectos archivados en los resultados (default: false)'
 *     responses:
 *       '200':
 *         description: Lista de proyectos (solo aquellos a los que el usuario tiene acceso)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Project'
 *       '401':
 *         description: No autorizado
 *       '500':
 *         description: Error del servidor
 */
router.get('/', getProjects);

/**
 * @swagger
 * /api/project/{id}:
 *   get:
 *     summary: Obtener detalles de un proyecto específico
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del proyecto a obtener
 *     responses:
 *       '200':
 *         description: Detalles del proyecto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project' # Podría estar poblado con detalles de cliente/usuario
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Permisos insuficientes (el usuario no está asignado ni es propietario)
 *       '404':
 *         description: Proyecto no encontrado
 *       '500':
 *         description: Error del servidor
 */
router.get('/:id', getProjectById);

/**
 * @swagger
 * /api/project:
 *   post:
 *     summary: Crear un nuevo proyecto
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectInput'
 *     responses:
 *       '201':
 *         description: Proyecto creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       '400':
 *         description: Datos inválidos
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Permisos insuficientes sobre el cliente especificado
 *       '404':
 *         description: Cliente no encontrado
 *       '500':
 *         description: Error del servidor
 */
router.post(
  '/',
  [
    check('name', 'El nombre es obligatorio').not().isEmpty(),
    check('clientId', 'El cliente es obligatorio').isMongoId(),
    check('startDate', 'La fecha de inicio debe ser una fecha válida').optional().isISO8601().toDate(),
    check('endDate', 'La fecha de fin debe ser una fecha válida').optional().isISO8601().toDate(),
  ],
  validateRequest,
  createProject
);

/**
 * @swagger
 * /api/project/{id}:
 *   put:
 *     summary: Actualizar un proyecto existente
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del proyecto a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectUpdateInput'
 *     responses:
 *       '200':
 *         description: Proyecto actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       '400':
 *         description: Datos inválidos o intento de editar proyecto archivado
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Permisos insuficientes (no es propietario o no tiene acceso al nuevo cliente)
 *       '404':
 *         description: Proyecto o cliente no encontrado
 *       '500':
 *         description: Error del servidor
 */
router.put(
  '/:id',
  [
    check('name', 'El nombre no puede estar vacío').optional().not().isEmpty(),
    check('clientId', 'El ID de cliente debe ser válido').optional().isMongoId(),
    check('startDate', 'La fecha de inicio debe ser una fecha válida').optional().isISO8601().toDate(),
    check('endDate', 'La fecha de fin debe ser una fecha válida').optional().isISO8601().toDate(),
    check('status', 'Estado no válido').optional().isIn(['active', 'completed', 'canceled'])
  ],
  validateRequest,
  updateProject
);

/**
 * @swagger
 * /api/project/{id}/archive:
 *   patch:
 *     summary: Archivar un proyecto
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del proyecto a archivar
 *     responses:
 *       '200':
 *         description: Proyecto archivado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Permisos insuficientes (no es propietario)
 *       '404':
 *         description: Proyecto no encontrado
 *       '500':
 *         description: Error del servidor
 */
router.patch('/:id/archive', archiveProject);

/**
 * @swagger
 * /api/project/{id}/unarchive:
 *   patch:
 *     summary: Recuperar un proyecto archivado
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del proyecto a recuperar
 *     responses:
 *       '200':
 *         description: Proyecto recuperado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Permisos insuficientes (no es propietario)
 *       '404':
 *         description: Proyecto no encontrado
 *       '500':
 *         description: Error del servidor
 */
router.patch('/:id/unarchive', unarchiveProject);

/**
 * @swagger
 * /api/project/{id}:
 *   delete:
 *     summary: Eliminar lógicamente (soft delete) un proyecto
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del proyecto a eliminar
 *     responses:
 *       '200':
 *         description: Proyecto marcado como eliminado
 *       '400':
 *         description: No se puede eliminar proyecto con albaranes asociados
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Permisos insuficientes (no es propietario)
 *       '404':
 *         description: Proyecto no encontrado
 *       '500':
 *         description: Error del servidor
 */
router.delete('/:id', softDeleteProject);

/**
 * @swagger
 * /api/project/{id}/permanent:
 *   delete:
 *     summary: Eliminar permanentemente (hard delete) un proyecto
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del proyecto a eliminar permanentemente
 *     responses:
 *       '200':
 *         description: Proyecto eliminado permanentemente
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Permisos insuficientes (no es propietario)
 *       '404':
 *         description: Proyecto no encontrado
 *       '500':
 *         description: Error del servidor
 */
router.delete('/:id/permanent', hardDeleteProject);

module.exports = router;