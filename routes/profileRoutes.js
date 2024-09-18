const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

// Route to view a user's profile by slug
router.get('/:slug', profileController.viewUserAnnouncements);

// Route to view the announcements for a specific user by slug
router.get('/:slug/announcements', profileController.viewUserAnnouncements);

module.exports = router;
