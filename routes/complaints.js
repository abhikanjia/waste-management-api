const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');

router.get('/', complaintController.getAllComplaints);
router.get('/user/:userId', complaintController.getUserComplaints);
router.get('/:complaintId', complaintController.getComplaintById);
router.post('/', complaintController.createComplaint);
router.patch('/:complaintId/status', complaintController.updateComplaintStatus);

module.exports = router;