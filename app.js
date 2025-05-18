const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/database');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');
const swaggerUI = require('swagger-ui-express');
const swaggerDocs = require('./docs/swagger');
require('dotenv').config();

// Conectamos la base de datos
connectDB();

const app = express();

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Rutas
app.use('/api/user', require('./routes/userRoutes')); 
app.use('/api/client', require('./routes/clientRoutes'));
app.use('/api/project', require('./routes/projectRoutes'));
app.use('/api/deliverynote', require('./routes/deliveryNoteRoutes'));

// Documentación Swagger
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));

app.use(notFound);
app.use(errorHandler);

const PORT = 5001;

// Evitamos ejecutar el servidor si estamos en modo test
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en puerto ${PORT}`);
  });
}

module.exports = app;