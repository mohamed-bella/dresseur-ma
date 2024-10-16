const express = require('express');
const passport = require('passport');
const router = express.Router();

// Redirect the user to Google for authentication
router.get('/auth/google',
     passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google callback URL after authentication
router.get('/auth/google/cb',
     passport.authenticate('google', { failureRedirect: '/' }),
     (req, res) => {
          // Successful login
          res.redirect('/dashboard');  // Redirect to dashboard or any other route after login
     }
);

// Logout route
router.get('/logout', (req, res) => {
     req.logout(() => {
          res.redirect('/');
     });
});

// Protect dashboard route (or other routes)
router.get('/dashboard', (req, res) => {
     if (req.isAuthenticated()) {
          res.render('user/dashboard/dashboard', { user: req.user });
     } else {
          res.redirect('/');
     }
});

// GET: Logout
router.get('/logout', (req, res) => {
     req.logout(() => {
          res.redirect('/');
     });
});

module.exports = router;
