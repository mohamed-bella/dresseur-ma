const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

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
router.post('/articles/create', adminController.createArticle);
router.post('/articles/:id/edit', adminController.editArticle);
router.post('/articles/:id', adminController.deleteArticle);

module.exports = router;
