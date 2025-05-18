const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Company = require('../models/Company');

jest.mock('../utils/emailSender');

describe('User API', () => {
  let token;
  let userId;

  beforeEach(async () => {
    await User.deleteMany({ email: /test@example.com$|^testuser|^profiletest|^companytest/ });
    await Company.deleteMany({ CIF: 'B12345678' });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /test@example.com$|^testuser|^profiletest|^companytest/ });
    await Company.deleteMany({ CIF: 'B12345678' });
    await mongoose.connection.close();
  });

  describe('Registrar Usuario', () => {
    it('debería registrar un nuevo usuario', async () => {
      const res = await request(app)
        .post('/api/user/register')
        .send({
          name: 'Usuario de prueba',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.name).toBe('Usuario de prueba');
      expect(res.body.emailValidado).toBe(false);
    });
    
    it('debería fallar al registrar con datos inválidos', async () => {
      const res = await request(app)
        .post('/api/user/register')
        .send({
          name: 'Usuario de prueba',
          email: 'invalid-email',
          password: 'pass'
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
  });
  
  describe('Iniciar Sesión', () => {
    let testUserEmail = 'testuserlogin@example.com';
    let testUserPassword = 'password123';
    let validationToken;

    beforeEach(async () => {
      const userRes = await request(app)
        .post('/api/user/register')
        .send({ name: 'Login User', email: testUserEmail, password: testUserPassword });
      const user = await User.findOne({ email: testUserEmail });
      if (user) {
         validationToken = user.validationToken;
      } else {
         console.error("Error en Test inicializacion: No se encontró el usuario");
         validationToken = null;
      }
    });

    it('debería no iniciar sesión con un email no validado', async () => {
      const res = await request(app)
        .post('/api/user/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('Debe validar su email');
    });
    
    it('debería validar el email y iniciar sesión correctamente', async () => {
      if (!validationToken) throw new Error("Error en Test inicializacion: No se encontró el token de validación");

      const validateRes = await request(app)
        .put('/api/user/validation')
        .send({ token: validationToken });
      
      expect(validateRes.statusCode).toBe(200);
      
      const loginRes = await request(app)
        .post('/api/user/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        });
      
      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.body).toHaveProperty('token');
      
      token = loginRes.body.token;
    });
  });
  
  describe('Actualizar Perfil', () => {
    let userToken;
    let testUserId;

    beforeEach(async () => {
      const email = 'profiletest@example.com';
      const password = 'password123';
      await request(app)
          .post('/api/user/register')
          .send({ name: 'Profile User', email, password });
      const user = await User.findOne({ email });
      await request(app)
          .put('/api/user/validation')
          .send({ token: user.validationToken });
      const loginRes = await request(app)
          .post('/api/user/login')
          .send({ email, password });
      userToken = loginRes.body.token;
      testUserId = loginRes.body._id;
    });

    it('debería actualizar el perfil del usuario', async () => {
      const res = await request(app)
        .patch('/api/user/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Name'
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Updated Name');
    });
    
    it('debería fallar sin autenticación', async () => {
      const res = await request(app)
        .patch('/api/user/profile')
        .send({
          name: 'Updated Name'
        });
      
      expect(res.statusCode).toBe(401);
    });
  });
  
  describe('Crear Empresa', () => {
    let userToken;

    beforeEach(async () => {
       const email = 'companytest@example.com';
       const password = 'password123';
       await request(app)
           .post('/api/user/register')
           .send({ name: 'Company User', email, password });
       const user = await User.findOne({ email });
       if (!user || !user.validationToken) {
         throw new Error('Error en Test inicializacion: No se encontró el usuario/token');
       }
       await request(app)
           .put('/api/user/validation')
           .send({ token: user.validationToken });
       const loginRes = await request(app)
           .post('/api/user/login')
           .send({ email, password });
       if (!loginRes.body.token) {
         throw new Error('Error en Test inicializacion: No se pudo iniciar sesión');
       }
       userToken = loginRes.body.token;
     });

    it('debería crear una empresa para el usuario', async () => {
      const res = await request(app)
        .post('/api/user/company')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Empresa de prueba',
          CIF: 'B12345678'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.name).toBe('Empresa de prueba');
      const updatedUser = await User.findOne({ email: 'companytest@example.com' });
      expect(updatedUser.company.toString()).toEqual(res.body._id);
    });
  });
});