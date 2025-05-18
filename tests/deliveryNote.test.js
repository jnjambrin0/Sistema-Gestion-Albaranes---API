const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Client = require('../models/Client');
const Project = require('../models/Project');
const DeliveryNote = require('../models/DeliveryNote');
const mockStorage = require('firebase/storage');

jest.mock('../utils/emailSender');

jest.mock('firebase/storage');

describe('API de Delivery Notes', () => {
  let token;
  let userId;
  let clientId;
  let projectId;
  let deliveryNoteId;

  const testUserEmail = 'testnote@example.com';
  const testClientCIF = 'C12345678';
  const testProjectName = 'Test Note Project';

  // Inicializamos los datos de prueba
  beforeAll(async () => {
    await User.deleteMany({ email: testUserEmail });
    await Client.deleteMany({ CIF: testClientCIF });
    await Project.deleteMany({ name: testProjectName });
    const projects = await Project.find({ name: testProjectName }).select('_id');
    const projectIds = projects.map(p => p._id);
    await DeliveryNote.deleteMany({ project: { $in: projectIds } });

    // Creamos el usuario de prueba
    await request(app)
      .post('/api/user/register')
      .send({
        name: 'Test usuario Delivery Note',
        email: testUserEmail,
        password: 'password123'
      });

    const user = await User.findOne({ email: testUserEmail });
    if (!user || !user.validationToken) throw new Error('Error en Test inicializacion: No se encontró el usuario/token');
    await request(app)
      .put('/api/user/validation')
      .send({ token: user.validationToken });

    // Iniciamos sesión
    const loginRes = await request(app)
      .post('/api/user/login')
      .send({
        email: testUserEmail,
        password: 'password123'
      });
    if (!loginRes.body.token) throw new Error('Error en Test inicializacion: No se pudo iniciar sesión');
    token = loginRes.body.token;
    userId = loginRes.body._id;

    // Creamos el cliente de prueba
    const clientRes = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Note Client',
        CIF: testClientCIF,
        email: 'client@testnote.com'
      });
    if (clientRes.statusCode !== 201) throw new Error('Error en Test inicializacion: No se pudo crear el cliente para las notas');
    clientId = clientRes.body._id;

    const projectRes = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: testProjectName,
        clientId: clientId,
        usuariosAsignados: [userId]
      });
    if (projectRes.statusCode !== 201) throw new Error('Error en Test inicializacion: No se pudo crear el proyecto para las notas');
    projectId = projectRes.body._id;
  });

   beforeEach(async () => {
      await DeliveryNote.deleteMany({ project: projectId });
      jest.clearAllMocks(); 
      mockStorage.resetUploadBytesArgs();
   });

  afterAll(async () => {
    await User.deleteMany({ email: testUserEmail });
    await Client.deleteMany({ CIF: testClientCIF });
    await Project.deleteMany({ name: testProjectName });
    await DeliveryNote.deleteMany({ project: projectId });
    await mongoose.connection.close();
  });

  describe('Crear Delivery Note', () => {
    it('debería crear una nueva nota de entrega con subida de PDF simulada', async () => {
      const res = await request(app)
        .post('/api/deliverynote')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: projectId,
          items: [
            {
              description: 'Servicio de consultoría',
              cantidad: 5,
              unidad: 'hora',
              precioUnidad: 50
            }
          ],
          notes: 'Nota de prueba'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('number');
      expect(res.body.status).toBe('sent');
      expect(res.body.pdfUrl).toBe('https://mock.firebase.storage.url/mockFile.pdf');

      deliveryNoteId = res.body._id;

      expect(mockStorage.uploadBytes).toHaveBeenCalledTimes(1);
      
      const uploadArgs = mockStorage.getUploadBytesArgs();
      expect(uploadArgs).toHaveLength(1);
      const [buffer, fileRef, metadata] = uploadArgs[0];

      // Comprobamos que el buffer sea una instancia de Buffer y que tenga más de 1000 bytes para aseguranos de que pueda ser un PDF
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000);
      expect(buffer.toString('utf8', 0, 4)).toBe('%PDF'); 

      // Comprobamos que el archivo de referencia esté definido
      expect(fileRef).toBeDefined();
      expect(fileRef.path).toMatch(/^albaranes\/pdfs\/\d+-delivery-note-ALB-\d+-\d+\.pdf$/);
      expect(fileRef.name).toMatch(/^\d+-delivery-note-ALB-\d+-\d+\.pdf$/);

      expect(metadata).toBeDefined();
      expect(metadata).toHaveProperty('contentType', 'application/pdf');
    });

    it('debería fallar al crear con un ID de proyecto inválido', async () => {
      const invalidProjectId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post('/api/deliverynote')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: invalidProjectId,
          items: [
            {
              description: 'Servicio',
              cantidad: 1,
              unidad: 'hora',
              precioUnidad: 50
            }
          ]
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('Proyecto no encontrado');
      expect(mockStorage.uploadBytes).not.toHaveBeenCalled();
    });

    it('debería fallar al crear con un array de items vacío', async () => {
      const res = await request(app)
        .post('/api/deliverynote')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId: projectId, items: [] });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
      expect(mockStorage.uploadBytes).not.toHaveBeenCalled();
    });
  });

  describe('Get DeliveryNotes', () => {
    beforeEach(async () => {
       const res = await request(app)
        .post('/api/deliverynote')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId: projectId, items: [{description: 'Get Item', cantidad: 1, unidad: 'unidad'}] });
       deliveryNoteId = res.body._id;
    });

    it('debería obtener todas las notas de entrega para el usuario', async () => {
      const res = await request(app)
        .get('/api/deliverynote')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some(dn => dn._id === deliveryNoteId)).toBe(true);
    });

    it('debería obtener una nota de entrega específica por ID', async () => {
      const res = await request(app)
        .get(`/api/deliverynote/${deliveryNoteId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('_id');
      expect(res.body._id).toBe(deliveryNoteId);
      expect(res.body).toHaveProperty('items');
      expect(res.body.items[0].description).toBe('Get Item');
    });
  });

  describe('Get DeliveryNote PDF URL', () => {
     beforeEach(async () => {
       const res = await request(app)
        .post('/api/deliverynote')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId: projectId, items: [{description: 'PDF Item', cantidad: 1, unidad: 'unidad'}] });
       deliveryNoteId = res.body._id;
    });

    it('debería obtener la URL del PDF para una nota de entrega', async () => {
      const res = await request(app)
        .get(`/api/deliverynote/${deliveryNoteId}/pdf`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('pdfUrl');
      expect(res.body.pdfUrl).toBe('https://mock.firebase.storage.url/mockFile.pdf');
    });
  });
});