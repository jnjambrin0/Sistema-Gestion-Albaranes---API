const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del cliente es obligatorio'],
    trim: true
  },
  CIF: {
    type: String,
    required: [true, 'El NIF/CIF es obligatorio']
  },
  PersonaContacto: String,
  email: String,
  telefono: String,
  direccion: {
    calle: String,
    ciudad: String,
    CP: String,
    pais: String
  },
  propietario: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'propietarioModel',
    required: true
  },
  propietarioModel: {
    type: String,
    required: true,
    enum: ['User', 'Company']
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índice para búsquedas eficientes por propietario
ClientSchema.index({ propietario: 1, propietarioModel: 1 });

module.exports = mongoose.model('Client', ClientSchema);