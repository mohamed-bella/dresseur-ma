const express = require('express');
const router = express.Router();
const Announcement = require('../models/announcement');
const Seller = require('../models/seller');
const cloudinary = require('../config/cloudinary');
const slugify = require('slugify');
const upload = require('../config/multer'); // Import Multer
const { marcheCanineController, ensureSellerAuthenticated } = require('../controllers/marcheCanineController');
const filterController = require('../controllers/filterController')
// GET: Retrieve all announcements (Home page)
router.get('/announcements', marcheCanineController.getAnnouncements);

// GET: Show form to create a new announcement (only sellers)
router.get('/announcements/new', ensureSellerAuthenticated, marcheCanineController.showNewAnnouncementForm);

// GET: Filter announcements based on criteria (e.g., location, price)
router.get('/announcements/filter', filterController.filterAnnouncements);
// POST: Add a new announcement with media upload (for sellers only)

router.post('/announcements', ensureSellerAuthenticated, async (req, res) => {
     const { breed, description, price, location, number } = req.body;

     // Validate the form data
     if (!breed || !description || !price || !location || !number) {
          return res.status(400).render('marketplace/newAnnouncement', {
               message: 'Please fill in all fields',
               title: 'Créer une nouvelle annonce'
          });
     }

     try {
          const seller = await Seller.findOne({ googleId: req.user.googleId });
          if (!seller) {
               return res.status(404).json({ message: 'Seller not found' });
          }

          // Save the text information in a temporary storage (session or database)
          req.session.newAnnouncement = {
               breed,
               description,
               price,
               location,
               number,
               seller: seller._id
          };

          // Redirect to the media upload page
          res.redirect('/announcements/upload-media');
     } catch (err) {
          console.error(err);
          res.status(500).render('error', { message: 'Failed to save the announcement' });
     }
});


router.get('/announcements/upload-media', ensureSellerAuthenticated, (req, res) => {
     res.render('marketplace/newAnnouncementImage', {
          title: 'Créer une nouvelle annonce',
          successMsg: req.flash('success'),
          errorMsg: req.flash('error')
     })
});
router.post('/announcements/upload-media', ensureSellerAuthenticated, upload.array('media', 10), async (req, res) => {
     // Get the new announcement data from the session
     const newAnnouncementData = req.session.newAnnouncement;

     if (!newAnnouncementData) {
          return res.status(400).redirect('/announcements/new');
     }

     // Process media uploads
     let mediaUrls = [];
     if (req.files && req.files.length > 0) {
          try {
               const uploadPromises = req.files.map(file =>
                    cloudinary.uploader.upload(file.path, { resource_type: "auto" })
               );
               const results = await Promise.all(uploadPromises);
               mediaUrls = results.map(result => result.secure_url);
          } catch (err) {
               console.error('Error uploading media:', err);
               return res.status(500).render('error', { message: 'Error uploading media files' });
          }
     }

     try {
          // Finalize and save the announcement
          const newAnnouncement = new Announcement({
               ...newAnnouncementData,
               media: mediaUrls
          });

          await newAnnouncement.save();

          // Clear the session data after successful save
          req.session.newAnnouncement = null;

          req.flash('success', "Votre annonce a été publiée avec succès !");
          res.redirect('/announcements');
     } catch (err) {
          console.error(err);
          res.status(500).render('error', { message: 'Failed to create the announcement' });
     }
});

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
