const express = require('express');
const passport = require('passport');
const router = express.Router();

// Redirect the user to Google for authentication
router.get('/auth/google',
     passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google callback URL after authentication
router.get('/auth/google/cb',
     passport.authenticate('google', { failureRedirect: '/', failureMessage: true }),
     (req, res) => {
          if (req.authInfo) {
               console.log('Authentication Info:', req.authInfo);
          }
          if (req.user) {
               console.log('User Info:', req.user);  // This should log the authenticated user.
          }
          res.redirect('/dashboard');
     }
);


// Logout route
router.get('/logout', (req, res) => {
     req.logout(() => {
          res.redirect('/');
     });
});

// Protect dashboard route (or other routes)


// GET: Logout
router.get('/logout', (req, res) => {
     req.logout(() => {
          res.redirect('/');
     });
});



module.exports = router;
