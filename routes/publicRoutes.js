const router = require('express').Router();
const cloudinary = require('cloudinary').v2;
const path = require('path');
const slugify = require('slugify');
const Seller = require('../models/seller');
const upload = require('../config/multer');
const publicController = require('../controllers/publicController');

const Article = require('../models/article');
const Announcement = require('../models/announcement');
const Elevage = require('../models/elevage');
const Breed = require('../models/breed');


// Middleware to ensure the user is authenticated as a seller
const ensureSellerAuthenticated = async (req, res, next) => {
     if (req.isAuthenticated() && req.user.googleId) {
          try {
               const seller = await Seller.findOne({ googleId: req.user.googleId });
               if (!seller) {
                    return res.status(403).render('error', { message: 'Unauthorized access. Seller not found.' });
               }
               next();
          } catch (err) {
               console.error(err);
               return res.status(500).render('error', { message: 'Server error during seller authentication.' });
          }
     } else {
          res.redirect('/auth/google'); // Redirect to Google login if not authenticated
     }
};

// Middleware to ensure the user is authenticated as a writer
const ensureWriter = (req, res, next) => {
     if (req.isAuthenticated() && req.user.role === 'writer') {
          return next();
     } else {
          res.status(403).send('Access denied. You are not authorized to post articles.');
     }
};

/*
 ========= HOME PAGE ===========
*/
router.get('/', async (req, res) => {
     try {
          // Fetch data for Public Announcements, Elevages, Breeds, and Articles
          const announcements = await Announcement.find().limit(6); // Fetch latest 6 announcements
          const elevages = await Elevage.find().limit(6); // Fetch latest 6 elevages
          const breeds = await Breed.find().limit(6); // Fetch latest 6 breeds
          const articles = await Article.find().limit(6); // Fetch latest 6 articles

          // Render the home page and pass the fetched data to the view
          res.render('marketplace/home', {
               title: 'Annonces, Articles et Consultations Gratuitement Sur Ndressilik',
               announcements,
               elevages,
               breeds,
               articles
          });
     } catch (err) {
          console.error('Error fetching home page data:', err);
          res.status(500).send('Internal Server Error');
     }
});

// Routes for writing and managing articles
router.get('/write-article/new', ensureWriter, (req, res) => {
     res.render('public/newArticle', { title: 'Partager un nouvel article' });
});

router.post('/write-article', ensureWriter, upload.single('bannerImage'), async (req, res) => {
     try {
          const { title, content, description } = req.body;
          const user = req.user;
          let bannerImageUrl = '';

          if (req.file) {
               const result = await cloudinary.uploader.upload(req.file.path);
               bannerImageUrl = result.secure_url;
          }

          const newArticle = new Article({
               title,
               content,
               description,
               bannerImage: bannerImageUrl,
               author: user.displayName,
               slug: slugify(title, { lower: true }),
          });

          await newArticle.save();
          res.redirect('/articles');
     } catch (err) {
          console.error('Error creating article:', err);
          res.status(500).send('Erreur lors de la création de l\'article.');
     }
});

// Routes for displaying and viewing articles
router.get('/articles', async (req, res) => {
     try {
          const articles = await Article.find();
          res.render('public/articles', { articles, title: 'Nos Articles' });
     } catch (err) {
          console.error('Error fetching articles:', err);
          res.status(500).send('Erreur lors de la récupération des articles.');
     }
});

router.get('/articles/:slug', async (req, res) => {
     try {
          const article = await Article.findOne({ slug: req.params.slug });
          if (!article) {
               return res.status(404).send('Article non trouvé.');
          }
          res.render('public/articleDetail', { article, title: article.title });
     } catch (err) {
          console.error('Error fetching article:', err);
          res.status(500).send('Erreur lors de la récupération de l\'article.');
     }
});

// Route for dashboard
router.get('/dashboard', ensureSellerAuthenticated, publicController.getDashboard);

router.get('/dashboard/elevage/new', ensureSellerAuthenticated, (req, res) => {

     res.render('public/dashboard/newElevage', {
          title: 'new Elevage'
     })
})
router.post('/dashboard/elevage/new', ensureSellerAuthenticated, publicController.newElevage)
// Routes for dog breeds and breed details
router.get('/tous-les-races-des-chiens', publicController.getAllBreeds);
router.get('/tous-les-races-des-chiens/:id', publicController.getBreed);


router.get('/privacy-policy', (req, res) => {
     res.render('privacy-policy', { title: 'Politique de confidentialité' });
});

router.get('/terms', (req, res) => {
     res.render('term-and-conditions', { title: 'Conditions générales d\'utilisation' });
});

router.get('/cookies-policy', (req, res) => {
     res.render('cookie-policy', { title: 'Politique de cookies' });
});

router.get('/contact-us', (req, res) => {
     res.render('contact-us', { title: 'Contactez-nous' });
});

module.exports = router;
