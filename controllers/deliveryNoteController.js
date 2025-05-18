const DeliveryNote = require('../models/DeliveryNote');
const Project = require('../models/Project');
const Client = require('../models/Client');
const User = require('../models/User');
const Company = require('../models/Company');
const { generatePDF } = require('../utils/pdfGenerator');
const { uploadPdf, uploadSignature } = require('../utils/fileUploader');

// POST /api/deliverynote - Creamos un nuevo albarán
exports.createDeliveryNote = async (req, res) => {
  try {
    
    const { projectId, items, notes } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ message: 'El ID del proyecto es obligatorio' });
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Se requiere al menos un ítem en el albarán' });
    }
    
    // Verificamos que el proyecto existe
    const project = await Project.findById(projectId).populate('client');
    if (!project) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }
    
    // Verificamos que el usuario tiene acceso al proyecto
    const user = await User.findById(req.user.id);
    
    const isAssigned = project.usuariosAsignados.some(assignedUser => 
      assignedUser.equals(user._id)
    );
    
    const propietarioIsUser = project.propietarioModel === 'User' && project.propietario.equals(user._id);
    const propietarioIsCompany = project.propietarioModel === 'Company' && 
                           user.company && project.propietario.equals(user.company);
 
    
    if (!isAssigned && !propietarioIsUser && !propietarioIsCompany) {
      return res.status(403).json({ message: 'No tiene permisos para este proyecto' });
    }

    // Validamos el formato de items
    for (const item of items) {
      if (!item.description || !item.cantidad || !item.unidad) {
        return res.status(400).json({ 
          message: 'Formato de item inválido - se requiere description, cantidad y unidad'
        });
      }
    }
    
    // Creamos el albarán - totalcantidad will be calculated by pre-save hook
    const deliveryNote = await DeliveryNote.create({
      project: projectId,
      client: project.client._id,
      creator: user._id,
      company: user.company,
      items,
      notes,
    });
    
    
    // Generamos el PDF
    try {
      const pdfBuffer = await generatePDF(deliveryNote, project, project.client);
      
      // Guardamos el PDF
      const pdfUrl = await uploadPdf(pdfBuffer, `delivery-note-${deliveryNote.number}.pdf`);
      
      // Actualizamos el albarán con la URL del PDF
      deliveryNote.pdfUrl = pdfUrl;
      deliveryNote.status = 'sent';
      await deliveryNote.save();
    } catch (pdfError) {
      console.error('[ERROR] Error al generar o guardar PDF:', pdfError);
    }
    
    res.status(201).json({
      _id: deliveryNote._id,
      number: deliveryNote.number,
      date: deliveryNote.date,
      project: deliveryNote.project,
      client: deliveryNote.client,
      status: deliveryNote.status,
      pdfUrl: deliveryNote.pdfUrl
    });
  } catch (error) {
    console.error('[ERROR] Error al crear albarán:', error);
    res.status(500).json({ message: 'Error al crear albarán', error: error.message });
  }
};

// GET /api/deliverynote - Obtenemos todos los albaranes
exports.getDeliveryNotes = async (req, res) => {
  try {
    // Determinamos los criterios de búsqueda
    let searchCriteria = {};
    
    searchCriteria.$or = [{ creator: req.user._id }];
    
    if (req.user.company) {
      searchCriteria.$or.push({ company: req.user.company });
    }
    
    searchCriteria.isDeleted = false;
    
    const { projectId, clientId, status, search, fromDate, toDate } = req.query;
    
    if (projectId) {
      searchCriteria.project = projectId;
    }
    
    if (clientId) {
      searchCriteria.client = clientId;
    }
    
    if (status) {
      searchCriteria.status = status;
    }
    
    if (fromDate || toDate) {
      searchCriteria.date = {};
      if (fromDate) {
        searchCriteria.date.$gte = new Date(fromDate);
      }
      if (toDate) {
        const toDateObj = new Date(toDate);
        toDateObj.setHours(23, 59, 59, 999);
        searchCriteria.date.$lte = toDateObj;
      }
    }
    
    // Filtramos por texto de búsqueda
    if (search) {
      searchCriteria.$or = [
        { number: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Obtenemos los albaranes con información relacionada
    const deliveryNotes = await DeliveryNote.find(searchCriteria)
      .populate('project', 'name')
      .populate('client', 'name')
      .sort({ date: -1 });
    
    res.status(200).json(deliveryNotes);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener albaranes', error: error.message });
  }
};

// GET /api/deliverynote/:id - Obtenemos un albarán por ID
exports.getDeliveryNoteById = async (req, res) => {
  try {
    const deliveryNote = await DeliveryNote.findById(req.params.id)
      .populate('project', 'name description')
      .populate('client', 'name CIF email telefono direccion')
      .populate('creator', 'name email')
      .populate('company', 'name CIF');
    
    if (!deliveryNote) {
      return res.status(404).json({ message: 'Albarán no encontrado' });
    }
    
    // Verificamos que el usuario tiene acceso al albarán
    const isCreator = deliveryNote.creator._id.equals(req.user._id);
    const isCompanyMember = 
      deliveryNote.company && 
      req.user.company && 
      deliveryNote.company._id.equals(req.user.company);
    
    if (!isCreator && !isCompanyMember) {
      return res.status(403).json({ message: 'No tiene permisos para ver este albarán' });
    }
    
    res.status(200).json(deliveryNote);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener albarán', error: error.message });
  }
};

// POST /api/deliverynote/:id/sign - Firmamos un albarán
exports.signDeliveryNote = async (req, res) => {
  try {
    const { signatureImage, signedBy } = req.body;
    
    if (!signatureImage || !signedBy) {
      return res.status(400).json({ message: 'La firma y el nombre son obligatorios' });
    }
    
    let deliveryNote = await DeliveryNote.findById(req.params.id);
    
    if (!deliveryNote) {
      return res.status(404).json({ message: 'Albarán no encontrado' });
    }
    
    if (deliveryNote.status === 'signed') {
      return res.status(400).json({ message: 'El albarán ya está firmado' });
    }
    
    // Verificamos que el usuario tiene acceso al albarán
    const isCreator = deliveryNote.creator.equals(req.user._id);
    const isCompanyMember = 
      deliveryNote.company && 
      req.user.company && 
      deliveryNote.company.equals(req.user.company);
    
    if (!isCreator && !isCompanyMember) {
      return res.status(403).json({ message: 'No tiene permisos para firmar este albarán' });
    }
    
    // Guardamos la imagen de la firma
    const signatureUrl = await uploadSignature(
      signatureImage, 
      `signature-${deliveryNote._id}.png`
    );
    
    // Creamos el PDF firmado
    const project = await Project.findById(deliveryNote.project);
    const client = await Client.findById(deliveryNote.client);
    
    const signedPdfBuffer = await generatePDF(
      deliveryNote, project, client, signatureUrl, signedBy
    );
    
    const signedPdfUrl = await uploadPdf(
      signedPdfBuffer, 
      `signed-delivery-note-${deliveryNote.number}.pdf`
    );
    
    // Actualizamos el albarán
    deliveryNote.signature = {
      date: new Date(),
      image: signatureUrl,
      signedBy
    };
    deliveryNote.status = 'signed';
    deliveryNote.signedPdfUrl = signedPdfUrl;
    
    await deliveryNote.save();
    
    res.status(200).json({
      _id: deliveryNote._id,
      number: deliveryNote.number,
      status: deliveryNote.status,
      signature: deliveryNote.signature,
      signedPdfUrl: deliveryNote.signedPdfUrl,
      message: 'Albarán firmado correctamente'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al firmar albarán', error: error.message });
  }
};

// DELETE /api/deliverynote/:id - Eliminamos un albarán
exports.deleteDeliveryNote = async (req, res) => {
  try {
    const deliveryNote = await DeliveryNote.findById(req.params.id);
    
    if (!deliveryNote) {
      return res.status(404).json({ message: 'Albarán no encontrado' });
    }
    
    // Verificamos que el usuario tiene acceso al albarán
    const isCreator = deliveryNote.creator.equals(req.user._id);
    const isCompanyMember = 
      deliveryNote.company && 
      req.user.company && 
      deliveryNote.company.equals(req.user.company);
    
    if (!isCreator && !isCompanyMember) {
      return res.status(403).json({ message: 'No tiene permisos para eliminar este albarán' });
    }
    
    // Solo permitimos eliminar albaranes no firmados
    if (deliveryNote.status === 'signed') {
      return res.status(400).json({ message: 'No se puede eliminar un albarán firmado' });
    }
    
    deliveryNote.isDeleted = true;
    await deliveryNote.save();
    
    res.status(200).json({ message: 'Albarán eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar albarán', error: error.message });
  }
};

// GET /api/deliverynote/:id/pdf - Descargamos el PDF del albarán
exports.getDeliveryNotePdf = async (req, res) => {
  try {
    const deliveryNote = await DeliveryNote.findById(req.params.id);
    
    if (!deliveryNote) {
      return res.status(404).json({ message: 'Albarán no encontrado' });
    }
    
    // Verificamos que el usuario tiene acceso al albarán
    const isCreator = deliveryNote.creator.equals(req.user._id);
    const isCompanyMember = 
      deliveryNote.company && 
      req.user.company && 
      deliveryNote.company.equals(req.user.company);
    
    if (!isCreator && !isCompanyMember) {
      return res.status(403).json({ message: 'No tiene permisos para descargar este albarán' });
    }
    
    // Comprobamos si queremos el PDF firmado o sin firmar
    const { signed } = req.query;
    const pdfUrl = signed === 'true' && deliveryNote.signedPdfUrl 
      ? deliveryNote.signedPdfUrl 
      : deliveryNote.pdfUrl;
    
    if (!pdfUrl) {
      return res.status(404).json({ message: 'PDF no encontrado' });
    }
    
    res.status(200).json({ pdfUrl });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener PDF', error: error.message });
  }
};