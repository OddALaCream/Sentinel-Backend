const {
  z,
  validate,
  nullableTrimmedString,
  optionalBoolean,
  optionalInteger
} = require('../../utils/validators');
const asyncHandler = require('../../utils/asyncHandler');
const contactsService = require('./emergencyContacts.service');
const { logAction } = require('../auditLogs/auditLogs.service');

const contactBaseSchema = z.object({
  nombre_completo: z.string().trim().min(1).max(150),
  parentesco: nullableTrimmedString(80),
  telefono: z.string().trim().min(1).max(30),
  telefono_alternativo: nullableTrimmedString(30),
  prioridad: optionalInteger({ min: 1, max: 10 }),
  puede_recibir_alertas: optionalBoolean()
});

const contactUpdateSchema = contactBaseSchema.partial().refine(
  (payload) => Object.keys(payload).length > 0,
  'At least one field is required'
);

const createContact = asyncHandler(async (req, res) => {
  const data = await contactsService.createContact({
    accessToken: req.accessToken,
    profileId: req.profile.id,
    payload: req.body
  });

  await logAction({
    userId: req.profile.id,
    action: 'create',
    entityType: 'emergency_contact',
    entityId: data.id,
    description: `Emergency contact created: ${data.nombre_completo}`
  });

  return res.status(201).json({
    success: true,
    message: 'Emergency contact created successfully',
    data
  });
});

const listContacts = asyncHandler(async (req, res) => {
  const data = await contactsService.listContacts({
    accessToken: req.accessToken,
    profileId: req.profile.id
  });

  return res.status(200).json({
    success: true,
    message: 'Emergency contacts fetched successfully',
    data
  });
});

const getContactById = asyncHandler(async (req, res) => {
  const data = await contactsService.getContactById({
    accessToken: req.accessToken,
    profileId: req.profile.id,
    contactId: req.params.id
  });

  return res.status(200).json({
    success: true,
    message: 'Emergency contact fetched successfully',
    data
  });
});

const updateContact = asyncHandler(async (req, res) => {
  const data = await contactsService.updateContact({
    accessToken: req.accessToken,
    profileId: req.profile.id,
    contactId: req.params.id,
    payload: req.body
  });

  return res.status(200).json({
    success: true,
    message: 'Emergency contact updated successfully',
    data
  });
});

const deleteContact = asyncHandler(async (req, res) => {
  const data = await contactsService.deleteContact({
    accessToken: req.accessToken,
    profileId: req.profile.id,
    contactId: req.params.id
  });

  return res.status(200).json({
    success: true,
    message: 'Emergency contact deleted successfully',
    data
  });
});

module.exports = {
  createContactSchema: validate(contactBaseSchema),
  updateContactSchema: validate(contactUpdateSchema),
  createContact,
  listContacts,
  getContactById,
  updateContact,
  deleteContact
};
