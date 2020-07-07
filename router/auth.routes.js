const express = require('express');
const authController = require('../controller/auth.controller');
const loginRequired = require('../middleware/loginRequired');
const router = express.Router();

router.post('/login', authController.login);

router.post('/register', authController.register);

router.get('/validateToken', loginRequired)

module.exports = router;