const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Service = require('../models/service'); // Your Service model





// POST: Create new service
router.post('/services/new', [
     body('description').isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caractères.'),
     body('priceRange').isLength({ min: 3 }).withMessage('Veuillez entrer une plage de prix valide.'),
     body('location').notEmpty().withMessage('Le lieu est obligatoire.'),
     body('serviceOptions').isArray({ min: 1 }).withMessage('Sélectionnez au moins une option.')
], async (req, res) => {
     const errors = validationResult(req);

     // If validation errors exist
     if (!errors.isEmpty()) {
          return res.status(400).json({ success: false, errors: errors.array() });
     }

     try {
          // Create a new service document
          const newService = new Service({
               serviceName: req.body.serviceName,
               description: req.body.description,
               priceRange: req.body.priceRange,
               location: req.body.location,
               serviceOptions: req.body.serviceOptions,
               createdBy: req.user._id
          });

          // Save service to the database
          await newService.save();
          res.status(201).json({ success: true, message: 'Service créé avec succès!' });
     } catch (err) {
          console.error(err);
          res.status(500).json({ success: false, message: 'Erreur serveur, veuillez réessayer.' });
     }
});

// POST: Like a service
router.post('/services/:id/like', async (req, res) => {
     const serviceId = req.params.id;
     const likedServices = req.cookies.likedServices || [];

     // Check if the user has already liked this service
     if (likedServices.includes(serviceId)) {
          return res.json({ success: false, message: 'Vous avez déjà aimé ce service.' });
     }

     try {
          // Update the like counter
          await Service.findByIdAndUpdate(serviceId, { $inc: { likes: 1 } });

          // Set a cookie to remember the interaction
          likedServices.push(serviceId);
          res.cookie('likedServices', likedServices, { maxAge: 30 * 24 * 60 * 60 * 1000 }); // 30 days

          res.json({ success: true, message: 'Service aimé.' });
     } catch (err) {
          console.error(err);
          res.status(500).json({ success: false, message: 'Erreur serveur.' });
     }
});



// POST: Dislike a service
router.post('/services/:id/dislike', async (req, res) => {
     const serviceId = req.params.id;
     const dislikedServices = req.cookies.dislikedServices || [];

     // Check if the user has already disliked this service
     if (dislikedServices.includes(serviceId)) {
          req.flash('error', 'Vous avez déjà disliké ce service.');
          return res.redirect('back');
     }

     try {
          // Update the dislike counter
          await Service.findByIdAndUpdate(serviceId, { $inc: { dislikes: 1 } });

          // Set a cookie to remember the interaction
          dislikedServices.push(serviceId);
          res.cookie('dislikedServices', dislikedServices, { maxAge: 30 * 24 * 60 * 60 * 1000 }); // 30 days

          req.flash('success', 'Merci d\'avoir disliké ce service.');
          res.json({ success: true });
     } catch (err) {
          console.error(err);
          req.flash('error', 'Erreur serveur.');
          res.json({ success: false });
     }
});

// GET: Search for services
router.get('/services/search', async (req, res) => {
     try {

          const { location, serviceName } = req.query;  // Extract location, and serviceType

          // Build the search query
          let searchQuery = {};

          if (location) {
               searchQuery.location = location;
          }



          if (serviceName) {
               searchQuery.serviceName = serviceName; // Case-insensitive search for serviceType
          }

          // Find services matching the search query
          const services = await Service.find(searchQuery);
          console.log(searchQuery)


          // Render the filtered services and available locations to the view
          res.render('user/services', { services });
     } catch (err) {
          console.error('Error fetching services:', err);
          res.status(500).json({ success: false, message: 'Erreur serveur.' });
     }
});



module.exports = router;
