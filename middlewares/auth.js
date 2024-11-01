// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const passport = require('passport');

// Google OAuth Routes
router.get('/auth/google',
     passport.authenticate('google', {
          scope: ['profile', 'email'],
          prompt: 'select_account'
     })
);

router.get('/auth/google/cb',
     passport.authenticate('google', {
          failureRedirect: '/login',
          failureFlash: true
     }),
     (req, res) => {
          // Check if it's a new user
          if (req.user.createdAt === req.user.updatedAt) {
               return res.redirect('/onboarding');
          }
          res.redirect('/dashboard');
     }
);

// Logout route
router.get('/logout', (req, res) => {
     req.logout();
     res.redirect('/');
});

// Auth middleware
const isAuthenticated = (req, res, next) => {
     if (req.isAuthenticated()) {
          return next();
     }
     res.redirect('/login');
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