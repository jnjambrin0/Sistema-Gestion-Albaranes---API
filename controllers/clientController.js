const Client = require('../models/Client');
const User = require('../models/User');
const Project = require('../models/Project');

// POST /api/client - Creamos un nuevo cliente
exports.createClient = async (req, res) => {
  try {
    const { name, CIF, PersonaContacto, email, telefono, direccion } = req.body;
    
    // Vemos si el usuario es una empresa o un usuario
    let propietario;
    let propietarioModel;
    
    if (req.user.company) {
      propietario = req.user.company;
      propietarioModel = 'Company';
    } else {
      propietario = req.user._id;
      propietarioModel = 'User';
    }
    
    // Verificamos quen o exista
    const clientExists = await Client.findOne({
      CIF,
      propietario,
      propietarioModel,
      isDeleted: false
    });
    
    if (clientExists) {
      return res.status(400).json({ message: 'Ya existe un cliente con ese NIF/CIF' });
    }
    
    // Creamos el cliente
    const client = await Client.create({
      name,
      CIF,
      PersonaContacto,
      email,
      telefono,
      direccion,
      propietario,
      propietarioModel
    });
    
    res.status(201).json({
      _id: client._id,
      name: client.name,
      CIF: client.CIF,
      PersonaContacto: client.PersonaContacto,
      email: client.email,
      message: 'Cliente creado correctamente'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear cliente', error: error.message });
  }
};

// GET /api/client - Obtenemos todos los clientes del usuario o su empresa
exports.getClients = async (req, res) => {
  try {
    // Vemos si buscar por usuario o por empresa
    let searchCriteria = {};
    
    if (req.user.company) {
      searchCriteria = {
        propietario: req.user.company,
        propietarioModel: 'Company',
        isDeleted: false
      };
    } else {
      searchCriteria = {
        propietario: req.user._id,
        propietarioModel: 'User',
        isDeleted: false
      };
    }
    
    // Obtenemos los parámetros de consulta para que podamos filtrar
    const { includeArchived, search } = req.query;
    
    if (includeArchived !== 'true') {
      searchCriteria.isArchived = false;
    }
    
    if (search) {
      searchCriteria.$or = [
        { name: { $regex: search, $options: 'i' } },
        { CIF: { $regex: search, $options: 'i' } },
        { PersonaContacto: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Obtenemos los clientes
    const clients = await Client.find(searchCriteria)
      .sort({ name: 1 });
    
    res.status(200).json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener clientes', error: error.message });
  }
};

// GET /api/client/:id - Obtenemos un cliente por ID
exports.getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    
    if (client.propietarioModel === 'User' && !client.propietario.equals(req.user._id)) {
      return res.status(403).json({ message: 'No tiene permisos para ver este cliente' });
    }
    
    if (client.propietarioModel === 'Company' && 
        (!req.user.company || !client.propietario.equals(req.user.company))) {
      return res.status(403).json({ message: 'No tiene permisos para ver este cliente' });
    }
    
    res.status(200).json(client);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener cliente', error: error.message });
  }
};

// PUT /api/client/:id - Actualizamos un cliente
exports.updateClient = async (req, res) => {
  try {
    const { name, CIF, PersonaContacto, email, telefono, direccion } = req.body;
    
    let client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    
    // Verificar que el usuario tiene acceso al cliente
    if (client.propietarioModel === 'User' && !client.propietario.equals(req.user._id)) {
      return res.status(403).json({ message: 'No tiene permisos para editar este cliente' });
    }
    
    if (client.propietarioModel === 'Company' && 
        (!req.user.company || !client.propietario.equals(req.user.company))) {
      return res.status(403).json({ message: 'No tiene permisos para editar este cliente' });
    }
    
    if (client.isArchived) {
      return res.status(400).json({ message: 'No se puede editar un cliente archivado' });
    }
    
    // Actualizamos los campos
    if (name) client.name = name;
    if (CIF) client.CIF = CIF;
    if (PersonaContacto !== undefined) client.PersonaContacto = PersonaContacto;
    if (email !== undefined) client.email = email;
    if (telefono !== undefined) client.telefono = telefono;
    if (direccion) client.direccion = direccion;
    
    client = await client.save();
    
    res.status(200).json({
      _id: client._id,
      name: client.name,
      CIF: client.CIF,
      PersonaContacto: client.PersonaContacto,
      email: client.email,
      message: 'Cliente actualizado correctamente'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar cliente', error: error.message });
  }
};

// PATCH /api/client/:id/archive - Archivamos un cliente
exports.archiveClient = async (req, res) => {
  try {
    let client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    
    // Verificamos que el usuario tiene acceso al cliente
    if (client.propietarioModel === 'User' && !client.propietario.equals(req.user._id)) {
      return res.status(403).json({ message: 'No tiene permisos para archivar este cliente' });
    }
    
    if (client.propietarioModel === 'Company' && 
        (!req.user.company || !client.propietario.equals(req.user.company))) {
      return res.status(403).json({ message: 'No tiene permisos para archivar este cliente' });
    }
    
    client.isArchived = true;
    client = await client.save();
    
    res.status(200).json({
      _id: client._id,
      name: client.name,
      isArchived: client.isArchived,
      message: 'Cliente archivado correctamente'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al archivar cliente', error: error.message });
  }
};

// PATCH /api/client/:id/unarchive - Recuperamos un cliente archivado
exports.unarchiveClient = async (req, res) => {
  try {
    let client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    
    // Verificamos que el usuario tiene acceso al cliente
    if (client.propietarioModel === 'User' && !client.propietario.equals(req.user._id)) {
      return res.status(403).json({ message: 'No tiene permisos para recuperar este cliente' });
    }
    
    if (client.propietarioModel === 'Company' && 
        (!req.user.company || !client.propietario.equals(req.user.company))) {
      return res.status(403).json({ message: 'No tiene permisos para recuperar este cliente' });
    }
    
    client.isArchived = false;
    client = await client.save();
    
    res.status(200).json({
      _id: client._id,
      name: client.name,
      isArchived: client.isArchived,
      message: 'Cliente recuperado correctamente'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al recuperar cliente', error: error.message });
  }
};

// DELETE /api/client/:id - Eliminamos lógicamente un cliente
exports.softDeleteClient = async (req, res) => {
  try {
    let client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    
    // Verificar que el usuario tiene acceso al cliente
    if (client.propietarioModel === 'User' && !client.propietario.equals(req.user._id)) {
      return res.status(403).json({ message: 'No tiene permisos para eliminar este cliente' });
    }
    
    if (client.propietarioModel === 'Company' && 
        (!req.user.company || !client.propietario.equals(req.user.company))) {
      return res.status(403).json({ message: 'No tiene permisos para eliminar este cliente' });
    }
    
    // Verificamos si el cliente tiene proyectos asociados
    const projectCount = await Project.countDocuments({
      client: client._id,
      isDeleted: false
    });
    
    if (projectCount > 0) {
      return res.status(400).json({
        message: 'No se puede eliminar el cliente porque tiene proyectos asociados'
      });
    }
    
    client.isDeleted = true;
    client = await client.save();
    
    res.status(200).json({
      message: 'Cliente eliminado correctamente'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar cliente', error: error.message });
  }
};

// DELETE /api/client/:id/permanent - Eliminamos permanentemente un cliente
exports.hardDeleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    
    // Verificamos que el usuario tiene acceso al cliente
    if (client.propietarioModel === 'User' && !client.propietario.equals(req.user._id)) {
      return res.status(403).json({ message: 'No tiene permisos para eliminar este cliente' });
    }
    
    if (client.propietarioModel === 'Company' && 
        (!req.user.company || !client.propietario.equals(req.user.company))) {
      return res.status(403).json({ message: 'No tiene permisos para eliminar este cliente' });
    }
    
    // Verificamos si el cliente tiene proyectos asociados
    const projectCount = await Project.countDocuments({
      client: client._id
    });
    
    if (projectCount > 0) {
      return res.status(400).json({
        message: 'No se puede eliminar permanentemente el cliente porque tiene proyectos asociados'
      });
    }
    
    await Client.deleteOne({ _id: req.params.id });
    
    res.status(200).json({
      message: 'Cliente eliminado permanentemente'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar cliente', error: error.message });
  }
};