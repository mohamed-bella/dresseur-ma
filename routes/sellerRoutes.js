const express = require('express');
const router = express.Router();
const ensureSellerAuthenticated = require('../middlewares/ensureSellerAuthenticated');
const sellerController = require('../controllers/sellerController');

// GET: Seller dashboard
router.get('/dashboard', ensureSellerAuthenticated, sellerController.getDashboard);

// GET: View seller profile
router.get('/profile', ensureSellerAuthenticated, sellerController.getProfile);

// POST: Update seller profile
router.post('/profile', ensureSellerAuthenticated, sellerController.updateProfile);

// GET: Seller's announcements
router.get('/announcements', ensureSellerAuthenticated, sellerController.getMyAnnouncements);

// GET: Show form to edit a specific announcement
router.get('/announcements/:id/edit', ensureSellerAuthenticated, sellerController.showEditAnnouncementForm);

// POST: Update a specific announcement
router.post('/announcements/:id', ensureSellerAuthenticated, sellerController.updateAnnouncement);

// DELETE: Delete a specific announcement
router.post('/announcements/:id/delete', ensureSellerAuthenticated, sellerController.deleteAnnouncement);

module.exports = router;
