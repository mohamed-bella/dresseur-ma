// routes/contact.js
const express = require('express');
const router = express.Router();
const Contact = require('../models/contact'); // Import the Contact model
const { check, validationResult } = require('express-validator');



// POST - Handle form submission with validation
router.post(
     '/contact',
     [
          // Validate and sanitize fields
          check('name', 'Le nom est requis').not().isEmpty().trim().escape(),
          check('email', 'L\'email est requis et doit être valide').isEmail().normalizeEmail(),
          check('message', 'Le message est requis').not().isEmpty().trim().escape(),
     ],
     async (req, res) => {
          console.log(req.body)
          // Check for validation errors
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
               return res.render('user/contact', {
                    errors: errors.array(),
                    formData: req.body, // Send back the entered form data
               });
          }

          const { name, email, message } = req.body;

          try {
               // Create a new contact submission
               const newContact = new Contact({
                    name,
                    email,
                    message,
               });

               // Save the contact submission to the database
               await newContact.save();

               // Flash a success message (you can replace this with your own method)
               req.flash('success', 'Votre message a été envoyé avec succès !');

               // Redirect back to the contact page or to another page
               res.redirect('/contact');
          } catch (error) {
               console.error('Erreur lors de l\'envoi du message :', error);
               res.status(500).send('Erreur serveur');
          }
     }
);

module.exports = router;
