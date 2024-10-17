const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Admin = require('../models/admin'); // Assuming you have an Admin model
require('dotenv').config();

// Handle Admin Login
router.get('/admin/login', (req, res) => {
     res.render('admin/login');
});

require('dotenv').config(); // Load environment variables from .env

// Admin Login Route
router.post('/admin/login', async (req, res) => {
     const { username, password } = req.body;

     try {
          // Check if the username matches the one in the .env file
          if (username !== process.env.ADMIN_USERNAME && username !== process.env.AUTHOR_USERNAME) {
               req.flash('error', 'Invalid username');
               return res.redirect('/admin/login');
          }

          // If the username is valid, check the password
          const envPassword = username === process.env.ADMIN_USERNAME ? process.env.ADMIN_PASSWORD : process.env.AUTHOR_PASSWORD;

          // Compare the password (if using plain text passwords in .env, otherwise you can use bcrypt for hashing)
          const isMatch = password === envPassword;

          if (!isMatch) {
               req.flash('error', 'Invalid password');
               return res.redirect('/admin/login');
          }

          // Set session and cookies based on the role
          req.session.isAuthenticated = true;
          req.session.adminRole = username === process.env.ADMIN_USERNAME ? 'admin' : 'author'; // Set the role based on the username

          // Redirect to the appropriate dashboard
          res.redirect('/admin/dashboard');
     } catch (err) {
          console.error('Error during admin login:', err);
          res.status(500).send('Server Error');
     }
});



// Dashboard Route
router.get('/admin/dashboard', (req, res) => {
     if (!req.session.isAuthenticated) {
          return res.redirect('/admin/login');
     }

     // Only allow admins to view the full dashboard
     if (req.session.adminRole === 'admin') {
          return res.render('admin/dashboard', { role: 'admin' });
     } else if (req.session.adminRole === 'author') {
          return res.render('admin/dashboard', { role: 'author' });
     } else {
          return res.redirect('/admin/login');
     }
});

// Logout Route
router.get('/admin/logout', (req, res) => {
     req.session.destroy((err) => {
          if (err) {
               return res.status(500).send('Error during logout');
          }
          res.redirect('/admin/login');
     });
});

module.exports = router;
