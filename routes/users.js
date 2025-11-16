const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/:userId', userController.getUserById);
router.post('/', userController.createOrUpdateUser);
router.get('/:userId/stats', userController.getUserStats);

module.exports = router;