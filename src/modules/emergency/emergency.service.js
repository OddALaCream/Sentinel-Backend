const { Resend } = require('resend');
const ApiError = require('../../utils/apiError');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmergencyEmail = async ({ recipients, subject, body, evidenceIds }) => {
  const htmlContent = buildEmailHtml(body, evidenceIds);

  const { data, error } = await resend.emails.send({
    from: 'Sentinel SOS <onboarding@resend.dev>',
    to: recipients,
    subject,
    html: htmlContent
  });

  if (error) {
    throw ApiError.internal('Error al enviar el correo de emergencia', error);
  }

  return {
    success: true,
    message_id: data.id,
    recipients_count: recipients.length
  };
};

const buildEmailHtml = (body, evidenceIds) => {
  const { alert_message, location_url, alert_triggered_at, has_video, has_audio } = body;

  const formattedDate = new Date(alert_triggered_at).toLocaleString('es-MX', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City'
  });

  const mediaTypes = [];
  if (has_video) mediaTypes.push('Video');
  if (has_audio) mediaTypes.push('Audio');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">⚠️ ALERTA DE EMERGENCIA SOS</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">${alert_message}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
        <p style="margin: 8px 0;"><strong>Fecha y hora:</strong> ${formattedDate}</p>
        ${location_url ? `<p style="margin: 8px 0;"><strong>Ubicación:</strong> <a href="${location_url}" style="color: #2563eb;">Ver en Google Maps</a></p>` : ''}
        ${mediaTypes.length > 0 ? `<p style="margin: 8px 0;"><strong>Evidencia adjunta:</strong> ${mediaTypes.join(', ')}</p>` : ''}
        ${evidenceIds && evidenceIds.length > 0 ? `<p style="margin: 8px 0;"><strong>IDs de evidencia:</strong> ${evidenceIds.join(', ')}</p>` : ''}
        <div style="margin-top: 20px; padding: 12px; background-color: #fef2f2; border-radius: 6px; border-left: 4px solid #dc2626;">
          <p style="margin: 0; color: #991b1b; font-size: 14px;">
            Este correo fue enviado automáticamente por la aplicación <strong>Sentinel</strong> como parte de una alerta de emergencia SOS.
          </p>
        </div>
      </div>
    </div>
  `;
};

module.exports = { sendEmergencyEmail };
