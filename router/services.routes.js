const express = require('express');
const loginRequired = require('../middleware/loginRequired');
const serviceController = require('../controller/services.controller');
const router = express.Router();

router.get('/getUserContacts', loginRequired, serviceController.getUserContacts);

router.get('/getUserProfile', loginRequired, serviceController.getUserProfile);

router.get('/getUserMessages', loginRequired, serviceController.getUserMessages);

router.get('/addUser/:email', loginRequired, serviceController.addUser);

router.delete('/deleteUser/:userId', loginRequired, serviceController.deleteUser);

router.delete('/deactivateAccount', loginRequired, serviceController.deactivateAccount);

router.get('/urlForUserProfile', loginRequired, serviceController.urlForUserProfile);

router.put('/userProfileImage', loginRequired, serviceController.uploadUserProfile);

module.exports = router;