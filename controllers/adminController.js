const Seller = require('../models/seller');
const Announcement = require('../models/announcement');
const Article = require('../models/article');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const path = require('path');
const slugify = require('slugify');
const fs = require('fs');

// Set up multer for file storage
const storage = multer.diskStorage({
     destination: function (req, file, cb) {
          cb(null, 'uploads/');
     },
     filename: function (req, file, cb) {
          cb(null, Date.now() + path.extname(file.originalname)); // Save with a unique name
     }
});

const upload = multer({ storage });

// Admin Dashboard
exports.dashboard = (req, res) => {
     res.render('admin/dashboard', { title: 'Admin Dashboard' });
};

// Get all sellers
exports.getSellers = async (req, res) => {
     try {
          const sellers = await Seller.find();
          res.render('admin/manageSellers', { sellers, title: 'Gérer les vendeurs' });
     } catch (err) {
          console.error(err);
          res.status(500).render('error', { message: 'Erreur lors de la récupération des vendeurs.' });
     }
};

// Get all announcements for a specific seller
exports.getSellerAnnouncements = async (req, res) => {
     try {
          const announcements = await Announcement.find({ seller: req.params.id });
          if (!announcements) {
               return res.status(404).render('error', { message: 'Aucune annonce trouvée pour ce vendeur.' });
          }
          res.render('admin/manageAnnouncements', { announcements, title: `Annonces du vendeur` });
     } catch (err) {
          console.error(err);
          res.status(500).render('error', { message: 'Erreur lors de la récupération des annonces.' });
     }
};

// Get the form to edit a seller's profile
exports.getEditSellerForm = async (req, res) => {
     try {
          const seller = await Seller.findById(req.params.id);
          if (!seller) {
               return res.status(404).render('error', { message: 'Vendeur non trouvé.' });
          }
          res.render('admin/editSeller', { seller, title: 'Modifier le vendeur' });
     } catch (err) {
          console.error(err);
          res.status(500).render('error', { message: 'Erreur lors du chargement du formulaire.' });
     }
};

// Update seller information
exports.updateSeller = async (req, res) => {
     const { displayName, email, phone } = req.body;
     try {
          const seller = await Seller.findById(req.params.id);
          if (!seller) {
               return res.status(404).render('error', { message: 'Vendeur non trouvé.' });
          }
          seller.displayName = displayName || seller.displayName;
          seller.email = email || seller.email;
          seller.phone = phone || seller.phone;

          await seller.save();
          res.redirect('/admin/sellers');
     } catch (err) {
          console.error(err);
          res.status(500).render('error', { message: 'Erreur lors de la mise à jour du vendeur.' });
     }
};

// Delete seller and their announcements
exports.deleteSeller = async (req, res) => {
     try {
          const seller = await Seller.findById(req.params.id);
          if (!seller) {
               return res.status(404).render('error', { message: 'Vendeur non trouvé.' });
          }
          await Announcement.deleteMany({ seller: seller._id }); // Delete all announcements for this seller
          await seller.remove();
          res.redirect('/admin/sellers');
     } catch (err) {
          console.error(err);
          res.status(500).render('error', { message: 'Erreur lors de la suppression du vendeur.' });
     }
};

// Get All Announcements
exports.getAnnouncements = async (req, res) => {
     try {
          const announcements = await Announcement.find().populate('seller');
          res.render('admin/manageAnnouncements', { announcements, title: 'Gérer les annonces' });
     } catch (error) {
          console.error(error);
          res.status(500).send('Erreur du serveur lors de la récupération des annonces.');
     }
};

// Approve Announcement
exports.approveAnnouncement = async (req, res) => {
     try {
          const announcement = await Announcement.findById(req.params.id);
          if (!announcement) {
               return res.status(404).send('Annonce non trouvée.');
          }
          announcement.status = 'approved';
          await announcement.save();
          res.redirect('/admin/announcements');
     } catch (error) {
          console.error(error);
          res.status(500).send('Erreur du serveur lors de l\'approbation de l\'annonce.');
     }
};

// Edit Announcement Page
exports.getEditAnnouncement = async (req, res) => {
     try {
          const announcement = await Announcement.findById(req.params.id);
          if (!announcement) {
               return res.status(404).render('error', { message: 'Annonce non trouvée.' });
          }
          res.render('admin/editAnnouncement', { announcement, title: 'Modifier l\'annonce' });
     } catch (error) {
          console.error(error);
          res.status(500).render('error', { message: 'Erreur lors du chargement de l\'annonce.' });
     }
};

// Edit Announcement
exports.editAnnouncement = async (req, res) => {
     try {
          const { breed, description, price, location, images } = req.body;
          const announcement = await Announcement.findById(req.params.id);

          announcement.breed = breed || announcement.breed;
          announcement.description = description || announcement.description;
          announcement.price = price || announcement.price;
          announcement.location = location || announcement.location;
          announcement.images = images || announcement.images;

          await announcement.save();
          res.redirect('/admin/announcements');
     } catch (error) {
          console.error(error);
          res.status(500).send('Erreur du serveur lors de la mise à jour de l\'annonce.');
     }
};

// Delete Announcement
exports.deleteAnnouncement = async (req, res) => {
     try {
          await Announcement.findByIdAndDelete(req.params.id);
          res.redirect('/admin/announcements');
     } catch (error) {
          console.error(error);
          res.status(500).send('Erreur du serveur lors de la suppression de l\'annonce.');
     }
};

// Get All Articles
exports.getArticles = async (req, res) => {
     try {
          const articles = await Article.find().sort({ createdAt: -1 });
          res.render('admin/articles', { articles, title: 'Gérer les articles' });
     } catch (error) {
          console.error(error);
          res.status(500).send('Erreur du serveur lors de la récupération des articles.');
     }
};

// Get New Article Page
exports.getNewArticleForm = (req, res) => {
     res.render('admin/newArticle', { title: 'Créer un nouvel article' });
};

// Create Article
exports.createArticle = async (req, res) => {
     try {
          const { title, content, description } = req.body;
          let bannerImageUrl = '';

          if (req.file) {
               const result = await cloudinary.uploader.upload(req.file.path, {
                    resource_type: 'image',
                    timeout: 120000 // Set a timeout if the image is large
               });
               bannerImageUrl = result.secure_url;
               fs.unlinkSync(req.file.path); // Delete the file from local storage
          }

          let slug = slugify(title, { lower: true, strict: true });
          const slugExists = await Article.exists({ slug });
          if (slugExists) slug += '-' + Date.now();

          const newArticle = new Article({
               title,
               content,
               description,
               author: user.displayName,
               bannerImage: bannerImageUrl,
               slug
          });

          await newArticle.save();
          res.redirect('/admin/articles');
     } catch (error) {
          console.error(error);
          res.status(500).send('Erreur serveur lors de la création de l\'article.');
     }
};

// Get Edit Article Page
exports.getEditArticleForm = async (req, res) => {
     try {
          const article = await Article.findById(req.params.id);
          if (!article) {
               return res.status(404).render('error', { message: 'Article non trouvé.' });
          }
          res.render('admin/editArticle', { article, title: 'Modifier l\'article' });
     } catch (error) {
          console.error(error);
          res.status(500).send('Erreur serveur lors du chargement de l\'article.');
     }
};

// Edit Article
exports.editArticle = async (req, res) => {
     try {
          const { title, content } = req.body;
          await Article.findByIdAndUpdate(req.params.id, { title, content });
          res.redirect('/admin/articles');
     } catch (error) {
          console.error(error);
          res.status(500).send('Erreur serveur lors de la mise à jour de l\'article.');
     }
};

// Delete Article
exports.deleteArticle = async (req, res) => {
     try {
          await Article.findByIdAndDelete(req.params.id);
          res.redirect('/admin/articles');
     } catch (error) {
          console.error(error);
          res.status(500).send('Erreur serveur lors de la suppression de l\'article.');
     }
};
