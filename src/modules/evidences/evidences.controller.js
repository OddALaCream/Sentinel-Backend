const {
  z,
  validate,
  nullableTrimmedString,
  nullableDateTimeString,
  optionalBoolean
} = require('../../utils/validators');
const asyncHandler = require('../../utils/asyncHandler');
const evidencesService = require('./evidences.service');
const { logAction } = require('../auditLogs/auditLogs.service');

const evidenceMetadataSchema = z.object({
  tipo_evidencia: z.enum(['audio', 'imagen', 'video', 'documento']).optional(),
  titulo: nullableTrimmedString(150),
  descripcion: nullableTrimmedString(5000),
  taken_at: nullableDateTimeString(),
  is_private: optionalBoolean()
});

const createEvidence = asyncHandler(async (req, res) => {
  const data = await evidencesService.createEvidence({
    accessToken: req.accessToken,
    authUserId: req.authUser.id,
    profileId: req.profile.id,
    incidentId: req.params.incidentId,
    file: req.file,
    payload: req.body
  });

  await logAction({
    userId: req.profile.id,
    action: 'upload',
    entityType: 'evidence',
    entityId: data.id,
    description: `Evidence uploaded for incident ${req.params.incidentId}`
  });

  return res.status(201).json({
    success: true,
    message: 'Evidence uploaded successfully',
    data
  });
});

const listIncidentEvidences = asyncHandler(async (req, res) => {
  const data = await evidencesService.listIncidentEvidences({
    accessToken: req.accessToken,
    profileId: req.profile.id,
    incidentId: req.params.incidentId
  });

  return res.status(200).json({
    success: true,
    message: 'Evidences fetched successfully',
    data
  });
});

const getEvidenceById = asyncHandler(async (req, res) => {
  const data = await evidencesService.getEvidenceByIdOrThrow({
    accessToken: req.accessToken,
    profileId: req.profile.id,
    evidenceId: req.params.id
  });

  return res.status(200).json({
    success: true,
    message: 'Evidence fetched successfully',
    data
  });
});

const deleteEvidence = asyncHandler(async (req, res) => {
  const data = await evidencesService.deleteEvidence({
    accessToken: req.accessToken,
    profileId: req.profile.id,
    evidenceId: req.params.id
  });

  await logAction({
    userId: req.profile.id,
    action: 'delete',
    entityType: 'evidence',
    entityId: data.id,
    description: `Evidence deleted from incident ${data.incident_id}`
  });

  return res.status(200).json({
    success: true,
    message: 'Evidence deleted successfully',
    data
  });
});

module.exports = {
  createEvidenceSchema: validate(evidenceMetadataSchema),
  createEvidence,
  listIncidentEvidences,
  getEvidenceById,
  deleteEvidence
};
