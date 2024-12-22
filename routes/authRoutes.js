const express = require('express');
const passport = require('passport');
const router = express.Router();

// Redirect to Google auth
router.get('/auth/google',
    passport.authenticate('google', { 
        scope: ['profile', 'email'],
        prompt: 'select_account'  // Add this to always show account selection
    })
);

// Google callback with error handling
router.get('/auth/google/cb',
    passport.authenticate('google', { 
        failureRedirect: '/login',
        failureFlash: true 
    }),
    (req, res) => {
        // Log successful authentication
        console.log('Successfully authenticated user:', req.user?.displayName);
        res.redirect('/');
    }
);

// Logout with proper callback
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.redirect('/');
        }
        res.redirect('/');
    });
});

module.exports = router;