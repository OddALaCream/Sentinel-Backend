const express = require('express');
const emergencyController = require('./emergency.controller');

const router = express.Router();

router.post('/send-email', emergencyController.sendEmailValidation, emergencyController.sendEmail);
router.get('/evidence/:id/url', emergencyController.getEvidenceUrl);

module.exports = router;
