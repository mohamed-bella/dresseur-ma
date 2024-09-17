const express = require('express');
const router = express.Router();
const upload = require('../config/multer'); // Import Multer
const { marcheCanineController, ensureSellerAuthenticated } = require('../controllers/marcheCanineController');
const filterController = require('../controllers/filterController')
// GET: Retrieve all announcements (Home page)
router.get('/announcements', marcheCanineController.getAnnouncements);

// GET: Show form to create a new announcement (only sellers)
router.get('/announcements/new', ensureSellerAuthenticated, marcheCanineController.showNewAnnouncementForm);

// GET: Filter announcements based on criteria (e.g., location, price)
router.get('/announcements/filter', filterController.filterAnnouncements);

// POST: Create a new announcement (only sellers)
router.post('/announcements', upload.array('media', 10), ensureSellerAuthenticated, marcheCanineController.addAnnouncement);

router.post('/seller/announcements/:id/images', ensureSellerAuthenticated, upload.array('newImages', 10), marcheCanineController.updateAnnouncementImages);

// GET: View a specific announcement by ID
router.get('/announcements/:slug', marcheCanineController.getAnnouncementBySlug);

// GET: Show form to edit an existing announcement (only sellers)
router.get('/announcements/:id/edit', ensureSellerAuthenticated, marcheCanineController.showEditAnnouncementForm);

// PUT: Update an existing announcement (only sellers)
router.put('/announcements/:id', ensureSellerAuthenticated, marcheCanineController.updateAnnouncement);

// DELETE: Delete an existing announcement (only sellers)
router.post('/announcements/:id/', ensureSellerAuthenticated, marcheCanineController.deleteAnnouncement);

// Dynamic route for scraping individual dog pages
// router.get('/chien/:slug', marcheCanineController.getDogDetails);


module.exports = router;
