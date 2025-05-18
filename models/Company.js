const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre de la empresa es obligatorio'],
    trim: true
  },
  CIF: {
    type: String,
    required: [true, 'El NIF/CIF es obligatorio'],
    unique: true
  },
  direccion: {
    calle: String,
    ciudad: String,
    CP: String,
    pais: String
  },
  telefono: String,
  email: String,
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  miembros: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  pendingInvitations: [{
    email: String,
    token: String,
    expiresAt: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Company', CompanySchema);