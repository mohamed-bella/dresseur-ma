// routes/announcementRoutes.js

const express = require('express');
const announcementController = require('../controllers/announcementController');
const router = express.Router();

// Create an announcement
router.post('/new', announcementController.createAnnouncement);

// Get all announcements
router.get('/', announcementController.getAllAnnouncements);

module.exports = router;
