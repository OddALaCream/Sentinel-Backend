const { z, validate } = require('../../utils/validators');
const asyncHandler = require('../../utils/asyncHandler');
const emergencyService = require('./emergency.service');

const sendEmailSchema = z.object({
  recipients: z
    .array(z.string().email('Cada destinatario debe ser un email válido'))
    .min(1, 'Se requiere al menos un destinatario')
    .max(50, 'Máximo 50 destinatarios'),
  subject: z.string().trim().min(1, 'subject es obligatorio').max(500),
  body: z.object({
    alert_message: z.string().trim().min(1, 'alert_message es obligatorio'),
    location_url: z.string().url('location_url debe ser una URL válida').optional(),
    alert_triggered_at: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
      message: 'alert_triggered_at debe ser una fecha ISO 8601 válida'
    }),
    has_video: z.boolean().optional().default(false),
    has_audio: z.boolean().optional().default(false)
  }),
  evidence_ids: z.array(z.string()).optional().default([])
});

const sendEmail = asyncHandler(async (req, res) => {
  const { recipients, subject, body, evidence_ids } = req.body;

  const result = await emergencyService.sendEmergencyEmail({
    recipients,
    subject,
    body,
    evidenceIds: evidence_ids
  });

  return res.status(200).json(result);
});

module.exports = {
  sendEmailValidation: validate(sendEmailSchema),
  sendEmail
};
