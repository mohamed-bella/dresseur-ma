const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// Set up multer for file storage
const storage = multer.diskStorage({
     destination: function (req, file, cb) {
          const uploadDir = 'uploads/';

          // Check if the directory exists, if not, create it
          if (!fs.existsSync(uploadDir)) {
               fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
     },
     filename: function (req, file, cb) {
          cb(null, Date.now() + path.extname(file.originalname)); // Save with a unique name
     }
});

const upload = multer({ storage });


// Admin Dashboard
router.get('/', adminController.dashboard);

// Manage Sellers
router.get('/sellers', adminController.getSellers);
router.get('/sellers/:id/edit', adminController.getEditSellerForm);
router.post('/sellers/:id/edit', adminController.updateSeller);
router.post('/sellers/:id', adminController.deleteSeller);

// Manage Announcements
router.get('/announcements', adminController.getAnnouncements);
router.post('/announcements/:id/approve', adminController.approveAnnouncement);
router.get('/announcements/:id/edit', adminController.getEditAnnouncement);
router.post('/announcements/:id/edit', adminController.editAnnouncement);
router.post('/announcements/:id', adminController.deleteAnnouncement);

// Manage Articles
router.get('/articles', adminController.getArticles);
router.get('/articles/new', adminController.getNewArticleForm);
router.post('/articles/create', upload.single('bannerImage'), adminController.createArticle);
// Route to render the form to edit an article
router.get('/articles/:id/edit', adminController.getEditArticleForm);
router.post('/articles/:id/edit', adminController.editArticle);
router.post('/articles/:id', adminController.deleteArticle);

module.exports = router;
