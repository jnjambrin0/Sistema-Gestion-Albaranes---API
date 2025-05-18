const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { validateRequest } = require('../middlewares/validationMiddleware');
const { protect } = require('../middlewares/authMiddleware');
const {
  createDeliveryNote,
  getDeliveryNotes,
  getDeliveryNoteById,
  signDeliveryNote,
  deleteDeliveryNote,
  getDeliveryNotePdf
} = require('../controllers/deliveryNoteController');

/**
 * @swagger
 * components:
 *   schemas:
 *     DeliveryItem:
 *       type: object
 *       required:
 *         - description
 *         - cantidad
 *         - unidad
 *       properties:
 *         description:
 *           type: string
 *           description: Descripción del ítem o servicio
 *           example: "Horas de desarrollo"
 *         cantidad:
 *           type: number
 *           format: float
 *           description: Cantidad (horas, unidades, kg, etc.)
 *           example: 10
 *         unidad:
 *           type: string
 *           enum: [hour, unidad, kg, metros, litro]
 *           description: Unidad de medida
 *           example: "hour"
 *         precioUnidad:
 *           type: number
 *           format: float
 *           description: Precio por unidad (opcional)
 *           example: 55.0
 *         importe:
 *           type: number
 *           format: float
 *           description: Importe total del ítem (calculado = cantidad * precioUnidad)
 *           readOnly: true # Calculado por el backend
 *           example: 550.0
 *     DeliveryNote:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID único del albarán
 *           example: "64ac1234eb7c1e001a7ea001"
 *         number:
 *           type: string
 *           description: 'Número de albarán (generado automáticamente, ej: ALB-YYMM-NNNN)'
 *           readOnly: true
 *           example: "ALB-2307-0001"
 *         date:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación del albarán
 *           readOnly: true
 *         project:
 *           type: string
 *           description: ID del proyecto asociado
 *           example: "64ab1234eb7c1e001a7e9f02"
 *         client:
 *           type: string
 *           description: ID del cliente asociado (del proyecto)
 *           example: "64aa1234eb7c1e001a7e8f01"
 *         creator:
 *           type: string 
 *           description: ID del usuario creador
 *           example: "64a9eefaeb7c1e001a7e8e20"
 *         company:
 *           type: string # Could be object if populated
 *           description: ID de la empresa asociada (si el creador pertenece a una)
 *           example: "64a9f0f8eb7c1e001a7e8e22"
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DeliveryItem'
 *         totalcantidad:
 *           type: number
 *           format: float
 *           description: Importe total del albarán (suma de importes de items)
 *           readOnly: true
 *           example: 700.75
 *         notes:
 *           type: string
 *           description: Notas adicionales
 *           example: "Trabajos realizados según presupuesto adjunto."
 *         status:
 *           type: string
 *           enum: [draft, sent, signed, canceled]
 *           description: Estado del albarán
 *           readOnly: true
 *           example: "sent"
 *         signature:
 *           type: object
 *           properties:
 *             date:
 *               type: string
 *               format: date-time
 *               description: Fecha de la firma
 *             image:
 *               type: string
 *               format: url
 *               description: URL de la imagen de la firma almacenada
 *             signedBy:
 *               type: string
 *               description: Nombre de la persona que firmó
 *           description: Detalles de la firma (si aplica)
 *         pdfUrl:
 *           type: string
 *           format: url
 *           description: URL del PDF original almacenado
 *           readOnly: true
 *         signedPdfUrl:
 *           type: string
 *           format: url
 *           description: URL del PDF firmado almacenado (si aplica)
 *           readOnly: true
 *         isDeleted:
 *           type: boolean
 *           description: Indica si el albarán está eliminado lógicamente
 *           readOnly: true
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     DeliveryNoteInput:
 *       type: object
 *       required:
 *         - projectId
 *         - items
 *       properties:
 *         projectId:
 *           type: string
 *           description: ID del proyecto al que pertenece el albarán
 *           example: "64ab1234eb7c1e001a7e9f02"
 *         items:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: object
 *             required:
 *               - description
 *               - cantidad
 *               - unidad
 *             properties:
 *               description:
 *                 type: string
 *                 example: "Consultoría SEO"
 *               cantidad:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 example: 5
 *               unidad:
 *                 type: string
 *                 enum: [hour, unidad, kg, metros, litro]
 *                 example: "hour"
 *               precioUnidad:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 example: 70
 *           description: Lista de ítems del albarán
 *         notes:
 *           type: string
 *           description: Notas adicionales (opcional)
 *           example: "Incluye informe mensual."
 *     DeliveryNoteSignInput:
 *       type: object
 *       required:
 *         - signatureImage
 *         - signedBy
 *       properties:
 *         signatureImage:
 *           type: string
 *           format: byte # Technically base64, but byte is common for file uploads/data URIs
 *           description: 'Imagen de la firma codificada en Base64 (Data URI format: data:image/png;base64,...)'
 *         signedBy:
 *           type: string
 *           description: Nombre de la persona que firma
 *           example: "Pedro Cliente"
 *     PdfUrlResponse:
 *       type: object
 *       properties:
 *         pdfUrl:
 *           type: string
 *           format: url
 *           description: URL del PDF solicitado (original o firmado)
 */

// Aplicamos el middleware de autenticación a todas las rutas de albaranes
router.use(protect);

/**
 * @swagger
 * /api/deliverynote:
 *   get:
 *     summary: Obtener la lista de albaranes del usuario o su empresa
 *     tags: [Albaranes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Término de búsqueda para filtrar por número de albarán o notas
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Filtrar albaranes por ID de proyecto
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *         description: Filtrar albaranes por ID de cliente
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, sent, signed, canceled]
 *         description: Filtrar albaranes por estado
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar albaranes creados desde esta fecha (YYYY-MM-DD)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar albaranes creados hasta esta fecha (YYYY-MM-DD)
 *     responses:
 *       '200':
 *         description: Lista de albaranes (solo aquellos a los que el usuario tiene acceso)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DeliveryNote'
 *       '401':
 *         description: No autorizado
 *       '500':
 *         description: Error del servidor
 */
router.get('/', getDeliveryNotes);

/**
 * @swagger
 * /api/deliverynote/{id}:
 *   get:
 *     summary: Obtener detalles de un albarán específico
 *     tags: [Albaranes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del albarán a obtener
 *     responses:
 *       '200':
 *         description: Detalles del albarán
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryNote' # Might be populated
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Permisos insuficientes
 *       '404':
 *         description: Albarán no encontrado
 *       '500':
 *         description: Error del servidor
 */
router.get('/:id', getDeliveryNoteById);

/**
 * @swagger
 * /api/deliverynote/{id}/pdf:
 *   get:
 *     summary: Obtener la URL del PDF de un albarán (original o firmado)
 *     tags: [Albaranes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del albarán
 *       - in: query
 *         name: signed
 *         schema:
 *           type: boolean
 *         description: Poner a true para obtener la URL del PDF firmado (si existe)
 *     responses:
 *       '200':
 *         description: URL del PDF solicitado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PdfUrlResponse'
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Permisos insuficientes
 *       '404':
 *         description: Albarán o PDF no encontrado
 *       '500':
 *         description: Error del servidor
 */
router.get('/:id/pdf', getDeliveryNotePdf);

/**
 * @swagger
 * /api/deliverynote:
 *   post:
 *     summary: Crear un nuevo albarán
 *     tags: [Albaranes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeliveryNoteInput'
 *     responses:
 *       '201':
 *         description: Albarán creado, PDF generado y almacenado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryNote' # O un subconjunto con _id, number, status, pdfUrl
 *       '400':
 *         description: Datos inválidos
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Permisos insuficientes sobre el proyecto
 *       '404':
 *         description: Proyecto no encontrado
 *       '500':
 *         description: Error del servidor (incluyendo posible error al generar/subir PDF)
 */
router.post(
  '/',
  [
    check('projectId', 'El proyecto es obligatorio').isMongoId(),
    check('items', 'Los items son obligatorios').isArray({ min: 1 }),
    check('items.*.description', 'La descripción es obligatoria').not().isEmpty(),
    check('items.*.cantidad', 'La cantidad debe ser numérica y positiva').isFloat({ gt: 0 }),
    check('items.*.unidad', 'La unidad debe ser válida').isIn([
      'hour', 'unidad', 'kg', 'metros', 'litro'
    ]),
    check('items.*.precioUnidad', 'El precio unitario debe ser numérico y no negativo').optional().isFloat({ min: 0 })
  ],
  validateRequest,
  createDeliveryNote
);

/**
 * @swagger
 * /api/deliverynote/{id}/sign:
 *   post:
 *     summary: Firmar un albarán
 *     tags: [Albaranes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del albarán a firmar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeliveryNoteSignInput'
 *     responses:
 *       '200':
 *         description: Albarán firmado, PDF firmado generado y almacenado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryNote' # O un subconjunto con status, signature, signedPdfUrl
 *       '400':
 *         description: Datos inválidos o el albarán ya está firmado
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Permisos insuficientes
 *       '404':
 *         description: Albarán no encontrado
 *       '500':
 *         description: Error del servidor (incluyendo posible error al generar/subir PDF o firma)
 */
router.post(
  '/:id/sign',
  [
    check('signatureImage', 'La imagen de la firma es obligatoria').not().isEmpty(),
    check('signedBy', 'El nombre de quien firma es obligatorio').not().isEmpty()
  ],
  validateRequest,
  signDeliveryNote
);

/**
 * @swagger
 * /api/deliverynote/{id}:
 *   delete:
 *     summary: Eliminar lógicamente (soft delete) un albarán
 *     tags: [Albaranes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del albarán a eliminar
 *     responses:
 *       '200':
 *         description: Albarán marcado como eliminado
 *       '400':
 *         description: No se puede eliminar un albarán firmado
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Permisos insuficientes
 *       '404':
 *         description: Albarán no encontrado
 *       '500':
 *         description: Error del servidor
 */
router.delete('/:id', deleteDeliveryNote);

module.exports = router;