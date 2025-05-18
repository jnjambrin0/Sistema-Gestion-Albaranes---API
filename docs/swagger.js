const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'API de Gestión de Albaranes',
    version: '1.0.0',
    description: 'API REST para la gestión de albaranes, clientes, proyectos y usuarios.'
  },
  servers: [
    {
      url: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5001}`,
      description: process.env.NODE_ENV === 'production' ? 'Servidor de producción' : 'Servidor de desarrollo/local'
    }
  ],
};

const options = {
  swaggerDefinition,
  apis: [path.join(__dirname, '../routes/*.js')],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;