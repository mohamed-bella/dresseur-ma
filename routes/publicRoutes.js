const router = require('express').Router();

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

// // About Us Page
// router.get('/about-us', (req, res) => {
//      res.render('about-us', { title: 'À propos de nous' });
// });

// Contact Us Page
router.get('/contact-us', (req, res) => {
     res.render('contact-us', { title: 'Contactez-nous' });
});
module.exports = router;