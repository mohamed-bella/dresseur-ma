const router = require('express').Router();

const Article = require('../models/article')

const publicController = require('../controllers/publicController')

router.get('/', publicController.getHome)

// Privacy Policy Page
router.get('/privacy-policy', (req, res) => {
     res.render('privacy-policy', { title: 'Politique de confidentialité' });
});

// Terms and Conditions Page
router.get('/terms', (req, res) => {
     res.render('term-and-conditions', { title: 'Conditions générales d\'utilisation' });
});

// Cookie Policy Page
router.get('/cookies-policy', (req, res) => {
     res.render('cookie-policy', { title: 'Politique de cookies' });
});

router.get('/articles', async (req, res) => {
     try {
          const articles = await Article.find(); // Fetch all articles
          res.render('public/articles', { articles, title: 'Nos Articles' });
     } catch (err) {
          console.error(err);
          res.status(500).send('Erreur lors de la récupération des articles.');
     }
});


router.get('/articles/:id', async (req, res) => {
     try {
          const article = await Article.findById(req.params.id);
          res.render('public/articleDetail', { article, title: article.title });
     } catch (err) {
          console.error(err);
          res.status(500).send('Erreur lors de la récupération de l\'article.');
     }
});


// // About Us Page
// router.get('/about-us', (req, res) => {
//      res.render('about-us', { title: 'À propos de nous' });
// });

// Contact Us Page
router.get('/contact-us', (req, res) => {
     res.render('contact-us', { title: 'Contactez-nous' });
});
module.exports = router;