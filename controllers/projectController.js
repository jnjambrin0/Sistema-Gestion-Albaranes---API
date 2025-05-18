const Project = require('../models/Project');
const Client = require('../models/Client');
const DeliveryNote = require('../models/DeliveryNote');
const User = require('../models/User');

// POST /api/project - Creamos un nuevo proyecto
exports.createProject = async (req, res) => {
  try {
    const { name, description, clientId, startDate, endDate, usuariosAsignados } = req.body;
    
    // Comprobamos que el cliente existe
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    
    if (client.propietarioModel === 'User' && !client.propietario.equals(req.user._id)) {
      return res.status(403).json({ message: 'No tiene permisos para usar este cliente' });
    }
    
    if (client.propietarioModel === 'Company' && 
        (!req.user.company || !client.propietario.equals(req.user.company))) {
      return res.status(403).json({ message: 'No tiene permisos para usar este cliente' });
    }
    
    let propietario;
    let propietarioModel;
    
    if (req.user.company) {
      propietario = req.user.company;
      propietarioModel = 'Company';
    } else {
      propietario = req.user._id;
      propietarioModel = 'User';
    }
    
    // Validamos los usuarios asignados
    let validusuariosAsignados = [];
    if (usuariosAsignados && usuariosAsignados.length > 0) {
      if (propietarioModel === 'Company') {
        const companyUsers = await User.find({ company: propietario });
        
        validusuariosAsignados = usuariosAsignados.filter(userId => 
          companyUsers.some(user => user._id.equals(userId))
        );
      } else {
        if (usuariosAsignados.includes(req.user._id.toString())) {
          validusuariosAsignados = [req.user._id];
        }
      }
    }
    
    // Añadimos al usuario actual si no está ya incluido
    if (!validusuariosAsignados.includes(req.user._id)) {
      validusuariosAsignados.push(req.user._id);
    }
    
    // Creamos el proyecto
    const project = await Project.create({
      name,
      description,
      client: clientId,
      startDate: startDate || new Date(),
      endDate,
      propietario,
      propietarioModel,
      usuariosAsignados: validusuariosAsignados
    });
    
    res.status(201).json({
      _id: project._id,
      name: project.name,
      client: project.client,
      startDate: project.startDate,
      status: project.status,
      message: 'Proyecto creado correctamente'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear proyecto', error: error.message });
  }
};

// GET /api/project - Obtenemos todos los proyectos del usuario o su empresa
exports.getProjects = async (req, res) => {
  try {
    let searchCriteria = {};
    
    searchCriteria.$or = [{ usuariosAsignados: req.user._id }];
    
    if (req.user.company) {
      searchCriteria.$or.push({
        propietario: req.user.company,
        propietarioModel: 'Company'
      });
    } else {
      searchCriteria.$or.push({
        propietario: req.user._id,
        propietarioModel: 'User'
      });
    }
    
    searchCriteria.isDeleted = false;
    
    const { includeArchived, clientId, status, search } = req.query;
    
    if (includeArchived !== 'true') {
      searchCriteria.isArchived = false;
    }
    
    if (clientId) {
      searchCriteria.client = clientId;
    }
    
    if (status) {
      searchCriteria.status = status;
    }
    
    if (search) {
      searchCriteria.$and = [
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }
    
    // Obtenemos proyectos con información de cliente
    const projects = await Project.find(searchCriteria)
      .populate('client', 'name')
      .sort({ createdAt: -1 });
    
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener proyectos', error: error.message });
  }
};

// GET /api/project/:id - Obtenemos un proyecto por ID
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'name CIF PersonaContacto email telefono')
      .populate('usuariosAsignados', 'name email');
    
    if (!project) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }
    
    // Verificamos que el usuario tiene acceso al proyecto
    const isAssigned = project.usuariosAsignados.some(user => 
      user._id.equals(req.user._id)
    );
    
    const ispropietario = 
      (project.propietarioModel === 'User' && project.propietario.equals(req.user._id)) ||
      (project.propietarioModel === 'Company' && 
       req.user.company && project.propietario.equals(req.user.company));
    
    if (!isAssigned && !ispropietario) {
      return res.status(403).json({ message: 'No tiene permisos para ver este proyecto' });
    }
    
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener proyecto', error: error.message });
  }
};

// PUT /api/project/:id - Actualizamos un proyecto
exports.updateProject = async (req, res) => {
  try {
    const { name, description, clientId, startDate, endDate, status, usuariosAsignados } = req.body;
    
    let project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }
    
    // Verificamos que el usuario tiene permisos para editar el proyecto
    const ispropietario = 
      (project.propietarioModel === 'User' && project.propietario.equals(req.user._id)) ||
      (project.propietarioModel === 'Company' && 
       req.user.company && project.propietario.equals(req.user.company));
    
    if (!ispropietario) {
      return res.status(403).json({ message: 'No tiene permisos para editar este proyecto' });
    }
    
    // Si el proyecto está archivado, no permitimos ediciones
    if (project.isArchived) {
      return res.status(400).json({ message: 'No se puede editar un proyecto archivado' });
    }
    
    if (clientId && !project.client.equals(clientId)) {
      const client = await Client.findById(clientId);
      if (!client) {
        return res.status(404).json({ message: 'Cliente no encontrado' });
      }
      
      const hasAccessToClient = 
        (client.propietarioModel === 'User' && client.propietario.equals(req.user._id)) ||
        (client.propietarioModel === 'Company' && 
         req.user.company && client.propietario.equals(req.user.company));
      
      if (!hasAccessToClient) {
        return res.status(403).json({ message: 'No tiene permisos para usar este cliente' });
      }
      
      project.client = clientId;
    }
    
    if (usuariosAsignados && usuariosAsignados.length > 0) {
      if (project.propietarioModel === 'Company') {
        const companyUsers = await User.find({ company: project.propietario });
        
        const validusuariosAsignados = usuariosAsignados.filter(userId => 
          companyUsers.some(user => user._id.equals(userId))
        );
        
        project.usuariosAsignados = validusuariosAsignados;
      } else {
        if (usuariosAsignados.includes(req.user._id.toString())) {
          project.usuariosAsignados = [req.user._id];
        }
      }
    }
    
    // Actualizamos los campos
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (startDate) project.startDate = startDate;
    if (endDate !== undefined) project.endDate = endDate;
    if (status && ['active', 'completed', 'canceled'].includes(status)) {
      project.status = status;
    }
    
    // Guardamos los cambios
    project = await project.save();
    
    res.status(200).json({
      _id: project._id,
      name: project.name,
      status: project.status,
      message: 'Proyecto actualizado correctamente'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar proyecto', error: error.message });
  }
};

// PATCH /api/project/:id/archive - Archivamos un proyecto
exports.archiveProject = async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }
    
    // Verificamos que el usuario tiene permisos para archivar el proyecto
    const ispropietario = 
      (project.propietarioModel === 'User' && project.propietario.equals(req.user._id)) ||
      (project.propietarioModel === 'Company' && 
       req.user.company && project.propietario.equals(req.user.company));
    
    if (!ispropietario) {
      return res.status(403).json({ message: 'No tiene permisos para archivar este proyecto' });
    }
    
    project.isArchived = true;
    project = await project.save();
    
    res.status(200).json({
      _id: project._id,
      name: project.name,
      isArchived: project.isArchived,
      message: 'Proyecto archivado correctamente'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al archivar proyecto', error: error.message });
  }
};

// PATCH /api/project/:id/unarchive - Recuperamos un proyecto archivado
exports.unarchiveProject = async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }
    
    // Verificamos que el usuario tiene permisos para recuperar el proyecto
    const ispropietario = 
      (project.propietarioModel === 'User' && project.propietario.equals(req.user._id)) ||
      (project.propietarioModel === 'Company' && 
       req.user.company && project.propietario.equals(req.user.company));
    
    if (!ispropietario) {
      return res.status(403).json({ message: 'No tiene permisos para recuperar este proyecto' });
    }
    
    project.isArchived = false;
    project = await project.save();
    
    res.status(200).json({
      _id: project._id,
      name: project.name,
      isArchived: project.isArchived,
      message: 'Proyecto recuperado correctamente'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al recuperar proyecto', error: error.message });
  }
};

// DELETE /api/project/:id - Eliminamos lógicamente un proyecto
exports.softDeleteProject = async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }
    
    // Verificamos que el usuario tiene permisos para eliminar el proyecto
    const ispropietario = 
      (project.propietarioModel === 'User' && project.propietario.equals(req.user._id)) ||
      (project.propietarioModel === 'Company' && 
       req.user.company && project.propietario.equals(req.user.company));
    
    if (!ispropietario) {
      return res.status(403).json({ message: 'No tiene permisos para eliminar este proyecto' });
    }
    
    const deliveryNoteCount = await DeliveryNote.countDocuments({
      project: project._id,
      isDeleted: false
    });
    
    if (deliveryNoteCount > 0) {
      return res.status(400).json({
        message: 'No se puede eliminar el proyecto porque tiene albaranes asociados'
      });
    }
    
    project.isDeleted = true;
    project = await project.save();
    
    res.status(200).json({
      message: 'Proyecto eliminado correctamente'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar proyecto', error: error.message });
  }
};

// DELETE /api/project/:id/permanent - Eliminamos permanentemente un proyecto
exports.hardDeleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }
    
    // Verificamos que el usuario tiene permisos para eliminar el proyecto
    const ispropietario = 
      (project.propietarioModel === 'User' && project.propietario.equals(req.user._id)) ||
      (project.propietarioModel === 'Company' && 
       req.user.company && project.propietario.equals(req.user.company));
    
    if (!ispropietario) {
      return res.status(403).json({ message: 'No tiene permisos para eliminar este proyecto' });
    }
    
    const deliveryNoteCount = await DeliveryNote.countDocuments({
      project: project._id
    });
    
    if (deliveryNoteCount > 0) {
      return res.status(400).json({
        message: 'No se puede eliminar permanentemente el proyecto porque tiene albaranes asociados'
      });
    }
    
    await Project.deleteOne({ _id: req.params.id });
    
    res.status(200).json({
      message: 'Proyecto eliminado permanentemente'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar proyecto', error: error.message });
  }
};