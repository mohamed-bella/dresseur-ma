const express = require('express');
const router = express.Router();
const passport = require('passport');
const nodemailer = require('nodemailer');

// Yahoo SMTP configuration with debugging enabled
const transporter = nodemailer.createTransport({
    service: 'yahoo',
    auth: {
        user: process.env.YAHOO_EMAIL,  // Yahoo app-specific password
        pass: process.env.YAHOO_APP_PASSWORD,      // Your Yahoo email
    },
    logger: true,  // Logs to console
    debug: true    // Enable debugging
});


// Google OAuth Routes
router.get('/auth/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
);

router.get('/auth/google/cb',
    (req, res, next) => {
        console.log('Callback query params:', req.query);
        next();
    },
    passport.authenticate('google', { failureRedirect: '/', failureFlash: true }),
    (req, res) => {
        console.log('User authenticated:', req.user);
        req.session.save((err) => {
            if (err) {
                console.error('Error saving session:', err);
                return res.status(500).send('Internal Server Error: Failed to save session');
            }
            res.redirect('/dashboard');
        });
    }
);



// Logout route
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Error logging out:', err);
        }
        res.clearCookie('user_info'); // Clear custom cookie
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
            }
            res.redirect('/');
        });
    });
});


// Auth middleware
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated() && req.session) {
        return next();
    }
    res.redirect('/auth/google');
};


const isNotAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return next();
    }
    res.redirect('/dashboard');
};

module.exports = {
    router,
    isAuthenticated,
    isNotAuthenticated
};
