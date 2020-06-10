const express = require('express');
const loginRequired = require('../middleware/loginRequired');
const serviceController = require('../controller/services.controller');
const router = express.Router();

router.get('/getUserContacts', loginRequired, serviceController.getUserContacts);

router.get('/getUserProfile', loginRequired, serviceController.getUserProfile);

router.get('/getUserMessages', loginRequired, serviceController.getUserMessages);

module.exports = router;