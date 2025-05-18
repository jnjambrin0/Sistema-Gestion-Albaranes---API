# Guía de Uso - Sistema de Gestión de Albaranes

Esta guía describe el flujo completo para utilizar la aplicación, desde la configuración inicial hasta el almacenamiento de PDFs en Firebase y el envío de correos electrónicos.

## Índice
1. [Configuración Inicial](#configuración-inicial)
2. [Registro y Autenticación](#registro-y-autenticación)
3. [Gestión de Empresas](#gestión-de-empresas)
4. [Gestión de Clientes](#gestión-de-clientes)
5. [Gestión de Proyectos](#gestión-de-proyectos)
6. [Gestión de Albaranes](#gestión-de-albaranes)
7. [Almacenamiento en Firebase](#almacenamiento-en-firebase)
8. [Envío de Correos Electrónicos](#envío-de-correos-electrónicos)

## Configuración Inicial

### Requisitos Previos
- Node.js v16+
- MongoDB
- Cuenta en Firebase para almacenamiento
- Cuenta en Mailgun para envío de emails (validación, restablecimiento, invitación)

### Configuración del Entorno
1. Clona el repositorio
2. Crea un archivo `.env` basado en `.env.example` con tus credenciales:
   ```
   PORT=5001
   NODE_ENV=development
   
   # MongoDB
   MONGODB_URI=tu_uri_mongodb
   
   # JWT
   JWT_SECRET=tu_jwt_secret
   
   # Firebase
   FIREBASE_API_KEY=tu_api_key
   FIREBASE_AUTH_DOMAIN=tu_auth_domain
   FIREBASE_PROJECT_ID=tu_project_id
   FIREBASE_STORAGE_BUCKET=tu_storage_bucket
   FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
   FIREBASE_APP_ID=tu_app_id
   
   # Mailgun
   MAILGUN_API_KEY=tu_api_key
   MAILGUN_DOMAIN=tu_domain
   MAILGUN_FROM_EMAIL=noreply@tu_dominio.com
   
   # Frontend URL (for email links)
   FRONTEND_URL=http://localhost:3000 # URL del frontend (para enlaces de email)
   ```

3. Instala las dependencias:
   ```
   npm install
   ```

4. Inicia la aplicación:
   ```
   npm run dev
   ```

## Registro y Autenticación

### Registro de Usuario
1. Realiza una petición POST a `/api/user/register` con los siguientes datos:
   ```json
   {
     "name": "Tu Nombre",
     "email": "tucorreo@ejemplo.com",
     "password": "tucontraseña"
   }
   ```

2. Recibirás un correo de validación en la dirección proporcionada (si Mailgun está configurado).

### Validación de Email
1. Abre el enlace en el correo electrónico, o usa el token recibido para hacer una petición PUT a `/api/user/validation`:
   ```json
   {
     "token": "token_de_validación"
   }
   ```

### Inicio de Sesión
1. Realiza una petición POST a `/api/user/login` con tus credenciales:
   ```json
   {
     "email": "tucorreo@ejemplo.com",
     "password": "tucontraseña"
   }
   ```
2. Asegúrate de que tu email ha sido validado.
3. Guarda el token JWT recibido para futuras peticiones autorizadas (envíalo en el header `Authorization: Bearer <token>`).

### Restablecimiento de Contraseña
1. Si olvidaste tu contraseña, realiza una petición POST a `/api/user/forgot-password`:
   ```json
   {
     "email": "tucorreo@ejemplo.com"
   }
   ```

2. Recibirás un correo electrónico con un enlace o token (si Mailgun está configurado).

3. Usa ese token para realizar una petición PUT a `/api/user/reset-password`:
   ```json
   {
     "token": "token_recibido",
     "password": "nueva_contraseña"
   }
   ```

### Obtener Perfil de Usuario
1. Con sesión iniciada, realiza una petición GET a `/api/user/profile`.

### Actualizar Perfil de Usuario
1. Con sesión iniciada, realiza una petición PATCH a `/api/user/profile`:
   ```json
   {
     "name": "Nuevo Nombre", // Opcional
     "email": "nuevoemail@ejemplo.com" // Opcional. Cambiar el email requiere nueva validación.
   }
   ```

### Eliminar Cuenta de Usuario
1. **Eliminación Lógica (Soft Delete):** Realiza una petición DELETE a `/api/user`. El usuario se marcará como eliminado pero permanecerá en la base de datos.
2. **Eliminación Permanente (Hard Delete):** Realiza una petición DELETE a `/api/user/permanent`. Esta acción es irreversible y eliminará al usuario y potencialmente datos asociados. **(Precaución: Verifica la lógica exacta de eliminación en cascada si existe)**.

## Gestión de Empresas

### Crear Empresa
1. Con sesión iniciada, realiza una petición POST a `/api/user/company`:
   ```json
   {
     "name": "Nombre de tu Empresa",
     "CIF": "B12345678",
     "direccion": { // Opcional
       "calle": "Calle Falsa 123",
       "ciudad": "Ciudad",
       "CP": "28000",
       "pais": "España"
     },
     "telefono": "912345678", // Opcional
     "email": "empresa@ejemplo.com" // Opcional
   }
   ```
2. El usuario creador se convierte en el administrador de la empresa y se asocia automáticamente a ella.

### Asociar Usuario a Empresa Existente (Como Miembro)
1. Actualmente, los usuarios se unen a empresas principalmente a través de invitaciones (ver abajo). Un usuario podría cambiar su empresa activa si pertenece a varias (ver `Actualizar Empresa Asociada`).

### Actualizar Empresa Asociada (Para el Usuario Actual)
1. Si un usuario pertenece a múltiples empresas (fue invitado o creó varias), puede cambiar su `company` activa realizando una petición PATCH a `/api/user/company`:
   ```json
   {
     "companyId": "ID_de_la_empresa_a_activar"
   }
   ```
2. El usuario debe ser miembro o administrador de la empresa con `companyId`.

### Invitar Usuarios a la Empresa
1. Como administrador de la empresa, realiza una petición POST a `/api/user/invite`:
   ```json
   {
     "email": "usuarioainvitar@ejemplo.com"
   }
   ```
2. El usuario recibirá un correo de invitación (si Mailgun está configurado).

### Aceptar Invitación a Empresa
1. El usuario invitado debe usar el token del correo para realizar una petición POST a `/api/user/accept-invitation`:
   ```json
   {
     "token": "token_de_invitacion",
     "userId": "ID_del_usuario_que_acepta" // Generalmente, el ID del usuario logueado que recibió la invitación
   }
   ```

## Gestión de Clientes

*Nota: Los clientes pertenecen a un Usuario o a una Empresa.*

### Crear Cliente
1. Realiza una petición POST a `/api/client`:
   ```json
   {
     "name": "Nombre del Cliente",
     "CIF": "A87654321",
     "direccion": { // Opcional
       "calle": "Gran Vía 1",
       "ciudad": "Madrid",
       "CP": "28013",
       "pais": "España"
     },
     "telefono": "987654321", // Opcional
     "email": "cliente@ejemplo.com", // Opcional
     "PersonaContacto": "Persona de Contacto" // Opcional
   }
   ```
2. El cliente se asignará automáticamente al usuario o a la empresa del usuario que realiza la petición.

### Listar Clientes
1. Realiza una petición GET a `/api/client`.
2. Puedes filtrar por búsqueda: `/api/client?search=texto`.
3. Puedes incluir archivados: `/api/client?includeArchived=true`.
4. Solo se devuelven los clientes pertenecientes al usuario o a su empresa activa.

### Ver Detalles de un Cliente
1. Realiza una petición GET a `/api/client/{clientId}`.

### Actualizar Cliente
1. Realiza una petición PUT a `/api/client/{clientId}` con los datos a actualizar (similar al body de creación). No se puede editar un cliente archivado.

### Archivar Cliente
1. Realiza una petición PATCH a `/api/client/{clientId}/archive`.

### Recuperar Cliente Archivado
1. Realiza una petición PATCH a `/api/client/{clientId}/unarchive`.

### Eliminar Cliente
1. **Eliminación Lógica (Soft Delete):** Realiza una petición DELETE a `/api/client/{clientId}`. El cliente se marca como `isDeleted=true`. No se puede eliminar si tiene proyectos activos asociados.
2. **Eliminación Permanente (Hard Delete):** Realiza una petición DELETE a `/api/client/{clientId}/permanent`. Elimina el cliente de forma permanente. **(Precaución)**

## Gestión de Proyectos

*Nota: Los proyectos pertenecen a un Usuario o a una Empresa y están asociados a un Cliente.*

### Crear Proyecto
1. Realiza una petición POST a `/api/project`:
   ```json
   {
     "name": "Nombre del Proyecto",
     "clientId": "ID_del_Cliente_existente", // Cliente debe pertenecer al mismo propietario (User/Company)
     "description": "Descripción del proyecto", // Opcional
     "startDate": "2023-01-01", // Opcional
     "endDate": "2023-12-31", // Opcional
     "usuariosAsignados": ["ID_usuario_1", "ID_usuario_2"] // Opcional. Si el proyecto es de empresa, solo usuarios de esa empresa.
   }
   ```
2. El proyecto se asignará al usuario o empresa del creador. El creador se añade automáticamente a `usuariosAsignados`.

### Listar Proyectos
1. Realiza una petición GET a `/api/project`.
2. Puedes filtrar por cliente (`clientId`), estado (`status`), búsqueda (`search`).
3. Puedes incluir archivados: `/api/project?includeArchived=true`.
4. Solo se devuelven los proyectos donde el usuario está asignado o los proyectos de su empresa activa.

### Ver Detalles de un Proyecto
1. Realiza una petición GET a `/api/project/{projectId}`.

### Actualizar Proyecto
1. Realiza una petición PUT a `/api/project/{projectId}` con los datos a actualizar: `name`, `description`, `clientId`, `startDate`, `endDate`, `status`, `usuariosAsignados`.
2. Solo el propietario (User/Company) puede editar. No se puede editar un proyecto archivado.

### Archivar Proyecto
1. Realiza una petición PATCH a `/api/project/{projectId}/archive`.

### Recuperar Proyecto Archivado
1. Realiza una petición PATCH a `/api/project/{projectId}/unarchive`.

### Eliminar Proyecto
1. **Eliminación Lógica (Soft Delete):** Realiza una petición DELETE a `/api/project/{projectId}`. El proyecto se marca como `isDeleted=true`. No se puede eliminar si tiene albaranes asociados.
2. **Eliminación Permanente (Hard Delete):** Realiza una petición DELETE a `/api/project/{projectId}/permanent`. Elimina el proyecto de forma permanente. **(Precaución)**

## Gestión de Albaranes

*Nota: Los albaranes pertenecen a un Proyecto y registran un Creador (User) y opcionalmente una Empresa.*

### Crear Albarán
1. Realiza una petición POST a `/api/deliverynote`:
   ```json
   {
     "projectId": "ID_del_Proyecto_existente", // Usuario debe tener acceso al proyecto
     "items": [
       {
         "description": "Desarrollo módulo login",
         "cantidad": 8, // Número de unidades/horas/kg...
         "unidad": "hour", // 'hour', 'unidad', 'kg', 'metros', 'litro'
         "precioUnidad": 50 // Opcional: Precio por unidad/hora/kg...
       },
       {
         "description": "Materiales varios",
         "cantidad": 1,
         "unidad": "unidad",
         "precioUnidad": 150.75
       },
       {
         "description": "Licencia Software",
         "cantidad": 1,
         "unidad": "unidad" // Sin precioUnidad, importe = cantidad
       }
     ],
     "notes": "Entrega parcial del proyecto" // Opcional
   }
   ```
2. El sistema genera automáticamente el número de albarán (`number`), la fecha (`date`), calcula el `importe` de cada item y el `totalcantidad`.
3. Se genera un PDF del albarán y se sube a Firebase (`pdfUrl`). El estado inicial es `sent`.

### Listar Albaranes
1. Realiza una petición GET a `/api/deliverynote`.
2. Puedes filtrar por `projectId`, `clientId`, `status`, `search`, fechas (`fromDate`, `toDate`).
3. Solo se devuelven los albaranes creados por el usuario o pertenecientes a su empresa activa.

### Ver Detalles de un Albarán
1. Realiza una petición GET a `/api/deliverynote/{deliveryNoteId}`.

### Obtener URL del PDF de un Albarán
1. Realiza una petición GET a `/api/deliverynote/{deliveryNoteId}/pdf`.
2. Si el albarán está firmado, puedes obtener el PDF firmado añadiendo `?signed=true`.
3. La respuesta será un JSON con la URL del PDF solicitado:
   ```json
   {
     "pdfUrl": "https://url.firebase.storage/..."
   }
   ```

### Firmar un Albarán
1. Realiza una petición POST a `/api/deliverynote/{deliveryNoteId}/sign`:
   ```json
   {
     "signatureImage": "data:image/png;base64,...", // Imagen de la firma en Base64
     "signedBy": "Nombre del Firmante"
   }
   ```
2. El sistema:
   - Sube la imagen de la firma a Firebase.
   - Genera un nuevo PDF incluyendo la firma.
   - Sube el PDF firmado a Firebase (`signedPdfUrl`).
   - Actualiza el estado del albarán a `signed` y guarda los detalles de la firma.

### Eliminar Albarán (Lógico)
1. Realiza una petición DELETE a `/api/deliverynote/{deliveryNoteId}`.
2. El albarán se marca como `isDeleted=true`.
3. **Importante:** Solo se pueden eliminar albaranes que *no* estén en estado `signed`.

## Almacenamiento en Firebase

Cuando se crea o se firma un albarán, el sistema automáticamente:

1. Genera el archivo PDF correspondiente (original o firmado) utilizando `pdf-lib` u otra librería similar.
2. Sube el archivo a Firebase Storage en la ruta `pdfs/` (para originales) o `signed-pdfs/` (para firmados) o similar (ver `fileUploader.js` para rutas exactas como `albaranes/` o `pdfs/`). Las firmas se guardan en `signatures/`.
3. Almacena la URL pública del archivo (`pdfUrl` o `signedPdfUrl`) en el documento del albarán en MongoDB.

Para acceder a los PDFs almacenados:

1. Utiliza la ruta `GET /api/deliverynote/{deliveryNoteId}/pdf` (o `?signed=true`) para obtener la URL.
2. Usa la URL devuelta para descargar o visualizar el PDF directamente desde Firebase Storage.

## Envío de Correos Electrónicos

El sistema utiliza Mailgun (si está configurado en `.env`) para enviar correos electrónicos transaccionales:

- **Validación de Email:** Al registrar un nuevo usuario.
- **Restablecimiento de Contraseña:** Cuando un usuario solicita restablecer su contraseña.
- **Invitación a Empresa:** Cuando un administrador invita a un usuario a unirse a su empresa.

*(Nota: La funcionalidad de enviar manualmente un albarán por email (`POST /api/deliverynote/{deliveryNoteId}/send`) mencionada en versiones anteriores no parece estar implementada en las rutas actuales proporcionadas.)*
