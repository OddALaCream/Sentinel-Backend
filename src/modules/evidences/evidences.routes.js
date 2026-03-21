const express = require('express');
const { requireAuth, requireProfile } = require('../../middlewares/auth.middleware');
const { uploadEvidence } = require('../../middlewares/upload.middleware');
const { validate, schemas } = require('../../utils/validators');
const evidencesController = require('./evidences.controller');

const router = express.Router();
const validateIdParam = validate(schemas.params.id, 'params');
const validateIncidentIdParam = validate(schemas.params.incidentId, 'params');

router.use(requireAuth, requireProfile);

router.post(
  '/evidences',
  uploadEvidence.single('file'),
  evidencesController.createEvidenceSchema,
  evidencesController.createStandaloneEvidence
);
router.post(
  '/incidents/:incidentId/evidences',
  validateIncidentIdParam,
  uploadEvidence.single('file'),
  evidencesController.createEvidenceSchema,
  evidencesController.createEvidence
);
router.get('/evidences', evidencesController.listEvidences);
router.get('/incidents/:incidentId/evidences', validateIncidentIdParam, evidencesController.listIncidentEvidences);
router.get('/evidences/:id', validateIdParam, evidencesController.getEvidenceById);
router.put(
  '/evidences/:id/incident',
  validateIdParam,
  evidencesController.updateEvidenceIncidentSchema,
  evidencesController.updateEvidenceIncident
);
router.delete('/evidences/:id', validateIdParam, evidencesController.deleteEvidence);

module.exports = router;
