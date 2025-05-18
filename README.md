# Sistema de Gestión de Albaranes - API

## Descripción del Proyecto

Esta es la API REST para un sistema de gestión de albaranes, clientes, proyectos y usuarios. Permite a los usuarios (o empresas) gestionar sus relaciones comerciales, seguir el progreso de los proyectos y generar albaranes en formato PDF, almacenándolos en Firebase y enviando notificaciones por correo electrónico, y manejando y almancenado errores en Slack

## Prerrequisitos

- Node.js (v16 o superior recomendado)
- MongoDB (local o Atlas)
- Cuenta de Firebase (para almacenamiento de PDF)
- Cuenta de Mailgun (para envío de correos de validación/restablecimiento/invitación)
- Cuenta de Slack (no he conseguido crearla para el API, pero lo he simulado)

## Configuración

1.  **Clonar el Repositorio:** (Si aplica)
    ```bash
    git clone [<Sistema-Gestion-Albaranes - API>](https://github.com/jnjambrin0/Sistema-Gestion-Albaranes---API)
    cd <Sistema-Gestion-Albaranes---API>
    ```
2.  **Variables de Entorno:**
    Crear un archivo `.env` en la raíz del proyecto copiando el contenido de `.env.example` y rellenando los valores correspondientes:
    ```dotenv
    PORT=5001
    NODE_ENV=development
    
    # MongoDB
    MONGO_URI=mongodb+srv://...
    
    # JWT
    JWT_SECRET=tu_secreto_jwt_muy_seguro
    
    # Firebase
    FIREBASE_API_KEY=...
    FIREBASE_AUTH_DOMAIN=...
    FIREBASE_PROJECT_ID=...
    FIREBASE_STORAGE_BUCKET=...
    FIREBASE_MESSAGING_SENDER_ID=...
    FIREBASE_APP_ID=...
    
    # Mailgun
    MAILGUN_API_KEY=...
    MAILGUN_DOMAIN=...
    MAILGUN_FROM_EMAIL=...
    
    # Frontend URL (para enlaces de email)
    FRONTEND_URL=http://localhost:3000 

    SLACK_TOKEN=your_slack_token
    SLACK_ERROR_CHANNEL=api-errors
    ```

## Instalación

Instalar las dependencias del proyecto:

```bash
npm install
```

## Ejecución

Para iniciar el servidor en modo de desarrollo (con recarga automática):

```bash
npm run dev
```

El servidor estará disponible por defecto en `http://localhost:5001` (o el puerto especificado en `.env`).

Para iniciar en modo producción:

```bash
npm start
```

## Pruebas Unitarias y de Integración

Se ha implementado una suite de pruebas utilizando Jest y Supertest para verificar la funcionalidad de la API.

Para ejecutar las pruebas:

```bash
npm run test
```

**Estado Actual:** Todos los tests (4 suites, 28 tests en total) pasan correctamente, asegurando la funcionalidad de los endpoints, la lógica del back y las interacciones (simuladas) con servicios externos como Firebase y Mailgun.

## Características Principales

- **Gestión de Usuarios:** Registro, validación de email, inicio de sesión, actualización de perfil, restablecimiento de contraseña, eliminación (lógica y permanente).
- **Gestión de Empresas:** Creación de empresas, asociación de usuarios, invitaciones.
- **Gestión de Clientes:** CRUD completo, archivo/desarchivo, eliminación lógica y permanente.
- **Gestión de Proyectos:** CRUD completo, asignación de usuarios, archivo/desarchivo, eliminación lógica y permanente.
- **Gestión de Albaranes:**
    - Creación asociada a proyectos.
    - Generación automática de número de albarán.
    - Cálculo automático de importes.
    - **Generación de PDF:** Creación automática de un PDF para cada albarán.
    - **Almacenamiento en Firebase:** Subida automática de los PDFs generados a Firebase Storage.
    - Firma de albaranes (con almacenamiento de firma y PDF firmado).
    - Eliminación lógica.
- **Autenticación y Autorización:** Mediante JWT y middleware para proteger rutas y verificar permisos.
- **Validación:** Uso de `express-validator` para validar las entradas de la API.
- **Envío de Correos:** Integración con Mailgun para emails transaccionales.

## Documentación de la API (Swagger)

La API está documentada utilizando Swagger con JSDoc.

Una vez que el servidor está en ejecución, se puede acceder a la documentación interactiva en la siguiente ruta:

`/api-docs`

(Ejemplo: `http://localhost:5001/api-docs`)

## Tecnologías Utilizadas

- **Backend:** Node.js, Express.js
- **Base de Datos:** MongoDB (con Mongoose)
- **Autenticación:** JSON Web Tokens (JWT)
- **Validación:** express-validator
- **Almacenamiento de Archivos:** Firebase Storage
- **Envío de Emails:** Mailgun
- **Generación de PDF:** pdfkit
- **Testing:** Jest, Supertest
- **Documentación:** Swagger (swagger-jsdoc, swagger-ui-express)
- **Otros:** dotenv, cors, helmet, morgan, bcryptjs 