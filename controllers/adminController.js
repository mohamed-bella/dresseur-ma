const User = require('../models/user');
const Seller = require('../models/seller');
const Article = require('../models/article');
const cloudinary = require('../config/cloudinary'); // Import Cloudinary configuration
const multer = require('multer');
const path = require('path');

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
          const seller = await Seller.findById(req.params.id);
          if (!seller) {
               return res.status(404).render('error', { message: 'Vendeur non trouvé.' });
          }
          const announcements = seller.announcements;
          res.render('admin/manageAnnouncements', { announcements, title: `Annonces de ${seller.displayName}` });
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
          const sellers = await Seller.find();
          const announcements = sellers.reduce((acc, seller) => [...acc, ...seller.announcements], []);
          res.render('admin/manageAnnouncements', { announcements, title: 'Manage Announcements' });
     } catch (error) {
          console.error(error);
          res.status(500).send('Server Error');
     }
};

// Approve Announcement
exports.approveAnnouncement = async (req, res) => {
     try {
          const seller = await Seller.findOne({ 'announcements._id': req.params.id });
          const announcement = seller.announcements.id(req.params.id);
          announcement.status = 'approved';
          await seller.save();
          res.redirect('/admin/announcements');
     } catch (error) {
          console.error(error);
          res.status(500).send('Server Error');
     }
};
// Edit Announv=cement Page 
exports.getEditAnnouncement = async (req, res) => {
     try {
          // Find the seller by the announcement ID
          const seller = await Seller.findOne({ 'announcements._id': req.params.id });
          if (!seller) {
               return res.status(404).render('error', { message: 'Annonce non trouvée.' });
          }

          // Find the specific announcement within the seller's announcements
          const announcement = seller.announcements.id(req.params.id);

          // Render the edit announcement page
          res.render('admin/editAnnouncement', { announcement, title: 'Modifier l\'annonce' });
     } catch (error) {
          console.error(error);
          res.status(500).render('error', { message: 'Erreur lors du chargement de l\'annonce.' });
     }
}
// Edit Announcement
exports.editAnnouncement = async (req, res) => {
     try {
          const { breed, description, price, location, images } = req.body;
          console.log(req.body)
          const seller = await Seller.findOne({ 'announcements._id': req.params.id });
          const announcement = seller.announcements.id(req.params.id);

          announcement.breed = breed || announcement.breed;
          announcement.description = description || announcement.description;
          announcement.price = price || announcement.price;
          announcement.location = location || announcement.location;
          announcement.images = images || announcement.images;
          console.log(seller)
          await seller.save();
          res.redirect('/admin/announcements');
     } catch (error) {
          console.error(error);
          res.status(500).send('Server Error');
     }
};

// Delete Announcement
exports.deleteAnnouncement = async (req, res) => {
     try {
          const seller = await Seller.findOne({ 'announcements._id': req.params.id });
          seller.announcements.pull({ _id: req.params.id });
          await seller.save();
          res.redirect('/admin/announcements');
     } catch (error) {
          console.error(error);
          res.status(500).send('Server Error');
     }
};

// Get All Articles
exports.getArticles = async (req, res) => {
     try {
          const articles = await Article.find();
          res.render('admin/articles', { articles, title: 'Manage Articles' });
     } catch (error) {
          console.error(error);
          res.status(500).send('Server Error');
     }
};

// Get New Article Page
exports.getNewArticleForm = (req, res) => {
     res.render('admin/newArticle', { title: 'Créer un nouvel article' });
};

const fs = require('fs');

exports.createArticle = async (req, res) => {
     try {
          const { title, content, description } = req.body;
          let bannerImageUrl = '';

          // Check if an image is uploaded
          if (req.file) {
               const result = await cloudinary.uploader.upload(req.file.path, {
                    resource_type: 'image',
                    timeout: 120000 // Optional: to set a timeout if the image is large
               });
               bannerImageUrl = result.secure_url; // Cloudinary URL for the image

               // Remove the file from local storage after upload
               fs.unlinkSync(req.file.path);
          }

          // Create new article with the banner image URL
          const newArticle = new Article({
               title,
               content,
               description,
               bannerImage: bannerImageUrl
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
          res.status(500).send('Server Error');
     }
};

// Delete Article
exports.deleteArticle = async (req, res) => {
     try {
          await Article.findByIdAndDelete(req.params.id);
          res.redirect('/admin/articles');
     } catch (error) {
          console.error(error);
          res.status(500).send('Server Error');
     }
};
