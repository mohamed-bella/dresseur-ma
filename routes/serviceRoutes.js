const express = require('express');
const router = express.Router();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose')
const { ObjectId } = mongoose.Types;

const sharp = require('sharp');
const Service = require('../models/service');
const Review = require('../models/review');
const User = require('../models/user')
const Reservation = require('../models/reservation');

const fs = require('fs');

// S3 Client initialization
const s3 = new S3Client({
     region: process.env.AWS_REGION,
     credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
     }
});
// Define a helper function to create a case-insensitive regex pattern
const getCaseInsensitiveRegex = (str) => {
     return new RegExp(str, 'i');
};

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({
     storage,
     limits: {
          fileSize: 5 * 1024 * 1024, // 5MB
          files: 5
     },
     fileFilter: (req, file, cb) => {
          if (!file.mimetype.startsWith('image/')) {
               return cb(new Error('Only images are allowed'));
          }
          cb(null, true);
     }
}).array('serviceImages', 5); // Changed to array for multiple files

// Image processing function
const processImage = async (buffer) => {
     return await sharp(buffer)
          .resize(800, 600, {
               fit: 'cover',
               withoutEnlargement: true
          })
          .webp({ quality: 80 })
          .toBuffer();
};

// S3 upload function
const uploadToS3 = async (fileBuffer, key) => {
     const params = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key,
          Body: fileBuffer,
          ContentType: 'image/webp',
          ACL: 'public-read'
     };

     await s3.send(new PutObjectCommand(params));
     return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

// GET: New Service Form
router.get('/dashboard/new-service', async (req, res) => {
     try {
          // Metadata for SEO
          const pageTitle = 'Créer un nouveau service | NDRESSILIK';
          const description = 'Créez et publiez votre service animalier sur NDRESSILIK';
          const keywords = 'création service, services animaliers, NDRESSILIK';

          // Fetch any necessary data for the form
          const locations = await Service.distinct('location');
          const services = await Service.distinct('serviceName');
          const features = [
               { id: 'certified', name: 'Certification professionnelle' },
               { id: 'experience', name: '5+ ans d\'expérience' },
               { id: 'insurance', name: 'Service assuré' },
               { id: 'emergency', name: 'Service d\'urgence' },
               { id: 'home', name: 'Service à domicile' },
               { id: 'transport', name: 'Transport inclus' }
          ];

          res.render('user/dashboard/newService', {
               pageTitle,
               description,
               keywords,
               user: req.user,
               services,
               locations,
               features,
               // formData: {},
               errors: []
          });

     } catch (error) {
          console.error('Error loading new service form:', error);
          res.status(500).json({
               success: false,
               message: 'Une erreur est survenue lors du chargement du formulaire'
          });
     }
});

// Service creation endpoint
router.post('/services/add', (req, res) => {
     upload(req, res, async (err) => {
          if (err) {
               return res.status(400).json({
                    success: false,
                    message: err.message
               });
          }

          try {
               console.log(req.body.serviceImages)
               const { serviceName, serviceImages, description, minPrice, location, serviceType } = req.body;


               // Process and upload images
               // if (req.files && req.files.length > 0) {
               //      for (const file of req.files) {
               //           const resizedImage = await processImage(file.buffer);
               //           const key = `services/${Date.now()}-${path.basename(file.originalname)}`;
               //           const imageUrl = await uploadToS3(resizedImage, key);
               //           serviceImages.push(imageUrl);
               //      }
               // }

               // console.log(serviceImages)

               // Create new service
               const newService = new Service({
                    serviceName: serviceName.trim(),
                    description: description.trim(),
                    priceRange: `${minPrice}`,
                    location: location.toLowerCase(),
                    serviceOptions: serviceType,
                    createdBy: req.user ? req.user._id : null,
                    images: serviceImages
               });

               await newService.save();

               res.status(201).json({
                    success: true,
                    message: 'Service créé avec succès!'
               });

          } catch (error) {
               console.error(error);
               res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la création du service'
               });
          }
     });
});

// FilePond temporary upload endpoint
router.post('/services/upload-temp', (req, res) => {
     upload(req, res, async (err) => {
          if (err) {
               return res.status(400).json({ error: err.message });
          }

          try {
               if (!req.files || req.files.length === 0) {
                    return res.status(400).json({ error: 'No file uploaded' });
               }

               const uploadedUrls = [];
               for (const file of req.files) {
                    const resizedImage = await processImage(file.buffer);
                    const key = `temp/${Date.now()}-${path.basename(file.originalname)}`;
                    const imageUrl = await uploadToS3(resizedImage, key);
                    uploadedUrls.push({ key, url: imageUrl });
               }

               res.json({ uploadedUrls });
          } catch (error) {
               console.error(error);
               res.status(500).json({ error: 'Upload failed' });
          }
     });
});

/**
 * ============================
 * FETCH SERVICES
 * ============================
 */

// GET: Fetch all services (e.g., "/services/tous")

/**
 * ============================
 * LIKE A SERVICE
 * ============================
 */

// POST: Like a service
router.post('/services/:id/like', async (req, res) => {
     const serviceId = req.params.id;
     const likedServices = req.cookies.likedServices || [];

     if (likedServices.includes(serviceId)) {
          return res.json({ success: false, message: 'Vous avez déjà aimé ce service.' });
     }

     try {
          await Service.findByIdAndUpdate(serviceId, { $inc: { likes: 1 } });

          likedServices.push(serviceId);
          res.cookie('likedServices', likedServices, { maxAge: 30 * 24 * 60 * 60 * 1000 }); // 30 days
          res.json({ success: true, message: 'Service aimé.' });
     } catch (err) {
          console.error(err);
          res.status(500).json({ success: false, message: 'Erreur serveur.' });
     }
});

/**
 * ============================
 * SEARCH SERVICES
 * ============================
**/
// Configuration objects
const serviceConfig = {
     icons: {
          'dressage': '🐕',
          'toilettage': '✂️',
          'promonade': '🦮',
          'veterinaire': '⚕️',
          'pension': '🏠',
          'transport': '🚗'
     },
     titles: {
          'dressage': 'Dressage de chiens',
          'toilettage': 'Toilettage pour animaux',
          'promonade': 'Promenade de chiens',
          'veterinaire': 'Services vétérinaires',
          'pension': 'Pension pour animaux',
          'transport': 'Transport animalier',
          'tous': 'Tous les services'
     },
     descriptions: {
          'dressage': 'Services professionnels de dressage canin',
          'toilettage': 'Services de toilettage pour animaux',
          'promonade': 'Services de promenade de chiens',
          'veterinaire': 'Services vétérinaires professionnels',
          'pension': 'Services de pension pour animaux',
          'transport': 'Services de transport animalier',
          'tous': 'Découvrez tous nos services pour animaux'
     },
     sortOptions: [
          { value: 'recent', label: 'Plus récents' },
          { value: 'price-asc', label: 'Prix croissant' },
          { value: 'price-desc', label: 'Prix décroissant' },
          { value: 'rating', label: 'Meilleures notes' }
     ]
};

router.get('/services/:serviceOption?/:location?', async (req, res) => {
     try {
          const { serviceOption = 'tous', location } = req.params;
          const page = parseInt(req.query.page) || 1;
          const limit = parseInt(req.query.limit) || 12;
          const sort = req.query.sort || 'recent';

          // Build query
          const query = { isActive: true };
          if (serviceOption !== 'tous') {
               query.serviceOptions = serviceOption.toLowerCase();
          }
          if (location) {
               query.location = new RegExp(location, 'i');
          }

          // Get sort configuration
          const sortConfig = {
               'recent': { createdAt: -1 },
               'price-asc': { priceRange: 1 },
               'price-desc': { priceRange: -1 },
               'rating': { rating: -1 }
          }[sort] || { createdAt: -1 };

          // Execute queries
          const [services, total] = await Promise.all([
               Service.find(query)
                    .populate('createdBy', 'displayName profileImage isVerified')
                    .sort(sortConfig)
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .lean(),
               Service.countDocuments(query)
          ]);

          // Process services
          const processedServices = services.map(service => ({
               _id: service._id,
               serviceName: service.serviceName || service.serviceOptions?.[0] || 'Service',
               serviceOptions: service.serviceOptions,
               images: service.images || [],
               rating: service.rating || 4.9,
               reviewsCount: service.reviewsCount || '12',
               priceRange: service.priceRange ? `${service.priceRange} DH` : 'N/A',
               location: service.location || 'Non spécifié',
               availability: service.availability || 'sur rendez-vous',
               createdBy: {
                    displayName: service.createdBy?.displayName || 'Service Provider',
                    profileImage: service.createdBy?.profileImage || '/default-avatar.png',
                    isVerified: service.createdBy?.isVerified || false
               },
               serviceType: service.serviceOptions?.[0]?.toLowerCase() || 'general',
               icon: serviceConfig.icons[service.serviceOptions?.[0]?.toLowerCase()] || '🐾'
          }));

          // Prepare view data
          const viewData = {


          };
          console.log(services)
          res.render('user/services', {
               pageTitle: '',
               description: '',
               keywords: '',

               // Services data
               services: processedServices,
               serviceIcons: serviceConfig.icons,

               // Page metadata
               meta: {
                    title: location ?
                         `${serviceConfig.titles[serviceOption]} à ${location} | NDRESSILIK` :
                         `${serviceConfig.titles[serviceOption]} | NDRESSILIK`,
                    description: serviceConfig.descriptions[serviceOption],
                    keywords: `${serviceOption}, services animaliers, ${location || 'Maroc'}, NDRESSILIK`
               },

               // Current selections
               current: {
                    serviceOption,
                    location,
                    sort
               },

               // Options
               options: {
                    sorts: serviceConfig.sortOptions,
                    serviceTypes: Object.entries(serviceConfig.titles).map(([key, value]) => ({
                         value: key,
                         label: value,
                         icon: serviceConfig.icons[key] || '🐾'
                    }))
               },

               // Pagination
               pagination: {
                    current: page,
                    total: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
               },

               // Additional info
               stats: {
                    total,
                    filteredBy: location ? `à ${location}` : null
               },
               serviceOption

          });

     } catch (error) {
          console.error('Error fetching services:', error);
          res.render('user/services', {
               services: [],
               meta: {
                    title: 'Services | NDRESSILIK',
                    description: 'Découvrez nos services pour animaux'
               },
               error: 'Une erreur est survenue lors du chargement des services'
          });
     }
});

/**
 * ============================
 * SERVICE DETAILS
 * ============================
 */

// GET: Service Details
router.get('/service/:serviceId', async (req, res) => {
     try {
          const serviceId = req.params.serviceId;

          // Find the service by ID and populate the createdBy field
          const service = await Service.findById(serviceId)
               .populate('createdBy', 'email profileImage displayName slug isVerified createdAt');  // Populate the service creator details

          if (!service) {
               return res.status(404).send('Service non trouvé');
          }

          // Fetch reviews separately by serviceId and populate the userId for each review
          const reviews = await Review.find({ serviceId })
               .populate('userId', 'displayName image');  // Populate the user details for each review

          // Increment views
          service.views += 1;
          await service.save();
          // Dynamic metadata for individual service
          const pageTitle = `${service.serviceName} - NDRESSILIK`;
          const description = `${service.serviceName} disponible à ${service.location}. Découvrez les détails sur ce service proposé par ${service.createdBy.name || 'notre plateforme'}.`;
          const keywords = `${service.serviceName}, services pour animaux, ${service.location}, ${service.createdBy.displayName || 'service'}`;


          // Render the service details page with the service and its reviews
          res.render('user/serviceDetails', {
               service,
               reviews,  // Pass the reviews to the frontend template
               pageTitle,
               description,
               keywords
          });
     } catch (err) {
          console.error('Error fetching service details:', err);
          res.status(500).json({ success: false, message: 'Erreur serveur.' });
     }
});


// Submit a review
router.post('/services/:serviceId/review', async (req, res) => {
     try {
          const { rating, comment } = req.body;
          console.log(req.body)
          const userId = req.user._id;
          const newReview = new Review({
               serviceId: req.params.serviceId,
               userId,
               rating,
               comment
          });

          await newReview.save();

          res.status(200).json({
               success: true,
               message: 'Avis ajouté avec succès'
          });
     } catch (error) {
          console.log(error)
          res.status(500).json({
               success: false,
               message: 'Erreur lors de l\'ajout de l\'avis'
          });
     }
});

// Route: Toggle Service Status
router.put('/dashboard/services/:serviceId/toggle-status', async (req, res) => {
     try {
          const { serviceId } = req.params;
          const { status } = req.body;

          // Validate the status
          if (!['active', 'inactive'].includes(status)) {
               return res.status(400).json({
                    success: false,
                    message: 'Statut invalide. Doit être "active" ou "inactive".'
               });
          }

          // Convert status to isActive boolean
          const isActive = status === 'active';

          // Find the service by ID
          const service = await Service.findById(serviceId);

          if (!service) {
               return res.status(404).json({
                    success: false,
                    message: 'Service non trouvé'
               });
          }

          // Check if the authenticated user is the owner of the service
          if (service.createdBy.toString() !== req.user._id.toString()) {
               return res.status(403).json({
                    success: false,
                    message: 'Vous n\'êtes pas autorisé à modifier ce service'
               });
          }

          // Update the isActive status
          service.isActive = isActive;
          await service.save();

          res.json({
               success: true,
               message: 'Le statut du service a été mis à jour avec succès'
          });
     } catch (error) {
          console.error('Error updating service status:', error);
          res.status(500).json({
               success: false,
               message: 'Une erreur est survenue lors de la mise à jour du statut du service'
          });
     }
});

// GET EDIT SERVICE PAGE 
router.get('/dashboard/services/:serviceId/edit', async (req, res) => {
     try {
          const service = await Service.findById(req.params.serviceId)
               .populate('createdBy', 'email profileImage displayName');

          if (!service) {
               return res.status(404).json({
                    success: false,
                    message: 'Service non trouvé'
               });
          }

          // Check if user owns this service
          if (service.createdBy._id.toString() !== req.user._id.toString()) {
               return res.status(403).json({
                    success: false,
                    message: 'Non autorisé à modifier ce service'
               });
          }

          // Metadata for SEO
          const pageTitle = `Modifier ${service.serviceName} | NDRESSILIK`;
          const description = 'Modifier votre service sur NDRESSILIK';
          const keywords = 'modification service, services animaliers, NDRESSILIK';

          res.render('user/dashboard/editService', {
               pageTitle,
               description,
               keywords,
               user: req.user,
               service,
               errors: []
          });

     } catch (error) {
          console.error('Error fetching service for edit:', error);
          res.status(500).json({
               success: false,
               message: 'Une erreur est survenue lors du chargement du service'
          });
     }
});


// DELETE route for removing a service and redirecting
router.post('/dashboard/services/:serviceId/delete', async (req, res) => {
     try {
          const serviceId = req.params.serviceId;
          console.log(serviceId)

          // Check if the provided ID is valid
          // if (!ObjectId.isValid(serviceId)) {
          //      return res.status(400).send('Invalid service ID');
          // }

          // Find and delete the service
          const deletedService = await Service.findByIdAndDelete(serviceId);

          // If the service was not found, send an error response
          if (!deletedService) {
               return res.status(404).send('Service not found');
          }

          // Redirect to a different page after successful deletion (e.g., dashboard or services list)
          res.redirect('/dashboard'); // Adjust the path as needed for your application
     } catch (error) {
          console.error('Error deleting service:', error);
          res.status(500).send('An error occurred while deleting the service');
     }
});

// Updated route with middleware
router.post('/dashboard/services/:serviceId', upload, async (req, res) => {
     try {
          const serviceId = req.params.serviceId;
          const service = await Service.findById(serviceId);

          if (!service) {
               return res.status(404).json({
                    success: false,
                    message: 'Service non trouvé'
               });
          }

          // Check ownership
          if (service.createdBy.toString() !== req.user._id.toString()) {
               return res.status(403).json({
                    success: false,
                    message: 'Non autorisé à modifier ce service'
               });
          }

          const { serviceName, description, minPrice, maxPrice, location, serviceType } = req.body;

          // Parse price range from the current values
          let priceRange;
          if (minPrice && maxPrice) {
               priceRange = `${minPrice}-${maxPrice} DH`;
          } else {
               // Keep existing price range if new values aren't provided
               priceRange = service.priceRange;
          }

          let imageUrls = [...service.images]; // Keep existing images

          // Process new images if any
          if (req.files && req.files.length > 0) {
               for (const file of req.files) {
                    const resizedImage = await processImage(file.buffer);
                    const key = `services/${Date.now()}-${path.basename(file.originalname)}`;
                    const imageUrl = await uploadToS3(resizedImage, key);
                    imageUrls.push(imageUrl);
               }
          }

          // Remove images if specified
          if (req.body.removeImages) {
               const imagesToRemove = JSON.parse(req.body.removeImages);
               imageUrls = imageUrls.filter(url => !imagesToRemove.includes(url));
          }

          // Update service
          const updatedService = await Service.findByIdAndUpdate(
               serviceId,
               {
                    serviceName: serviceName.trim(),
                    description: description.trim(),
                    priceRange,
                    location: location.toLowerCase(),
                    serviceOptions: serviceType,
                    images: imageUrls
               },
               { new: true }
          );

          res.status(200).json({
               success: true,
               message: 'Service mis à jour avec succès',
               service: updatedService
          });

     } catch (error) {
          console.error('Error updating service:', error);
          res.status(500).json({
               success: false,
               message: 'Erreur lors de la mise à jour du service'
          });
     }
});

module.exports = router;
