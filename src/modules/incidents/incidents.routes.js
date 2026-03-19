const express = require('express');
const { requireAuth, requireProfile } = require('../../middlewares/auth.middleware');
const incidentsController = require('./incidents.controller');

const router = express.Router();

router.use(requireAuth, requireProfile);

router.post('/', incidentsController.createIncidentSchema, incidentsController.createIncident);
router.get('/', incidentsController.listIncidents);
router.get('/:id', incidentsController.getIncidentById);
router.put('/:id', incidentsController.updateIncidentSchema, incidentsController.updateIncident);
router.delete('/:id', incidentsController.deleteIncident);

router.post(
  '/:incidentId/contacts/:contactId',
  incidentsController.linkContactSchema,
  incidentsController.linkContactToIncident
);
router.get('/:incidentId/contacts', incidentsController.listIncidentContacts);
router.delete('/:incidentId/contacts/:contactId', incidentsController.unlinkContactFromIncident);

module.exports = router;
