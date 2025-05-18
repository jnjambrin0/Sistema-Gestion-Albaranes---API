const mongoose = require('mongoose');

// Esquema para los items del albarán
const DeliveryItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  cantidad: {
    type: Number,
    required: true,
    min: [0, 'La cantidad no puede ser negativa']
  },
  unidad: {
    type: String,
    required: true,
    enum: ['hour', 'unidad', 'kg', 'metros', 'litro']
  },
  precioUnidad: {
    type: Number,
    min: [0, 'El precio no puede ser negativo']
  },
  importe: {
    type: Number,
    min: [0, 'El importe no puede ser negativo']
  }
});

const DeliveryNoteSchema = new mongoose.Schema({
  number: {
    type: String,
    unique: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  items: [DeliveryItemSchema],
  totalcantidad: {
    type: Number,
    min: [0, 'El importe total no puede ser negativo']
  },
  notes: String,
  status: {
    type: String,
    enum: ['draft', 'sent', 'signed', 'canceled'],
    default: 'draft'
  },
  signature: {
    date: Date,
    image: String,
    signedBy: String
  },
  pdfUrl: String,
  signedPdfUrl: String,
  isDeleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Middleware para generar número de albarán automáticamente
DeliveryNoteSchema.pre('save', async function(next) {
  try {
    if (!this.number) {
      const date = new Date();
      const year = date.getFullYear().toString().substr(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      
      const lastDeliveryNote = await this.constructor.findOne({})
        .sort({ createdAt: -1 })
        .exec();
      
      
      let sequence = '0001';
      if (lastDeliveryNote && lastDeliveryNote.number) {
        const lastSequence = lastDeliveryNote.number.substr(-4);
        sequence = (parseInt(lastSequence, 10) + 1).toString().padStart(4, '0');
      }
      
      this.number = `ALB-${year}${month}-${sequence}`;
    }
    next();
  } catch (error) {
    if (!this.number) {
      const timestamp = Date.now();
      this.number = `ALB-${timestamp}`;
    }
    next();
  }
});

// Middleware para calcular el importe total antes de guardar
DeliveryNoteSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    let calculatedTotal = 0;
    // Calculamos el importe para cada ítem y el total
    this.items.forEach(item => {
      if (item.cantidad && item.precioUnidad && item.precioUnidad > 0) {
        item.importe = item.cantidad * item.precioUnidad;
      } else {
        // Si no hay precio por unidad, el importe es igual a la cantidad (o 0 si no hay cantidad)
        item.importe = item.cantidad || 0;
      }
      calculatedTotal += item.importe;
    });

    // Asignamos el importe total calculado
    this.totalcantidad = calculatedTotal;
  }
  next();
});

// Índices para búsquedas eficientes
DeliveryNoteSchema.index({ project: 1 });
DeliveryNoteSchema.index({ client: 1 });
DeliveryNoteSchema.index({ creator: 1 });
DeliveryNoteSchema.index({ company: 1 });
DeliveryNoteSchema.index({ status: 1 });

module.exports = mongoose.model('DeliveryNote', DeliveryNoteSchema);