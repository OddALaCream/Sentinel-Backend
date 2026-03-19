const express = require('express');
const { requireAuth, requireProfile } = require('../../middlewares/auth.middleware');
const audioMetadataController = require('./audioMetadata.controller');

const router = express.Router();

router.use(requireAuth, requireProfile);

router.post(
  '/evidences/:evidenceId/audio-metadata',
  audioMetadataController.createAudioMetadataSchema,
  audioMetadataController.createAudioMetadata
);
router.get('/evidences/:evidenceId/audio-metadata', audioMetadataController.getAudioMetadata);
router.put(
  '/evidences/:evidenceId/audio-metadata',
  audioMetadataController.updateAudioMetadataSchema,
  audioMetadataController.updateAudioMetadata
);

module.exports = router;
