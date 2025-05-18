const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Client = require('../models/Client');
const Project = require('../models/Project');

jest.mock('../utils/emailSender');

describe('Project API', () => {
  let token;
  let userId;
  let clientId;
  let projectId;

  const testUserEmail = 'testproject@example.com';
  const testClientCIF = 'B87654321';
  const testProjectName = 'Proyecto de prueba';

  // Inicializamos los datos de prueba
  beforeAll(async () => {
    await User.deleteMany({ email: testUserEmail });
    await Client.deleteMany({ CIF: testClientCIF });
    await Project.deleteMany({ name: testProjectName });

    await request(app)
      .post('/api/user/register')
      .send({
        name: 'Test Project User',
        email: testUserEmail,
        password: 'password123'
      });

    const user = await User.findOne({ email: testUserEmail });
    if (!user || !user.validationToken) throw new Error('Error en Test inicializacion: No se encontró el usuario/token');
    await request(app)
      .put('/api/user/validation')
      .send({ token: user.validationToken });

    const loginRes = await request(app)
      .post('/api/user/login')
      .send({
        email: testUserEmail,
        password: 'password123'
      });
    if (!loginRes.body.token) throw new Error('Error en Test inicializacion: No se pudo iniciar sesión');
    token = loginRes.body.token;
    userId = loginRes.body._id;

    const clientRes = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Cliente para Proyectos',
        CIF: testClientCIF,
        email: 'client@testproject.com'
      });
    if (clientRes.statusCode !== 201) throw new Error('Error en Test inicializacion: No se pudo crear el cliente');
    clientId = clientRes.body._id;
  });

  beforeEach(async () => {
    await Project.deleteMany({ name: testProjectName });
  });

  afterAll(async () => {
    await User.deleteMany({ email: testUserEmail });
    await Client.deleteMany({ CIF: testClientCIF });
    await Project.deleteMany({ name: testProjectName });
    await mongoose.connection.close();
  });

  describe('Crear Proyecto', () => {
    it('debería crear un nuevo proyecto', async () => {
      const res = await request(app)
        .post('/api/project')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: testProjectName,
          description: 'Este es un proyecto de prueba',
          clientId: clientId,
          startDate: new Date().toISOString()
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.name).toBe(testProjectName);
      projectId = res.body._id;
    });

    it('debería fallar al crear un proyecto con un cliente inválido', async () => {
      const invalidClientId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post('/api/project')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Proyecto inválido',
          description: 'Este es un proyecto inválido',
          clientId: invalidClientId,
          startDate: new Date().toISOString()
        });

      expect([404, 403]).toContain(res.statusCode);
      if(res.statusCode === 404) {
        expect(res.body.message).toContain('Cliente no encontrado');
      } else {
        expect(res.body.message).toContain('No tiene permisos para usar este cliente');
      }
    });
  });

  describe('Get Projects', () => {
    beforeEach(async () => {
      const res = await request(app)
        .post('/api/project')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: testProjectName, clientId: clientId });
        projectId = res.body._id;
    });

    it('debería obtener todos los proyectos del usuario', async () => {
      const res = await request(app)
        .get('/api/project')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some(p => p._id === projectId)).toBe(true);
    });

    it('debería obtener un proyecto específico por ID', async () => {
      const res = await request(app)
        .get(`/api/project/${projectId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('_id');
      expect(res.body._id).toBe(projectId);
      expect(res.body.name).toBe(testProjectName);
      expect(res.body).toHaveProperty('client');
    });
  });

  describe('Actualizar Proyecto', () => {
     beforeEach(async () => {
      const res = await request(app)
        .post('/api/project')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: testProjectName, clientId: clientId });
        projectId = res.body._id;
    });

    it('debería actualizar un proyecto', async () => {
      const res = await request(app)
        .put(`/api/project/${projectId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Proyecto actualizado',
          description: 'Descripción actualizada'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Proyecto actualizado');
    });
  });

  describe('Archive & Unarchive Project', () => {
     beforeEach(async () => {
      const res = await request(app)
        .post('/api/project')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: testProjectName, clientId: clientId });
        projectId = res.body._id;
    });

    it('debería archivar un proyecto', async () => {
      const res = await request(app)
        .patch(`/api/project/${projectId}/archive`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.isArchived).toBe(true);
    });

    it('debería desarchivar un proyecto', async () => {
      await request(app)
        .patch(`/api/project/${projectId}/archive`)
        .set('Authorization', `Bearer ${token}`);
      const res = await request(app)
        .patch(`/api/project/${projectId}/unarchive`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.isArchived).toBe(false);
    });
  });
});