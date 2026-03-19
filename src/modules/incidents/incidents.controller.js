const {
  z,
  validate,
  nullableTrimmedString,
  nullableDateTimeString,
  INCIDENT_RISK_LEVELS,
  INCIDENT_STATUSES
} = require('../../utils/validators');
const asyncHandler = require('../../utils/asyncHandler');
const incidentsService = require('./incidents.service');
const { logAction } = require('../auditLogs/auditLogs.service');

const incidentBaseSchema = z.object({
  titulo: z.string().trim().min(1).max(150),
  descripcion: nullableTrimmedString(5000),
  tipo_incidente: z.string().trim().min(1).max(50),
  fecha_incidente: nullableDateTimeString(),
  lugar: nullableTrimmedString(1000),
  nivel_riesgo: z.enum(INCIDENT_RISK_LEVELS).optional(),
  estado: z.enum(INCIDENT_STATUSES).optional()
});

const incidentUpdateSchema = incidentBaseSchema.partial().refine(
  (payload) => Object.keys(payload).length > 0,
  'At least one field is required'
);

const linkContactPayloadSchema = z.object({
  rol: nullableTrimmedString(50)
});

const createIncident = asyncHandler(async (req, res) => {
  const data = await incidentsService.createIncident({
    accessToken: req.accessToken,
    profileId: req.profile.id,
    payload: req.body
  });

  await logAction({
    userId: req.profile.id,
    action: 'create',
    entityType: 'incident',
    entityId: data.id,
    description: `Incident created: ${data.titulo}`
  });

  return res.status(201).json({
    success: true,
    message: 'Incident created successfully',
    data
  });
});

const listIncidents = asyncHandler(async (req, res) => {
  const data = await incidentsService.listIncidents({
    accessToken: req.accessToken,
    profileId: req.profile.id
  });

  return res.status(200).json({
    success: true,
    message: 'Incidents fetched successfully',
    data
  });
});

const getIncidentById = asyncHandler(async (req, res) => {
  const data = await incidentsService.getIncidentByIdOrThrow({
    accessToken: req.accessToken,
    profileId: req.profile.id,
    incidentId: req.params.id
  });

  return res.status(200).json({
    success: true,
    message: 'Incident fetched successfully',
    data
  });
});

const updateIncident = asyncHandler(async (req, res) => {
  const data = await incidentsService.updateIncident({
    accessToken: req.accessToken,
    profileId: req.profile.id,
    incidentId: req.params.id,
    payload: req.body
  });

  await logAction({
    userId: req.profile.id,
    action: 'update',
    entityType: 'incident',
    entityId: data.id,
    description: `Incident updated: ${data.titulo}`
  });

  return res.status(200).json({
    success: true,
    message: 'Incident updated successfully',
    data
  });
});

const deleteIncident = asyncHandler(async (req, res) => {
  const data = await incidentsService.deleteIncident({
    accessToken: req.accessToken,
    profileId: req.profile.id,
    incidentId: req.params.id
  });

  await logAction({
    userId: req.profile.id,
    action: 'delete',
    entityType: 'incident',
    entityId: data.id,
    description: `Incident deleted: ${data.titulo}`
  });

  return res.status(200).json({
    success: true,
    message: 'Incident deleted successfully',
    data
  });
});

const linkContactToIncident = asyncHandler(async (req, res) => {
  const data = await incidentsService.linkContactToIncident({
    accessToken: req.accessToken,
    profileId: req.profile.id,
    incidentId: req.params.incidentId,
    contactId: req.params.contactId,
    role: req.body.rol
  });

  return res.status(201).json({
    success: true,
    message: 'Contact linked to incident successfully',
    data
  });
});

const listIncidentContacts = asyncHandler(async (req, res) => {
  const data = await incidentsService.listIncidentContacts({
    accessToken: req.accessToken,
    profileId: req.profile.id,
    incidentId: req.params.incidentId
  });

  return res.status(200).json({
    success: true,
    message: 'Incident contacts fetched successfully',
    data
  });
});

const unlinkContactFromIncident = asyncHandler(async (req, res) => {
  const data = await incidentsService.unlinkContactFromIncident({
    accessToken: req.accessToken,
    profileId: req.profile.id,
    incidentId: req.params.incidentId,
    contactId: req.params.contactId
  });

  return res.status(200).json({
    success: true,
    message: 'Contact unlinked from incident successfully',
    data
  });
});

module.exports = {
  createIncidentSchema: validate(incidentBaseSchema),
  updateIncidentSchema: validate(incidentUpdateSchema),
  linkContactSchema: validate(linkContactPayloadSchema),
  createIncident,
  listIncidents,
  getIncidentById,
  updateIncident,
  deleteIncident,
  linkContactToIncident,
  listIncidentContacts,
  unlinkContactFromIncident
};
