// Servicio de notificaciones por WhatsApp Business API (Cloud API - Meta)
// Envía notificaciones al cliente cuando cambia el estado de su vehículo.
// Requiere configurar WHATSAPP_TOKEN, WHATSAPP_PHONE_ID y WHATSAPP_ENABLED en .env

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';

// Estados que disparan notificación WhatsApp al cliente
const NOTIFIABLE_STATUSES = [
  'EN_REVISION',
  'PRESUPUESTO_PENDIENTE',
  'ESPERANDO_PIEZA',
  'LISTO'
];

// Mensajes personalizados por estado
const STATUS_MESSAGES = {
  EN_REVISION: (plate, workshopName) =>
    `🛠 *${workshopName}*\n\nHola, te informamos que tu vehículo con matrícula *${plate}* ya está siendo revisado por nuestro equipo.\n\nTe avisaremos de cualquier novedad.`,
  PRESUPUESTO_PENDIENTE: (plate, workshopName) =>
    `📄 *${workshopName}*\n\nYa tenemos listo el presupuesto para tu vehículo *${plate}*.\n\nPuedes revisarlo y contactarnos para confirmar la reparación.`,
  ESPERANDO_PIEZA: (plate, workshopName, detail) =>
    `📦 *${workshopName}*\n\nTu vehículo *${plate}* está pendiente de recibir una pieza para continuar con la reparación.${detail ? `\n\n_Detalle: ${detail}_` : ''}\n\nTe avisaremos en cuanto llegue.`,
  LISTO: (plate, workshopName) =>
    `✅ *${workshopName}*\n\n¡Tu vehículo *${plate}* está listo para recoger!\n\nPuedes pasar a recogerlo en horario de atención. ¡Gracias por confiar en nosotros!`
};

function isEnabled() {
  return process.env.WHATSAPP_ENABLED === 'true' &&
    process.env.WHATSAPP_TOKEN &&
    process.env.WHATSAPP_PHONE_ID;
}

function shouldNotify(status) {
  return NOTIFIABLE_STATUSES.includes(status);
}

// Formatear teléfono para WhatsApp API (sin + ni espacios)
function formatPhoneForWhatsApp(phone) {
  if (!phone) return null;
  return phone.replace(/[\s+\-()]/g, '');
}

// Enviar mensaje de texto por WhatsApp
async function sendTextMessage(to, text) {
  if (!isEnabled()) {
    console.log('📱 WhatsApp deshabilitado, mensaje no enviado.');
    return { sent: false, reason: 'DISABLED' };
  }

  const phoneNumber = formatPhoneForWhatsApp(to);
  if (!phoneNumber) {
    return { sent: false, reason: 'INVALID_PHONE' };
  }

  const url = `${WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_ID}/messages`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'text',
        text: { preview_url: false, body: text }
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`📱 WhatsApp enviado a ${phoneNumber}`);
      return { sent: true, messageId: result.messages?.[0]?.id };
    } else {
      console.error(`📱 WhatsApp error (${response.status}):`, JSON.stringify(result));
      return { sent: false, reason: 'API_ERROR', error: result };
    }
  } catch (error) {
    console.error('📱 WhatsApp error de conexión:', error.message);
    return { sent: false, reason: 'CONNECTION_ERROR', error: error.message };
  }
}

// Enviar documento PDF por WhatsApp
async function sendDocument(to, documentUrl, filename, caption) {
  if (!isEnabled()) {
    return { sent: false, reason: 'DISABLED' };
  }

  const phoneNumber = formatPhoneForWhatsApp(to);
  if (!phoneNumber) {
    return { sent: false, reason: 'INVALID_PHONE' };
  }

  const url = `${WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_ID}/messages`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'document',
        document: {
          link: documentUrl,
          filename: filename || 'presupuesto.pdf',
          caption: caption || 'Presupuesto de tu vehículo'
        }
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`📱 WhatsApp PDF enviado a ${phoneNumber}`);
      return { sent: true, messageId: result.messages?.[0]?.id };
    } else {
      console.error(`📱 WhatsApp PDF error (${response.status}):`, JSON.stringify(result));
      return { sent: false, reason: 'API_ERROR', error: result };
    }
  } catch (error) {
    console.error('📱 WhatsApp PDF error de conexión:', error.message);
    return { sent: false, reason: 'CONNECTION_ERROR', error: error.message };
  }
}

// Notificar cambio de estado al cliente
async function notifyStatusChange(vehicle, workshopName, detail = '') {
  if (!shouldNotify(vehicle.status)) {
    return { sent: false, reason: 'STATUS_NOT_NOTIFIABLE' };
  }

  const messageBuilder = STATUS_MESSAGES[vehicle.status];
  if (!messageBuilder) {
    return { sent: false, reason: 'NO_MESSAGE_TEMPLATE' };
  }

  const text = messageBuilder(vehicle.plate, workshopName || 'Tu Taller', detail);
  return await sendTextMessage(vehicle.phone, text);
}

// Enviar presupuesto PDF por WhatsApp
async function sendQuotePdf(vehicle, workshopName, pdfPublicUrl) {
  if (!isEnabled()) {
    return { sent: false, reason: 'DISABLED' };
  }

  const caption = `📄 Presupuesto para tu vehículo ${vehicle.plate} — ${workshopName || 'Tu Taller'}`;
  return await sendDocument(
    vehicle.phone,
    pdfPublicUrl,
    `presupuesto-${vehicle.plate}.pdf`,
    caption
  );
}

module.exports = {
  isEnabled,
  shouldNotify,
  sendTextMessage,
  sendDocument,
  notifyStatusChange,
  sendQuotePdf,
  NOTIFIABLE_STATUSES,
  STATUS_MESSAGES
};
