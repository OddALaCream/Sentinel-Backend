const express = require('express');
const { requireAuth, requireProfile } = require('../../middlewares/auth.middleware');
const contactsController = require('./emergencyContacts.controller');

const router = express.Router();

router.use(requireAuth, requireProfile);

router.post('/', contactsController.createContactSchema, contactsController.createContact);
router.get('/', contactsController.listContacts);
router.get('/:id', contactsController.getContactById);
router.put('/:id', contactsController.updateContactSchema, contactsController.updateContact);
router.delete('/:id', contactsController.deleteContact);

module.exports = router;
