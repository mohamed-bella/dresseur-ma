const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

const passport = require('passport');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const captureVisit = require('../utils/visitTracker'); // Import the visit tracking utility
const Visit = require('../models/visit')
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

const fs = require('fs');
const Article = require('../models/article');
const slugify = require('slugify');
const sharp = require('sharp');
// const upload = require('../config/multer'); // Multer config with Cloudinary
const Announcement = require('../models/announcement'); // Your announcement model
const Service = require('../models/service');
const User = require('../models/user');
const Event = require('../models/event');
const Reservation = require('../models/reservation')
const Review = require('../models/review');
const { sendNewServiceEmail } = require('../utils/emails'); // Import the email service




// Set up multer for file uploads (saving locally)
const storage = multer.memoryStorage();


const upload = multer({
     storage: storage, // Use memory storage to hold files in buffer
     limits: { fileSize: 10 * 1024 * 1024 } // Limit file size to 10MB (adjust as needed)
});



// Validation middleware
const validateService = [
     body('serviceName')
          .trim()
          .isLength({ min: 3, max: 100 })
          .withMessage('Le nom du service doit contenir entre 3 et 100 caractères'),

     body('description')
          .trim()
          .isLength({ min: 100 })
          .withMessage('La description doit contenir au moins 100 caractères'),

     body('serviceType')
          .isIn(['dressage', 'toilettage', 'promenade', 'veterinaire', 'pension', 'transport'])
          .withMessage('Type de service invalide'),

     body('location')
          .trim()
          .notEmpty()
          .withMessage('La localisation est requise'),

     body('basePrice')
          .isNumeric()
          .withMessage('Le prix doit être un nombre')
          .custom((value) => value >= 0)
          .withMessage('Le prix ne peut pas être négatif'),

     body('features')
          .optional()
          .isArray()
          .withMessage('Les caractéristiques doivent être un tableau'),

     body('availability')
          .optional()
          .isObject()
          .withMessage('La disponibilité doit être un objet valide')
];



// POST: Create New Service
router.post('/dashboard/new-service', validateService, async (req, res) => {
     try {
          // Handle file upload with error handling
          upload(req, res, async function (err) {
               if (err instanceof multer.MulterError) {
                    return res.status(400).json({
                         success: false,
                         message: 'Erreur lors du téléchargement des images',
                         errors: [{ msg: err.message }]
                    });
               }

               // Validate input
               const errors = validationResult(req);
               if (!errors.isEmpty()) {
                    return res.status(400).json({
                         success: false,
                         message: 'Erreur de validation',
                         errors: errors.array()
                    });
               }

               // Process and upload images
               const imageUrls = [];
               if (req.files && req.files.length > 0) {
                    for (const file of req.files) {
                         try {
                              // Process image with sharp
                              const processedImage = await sharp(file.buffer)
                                   .resize(1200, 800, {
                                        fit: 'cover',
                                        withoutEnlargement: true
                                   })
                                   .webp({ quality: 80 })
                                   .toBuffer();

                              // Generate unique filename
                              const filename = `services/${Date.now()}-${slugify(req.body.serviceName)}-${imageUrls.length + 1}.webp`;

                              // Upload to S3
                              const upload = new Upload({
                                   client: s3,
                                   params: {
                                        Bucket: process.env.AWS_S3_BUCKET_NAME,
                                        Key: filename,
                                        Body: processedImage,
                                        ContentType: 'image/webp',
                                        ACL: 'public-read'
                                   }
                              });

                              const result = await upload.done();
                              imageUrls.push({
                                   url: result.Location,
                                   key: filename
                              });

                         } catch (error) {
                              console.error('Error processing image:', error);
                              return res.status(500).json({
                                   success: false,
                                   message: 'Erreur lors du traitement des images'
                              });
                         }
                    }
               }

               try {
                    // Create service object
                    const newService = new Service({
                         serviceName: req.body.serviceName,
                         description: req.body.description,
                         serviceType: req.body.serviceType,
                         location: req.body.location,
                         basePrice: req.body.basePrice,
                         features: req.body.features || [],
                         images: imageUrls,
                         availability: JSON.parse(req.body.availability || '{}'),
                         provider: req.user._id,
                         status: 'active',
                         policies: req.body.policies || [],
                         experienceLevel: req.body.experienceLevel,
                         coordinates: req.body.coordinates ? {
                              type: 'Point',
                              coordinates: [
                                   parseFloat(req.body.coordinates.lng),
                                   parseFloat(req.body.coordinates.lat)
                              ]
                         } : undefined,
                         weeklySchedule: req.body.weeklySchedule || {},
                         bookingNotice: req.body.bookingNotice,
                         serviceDuration: req.body.serviceDuration,
                         maxCapacity: req.body.maxCapacity,
                         slug: slugify(req.body.serviceName, { lower: true, strict: true })
                    });

                    await newService.save();

                    // Return success response
                    res.status(201).json({
                         success: true,
                         message: 'Service créé avec succès',
                         serviceId: newService._id,
                         redirect: `/service/${newService._id}/${newService.slug}`
                    });

               } catch (error) {
                    console.error('Error creating service:', error);
                    res.status(500).json({
                         success: false,
                         message: 'Erreur lors de la création du service'
                    });
               }
          });
     } catch (error) {
          console.error('Error in service creation route:', error);
          res.status(500).json({
               success: false,
               message: 'Erreur serveur'
          });
     }
});

// router.get('/', async (req, res) => {

//      // Define the metadata for the homepage
//      const pageTitle = 'Bienvenue sur NDRESSILIK - Trouvez les meilleurs services pour votre chiend';
//      const description = 'Découvrez les derniers services et annonces pour animaux de compagnie sur NDRESSILIK. Recherchez par lieu et type de service.';
//      const keywords = 'services pour animaux,services pour chien, annonces, dressage, toilettage, adoption des animaux, NDRESSILIK';

//      try {

//           const events = await Event.find({
//                // date: { $gte: new Date() }
//           })
//                .sort({ createdat: -1 }) // Sort by date ascending
//                .limit(3); // Limit to 7 events (1 featured + 6 grid items)
//           // Fetch top providers with their metrics
//           const topProviders = await User.find({ status: 'active' })
//                .sort({ "metrics.averageRating": -1, "metrics.completedBookings": -1 })
//                .limit(7)
//                .select('displayName profileImage location city specializations metrics averageRating slug isVerified');

//           // Fetch services and reviews for each provider
//           const providersWithDetails = await Promise.all(
//                topProviders.map(async (provider) => {
//                     // Fetch provider's services
//                     const services = await Service.find({ createdBy: provider._id })
//                          .select('serviceName description priceRange images location serviceOptions')
//                          .limit(3); // Limit to 3 recent services

//                     // Fetch provider's reviews
//                     const reviews = await Review.find({
//                          serviceId: {
//                               $in: services.map(service => service._id)
//                          }
//                     })
//                          .populate('userId', 'displayName profileImage')
//                          .sort({ createdAt: -1 })
//                          .limit(5); // Limit to 5 recent reviews

//                     // Calculate metrics
//                     const avgRating = reviews.length > 0
//                          ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
//                          : 0;

//                     // Return provider with additional details
//                     return {
//                          ...provider.toObject(),
//                          services,
//                          reviews,
//                          metrics: {
//                               ...provider.metrics,
//                               averageRating: avgRating.toFixed(1),
//                               totalReviews: reviews.length,
//                               totalServices: services.length
//                          }
//                     };
//                })
//           );

//           // Fetch latest articles
//           const articles = await Article.find()
//                .sort({ createdAt: -1 })
//                .limit(6)
//                .select('title summary featuredImage category tags createdAt slug author');


//           // console.log(articles)

//           // Fetch locations
//           const [announcementLocations, serviceLocations] = await Promise.all([
//                Announcement.distinct('location'),
//                Service.distinct('location')
//           ]);

//           // Combine and filter unique locations
//           const uniqueLocations = [...new Set([...announcementLocations, ...serviceLocations])]
//                .filter(Boolean) // Remove empty values
//                .sort(); // Sort alphabetically

//           // Fetch featured announcements
//           const announcements = await Announcement.find({ status: 'active' })
//                .sort({ createdAt: -1 })
//                .limit(6)
//                .select('title description images location price breed age gender');

//           // service tabs in the home page 
//           const { category, page = 1 } = req.query;
//           const limit = 4;
//           const skip = (page - 1) * limit;

//           let query = {};

//           const services = await Service.find(query)
//                .sort({ createdAt: -1 })
//                .skip(skip)
//                .limit(limit)
//                .select('serviceName location priceRange images views');

//           // console.log(services)
//           res.render('user/index', {
//                pageTitle,
//                description,
//                events,
//                keywords,

//                topProviders: providersWithDetails, // Now includes services and reviews
//                articles,
//                services,
//                // announcements,
//                locations: uniqueLocations,
//                user: req.user || null // Pass current user if exists
//           });

//      } catch (error) {
//           console.error('Error fetching homepage data:', error);
//           res.status(500).render('error', {
//                error: {
//                     status: 500,
//                     message: 'Une erreur est survenue lors du chargement de la page'
//                }
//           });
//      }
// });
// GET ALL ARTICLES
router.get('/articles', async (req, res) => {

     // Metadata for the articles page
     const pageTitle = 'Articles sur les animaux | NDRESSILIK';
     const description = 'Lisez les derniers articles sur les soins, l’éducation, et l’adoption d’animaux sur NDRESSILIK.';
     const keywords = 'articles sur les animaux, soins, éducation, adoption, NDRESSILIK';

     try {
          // Fetch all articles
          const articles = await Article.find();
          // console.log(articles)
          // Get unique categories from articles
          const categories = [...new Set(articles.map(article => article.category.trim()))];

          // Extract tags from all articles, flatten them, and get unique, non-empty tags
          const allTags = articles.flatMap(article => article.tags);
          const topics = [...new Set(allTags.filter(tag => tag && tag.trim().length > 0))]; // Filter out empty tags

          // Render the page with articles, categories, and tags
          res.render('user/articles', {
               pageTitle,
               description,
               keywords,
               articles,
               categories,
               topics
          });
     } catch (error) {
          console.error('Error fetching articles:', error);
          res.status(500).send('Server Error');
     }
});


// Helper functions for dashboard
// utils/dashboardHelpers.js
const getDashboardStats = async (userId) => {
     try {
          const stats = await Service.aggregate([
               { $match: { createdBy: mongoose.Types.ObjectId(userId) } },
               {
                    $lookup: {
                         from: 'reviews',
                         localField: '_id',
                         foreignField: 'serviceId',
                         as: 'reviews'
                    }
               },
               {
                    $lookup: {
                         from: 'reservations',
                         localField: '_id',
                         foreignField: 'serviceId',
                         as: 'reservations'
                    }
               },
               {
                    $group: {
                         _id: null,
                         totalServices: { $sum: 1 },
                         activeServices: {
                              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
                         },
                         totalReservations: { $sum: { $size: '$reservations' } },
                         totalReviews: { $sum: { $size: '$reviews' } },
                         totalRevenue: {
                              $sum: {
                                   $reduce: {
                                        input: '$reservations',
                                        initialValue: 0,
                                        in: { $add: ['$$value', '$$this.totalAmount'] }
                                   }
                              }
                         },
                         averageRating: {
                              $avg: {
                                   $cond: [
                                        { $gt: [{ $size: '$reviews' }, 0] },
                                        { $avg: '$reviews.rating' },
                                        0
                                   ]
                              }
                         }
                    }
               }
          ]);

          return stats[0] || {
               totalServices: 0,
               activeServices: 0,
               totalReservations: 0,
               totalReviews: 0,
               totalRevenue: 0,
               averageRating: 0
          };
     } catch (error) {
          console.error('Error calculating dashboard stats:', error);
          throw error;
     }
};



// Updated dashboard route
router.get('/dashboard', async (req, res) => {
     try {

          const requiredFields = [
               { field: 'location.city', weight: 15 },
               { field: 'specializations', weight: 20, isArray: true },
               { field: 'languages', weight: 10, isArray: true },
               { field: 'experience.description', weight: 15, notDefault: 'Sans Experience.' },
               { field: 'qualifications', weight: 15, isArray: true },
               { field: 'gallery', weight: 15, isArray: true },
               { field: 'bio', weight: 10 }
          ];

          // Calculate completion percentage
          let completedWeight = 0;
          requiredFields.forEach(field => {
               if (field.isArray) {
                    // Check if array exists and has items
                    const value = field.field.split('.').reduce((obj, key) => obj?.[key], req.user);
                    if (value && Array.isArray(value) && value.length > 0) {
                         completedWeight += field.weight;
                    }
               } else if (field.notDefault) {
                    // Check if field exists and is not default value
                    const value = field.field.split('.').reduce((obj, key) => obj?.[key], req.user);
                    if (value && value !== field.notDefault) {
                         completedWeight += field.weight;
                    }
               } else {
                    // Check if field exists and has value
                    const value = field.field.split('.').reduce((obj, key) => obj?.[key], req.user);
                    if (value && value !== '') {
                         completedWeight += field.weight;
                    }
               }
          });

          // Add completion percentage to user object
          const userWithCompletion = {
               ...req.user.toObject(),
               completionPercentage: Math.round(completedWeight),
               requiredFields: requiredFields.map(field => {
                    const value = field.field.split('.').reduce((obj, key) => obj?.[key], req.user);
                    return {
                         field: field.field,
                         completed: field.isArray ?
                              (value && Array.isArray(value) && value.length > 0) :
                              (value && (!field.notDefault || value !== field.notDefault))
                    };
               })
          };


          // Get services with basic stats
          const services = await Service.aggregate([
               {
                    $match: {
                         createdBy: new ObjectId(req.user._id)
                    }
               },
               {
                    $lookup: {
                         from: 'reviews',
                         localField: '_id',
                         foreignField: 'serviceId',
                         as: 'reviews'
                    }
               },
               {
                    $lookup: {
                         from: 'reservations',
                         localField: '_id',
                         foreignField: 'serviceId',
                         as: 'reservations'
                    }
               },
               {
                    $addFields: {
                         averageRating: {
                              $cond: [
                                   { $gt: [{ $size: '$reviews' }, 0] },
                                   { $avg: '$reviews.rating' },
                                   0
                              ]
                         },
                         totalReservations: { $size: '$reservations' },
                         status: {
                              $cond: [
                                   { $eq: ['$isActive', true] },
                                   'active',
                                   'inactive'
                              ]
                         }
                    }
               }
          ]);

          // Calculate dashboard stats
          const stats = {
               totalServices: services.length,
               activeServices: services.filter(s => s.status === 'active').length,
               totalReservations: services.reduce((acc, s) => acc + s.totalReservations, 0),
               totalRevenue: services.reduce((acc, s) => {
                    const reservationRevenue = s.reservations.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
                    return acc + reservationRevenue;
               }, 0),
               averageRating: services.length > 0
                    ? (services.reduce((acc, s) => acc + s.averageRating, 0) / services.length).toFixed(1)
                    : 0,
               totalReviews: services.reduce((acc, s) => acc + s.reviews.length, 0)
          };

          const now = new Date();
          const last7Days = new Date(now.setDate(now.getDate() - 7));

          // Aggregate visit data, including guest visits, for the last 7 days
          const detailedVisits = await Visit.aggregate([
               {
                    $match: {
                         providerId: new ObjectId(req.user._id),
                         createdAt: { $gte: last7Days }
                    }
               },
               {
                    $group: {
                         _id: {
                              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                              device: '$device',
                              location: '$location',
                              userId: '$userId'
                         },
                         count: { $sum: 1 }
                    }
               },
               {
                    $sort: { '_id.date': 1 }
               }
          ]);
          const detailedVisits1 = formatDetailedVisits(detailedVisits)

          res.render('user/dashboard/dashboard', {
               user: req.user,
               stats,
               path: 'profile',
               services,
               analytics: {
                    detailedVisits1, // Format data for the frontend
               },
               moment: require('moment')
          });


     } catch (error) {
          console.error('Dashboard Error:', error);
          res.status(500).send('Error loading dashboard');
     }
});


function formatDetailedVisits(visits) {
     // Format visits data to return only date and count
     return visits.map(visit => ({
          date: visit._id.date, // Use only the date for the chart
          count: visit.count    // Total count of visits for that date
     }));
}
// Configure AWS S3 Client for SDK v3
const s3 = new S3Client({
     region: process.env.AWS_REGION,
     credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
     }
});

// POST route to create a new announcement
router.post('/announcements/new', upload.array('images', 10), async (req, res) => {
     console.log('Image upload to S3 started');

     try {
          // Extract form data
          const {
               description,
               announcementType,
               animalType,
               breed,
               age,
               gender,
               vaccination,
               sterilization,
               price,
               adoptionFee,
               location,
               whatsapp,
               email
          } = req.body;

          // Validate required fields
          if (!description || !announcementType || !animalType || !breed || !age || !gender || !location || !whatsapp) {
               return res.status(400).json({ success: false, message: 'All required fields must be filled out.' });
          }

          // Check if files were uploaded
          if (!req.files || req.files.length === 0) {
               return res.status(400).json({ success: false, message: 'No images uploaded' });
          }

          const imageUrls = [];

          // Convert uploaded images to WebP format and upload to S3
          for (const file of req.files) {
               try {
                    // Convert image buffer to WebP format
                    const buffer = await sharp(file.buffer)
                         .webp({ quality: 80 })
                         .toBuffer();

                    // Generate unique file name for WebP image
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    const key = `uploads/${uniqueSuffix}.webp`;

                    // Upload the WebP image to S3
                    const uploadParams = {
                         Bucket: process.env.AWS_S3_BUCKET_NAME,
                         Key: key,
                         Body: buffer,
                         ContentType: 'image/webp',
                         ACL: 'public-read' // Make the image public
                    };

                    const parallelUploads3 = new Upload({
                         client: s3,
                         params: uploadParams
                    });

                    const data = await parallelUploads3.done();
                    imageUrls.push(data.Location); // Store the URL of the uploaded image
               } catch (sharpError) {
                    console.error('Error processing image:', sharpError);
                    return res.status(500).json({ success: false, message: 'Image processing failed', error: sharpError });
               }
          }

          // Generate a slug for the announcement
          const date = new Date().toISOString().slice(0, 10);
          const typeInFrench = announcementType === 'sale' ? 'vendre' : 'adoption';
          const randomNum = Math.floor(1000 + Math.random() * 9000);
          const slug = slugify(`${breed}-${gender}-${typeInFrench}-${date}-${randomNum}-maroc`, { lower: true, strict: true });

          // Create a new announcement
          const newAnnouncement = new Announcement({
               description,
               announcementType,
               animalType,
               breed,
               age,
               gender,
               vaccination,
               sterilization,
               price: announcementType === 'sale' ? price : null,
               adoptionFee: announcementType === 'adoption' ? adoptionFee : null,
               location,
               images: imageUrls, // Store the S3 URLs
               whatsapp,
               email,
               slug,
               user: req.user._id // Link announcement to the logged-in user
          });

          // Save the announcement to the database
          await newAnnouncement.save();

          // Respond with success message
          res.json({ success: true, message: 'Announcement added successfully!' });
     } catch (err) {
          console.error('Error adding announcement:', err);
          res.status(500).json({ success: false, message: 'Internal Server Error' });
     }
});

// GET adopted dogs only
router.get('/adoptions', async (req, res) => {
     try {
          // Fetch only adopted dogs from the database
          const adoptedDogs = await Announcement.find({ announcementType: 'adopted' }); // assuming 'status' field in Dog model

          res.render('user/adoption', { announcements: adoptedDogs });
     } catch (error) {
          console.error('Error fetching adopted dogs:', error);
          res.status(500).send('Server Error');
     }
});



// POST: Handle New Announcement
// router.post('/announcements/new', upload.array('images', 10), async (req, res) => {
//      console.log('uploading image started ')
//      console.log(JSON.stringify(req.file, null, 2)); // Pretty-print the object
//      try {
//           // Extract form data
//           const {

//                description,
//                announcementType,
//                animalType,
//                breed,
//                age,
//                gender,
//                vaccination,
//                sterilization,
//                price,
//                adoptionFee,
//                location,
//                whatsapp,
//                email
//           } = req.body;

//           // Extract uploaded files from Cloudinary (returned by Multer)
//           const imageUrls = req.files.map(file => file.path);

//           // Create new announcement
//           const newAnnouncement = new Announcement({

//                description,
//                announcementType,
//                animalType,
//                breed,
//                age,
//                gender,
//                vaccination,
//                sterilization,
//                price: announcementType === 'sale' ? price : null, // Only store price for sale announcements
//                adoptionFee: announcementType === 'adoption' ? adoptionFee : null, // Only store adoption fee for adoption
//                location,
//                images: imageUrls, // Store Cloudinary URLs
//                whatsapp,
//                email,
//                user: req.user._id, // Link announcement to the logged-in user
//           });

//           // Save the announcement to the database
//           await newAnnouncement.save();

//           // Respond with success message in JSON format
//           res.json({ success: true, message: 'Announcement added successfully!' });

//      } catch (err) {
//           console.error('Error adding announcement:', err);


//           // Send error message in JSON format
//           res.status(500).json({ success: false, message: 'Internal Server Error' });
//      }
// });


// DELETE: Handle Deleting an Announcement
router.post('/announcements/:id/delete', async (req, res) => {
     try {
          // Find the announcement by ID and remove it
          await Announcement.findByIdAndDelete(req.params.id);
          req.flash('success', 'Announcement deleted successfully!');
          res.redirect('/dashboard'); // Redirect to the dashboard after deletion
     } catch (err) {
          console.error('Error deleting announcement:', err);
          req.flash('error', 'Error deleting announcement.');
          res.redirect('/dashboard');
     }
});


// GET: View an announcement by its ID
router.get('/announcement/:id', async (req, res) => {
     try {
          // Fetch the announcement from the database by ID
          const announcement = await Announcement.findById(req.params.id);
          if (!announcement) {
               return res.status(404).send('Announcement not found');
          }

          // Render the EJS template with the announcement data
          res.render('user/announcementDetail', { announcement });
     } catch (err) {
          console.error('Error fetching announcement:', err);
          res.status(500).send('Server Error');
     }
});

function calculateNdressilikScore(user) {
     let score = 0;

     // Rating contribution (40%)
     score += ((user.metrics?.averageRating || 0) / 5) * 40;

     // Completion rate contribution (20%)
     score += (user.trustFactors?.completionRate || 0) * 20;

     // Response rate contribution (20%)
     score += (user.trustFactors?.responseRate || 0) * 20;

     // On-time rate contribution (20%)
     score += (user.trustFactors?.onTimeRate || 0) * 20;

     // Bonus points for badges (up to 10 extra points)
     const badgeBonus = Math.min((user.badges?.length || 0) * 2, 10);
     score += badgeBonus;

     // Cap the score at 100
     return Math.min(Math.round(score), 100);
}

// profile route
const BADGE_CONFIG = {
     "lead-expert": {
          description: "Consistently high-rated professional",
          image: "https://ndressilik.s3.eu-north-1.amazonaws.com/badges/lead-badge.png"
     },
     "prominent": {
          description: "Verified expertise and credentials",
          image: "https://ndressilik.s3.eu-north-1.amazonaws.com/badges/prominent-badge.png"
     },
     "specialist": {
          description: "Fast and reliable responses",
          image: "https://ndressilik.s3.eu-north-1.amazonaws.com/badges/specialist-badge.png"
     },
     "chosen": {
          description: "Proven track record of success",
          image: "https://ndressilik.s3.eu-north-1.amazonaws.com/badges/chosen-badge.png"
     },
     "basic": {
          description: "Premium service provider",
          image: "https://ndressilik.s3.eu-north-1.amazonaws.com/badges/basic-badge.png"
     }
};
const badgeData = {
     "lead-expert": {
          description: "Consistently high-rated professional",
          image: "https://ndressilik.s3.eu-north-1.amazonaws.com/badges/lead-badge.png"
     },
     "prominent": {
          description: "Verified expertise and credentials",
          image: "https://ndressilik.s3.eu-north-1.amazonaws.com/badges/prominent-badge.png"
     },
     "specialist": {
          description: "Fast and reliable responses",
          image: "https://ndressilik.s3.eu-north-1.amazonaws.com/badges/specialist-badge.png"
     },
     "chosen": {
          description: "Proven track record of success",
          image: "https://ndressilik.s3.eu-north-1.amazonaws.com/badges/chosen-badge.png"
     },
     "basic": {
          description: "Premium service provider",
          image: "https://ndressilik.s3.eu-north-1.amazonaws.com/badges/basic-badge.png"
     },
     "verified-professional": {
          description: "Compte Verifier",
          image: "https://ndressilik.s3.eu-north-1.amazonaws.com/badges/basic-badge.png"
     }
};
// GET Public Profile
router.get('/@:slug', async (req, res) => {
     try {
          const { slug } = req.params;

          // Fetch user with all necessary fields
          const user = await User.findOne({ slug })
               .select('-password -email  -settings -verificationDocuments -googleId -__v');

          if (!user) {
               return res.status(404).render('user/404', {
                    message: 'Profil non trouvé'
               });
          }

          // Capture user visit for analytics
          await captureVisit(req, user._id);

          // Fetch related data
          const [services, reviews, completedBookings] = await Promise.all([
               Service.find({ createdBy: user._id }).sort('-createdAt'),
               Review.find({ userId: user._id })
                    .sort('-createdAt')
                    .populate('userId', 'displayName profileImage'),
               Reservation.countDocuments({
                    provider: user._id,
                    status: 'completed'
               })
          ]);

          // Calculate metrics
          const metrics = await calculateUserMetrics(user, services, reviews, completedBookings);

          // Update trust factors
          const trustFactors = await calculateTrustFactors(user._id);

          // Determine new badges to add
          const newBadges = await determineUserBadges(user, metrics, trustFactors);

          // Extract existing badge types to prevent duplicates
          const existingBadgeTypes = user.badges.map(b => b.type);

          // Filter out badges that the user already has
          const badgesToAdd = newBadges.filter(badge => !existingBadgeTypes.includes(badge.type));

          // If there are new badges to add, update the user document
          if (badgesToAdd.length > 0) {
               user.badges.push(...badgesToAdd);

               // Update user metrics and trust factors
               user.metrics = metrics;
               user.trustFactors = trustFactors;
               user.ndressilikScore = user.calculateNdressilikScore();

               await user.save();
          }

          // Map user's badges to include image URLs and descriptions
          const userBadges = user.badges.map(badge => {
               const badgeInfo = badgeData[badge.type];
               return {
                    type: badge.type,
                    label: badgeInfo ? badgeInfo.description : 'Badge Inconnu',
                    image: badgeInfo ? badgeInfo.image : 'https://ndressilik.s3.eu-north-1.amazonaws.com/badges/default-badge.png', // Fallback image
                    earnedAt: badge.earnedAt
               };
          });

          // Prepare view data
          const viewData = {
               profile: {
                    ...user.toObject(),
                    metrics,
                    trustFactors,
                    badges: userBadges,
                    gallery: user.gallery || [],
                    badgeConfig: badgeData // Pass full config for reference
               },
               services,
               reviews,
               stats: {
                    completedServices: metrics.totalServices,
                    totalReviews: metrics.totalReviews,
                    averageRating: metrics.averageRating,
                    ndressilikScore: user.calculateNdressilikScore()
               }
          };

          res.render('user/profile', {
               ...viewData,
               pageTitle: `Profile de ${user.displayName}`,
               description: `Découvrez le profil professionnel de ${user.displayName} sur NDRESSILIK. ${user.specializations.join(', ')}`,
               author: "NDRESSILIK",
               keywords: `${user.displayName}, ${user.specializations.join(', ')}, services, ndressilik`,
          });

     } catch (error) {
          console.error('Error fetching public profile:', error);
          res.status(500).render('500', {
               message: 'Erreur interne du serveur'
          });
     }
});

// Helper Functions
async function calculateUserMetrics(user, services, reviews, completedBookings) {
     const averageRating = reviews.length > 0
          ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
          : 0;

     return {
          totalServices: services.length,
          totalReviews: reviews.length,
          averageRating: Number(averageRating.toFixed(1)),
          completedBookings
     };
}

async function calculateTrustFactors(userId) {
     const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

     // Get recent bookings
     const recentBookings = await Reservation.find({
          provider: userId,
          createdAt: { $gte: thirtyDaysAgo }
     });

     // Calculate rates
     const responseRate = await calculateResponseRate(userId, recentBookings);
     const completionRate = await calculateCompletionRate(recentBookings);
     const onTimeRate = await calculateOnTimeRate(recentBookings);

     return {
          responseRate,
          completionRate,
          onTimeRate
     };
}

// Update the badge determination function
/**
 * Determine User Badges based on metrics and trust factors
 * @param {Object} user - User document
 * @param {Object} metrics - User metrics
 * @param {Object} trustFactors - User trust factors
 * @returns {Array} newBadges - Badges to be added
 */
async function determineUserBadges(user, metrics, trustFactors) {
     const newBadges = [];
     const now = new Date();

     // Badge: Lead Expert
     if (metrics.averageRating >= 4.5 && metrics.totalReviews >= 10) {
          newBadges.push({
               type: 'lead-expert',
               earnedAt: now
          });
     }

     // Badge: Prominent
     if (user.isVerified) {
          newBadges.push({
               type: 'prominent',
               earnedAt: now
          });
     }

     // Badge: Specialist
     if (trustFactors.responseRate >= 0.9) {
          newBadges.push({
               type: 'specialist',
               earnedAt: now
          });
     }

     // Badge: Chosen
     if (metrics.completedBookings >= 50 || (user.experience && user.experience.years >= 2)) {
          newBadges.push({
               type: 'chosen',
               earnedAt: now
          });
     }

     // Badge: Basic
     if (
          metrics.averageRating >= 4.8 &&
          metrics.totalReviews >= 20 &&
          trustFactors.completionRate >= 0.95
     ) {
          newBadges.push({
               type: 'basic',
               earnedAt: now
          });
     }

     // Sort badges by priority
     return newBadges.sort((a, b) => getBadgePriority(a.type) - getBadgePriority(b.type));
}



async function getBadgePriority(badgeType) {
     const priorityMap = {
          'platinum': 1,
          'gold': 2,
          'silver': 3,
          'bronze': 4,
          // Add other badge types with their priorities here
     };

     // Return the priority for the given badge type
     // If the badge type is not found, assign a default low priority
     return priorityMap[badgeType] || 999;
}


async function calculateResponseRate(userId, recentBookings) {
     if (!recentBookings.length) return 0;

     const respondedCount = recentBookings.filter(booking =>
          booking.providerRespondedAt &&
          (booking.providerRespondedAt - booking.createdAt) <= 24 * 60 * 60 * 1000 // 24 hours
     ).length;

     return Number((respondedCount / recentBookings.length).toFixed(2));
}

async function calculateCompletionRate(recentBookings) {
     if (!recentBookings.length) return 0;

     const completedCount = recentBookings.filter(booking =>
          booking.status === 'completed'
     ).length;

     return Number((completedCount / recentBookings.length).toFixed(2));
}

async function calculateOnTimeRate(recentBookings) {
     const completedBookings = recentBookings.filter(booking =>
          booking.status === 'completed'
     );

     if (!completedBookings.length) return 0;

     const onTimeCount = completedBookings.filter(booking =>
          !booking.wasLate // Assuming you have this field
     ).length;

     return Number((onTimeCount / completedBookings.length).toFixed(2));
}



// =============================== ALL ANNOUNCEMENTS PAGE ROUTS ======================


// AJAX route for filtering announcements
// Route to fetch announcements with filtering (no AJAX)
// Route to fetch announcements with filtering (no AJAX)
// Route to fetch announcements with filtering (GET request)
router.get('/tous-les-annonces', async (req, res) => {
     try {
          // Destructure query parameters for filtering
          const { quickSearch, animalType, location, gender } = req.query;

          // Define filters object based on query params
          const filters = {};

          if (quickSearch) filters.breed = new RegExp(quickSearch, 'i');
          if (animalType) filters.animalType = animalType;
          if (location) filters.location = location;
          if (gender) filters.gender = gender;

          // Fetch filtered announcements (limit to latest 10)
          const announcements = await Announcement.find(filters)
               .sort({ createdAt: -1 }) // Sort by newest
               .limit(10);

          // Render the page with filtered announcements and filters
          res.render('user/allAnnouncements', {
               announcements,
               filters: req.query || {},  // Pass the filters back to repopulate the form
          });
     } catch (err) {
          console.error('Error fetching filtered announcements:', err);
          res.status(500).send('Internal Server Error');
     }
});
// Route for Privacy Policy Page
router.get('/politique-de-confidentialite', (req, res) => {
     const pageTitle = 'Politique de confidentialite | NDRESSILIK';
     const description = 'Politique de confidentialite pour les utilisateurs de NDRESSILIK.';
     const author = 'NDRESSILIK';

     res.render('user/privacyPolicy', {
          pageTitle,
          description,
          author
     });
});
// Route for Terms of Use Page
router.get('/conditions-d-utilisation', (req, res) => {
     const pageTitle = 'Conditions d’utilisation | NDRESSILIK';
     const description = 'Conditions d’utilisation pour les utilisateurs de NDRESSILIK.';
     const author = 'NDRESSILIK';

     res.render('user/terms', {
          pageTitle,
          description,
          author
     });
});

// Route for FAQ Page
router.get('/faq', (req, res) => {
     // write variables pagetitle and description and author.
     const pageTitle = 'FAQ | NDRESSILIK';
     const description = 'FAQ pour les utilisateurs de NDRESSILIK.';
     const author = 'NDRESSILIK';


     res.render('user/faq', {
          pageTitle,
          description,
          author
     });
});


// Route for contact
router.get('/contact', (req, res) => {
     const pageTitle = 'Contact | NDRESSILIK';
     const description = 'Contactez nous pour toute information supplemmentaire sur NDRESSILIK.';
     const author = 'NDRESSILIK';
     const keywords = 'contact, NDRESSILIK';
     res.render('user/contact', { formData: {}, pageTitle, description, author, keywords });
});


// route for consultation
router.get('/consultation', (req, res) => {
     res.render('user/consultation', {
          formData: {},
          pageTitle: 'Consultation | NDRESSILIK',
          description: 'Lisez les derniers articles sur les soins, l\'éducation, et l\’adoption d\’animaux sur NDRESSILIK.',
          keywords: 'consultation, soins, éducation, adoption, NDRESSILIK',

     });
});

// Single event page
router.get('/event/:id', async (req, res) => {
     try {
          const events = await Event.find();
          const event = await Event.findById(req.params.id);

          if (!event) {
               return res.status(404).render('error', {
                    message: 'Événement non trouvé'
               });
          }

          // Get related events (same category, future dates)
          const relatedEvents = await Event.find({
               _id: { $ne: event._id },
               category: event.category,
               date: { $gte: new Date() }
          })
               .limit(3)
               .sort({ date: 1 });

          res.render('user/event', {
               event,
               events,
               relatedEvents,
               user: req.user // If using authentication
          });

     } catch (error) {
          console.error('Error fetching event:', error);
          res.status(500).render('error', {
               message: 'Error loading event details'
          });
     }
});

// GET ALL PROVIDERS PAGE 
router.get('/providers', async (req, res) => {
     try {
          const filters = {};
          const { location, specialization, rating, sort } = req.query;

          // Apply filters
          if (location) {
               filters['location.city'] = new RegExp(location, 'i');
          }

          if (specialization) {
               filters.specializations = specialization;
          }

          if (rating) {
               filters['metrics.averageRating'] = { $gte: parseFloat(rating) };
          }

          // Base query
          let query = User.find({
               role: 'provider',
               // isVerified: true,
               status: 'active'
          });

          // Apply filters
          query = query.find(filters);

          // Apply sorting
          switch (sort) {
               case 'rating':
                    query = query.sort({ 'metrics.averageRating': -1 });
                    break;
               case 'experience':
                    query = query.sort({ 'experience.years': -1 });
                    break;
               case 'reviews':
                    query = query.sort({ 'metrics.totalReviews': -1 });
                    break;
               default:
                    query = query.sort({ 'metrics.ndressilikScore': -1 });
          }

          // Execute query with pagination
          const page = parseInt(req.query.page) || 1;
          const limit = 12;
          const skip = (page - 1) * limit;

          const [providers, total] = await Promise.all([
               query.skip(skip).limit(limit),
               User.countDocuments(filters)
          ]);

          // Get unique locations and specializations for filters
          const [locations, specializations] = await Promise.all([
               User.distinct('location.city', { role: 'provider' }),
               User.distinct('specializations', { role: 'provider' })
          ]);

          // console.log(providers)

          res.render('user/providers', {
               providers,
               locations,
               specializations,
               currentPage: page,
               totalPages: Math.ceil(total / limit),
               totalProviders: total,
               filters: {
                    location,
                    specialization,
                    rating,
                    sort
               },
               pageTitle: 'Trouvez les meilleurs prestataires de services pour animaux',
               description: 'Découvrez des professionnels qualifiés pour prendre soin de vos animaux de compagnie',
               keywords: 'services animaliers, dressage, toilettage, vétérinaire, pension'
          });
     } catch (error) {
          console.error('Error fetching providers:', error);
          res.status(500).render('error', {
               message: 'Une erreur est survenue lors du chargement des prestataires'
          });
     }
});

router.get('/api/services', async (req, res) => {
     try {
          const { category, page = 1 } = req.query;
          const limit = 4;
          const skip = (page - 1) * limit;

          let query = {};
          if (category !== 'all') {
               query.serviceOptions = category;
          }

          const services = await Service.find(query)
               .sort({ createdAt: -1 })
               .skip(skip)
               .limit(limit)
               .select('serviceName location priceRange images views');

          res.json({
               success: true,
               services
          });
     } catch (error) {
          console.error('Error fetching services:', error);
          res.status(500).json({
               success: false,
               message: 'Error fetching services'
          });
     }
});
module.exports = router;
