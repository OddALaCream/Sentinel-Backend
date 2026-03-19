const express = require('express');
const { requireAuth, requireProfile } = require('../../middlewares/auth.middleware');
const profilesController = require('./profiles.controller');

const router = express.Router();

router.post('/', requireAuth, profilesController.createProfileSchema, profilesController.createProfile);
router.get('/me', requireAuth, requireProfile, profilesController.getCurrentProfile);
router.put('/me', requireAuth, requireProfile, profilesController.updateProfileSchema, profilesController.updateCurrentProfile);

module.exports = router;
