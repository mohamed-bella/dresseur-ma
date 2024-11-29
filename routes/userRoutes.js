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
const Consultation = require('../models/consultation');
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
const moment = require('moment');
// auth mdlwr
const { isAuthenticated } = require('../middlewares/auth')



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
router.get('/', async (req, res) => {
    try {
        const [topUsers, locations, services] = await Promise.all([
            // Top Users Query (existing)
            User.aggregate([
                { $match: { status: 'active' } },
                {
                    $lookup: {
                        from: 'services',
                        localField: '_id',
                        foreignField: 'createdBy',
                        as: 'services'
                    }
                },
                {
                    $lookup: {
                        from: 'reviews',
                        let: { userServices: '$services._id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: ['$serviceId', '$$userServices']
                                    }
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    totalReviews: { $sum: 1 }
                                }
                            }
                        ],
                        as: 'reviews'
                    }
                },
                {
                    $addFields: {
                        servicesCount: { $size: '$services' },
                        totalViews: {
                            $sum: {
                                $map: {
                                    input: '$services',
                                    as: 'service',
                                    in: { $ifNull: ['$$service.views', 0] }
                                }
                            }
                        },
                        totalReviews: { $ifNull: [{ $arrayElemAt: ['$reviews.totalReviews', 0] }, 0] }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        displayName: 1,
                        profileImage: 1,
                        servicesCount: 1,
                        slug: 1,
                        totalViews: 1,
                        totalReviews: 1,
                        totalScore: {
                            $add: ['$servicesCount', '$totalViews', '$totalReviews']
                        }
                    }
                },
                { $sort: { totalScore: -1 } },
                { $limit: 3 }
            ]),

            // Get unique locations with service counts
            Service.aggregate([
                { $match: { isActive: true } },
                {
                    $group: {
                        _id: '$location',
                        count: { $sum: 1 },
                        arabicName: { $first: '$locationArabic' }
                    }
                },
                { $sort: { count: -1 } }
            ]),

            // Get service types with counts
            Service.aggregate([
                { $match: { isActive: true } },
                { $unwind: '$serviceOptions' },
                {
                    $group: {
                        _id: '$serviceOptions',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ])
        ]);

        // Process locations for the form
        const processedLocations = locations
            .filter(loc => loc._id) // Remove null/empty locations
            .map(loc => ({
                value: `${loc._id}${loc.arabicName ? ` - ${loc.arabicName}` : ''}`,
                label: loc._id,
                count: loc.count
            }));

        // Process service types for the form
        const processedServices = services.map(service => ({
            value: service._id.toLowerCase(),
            // label: serviceConfig.titles[service._id] || service._id,
            count: service.count,
            // icon: serviceConfig.icons[service._id.toLowerCase()] || '🐾'
        }));
        console.log(processedLocations)
        console.log(processedServices)

        res.render('user/index', {
            topUsers,
            locations: processedLocations,
            services: processedServices,
            pageTitle: 'Ndressilik - Trouvez les Meilleurs Services pour Chiens au Maroc',
            description: 'Ndressilik est votre plateforme de confiance pour trouver les meilleurs services pour chiens au Maroc...',
            keywords: 'services pour chiens Maroc, toilettage chien, éducation canine Maroc...'
        });
    } catch (error) {
        console.error('Error in home page:', error);
        res.status(500).render('error', { error: 'Une erreur est survenue' });
    }
});

// POST: Create New Service
router.post('/dashboard/new-service', isAuthenticated, validateService, async (req, res) => {
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
const pageTitle = 'Articles sur les Animaux - Soins, Éducation et Adoption | NDRESSILIK';
const description = 'Découvrez une collection complète d’articles sur les animaux sur NDRESSILIK. Apprenez tout sur les soins, l’éducation canine, l’adoption responsable, les comportements des animaux, et bien plus encore. Trouvez des conseils pratiques et des informations utiles pour le bien-être de vos compagnons à quatre pattes.';
const keywords = 'articles sur les animaux, soins pour animaux, éducation canine, adoption d’animaux, comportement animal, bien-être animal, adoption responsable, NDRESSILIK, dressage de chiens, conseils pour animaux, soins vétérinaires, santé animale';

     try {
          // Fetch all articles
          const articles = await Article.find().sort({ createdAt: -1 });
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

router.get('/dashboard', isAuthenticated, async (req, res) => {
     try {
         // 1. Profile Completion Calculation
         const requiredFields = [
             { field: 'location.city', weight: 15 },
             { field: 'specializations', weight: 20, isArray: true },
             { field: 'languages', weight: 10, isArray: true },
             { field: 'experience.description', weight: 15, notDefault: 'Sans Experience.' },
             { field: 'qualifications', weight: 15, isArray: true },
             { field: 'gallery', weight: 15, isArray: true },
             { field: 'bio', weight: 10 }
         ];
 
         let completedWeight = 0;
         requiredFields.forEach(field => {
             if (field.isArray) {
                 const value = field.field.split('.').reduce((obj, key) => obj?.[key], req.user);
                 if (value && Array.isArray(value) && value.length > 0) {
                     completedWeight += field.weight;
                 }
             } else if (field.notDefault) {
                 const value = field.field.split('.').reduce((obj, key) => obj?.[key], req.user);
                 if (value && value !== field.notDefault) {
                     completedWeight += field.weight;
                 }
             } else {
                 const value = field.field.split('.').reduce((obj, key) => obj?.[key], req.user);
                 if (value && value !== '') {
                     completedWeight += field.weight;
                 }
             }
         });
 
         // 2. Services Statistics
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
 
         // 3. Consultations Statistics
         const consultations = await Consultation.aggregate([
             {
                 $match: {
                     assignedExpert: new ObjectId(req.user._id)
                 }
             },
             {
                 $facet: {
                     'stats': [
                         {
                             $group: {
                                 _id: null,
                                 total: { $sum: 1 },
                                 paid: {
                                     $sum: { $cond: [{ $eq: ['$type', 'paid'] }, 1, 0] }
                                 },
                                 free: {
                                     $sum: { $cond: [{ $eq: ['$type', 'free'] }, 1, 0] }
                                 },
                                 pending: {
                                     $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                                 },
                                 inProgress: {
                                     $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
                                 },
                                 completed: {
                                     $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                                 }
                             }
                         }
                     ],
                     'recent': [
                         { $match: { status: 'pending' } },
                         { $sort: { createdAt: -1 } },
                         { $limit: 5 }
                     ]
                 }
             }
         ]);
 
         // 4. Overall Stats Calculation
         const stats = {
          pendingPaidCount: 0,
            pendingFreeCount: 0,
            potentialEarnings: 0,
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
             totalReviews: services.reduce((acc, s) => acc + s.reviews.length, 0),
             consultations: consultations[0].stats[0] || {
                 total: 0, paid: 0, free: 0,
                 pending: 0, inProgress: 0, completed: 0
             }
         };
 
         // 5. Analytics Data (Last 7 Days)
         const now = new Date();
         const last7Days = new Date(now.setDate(now.getDate() - 7));
 
         const [visitsData, reservationsData, consultationsData] = await Promise.all([
             // Visits Analytics
             Visit.aggregate([
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
                 { $sort: { '_id.date': 1 } }
             ]),
 
             // Reservations Analytics
             Service.aggregate([
                 {
                     $match: {
                         createdBy: new ObjectId(req.user._id)
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
                 { $unwind: '$reservations' },
                 {
                     $match: {
                         'reservations.createdAt': { $gte: last7Days }
                     }
                 },
                 {
                     $group: {
                         _id: { 
                             date: { $dateToString: { format: '%Y-%m-%d', date: '$reservations.createdAt' } },
                             status: '$reservations.status'
                         },
                         count: { $sum: 1 },
                         revenue: { $sum: '$reservations.totalAmount' }
                     }
                 },
                 { $sort: { '_id.date': 1 } }
             ]),
 
             // Consultations Analytics
             Consultation.aggregate([
                 {
                     $match: {
                         assignedExpert: new ObjectId(req.user._id),
                         createdAt: { $gte: last7Days }
                     }
                 },
                 {
                     $group: {
                         _id: {
                             date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                             type: '$type',
                             status: '$status'
                         },
                         count: { $sum: 1 }
                     }
                 },
                 { $sort: { '_id.date': 1 } }
             ])
         ]);
 
         // Format analytics data
         const analytics = {
             visits: formatVisitsData(visitsData),
             reservations: formatReservationsData(reservationsData),
             consultations: formatConsultationsData(consultationsData)
         };
        const consults = await Consultation.find()


     //    Get Consultation Data
      // Get pending consultations count
      const consultationsStats = await Consultation.aggregate([
          {
              $match: {
                  status: 'pending',
                  assignedExpert: null // Not yet assigned
              }
          },
          {
              $group: {
                  _id: '$type',
                  count: { $sum: 1 }
              }
          }
      ]);
      // Process the aggregation results
      consultationsStats.forEach(stat => {
          if (stat._id === 'paid') {
              stats.pendingPaidCount = stat.count;
              stats.potentialEarnings = stat.count * 200; // 200 DH per paid consultation
          } else if (stat._id === 'free') {
              stats.pendingFreeCount = stat.count;
          }
      });
        // Only show alert if there are pending consultations
        const showConsultationAlert = stats.pendingPaidCount > 0 || stats.pendingFreeCount > 0;

      
     
          console.log(stats)
         // Render dashboard with all data
         res.render('user/dashboard/dashboard', {
          pageTitle : 'dashboard',
          description :'',
          keywords : '',
             user: {
                 ...req.user.toObject(),
                 completionPercentage: Math.round(completedWeight)
             },
             stats,
             showConsultationAlert,
             services,
             recentConsultations: consultations[0].recent,
             analytics,
             consultations : consults,
             moment,
             path: 'dashboard'
         });
 
     } catch (error) {
         console.error('Dashboard Error:', error);
         res.status(500).render('error', { 
             message: 'Error loading dashboard',
             error: process.env.NODE_ENV === 'development' ? error : {}
         });
     }
 });

//  Dashboard Consultation
router.get('/dashboard/consultations', isAuthenticated, async (req, res) => {
     try {
         // 1. Profile Completion Calculation
         const requiredFields = [
             { field: 'location.city', weight: 15 },
             { field: 'specializations', weight: 20, isArray: true },
             { field: 'languages', weight: 10, isArray: true },
             { field: 'experience.description', weight: 15, notDefault: 'Sans Experience.' },
             { field: 'qualifications', weight: 15, isArray: true },
             { field: 'gallery', weight: 15, isArray: true },
             { field: 'bio', weight: 10 }
         ];
 
         let completedWeight = 0;
         requiredFields.forEach(field => {
             if (field.isArray) {
                 const value = field.field.split('.').reduce((obj, key) => obj?.[key], req.user);
                 if (value && Array.isArray(value) && value.length > 0) {
                     completedWeight += field.weight;
                 }
             } else if (field.notDefault) {
                 const value = field.field.split('.').reduce((obj, key) => obj?.[key], req.user);
                 if (value && value !== field.notDefault) {
                     completedWeight += field.weight;
                 }
             } else {
                 const value = field.field.split('.').reduce((obj, key) => obj?.[key], req.user);
                 if (value && value !== '') {
                     completedWeight += field.weight;
                 }
             }
         });
 
         // 2. Services Statistics
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
 
         // 3. Consultations Statistics
         const consultations = await Consultation.aggregate([
             {
                 $match: {
                     assignedExpert: new ObjectId(req.user._id)
                 }
             },
             {
                 $facet: {
                     'stats': [
                         {
                             $group: {
                                 _id: null,
                                 total: { $sum: 1 },
                                 paid: {
                                     $sum: { $cond: [{ $eq: ['$type', 'paid'] }, 1, 0] }
                                 },
                                 free: {
                                     $sum: { $cond: [{ $eq: ['$type', 'free'] }, 1, 0] }
                                 },
                                 pending: {
                                     $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                                 },
                                 inProgress: {
                                     $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
                                 },
                                 completed: {
                                     $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                                 }
                             }
                         }
                     ],
                     'recent': [
                         { $match: { status: 'pending' } },
                         { $sort: { createdAt: -1 } },
                         { $limit: 5 }
                     ]
                 }
             }
         ]);
 
         // 4. Overall Stats Calculation
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
             totalReviews: services.reduce((acc, s) => acc + s.reviews.length, 0),
             consultations: consultations[0].stats[0] || {
                 total: 0, paid: 0, free: 0,
                 pending: 0, inProgress: 0, completed: 0
             }
         };
 
         // 5. Analytics Data (Last 7 Days)
         const now = new Date();
         const last7Days = new Date(now.setDate(now.getDate() - 7));
 
         const [visitsData, reservationsData, consultationsData] = await Promise.all([
             // Visits Analytics
             Visit.aggregate([
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
                 { $sort: { '_id.date': 1 } }
             ]),
 
             // Reservations Analytics
             Service.aggregate([
                 {
                     $match: {
                         createdBy: new ObjectId(req.user._id)
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
                 { $unwind: '$reservations' },
                 {
                     $match: {
                         'reservations.createdAt': { $gte: last7Days }
                     }
                 },
                 {
                     $group: {
                         _id: { 
                             date: { $dateToString: { format: '%Y-%m-%d', date: '$reservations.createdAt' } },
                             status: '$reservations.status'
                         },
                         count: { $sum: 1 },
                         revenue: { $sum: '$reservations.totalAmount' }
                     }
                 },
                 { $sort: { '_id.date': 1 } }
             ]),
 
             // Consultations Analytics
             Consultation.aggregate([
                 {
                     $match: {
                         assignedExpert: new ObjectId(req.user._id),
                         createdAt: { $gte: last7Days }
                     }
                 },
                 {
                     $group: {
                         _id: {
                             date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                             type: '$type',
                             status: '$status'
                         },
                         count: { $sum: 1 }
                     }
                 },
                 { $sort: { '_id.date': 1 } }
             ])
         ]);
 
         // Format analytics data
         const analytics = {
             visits: formatVisitsData(visitsData),
             reservations: formatReservationsData(reservationsData),
             consultations: formatConsultationsData(consultationsData)
         };
        const consults = await Consultation.find().sort({createdAt : -1})
     //    console.log(consults)
 
     // Render dashboard with all data
res.render('user/dashboard/consultations', {
     pageTitle: 'Tableau de Bord - Suivi des Consultations | NDRESSILIK',
     description: 'Gérez et suivez vos consultations avec NDRESSILIK. Accédez à des statistiques détaillées, des consultations récentes et des informations essentielles sur vos services pour animaux.',
     keywords: 'tableau de bord, consultations animaux, suivi des consultations, statistiques des services, NDRESSILIK, gestion des consultations, services pour animaux, suivi des animaux', 
             user: {
                 ...req.user.toObject(),
                 completionPercentage: Math.round(completedWeight)
             },
             stats,
             services,
             recentConsultations: consultations[0].recent,
             analytics,
             consultations : consults,
             moment,
             path: 'dashboard'
         });
 
     } catch (error) {
         console.error('Dashboard Error:', error);
         res.status(500).render('error', { 
             message: 'Error loading dashboard',
             error: process.env.NODE_ENV === 'development' ? error : {}
         });
     }
 });
 
 // Helper functions for formatting analytics data
 function formatVisitsData(visits) {
     const last7Days = Array.from({ length: 7 }, (_, i) => 
         moment().subtract(i, 'days').format('YYYY-MM-DD')
     ).reverse();
 
     const deviceStats = {};
     const locationStats = {};
     let totalVisits = 0;
     let uniqueVisitors = new Set();
 
     visits.forEach(visit => {
         const device = visit._id.device || 'unknown';
         const location = visit._id.location || 'unknown';
         deviceStats[device] = (deviceStats[device] || 0) + visit.count;
         locationStats[location] = (locationStats[location] || 0) + visit.count;
         totalVisits += visit.count;
         if (visit._id.userId) uniqueVisitors.add(visit._id.userId.toString());
     });
 
     return {
         daily: last7Days.map(date => ({
             date,
             total: visits.filter(v => v._id.date === date)
                         .reduce((sum, v) => sum + v.count, 0)
         })),
         devices: deviceStats,
         locations: locationStats,
         totalVisits,
         uniqueVisitors: uniqueVisitors.size
     };
 }
 
 function formatReservationsData(reservations) {
     const last7Days = Array.from({ length: 7 }, (_, i) => 
         moment().subtract(i, 'days').format('YYYY-MM-DD')
     ).reverse();
 
     return {
         daily: last7Days.map(date => ({
             date,
             confirmed: reservations.filter(r => r._id.date === date && r._id.status === 'confirmed')
                                  .reduce((sum, r) => sum + r.count, 0),
             pending: reservations.filter(r => r._id.date === date && r._id.status === 'pending')
                                .reduce((sum, r) => sum + r.count, 0),
             revenue: reservations.filter(r => r._id.date === date)
                                .reduce((sum, r) => sum + (r.revenue || 0), 0)
         }))
     };
 }
 
 function formatConsultationsData(consultations) {
     const last7Days = Array.from({ length: 7 }, (_, i) => 
         moment().subtract(i, 'days').format('YYYY-MM-DD')
     ).reverse();
 
     return {
         daily: last7Days.map(date => ({
             date,
             paid: consultations.filter(c => c._id.date === date && c._id.type === 'paid')
                              .reduce((sum, c) => sum + c.count, 0),
             free: consultations.filter(c => c._id.date === date && c._id.type === 'free')
                              .reduce((sum, c) => sum + c.count, 0)
         }))
     };
 }


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
router.post('/announcements/new', isAuthenticated, upload.array('images', 10), async (req, res) => {
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
router.post('/announcements/:id/delete', isAuthenticated, async (req, res) => {
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

          // Récupérer l'utilisateur avec tous les champs nécessaires
          const user = await User.findOne({ slug })
               .select('-password -email  -settings -verificationDocuments -googleId -__v'); // 'status' est inclus

          if (!user) {
               return res.status(404).render('user/404', {
                    message: 'Profil non trouvé'
               });
          }

          // Vérifier si l'utilisateur connecté consulte son propre profil
          let isOwner = false;
          if (req.user) {
               isOwner = user._id.equals(req.user._id);
          }

          // Si le profil ne appartient pas à l'utilisateur connecté et que le statut du compte n'est pas 'active', ne pas afficher le profil
          if (!isOwner && user.status !== 'active') {
               return res.status(403).render('403', {
                    message: 'Profil non disponible'
               });
          }

          // Capturer la visite de l'utilisateur pour l'analyse
          await captureVisit(req, user._id);

          // Récupérer les services créés par l'utilisateur
          const services = await Service.find({ createdBy: user._id }).sort('-createdAt');

          // Récupérer les avis liés
          const reviews = await Review.find({ userId: user._id })
               .sort('-createdAt')
               .populate('userId', 'displayName profileImage');

          // Calculer les métriques
          const metrics = await calculateUserMetrics(user, services, reviews);

          // Mettre à jour les facteurs de confiance
          const trustFactors = await calculateTrustFactors(user._id);

          // Déterminer les nouveaux badges à ajouter
          const newBadges = await determineUserBadges(user, metrics, trustFactors);

          // Extraire les types de badges existants pour éviter les doublons
          const existingBadgeTypes = user.badges.map(b => b.type);

          // Filtrer les badges que l'utilisateur n'a pas encore
          const badgesToAdd = newBadges.filter(badge => !existingBadgeTypes.includes(badge.type));

          // Si de nouveaux badges doivent être ajoutés, mettre à jour le document utilisateur
          if (badgesToAdd.length > 0) {
               user.badges.push(...badgesToAdd);

               // Mettre à jour les métriques et les facteurs de confiance de l'utilisateur
               user.metrics = metrics;
               user.trustFactors = trustFactors;
               user.ndressilikScore = user.calculateNdressilikScore();

               await user.save();
          }

          // Mapper les badges de l'utilisateur pour inclure les URLs des images et les descriptions
          const userBadges = user.badges.map(badge => {
               const badgeInfo = badgeData[badge.type];
               return {
                    type: badge.type,
                    label: badgeInfo ? badgeInfo.description : 'Badge Inconnu',
                    image: badgeInfo ? badgeInfo.image : 'https://ndressilik.s3.eu-north-1.amazonaws.com/badges/default-badge.png', // Image par défaut
                    earnedAt: badge.earnedAt
               };
          });

          // Préparer les données pour la vue
          const viewData = {
               profile: {
                    ...user.toObject(),
                    metrics,
                    trustFactors,
                    badges: userBadges,
                    gallery: user.gallery || [],
                    badgeConfig: badgeData // Passer la configuration complète pour référence
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
               pageTitle: `Profil de ${user.displayName}`,
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
     const pageTitle = 'Contactez-nous - Assistance et Informations | NDRESSILIK';
     const description = 'Besoin d’aide ou d’informations sur nos services pour animaux ? Contactez NDRESSILIK dès aujourd’hui. Nous sommes là pour répondre à toutes vos questions sur l’éducation canine, les soins, et l’adoption d’animaux.';
     const author = 'NDRESSILIK';
     const keywords = 'contact NDRESSILIK, assistance animaux, éducation canine, soins pour animaux, adoption d’animaux, questions NDRESSILIK, services pour animaux, aide NDRESSILIK';
     res.render('user/contact', { formData: {}, pageTitle, description, author, keywords });
 });
 


// Route for consultation
router.get('/consultation', (req, res) => {
     res.render('user/consultation', {
         formData: {},
         pageTitle: 'Consultation - Services et Conseils pour Animaux | NDRESSILIK',
         description: 'Obtenez des conseils personnalisés et des services experts pour vos animaux grâce à NDRESSILIK. Que ce soit pour l’éducation, les soins, ou l’adoption, notre équipe est là pour vous guider à chaque étape.',
         keywords: 'consultation animaux, conseils pour animaux, éducation canine, soins pour animaux, adoption responsable, NDRESSILIK, consultation expert animaux, services pour animaux',
     });
 });
 
// Single event page
router.get('/event/', async (req, res) => {
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
router.get('/professionnels', async (req, res) => {
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

          // Base query: Filter for approved providers only
          let query = User.find({
               role: 'provider',
               // isVerified: true, // Ensure the provider is verified
               status: 'active'  // Ensure the provider's status is active
          });

          // Apply additional filters
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
               User.countDocuments({ ...filters, role: 'provider', isVerified: true, status: 'active' }) // Count only approved profiles
          ]);

          // Get unique locations and specializations for filters
          const [locations, specializations] = await Promise.all([
               User.distinct('location.city', { role: 'provider', isVerified: true, status: 'active' }), // Locations of approved providers
               User.distinct('specializations', { role: 'provider', isVerified: true, status: 'active' }) // Specializations of approved providers
          ]);

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

router.get('/about', (req, res) => {
     res.render('user/about', {
          pageTitle : 'about ndressilik',
          description : "this is a description",
          keywords : 'keywords'
     })
});



// Submit new consultation
router.post('/consultations/submit', async (req, res) => {
    try {
        const consultationData = {
            type: req.body.consultationType,
            category: req.body.category,
            dog: {
                name: req.body.dogName,
                age: req.body.dogAge,
                breed: req.body.dogBreed,
                gender: req.body.dogGender
            },
            owner: {
                name: req.body.ownerName,
                email: req.body.email,
                phone: req.body.phone,
                preferredContact: req.body.preferredContact
            },
            problem: {
                description: req.body.description
            },
            availability: req.body.availability
        };

        const consultation = new Consultation(consultationData);
        await consultation.save();

        // Send simple email notification
        // You can implement this based on your email service
        
        res.json({
            success: true,
            message: 'Votre demande a été soumise avec succès',
            consultationId: consultation._id
        });

    } catch (error) {
        console.error('Consultation submission error:', error);
        res.status(500).json({
            success: false,
            error: 'Une erreur est survenue lors de la soumission'
        });
    }
});

router.get('/consultations/:id', isAuthenticated, async (req, res) => {
     try {
         // Get consultation with populated data
         const consultation = await Consultation.aggregate([
             {
                 $match: {
                     _id: new ObjectId(req.params.id)
                 }
             },
             {
                 // Get assigned professional details if any
                 $lookup: {
                     from: 'users',
                     localField: 'assignedExpert',
                     foreignField: '_id',
                     as: 'expertDetails'
                 }
             },
             {
                 $addFields: {
                     expertDetails: { $arrayElemAt: ['$expertDetails', 0] }
                 }
             }
         ]);
 
         if (!consultation[0]) {
             return res.status(404).json({
                 success: false,
                 error: 'Consultation non trouvée'
             });
         }
 
         // Format the consultation data
         const formattedConsultation = {
             _id: consultation[0]._id,
             type: consultation[0].type,
             status: consultation[0].status,
             category: consultation[0].category,
             
             // Dog information
             dog: {
                 name: consultation[0].dog.name,
                 age: consultation[0].dog.age,
                 breed: consultation[0].dog.breed,
                 gender: consultation[0].dog.gender
             },
 
             // Owner information
             owner: {
                 name: consultation[0].owner.name,
                 email: consultation[0].owner.email,
                 phone: consultation[0].owner.phone,
                 preferredContact: consultation[0].owner.preferredContact
             },
 
             // Problem details
             problem: {
                 description: consultation[0].problem.description
             },
 
             // Availability preferences
             availability: consultation[0].availability,
 
             // Dates
             createdAt: consultation[0].createdAt,
             updatedAt: consultation[0].updatedAt,
 
             // Expert details (if assigned)
             expert: consultation[0].expertDetails ? {
                 id: consultation[0].expertDetails._id,
                 name: consultation[0].expertDetails.name,
                 specializations: consultation[0].expertDetails.specializations
             } : null
         };
 
         res.json({
             success: true,
             consultation: formattedConsultation
         });
 
     } catch (error) {
         console.error('Error fetching consultation details:', error);
         res.status(500).json({
             success: false,
             error: 'Erreur lors de la récupération des détails de la consultation'
         });
     }
 });
// Get user's consultations
// router.get('/my-consultations', async (req, res) => {
//     try {
//         const email = req.query.email;
//         const phone = req.query.phone;

//         if (!email && !phone) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Email ou téléphone requis'
//             });
//         }

//         const query = {
//             $or: [
//                 { 'owner.email': email },
//                 { 'owner.phone': phone }
//             ]
//         };

//         const consultations = await Consultation.find(query)
//             .sort({ createdAt: -1 });

//         res.json({
//             success: true,
//             consultations
//         });

//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             error: 'Erreur lors de la récupération des consultations'
//         });
//     }
// });

// Get single consultation details


// Update consultation status (for admins)


// Get all consultations (for admins)


// Add feedback
// router.post('/:id/feedback', async (req, res) => {
//     try {
//         const consultation = await Consultation.findById(req.params.id);
        
//         if (!consultation) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Consultation non trouvée'
//             });
//         }

//         consultation.feedback = {
//             rating: req.body.rating,
//             comment: req.body.comment,
//             givenAt: new Date()
//         };

//         await consultation.save();

//         res.json({
//             success: true,
//             message: 'Feedback ajouté avec succès'
//         });

//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             error: 'Erreur lors de l\'ajout du feedback'
//         });
//     }
// });

module.exports = router;
