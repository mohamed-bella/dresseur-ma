// routes/contact.js
const express = require('express');
const router = express.Router();
const Contact = require('../models/contact'); // Import the Contact model
const { check, validationResult } = require('express-validator');



// POST - Handle form submission with validation
const contactValidation = [
     check('name')
          .trim()
          .notEmpty().withMessage('Le nom est requis')
          .isLength({ min: 2 }).withMessage('Le nom doit contenir au moins 2 caractères')
          .escape(),

     check('email')
          .trim()
          .notEmpty().withMessage('L\'email est requis')
          .isEmail().withMessage('Veuillez fournir une adresse email valide')
          .normalizeEmail(),

     check('message')
          .trim()
          .notEmpty().withMessage('Le message est requis')
          .isLength({ min: 10 }).withMessage('Le message doit contenir au moins 10 caractères')
          .escape()
];

// Contact route handler
router.post('/contact', contactValidation, async (req, res) => {
     try {
          // Check if it's an AJAX request
          const isAjax = req.xhr || req.headers.accept.indexOf('json') > -1;

          // Validate inputs
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
               if (isAjax) {
                    return res.status(400).json({
                         status: 'error',
                         errors: errors.array().map(err => ({
                              field: err.param,
                              message: err.msg
                         }))
                    });
               }

               // Traditional form submission
               return res.render('user/contact', {
                    errors: errors.array(),
                    formData: req.body
               });
          }

          const { name, email, message } = req.body;

          // Create and save new contact
          const newContact = new Contact({
               name,
               email,
               message
          });

          await newContact.save();

          // Handle successful submission
          if (isAjax) {
               return res.status(200).json({
                    status: 'success',
                    message: 'Votre message a été envoyé avec succès !'
               });
          }

          // Traditional form submission
          req.flash('success', 'Votre message a été envoyé avec succès !');
          return res.redirect('/contact');

     } catch (error) {
          console.error('Contact submission error:', error);

          if (isAjax) {
               return res.status(500).json({
                    status: 'error',
                    message: 'Une erreur est survenue lors de l\'envoi du message. Veuillez réessayer.'
               });
          }

          // Traditional form submission
          req.flash('error', 'Une erreur est survenue lors de l\'envoi du message. Veuillez réessayer.');
          return res.redirect('/contact');
     }
});

module.exports = router;
