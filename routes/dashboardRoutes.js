const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const User = require('../models/user');
const { isAuthenticated } = require('../middlewares/auth');
const Service = require('../models/service');
const Review = require('../models/review');
const multer = require('multer');
// const { isAuthenticated, isServiceProvider } = require('../middleware/auth');

// Dashboard middleware to check if user is a service provider
// router.use(isAuthenticated, isServiceProvider);



// Services routes
router.get('/services', async (req, res) => {
    try {
        const services = await Service.find({ serviceProvider: req.user._id });
        res.render('user/dashboard/dashboard', { 
            page: 'services',
            services 
        });
    } catch (error) {
        console.error('Services fetch error:', error);
        req.flash('error', 'Erreur lors du chargement des services');
        res.redirect('/dashboard');
    }
});







router.get('/profile', isAuthenticated, async (req, res) => {
     try {
          // Fetch user with select fields
          const user = await User.findById(req.user._id)
               .select('-password -__v')
               .lean();

          // Calculate missing fields for completion guide
          const missingFields = [];
          if (!user.displayName) missingFields.push('displayName');
          if (!user.bio) missingFields.push('bio');
          if (!user.location?.city) missingFields.push('city');
          if (!user.phoneNumber) missingFields.push('phone');
          if (!user.specializations?.length) missingFields.push('specializations');

          // Calculate completion percentage
          const completionPercentage = Math.round(
               ((5 - missingFields.length) / 5) * 100
          );

          // Calculate service metrics
          const totalServices = await Service.countDocuments({ createdBy: user._id });
          const userServiceIds = await Service.find({ createdBy: user._id }).distinct('_id');
          const totalReviews = await Review.countDocuments({ serviceId: { $in: userServiceIds } });

          // Calculate average rating
          const averageRatingResult = await Review.aggregate([
               {
                    $match: {
                         serviceId: { $in: userServiceIds }
                    }
               },
               {
                    $group: {
                         _id: null,
                         average: { $avg: '$rating' }
                    }
               }
          ]);
          const averageRating = averageRatingResult[0]?.average || 0;

          // Retrieve profile views from user.metrics
          const profileViews = user.metrics?.profileViews || 0; // Ensure this field exists in your user model

          // Format data for template
          const viewData = {
               page : 'profile',
               user: {
                    ...user,
                    stats: {
                         views: profileViews,
                         services: totalServices,
                         reviews: totalReviews,
                         rating: Number(averageRating.toFixed(1))
                    }
               },
               completionPercentage,
               missingFields,
               defaultProfileImage: 'https://images.unsplash.com/photo-1614850715973-58c3167b30a0',
               path: 'profile',
               breadcrumbs: [
                    { label: 'Dashboard', url: '/dashboard' },
                    { label: 'Profil', url: '#' }
               ],
               specializations: [
                    { value: 'dog-training', label: 'Dressage', icon: 'fa-dog' },
                    { value: 'grooming', label: 'Toilettage', icon: 'fa-cut' },
                    { value: 'walking', label: 'Promenade', icon: 'fa-walking' },
                    { value: 'veterinary', label: 'Vétérinaire', icon: 'fa-stethoscope' },
                    { value: 'boarding', label: 'Pension', icon: 'fa-home' },
                    { value: 'transport', label: 'Transport', icon: 'fa-car' }
               ]
          };

          // Add verification status
          if (user.status === 'pending') {
               viewData.verificationPending = true;
          }

          // Render the profile page
          res.render('user/dashboard/dashboard', viewData);

     } catch (error) {
          console.error('Profile fetch error:', error);
          res.status(500).send('Erreur du serveur');
     }
});



const Elevage = require('../models/elevage');
const Consultation = require('../models/consultation');


// GET /stats: Fetch user stats for the dashboard
router.get('/stats', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;

     //    // Elevages Stats
     //    const elevages = await Elevage.find({ userId }).lean();
     //    const totalElevages = elevages.length;
     //    const activeElevages = elevages.filter(e => e.status === 'active').length;
     //    const pendingElevages = elevages.filter(e => e.status === 'pending').length;
     //    const suspendedElevages = elevages.filter(e => e.status === 'suspended').length;
     // //    const totalDogs = elevages.reduce((sum, e) => sum + e.stats.totalDogs, 0);
     //    const availableDogs = elevages.reduce((sum, e) => sum + e.stats.availableDogs, 0);
     //    const totalReviews = elevages.reduce((sum, e) => sum + e.stats.totalReviews, 0);
     //    const averageRating =
     //        elevages.length > 0
     //            ? (
     //                elevages.reduce((sum, e) => sum + e.stats.averageRating * e.stats.totalReviews, 0) /
     //                totalReviews
     //            ).toFixed(1)
     //            : 0;

        // Services Stats
        const services = await Service.aggregate([
            { $match: { createdBy: userId } },
            {
                $lookup: {
                    from: 'reviews',
                    localField: '_id',
                    foreignField: 'serviceId',
                    as: 'reviews',
                },
            },
            {
                $lookup: {
                    from: 'reservations',
                    localField: '_id',
                    foreignField: 'serviceId',
                    as: 'reservations',
                },
            },
            {
                $addFields: {
                    averageRating: {
                        $cond: [{ $gt: [{ $size: '$reviews' }, 0] }, { $avg: '$reviews.rating' }, 0],
                    },
                    totalReservations: { $size: '$reservations' },
                },
            },
        ]);
        const totalServices = services.length;
        const activeServices = services.filter(s => s.isActive).length;
        const inactiveServices = totalServices - activeServices;
        const totalServiceReservations = services.reduce((sum, s) => sum + s.totalReservations, 0);
        const totalServiceReviews = services.reduce((sum, s) => sum + s.reviews.length, 0);
        const serviceAverageRating =
            totalServiceReviews > 0
                ? (
                    services.reduce(
                        (sum, s) => sum + s.averageRating * s.reviews.length,
                        0
                    ) / totalServiceReviews
                ).toFixed(1)
                : 0;
        const totalServiceViews = services.reduce((sum, s) => sum + (s.views || 0), 0);

        // Consultations Stats
        const consultations = await Consultation.aggregate([
            { $match: { assignedExpert: userId } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                    inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
                    completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                    paid: { $sum: { $cond: [{ $eq: ['$type', 'paid'] }, 1, 0] } },
                    free: { $sum: { $cond: [{ $eq: ['$type', 'free'] }, 1, 0] } },
                },
            },
        ]);
        const consultationStats = consultations[0] || {
            total: 0,
            pending: 0,
            inProgress: 0,
            completed: 0,
            paid: 0,
            free: 0,
        };

        // Reviews Stats
        const reviews = await Review.find({ userId }).sort({ createdAt: -1 }).lean();
        const totalReviewsCount = reviews.length;
        const reviewsAverageRating =
            totalReviewsCount > 0
                ? (
                    reviews.reduce((sum, r) => sum + r.rating, 0) /
                    totalReviewsCount
                ).toFixed(1)
                : 0;
        const latestReviews = reviews.slice(0, 5);

      

        // Compile Stats
        const stats = {
            // elevages: {
            //     total: totalElevages,
            //     active: activeElevages,
            //     pending: pendingElevages,
            //     suspended: suspendedElevages,
            //     totalDogs,
            //     availableDogs,
            //     totalReviews,
            //     averageRating,
            // },
            services: {
                total: totalServices,
                active: activeServices,
                inactive: inactiveServices,
                reservations: totalServiceReservations,
                totalViews: totalServiceViews,
                totalReviews: totalServiceReviews,
                averageRating: serviceAverageRating,
            },
            consultations: {
                total: consultationStats.total,
                pending: consultationStats.pending,
                inProgress: consultationStats.inProgress,
                completed: consultationStats.completed,
                paid: consultationStats.paid,
                free: consultationStats.free,
            },
            reviews: {
                total: totalReviewsCount,
                averageRating: reviewsAverageRating,
                latest: latestReviews,
            },
        };
        console.log(stats)

        res.render('user/dashboard/dashboard', {
            page: 'stats',
            stats,
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).send('Error loading stats');
    }
});




// Requests routes
router.get('/requests', async (req, res) => {
    try {
        const requests = await Request.find({ serviceProvider: req.user._id })
            .populate('client')
            .populate('service')
            .sort({ createdAt: -1 });

        res.render('dashboard', { 
            page: 'requests',
            requests 
        });
    } catch (error) {
        console.error('Requests fetch error:', error);
        req.flash('error', 'Erreur lors du chargement des demandes');
        res.redirect('/dashboard');
    }
});

// Messages routes
router.get('/messages', async (req, res) => {
    try {
        const conversations = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { sender: req.user._id },
                        { recipient: req.user._id }
                    ]
                }
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ['$sender', req.user._id] },
                            '$recipient',
                            '$sender'
                        ]
                    },
                    lastMessage: { $last: '$$ROOT' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'otherUser'
                }
            },
            { $unwind: '$otherUser' }
        ]);

        res.render('dashboard', { 
            page: 'messages',
            conversations 
        });
    } catch (error) {
        console.error('Messages fetch error:', error);
        req.flash('error', 'Erreur lors du chargement des messages');
        res.redirect('/dashboard');
    }
});

// Route: Display all reviews for the authenticated user's services
router.get('/reviews', isAuthenticated, async (req, res) => {
     try {
         // Fetch all services created by the logged-in user
         const services = await Service.find({ createdBy: req.user._id }).select('_id serviceName');
 
         // Fetch all reviews for the user's services
         const serviceIds = services.map(service => service._id);
         const reviews = await Review.find({ serviceId: { $in: serviceIds } })
             .populate('userId', 'name email') // Populate user details
             .populate('serviceId', 'serviceName') // Populate service details
             .sort({ createdAt: -1 }); // Sort reviews by the newest first
 
         res.render('user/dashboard/dashboard', {
             path: 'reviews',
             page : 'reviews',
             pageTitle: 'Avis sur les Services',
             reviews,
             user: req.user,
         });
     } catch (error) {
         console.error('Error fetching reviews:', error);
         res.status(500).send('Erreur lors du chargement des avis');
     }
 });

// Export router
module.exports = router;