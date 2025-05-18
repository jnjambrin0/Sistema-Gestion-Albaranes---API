const FormData = require('form-data');
const Mailgun = require('mailgun.js');

// Creamos el cliente de Mailgun
const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY,
  url: 'https://api.mailgun.net'
});
const mailgunDomain = process.env.MAILGUN_DOMAIN || 'sandbox1b7f9742e639483c84e979e13fbe4081.mailgun.org';
const mailgunFromdireccion = process.env.MAILGUN_FROM_EMAIL ? process.env.MAILGUN_FROM_EMAIL.match(/<(.+)>/)[1] : 'postmaster@sandbox1b7f9742e639483c84e979e13fbe4081.mailgun.org';

// Funcion para enviar un email de validación de cuenta
const sendValidationEmail = async (email, token) => {
  try {
    const validationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/validate-email?token=${token}`;
    
    const messageData = {
      from: mailgunFromdireccion,
      to: email,
      subject: 'Validación de cuenta',
      html: `
        <h1>Bienvenido a la plataforma de gestión de albaranes</h1>
        <p>Por favor, haga clic en el siguiente enlace para validar su cuenta:</p>
        <a href="${validationUrl}" style="
          display: inline-block;
          padding: 10px 20px;
          background-color: #4CAF50;
          color: white;
          text-decoration: none;
          border-radius: 5px;
        ">Validar cuenta</a>
        <p>Si no ha solicitado esta cuenta, ignore este correo.</p>
      `
    };
    
    console.log(`Enviando email de validación a ${email}`);
    const result = await mg.messages.create(mailgunDomain, messageData);
    console.log('Email enviado correctamente:', result);
    return result;
  } catch (error) {
    console.error('Error enviando email de validación:', error);
    // En lugar de lanzar el error, devolvemos una promesa resuelta como fallida
    return Promise.resolve({ success: false, error: error.message });
  }
};

// Funcion para enviar un email para restablecer contraseña
const sendPasswordResetEmail = async (email, token) => {
  try {
    // URL de restablecimiento (frontend)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    const messageData = {
      from: mailgunFromdireccion,
      to: email,
      subject: 'Restablecimiento de contraseña',
      html: `
        <h1>Restablecimiento de contraseña</h1>
        <p>Ha solicitado restablecer su contraseña. Haga clic en el siguiente enlace:</p>
        <a href="${resetUrl}" style="
          display: inline-block;
          padding: 10px 20px;
          background-color: #2196F3;
          color: white;
          text-decoration: none;
          border-radius: 5px;
        ">Restablecer contraseña</a>
        <p>Este enlace es válido durante 30 minutos.</p>
        <p>Si no ha solicitado restablecer su contraseña, ignore este correo.</p>
      `
    };
    
    console.log(`Enviando email de restablecimiento de contraseña a ${email}`);
    const result = await mg.messages.create(mailgunDomain, messageData);
    console.log('Email enviado correctamente:', result);
    return result;
  } catch (error) {
    console.error('Error enviando email de restablecimiento de contraseña:', error);
    return Promise.resolve({ success: false, error: error.message });
  }
};

// Funcion para enviar un email de invitación a la empresa
const sendInvitationEmail = async (email, token, companyName) => {
  try {
    const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invitation?token=${token}`;
    
    const messageData = {
      from: mailgunFromdireccion,
      to: email,
      subject: `Invitación para unirse a ${companyName}`,
      html: `
        <h1>Invitación para unirse a ${companyName}</h1>
        <p>Ha sido invitado a unirse a la empresa ${companyName} en la plataforma de gestión de albaranes.</p>
        <p>Si ya tiene una cuenta, haga clic en el siguiente enlace para aceptar la invitación:</p>
        <a href="${invitationUrl}" style="
          display: inline-block;
          padding: 10px 20px;
          background-color: #673AB7;
          color: white;
          text-decoration: none;
          border-radius: 5px;
        ">Aceptar invitación</a>
        <p>Si no tiene una cuenta, regístrese primero y luego utilice el enlace de arriba.</p>
        <p>Esta invitación es válida durante 7 días.</p>
      `
    };
    
    console.log(`Enviando email de invitación a ${email}`);
    const result = await mg.messages.create(mailgunDomain, messageData);
    console.log('Email enviado correctamente:', result);
    return result;
  } catch (error) {
    console.error('Error enviando email de invitación:', error);
    return Promise.resolve({ success: false, error: error.message });
  }
};

module.exports = {
  sendValidationEmail,
  sendPasswordResetEmail,
  sendInvitationEmail
};