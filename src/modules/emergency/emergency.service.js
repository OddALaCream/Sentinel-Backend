const ApiError = require('../../utils/apiError');
const { supabaseAdmin } = require('../../config/supabaseClient');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const EVIDENCE_BUCKET = 'evidences';
const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

const getEvidenceSignedUrl = async (evidenceId) => {
  const { data: evidence, error } = await supabaseAdmin
    .from('evidences')
    .select('id, tipo_evidencia, original_filename, mime_type, storage_path')
    .eq('id', evidenceId)
    .maybeSingle();

  if (error) {
    throw ApiError.internal('Error al buscar la evidencia', error.message);
  }

  if (!evidence) {
    throw ApiError.notFound('Evidencia no encontrada');
  }

  const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(evidence.storage_path, ONE_WEEK_SECONDS);

  if (signedUrlError) {
    throw ApiError.internal('Error al generar la URL firmada', signedUrlError.message);
  }

  return {
    evidence_id: evidence.id,
    tipo_evidencia: evidence.tipo_evidencia,
    original_filename: evidence.original_filename,
    mime_type: evidence.mime_type,
    signed_url: signedUrlData.signedUrl,
    expires_in_seconds: ONE_WEEK_SECONDS
  };
};

const generateEvidenceLinks = async (evidenceIds) => {
  if (!evidenceIds || evidenceIds.length === 0) return [];

  const results = await Promise.allSettled(
    evidenceIds.map((id) => getEvidenceSignedUrl(id))
  );

  return results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);
};

const sendEmergencyEmail = async ({ recipients, subject, body, evidenceIds }) => {
  const evidenceLinks = await generateEvidenceLinks(evidenceIds);
  const htmlContent = buildEmailHtml(body, evidenceLinks);

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      'accept': 'application/json'
    },
    body: JSON.stringify({
      sender: {
        name: 'Sentinel SOS',
        email: 'sentinel.help.lpz@gmail.com'
      },
      to: recipients.map((email) => ({ email })),
      subject,
      htmlContent
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw ApiError.internal('Error al enviar el correo de emergencia', data);
  }

  return {
    success: true,
    message_id: data.messageId,
    recipients_count: recipients.length,
    evidences_attached: evidenceLinks.length
  };
};

const EVIDENCE_TYPE_LABELS = {
  video: { label: 'Ver Video', color: '#7c3aed' },
  audio: { label: 'Escuchar Audio', color: '#059669' },
  imagen: { label: 'Ver Imagen', color: '#2563eb' },
  documento: { label: 'Ver Documento', color: '#d97706' },
  texto: { label: 'Ver Texto', color: '#6b7280' }
};

const buildEvidenceButtonsHtml = (evidenceLinks) => {
  if (evidenceLinks.length === 0) return '';

  const buttons = evidenceLinks
    .map((ev) => {
      const config = EVIDENCE_TYPE_LABELS[ev.tipo_evidencia] || { label: 'Ver Evidencia', color: '#2563eb' };
      return `
        <a href="${ev.signed_url}" target="_blank"
           style="display: inline-block; padding: 10px 20px; margin: 4px;
                  background-color: ${config.color}; color: white;
                  text-decoration: none; border-radius: 6px; font-size: 14px;">
          ${config.label} - ${ev.original_filename}
        </a>`;
    })
    .join('\n');

  return `
    <div style="margin-top: 16px;">
      <p style="margin: 8px 0;"><strong>Evidencias adjuntas:</strong></p>
      <div style="margin-top: 8px;">
        ${buttons}
      </div>
      <p style="margin-top: 8px; font-size: 12px; color: #6b7280;">
        Los enlaces expiran en 7 días.
      </p>
    </div>`;
};

const buildEmailHtml = (body, evidenceLinks) => {
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
        ${mediaTypes.length > 0 ? `<p style="margin: 8px 0;"><strong>Tipo de evidencia:</strong> ${mediaTypes.join(', ')}</p>` : ''}
        ${buildEvidenceButtonsHtml(evidenceLinks)}
        <div style="margin-top: 20px; padding: 12px; background-color: #fef2f2; border-radius: 6px; border-left: 4px solid #dc2626;">
          <p style="margin: 0; color: #991b1b; font-size: 14px;">
            Este correo fue enviado automáticamente por la aplicación <strong>Sentinel</strong> como parte de una alerta de emergencia SOS.
          </p>
        </div>
      </div>
    </div>
  `;
};

module.exports = { sendEmergencyEmail, getEvidenceSignedUrl };
