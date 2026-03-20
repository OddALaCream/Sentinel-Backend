const express = require('express');
const { requireAuth, requireProfile } = require('../../middlewares/auth.middleware');
const { uploadEvidence } = require('../../middlewares/upload.middleware');
const evidencesController = require('./evidences.controller');

const router = express.Router();

router.use(requireAuth, requireProfile);

router.post(
  '/evidences',
  uploadEvidence.single('file'),
  evidencesController.createEvidenceSchema,
  evidencesController.createStandaloneEvidence
);
router.post(
  '/incidents/:incidentId/evidences',
  uploadEvidence.single('file'),
  evidencesController.createEvidenceSchema,
  evidencesController.createEvidence
);
router.get('/evidences', evidencesController.listEvidences);
router.get('/incidents/:incidentId/evidences', evidencesController.listIncidentEvidences);
router.get('/evidences/:id', evidencesController.getEvidenceById);
router.put(
  '/evidences/:id/incident',
  evidencesController.updateEvidenceIncidentSchema,
  evidencesController.updateEvidenceIncident
);
router.delete('/evidences/:id', evidencesController.deleteEvidence);

module.exports = router;
