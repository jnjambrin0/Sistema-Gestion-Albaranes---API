const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del proyecto es obligatorio'],
    trim: true
  },
  description: String,
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'El cliente es obligatorio']
  },
  startDate: Date,
  endDate: Date,
  status: {
    type: String,
    enum: ['active', 'completed', 'canceled'],
    default: 'active'
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
  usuariosAsignados: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
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

// Índice para búsquedas eficientes por propietario y cliente
ProjectSchema.index({ propietario: 1, propietarioModel: 1 });
ProjectSchema.index({ client: 1 });

module.exports = mongoose.model('Project', ProjectSchema);