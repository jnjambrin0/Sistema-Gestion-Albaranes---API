const { WebClient } = require('@slack/web-api');

// Cliente de Slack para notificaciones
const slack = new WebClient(process.env.SLACK_TOKEN);

// Middleware para errores 404
const notFound = (req, res, next) => {
  const error = new Error(`Ruta no encontrada - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Middleware para errores en general
const errorHandler = async (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
  
  if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    try {
      await slack.chat.postMessage({
        channel: process.env.SLACK_ERROR_CHANNEL,
        text: `Error en API: ${err.message}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Error en API*: ${err.message}`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Ruta*: ${req.originalUrl}\n*Método*: ${req.method}\n*IP*: ${req.ip}`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Stack*: \`\`\`${err.stack}\`\`\``
            }
          }
        ]
      });
    } catch (slackError) {
      console.error('Error al enviar notificación a Slack:', slackError);
    }
  }
};

module.exports = { notFound, errorHandler };