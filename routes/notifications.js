const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.get('/user/:userId', notificationController.getUserNotifications);
router.get('/user/:userId/unread', notificationController.getUnreadNotifications);
router.post('/', notificationController.createNotification);
router.patch('/:notificationId/read', notificationController.markAsRead);
router.patch('/user/:userId/read-all', notificationController.markAllAsRead);

module.exports = router;