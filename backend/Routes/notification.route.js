const express = require('express');
const router = express.Router();
const { getUserNotifications, markAsRead } = require('../controllers/Notification.controller');
// Import your existing auth middleware here
const { verifyAppToken} = require('../middlerware/protect');

router.get('/', verifyAppToken, getUserNotifications);
router.patch('/:id/read', verifyAppToken, markAsRead);

module.exports = router;