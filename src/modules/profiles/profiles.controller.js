const {
  z,
  validate,
  nullableTrimmedString,
  nullableDateString
} = require('../../utils/validators');
const asyncHandler = require('../../utils/asyncHandler');
const profilesService = require('./profiles.service');
const { logAction } = require('../auditLogs/auditLogs.service');

const nullableEmail = z.preprocess(
  (value) => (value === '' ? null : value),
  z.string().trim().email().nullable().optional()
);

const profileBaseSchema = z.object({
  nombre: z.string().trim().min(1).max(100),
  apellido_p: z.string().trim().min(1).max(100),
  apellido_m: nullableTrimmedString(100),
  fecha_nacimiento: nullableDateString(),
  telefono: nullableTrimmedString(30),
  email: nullableEmail,
  direccion_opcional: nullableTrimmedString(500)
});

const profileUpdateSchema = profileBaseSchema.partial().refine(
  (payload) => Object.keys(payload).length > 0,
  'At least one field is required'
);

const createProfile = asyncHandler(async (req, res) => {
  const data = await profilesService.createProfile({
    accessToken: req.accessToken,
    authUserId: req.authUser.id,
    fallbackEmail: req.authUser.email,
    payload: req.body
  });

  return res.status(201).json({
    success: true,
    message: 'Profile created successfully',
    data
  });
});

const getCurrentProfile = asyncHandler(async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Profile fetched successfully',
    data: req.profile
  });
});

const updateCurrentProfile = asyncHandler(async (req, res) => {
  const data = await profilesService.updateProfile({
    accessToken: req.accessToken,
    authUserId: req.authUser.id,
    payload: req.body
  });

  await logAction({
    userId: req.profile.id,
    action: 'update',
    entityType: 'profile',
    entityId: data.id,
    description: 'User updated profile information'
  });

  return res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data
  });
});

module.exports = {
  createProfileSchema: validate(profileBaseSchema),
  updateProfileSchema: validate(profileUpdateSchema),
  createProfile,
  getCurrentProfile,
  updateCurrentProfile
};
