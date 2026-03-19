const express = require('express');
const { requireAuth, requireProfile } = require('../../middlewares/auth.middleware');
const { uploadEvidence } = require('../../middlewares/upload.middleware');
const evidencesController = require('./evidences.controller');

const router = express.Router();

router.use(requireAuth, requireProfile);

router.post(
  '/incidents/:incidentId/evidences',
  uploadEvidence.single('file'),
  evidencesController.createEvidenceSchema,
  evidencesController.createEvidence
);
router.get('/incidents/:incidentId/evidences', evidencesController.listIncidentEvidences);
router.get('/evidences/:id', evidencesController.getEvidenceById);
router.delete('/evidences/:id', evidencesController.deleteEvidence);

module.exports = router;
