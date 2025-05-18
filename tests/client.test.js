const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Client = require('../models/Client');
const Company = require('../models/Company');

jest.mock('../utils/emailSender');

describe('API de Clientes', () => {
  let token;
  let userId;
  let clientId;

  const testUserEmail = 'testclient@example.com';
  const testClientCIF = 'A12345678';

  // Inicializamos los datos de prueba
  beforeAll(async () => {
    await User.deleteMany({ email: testUserEmail });
    await Client.deleteMany({ CIF: testClientCIF });

    await request(app)
      .post('/api/user/register')
      .send({
        name: 'Usuario de prueba',
        email: testUserEmail,
        password: 'password123'
      });

    // Validamos el usuario
    const user = await User.findOne({ email: testUserEmail });
    if (!user || !user.validationToken) throw new Error('Error en la configuración de la prueba: No se encontró el usuario/token');
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
    if (!loginRes.body.token) throw new Error('Error en la configuración de la prueba: No se pudo iniciar sesión');
    token = loginRes.body.token;
    userId = loginRes.body._id;
  });

  // Limpiamos el cliente después de cada prueba
  beforeEach(async () => {
    await Client.deleteMany({ CIF: testClientCIF });
  });

  afterAll(async () => {
    await User.deleteMany({ email: testUserEmail });
    await Client.deleteMany({ CIF: testClientCIF });
    await mongoose.connection.close();
  });

  describe('Crear Cliente', () => {
    it('debería crear un nuevo cliente', async () => {
      const res = await request(app)
        .post('/api/client')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Cliente de prueba',
          CIF: testClientCIF,
          PersonaContacto: 'Contacto de prueba',
          email: 'contact@testclient.com',
          telefono: '987654321',
          direccion: {
            calle: 'Calle de prueba',
            ciudad: 'Ciudad de prueba',
            CP: '54321',
            pais: 'España'
          }
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.name).toBe('Cliente de prueba');
      expect(res.body.CIF).toBe(testClientCIF);
      clientId = res.body._id;
    });

    it('debería fallar al crear un cliente con CIF duplicado', async () => {
      await request(app)
        .post('/api/client')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Cliente Uno', CIF: testClientCIF });

      const res = await request(app)
        .post('/api/client')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Cliente Dos', CIF: testClientCIF });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Ya existe un cliente con ese NIF/CIF');
    });


    it('debería fallar al crear un cliente con campos requeridos faltantes', async () => {
      const res = await request(app)
        .post('/api/client')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Cliente sin CIF'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('Obtener Clientes', () => {
     // Creamos un cliente en beforeEach para las pruebas de GET
     beforeEach(async () => {
      const res = await request(app)
        .post('/api/client')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Cliente Get Test', CIF: testClientCIF });
      clientId = res.body._id;
    });

    it('debería obtener todos los clientes del usuario', async () => {
      const res = await request(app)
        .get('/api/client')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some(c => c._id === clientId)).toBe(true);
    });

    it('debería obtener un cliente específico por ID', async () => {
      const res = await request(app)
        .get(`/api/client/${clientId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('_id');
      expect(res.body._id).toBe(clientId);
      expect(res.body.name).toBe('Cliente Get Test');
    });
  });

  describe('Actualizar Cliente', () => {
     // Creamos un cliente en beforeEach para las pruebas de UPDATE
     beforeEach(async () => {
      const res = await request(app)
        .post('/api/client')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Cliente Update Test', CIF: testClientCIF });
      clientId = res.body._id;
    });

    it('debería actualizar un cliente', async () => {
      const res = await request(app)
        .put(`/api/client/${clientId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Cliente actualizado',
          email: 'actualizado@testclient.com'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Cliente actualizado');
    });
  });

  describe('Archivar y Desarchivar Cliente', () => {
     beforeEach(async () => {
      const res = await request(app)
        .post('/api/client')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Cliente Archive Test', CIF: testClientCIF });
      clientId = res.body._id;
    });

    it('debería archivar un cliente', async () => {
      const res = await request(app)
        .patch(`/api/client/${clientId}/archive`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.isArchived).toBe(true);
    });

    it('debería desarchivar un cliente', async () => {
      await request(app)
        .patch(`/api/client/${clientId}/archive`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request(app)
        .patch(`/api/client/${clientId}/unarchive`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.isArchived).toBe(false);
    });
  });
});