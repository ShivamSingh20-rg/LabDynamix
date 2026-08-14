const express = require('express');
const router = express.Router();
const {
  getAllBookings,
  updateBookingStatus,
} = require('../controllers/adminbooking.controller');

// Middleware to verify JWT token and verify admin privileges
const { verifyAppToken,authorizeRoles } = require('../middlerware/protect');

// Route to fetch all student requests for Admin
router.get('/all-bookings', verifyAppToken, getAllBookings);

 
router.put('/:id/status', verifyAppToken, updateBookingStatus);

module.exports = router;