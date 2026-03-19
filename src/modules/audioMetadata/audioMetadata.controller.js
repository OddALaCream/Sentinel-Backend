const {
  z,
  validate,
  nullableTrimmedString,
  optionalInteger
} = require('../../utils/validators');
const asyncHandler = require('../../utils/asyncHandler');
const audioMetadataService = require('./audioMetadata.service');

const audioMetadataSchema = z.object({
  duration_seconds: optionalInteger({ min: 0, max: 86400 }),
  transcript: nullableTrimmedString(20000),
  language: nullableTrimmedString(20)
});

const audioMetadataUpdateSchema = audioMetadataSchema.partial().refine(
  (payload) => Object.keys(payload).length > 0,
  'At least one field is required'
);

const createAudioMetadata = asyncHandler(async (req, res) => {
  const data = await audioMetadataService.createAudioMetadata({
    accessToken: req.accessToken,
    profileId: req.profile.id,
    evidenceId: req.params.evidenceId,
    payload: req.body
  });

  return res.status(201).json({
    success: true,
    message: 'Audio metadata created successfully',
    data
  });
});

const getAudioMetadata = asyncHandler(async (req, res) => {
  const data = await audioMetadataService.getAudioMetadata({
    accessToken: req.accessToken,
    profileId: req.profile.id,
    evidenceId: req.params.evidenceId
  });

  return res.status(200).json({
    success: true,
    message: 'Audio metadata fetched successfully',
    data
  });
});

const updateAudioMetadata = asyncHandler(async (req, res) => {
  const data = await audioMetadataService.updateAudioMetadata({
    accessToken: req.accessToken,
    profileId: req.profile.id,
    evidenceId: req.params.evidenceId,
    payload: req.body
  });

  return res.status(200).json({
    success: true,
    message: 'Audio metadata updated successfully',
    data
  });
});

module.exports = {
  createAudioMetadataSchema: validate(audioMetadataSchema),
  updateAudioMetadataSchema: validate(audioMetadataUpdateSchema),
  createAudioMetadata,
  getAudioMetadata,
  updateAudioMetadata
};
