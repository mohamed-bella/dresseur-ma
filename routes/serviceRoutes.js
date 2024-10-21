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

// Utility function for case-insensitive regex
const getCaseInsensitiveRegex = (value) => new RegExp(value, 'i');

// GET: Search for services by serviceName and optionally location
router.get('/services/:serviceName/:location?', async (req, res) => {
     try {
          const { serviceName, location } = req.params;

          // Query to find services based on serviceName and optionally location
          const serviceQuery = {
               serviceName: getCaseInsensitiveRegex(serviceName)
          };

          if (location) {
               serviceQuery.location = getCaseInsensitiveRegex(location);  // Add location to query if present
          }

          // Fetch services with populated 'createdBy' field to get user data
          const [services, locations] = await Promise.all([
               Service.find(serviceQuery)
                    .populate('createdBy', 'email image displayName')  // Populate the 'createdBy' field with 'name' and 'email' from User
                    .limit(6),  // Limit services to 6
               Service.distinct('location', { serviceName: getCaseInsensitiveRegex(serviceName) })
          ]);

          // console.log(services)

          // Render the filtered services, locations, and current user data
          res.render('user/services', { services, locations, serviceName, location });
     } catch (err) {
          console.error('Error fetching services:', err);
          res.status(500).json({ success: false, message: 'Erreur serveur.' });
     }
});

// GET: Service Details
router.get('/service/:serviceId', async (req, res) => {
     try {
          const serviceId = req.params.serviceId;

          // Fetch the service by ID and populate the `createdBy` field to get user data
          const service = await Service.findById(serviceId).populate('createdBy');

          if (!service) {
               return res.status(404).send('Service not found');
          }

          // Render the service details view
          res.render('user/serviceDetails', { service });
     } catch (err) {
          console.error('Error fetching service details:', err);
          res.status(500).json({ success: false, message: 'Erreur serveur.' });
     }
});



module.exports = router;
