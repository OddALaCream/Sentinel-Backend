const express = require('express');
const authController = require('./auth.controller');

const router = express.Router();

router.post('/register', authController.registerSchema, authController.register);
router.post('/login', authController.loginSchema, authController.login);

module.exports = router;
