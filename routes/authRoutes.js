const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');

// Middleware to check if the user is authenticated
const isAuth = (req, res, next) => {
     if (!req.isAuthenticated()) {
          return next();
     }
     res.redirect('/profile');  // Redirect to profile if already logged in
};

// Route for the sign-in page
router.get('/', isAuth, (req, res) => {
     res.render('public/auth', {
          title: 'Sign in with Google',
          heroTitle: 'Sign in with Google',
          heroDescription: 'Creating an account will allow you to access more features.',
     });
});

// Google authentication route
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google authentication callback
router.get('/google/cb', passport.authenticate('google', { failureRedirect: '/' }), authController.loginSuccess);

// Logout route
router.get('/logout', authController.logout);

module.exports = router;
