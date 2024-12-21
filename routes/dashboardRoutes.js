const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const {unreadRequests} = require('../middlewares/globals');

const User = require('../models/user');
const { isAuthenticated } = require('../middlewares/auth');
const Service = require('../models/service');
const Review = require('../models/review');
const multer = require('multer');

const TrainingSession = require('../models/trainingSession');
const Client = require('../models/client');
const Program = require('../models/program');
// const { isAuthenticated, isServiceProvider } = require('../middleware/auth');

// Dashboard middleware to check if user is a service provider
// router.use(isAuthenticated, isServiceProvider);



// Services routes
router.get('/services', async (req, res) => {
    try {
        const services = await Service.find({ serviceProvider: req.user._id });
        res.render('user/dashboard/dashboard', { 
            page: 'services',
            unreadRequests,
            services 
        });
    } catch (error) {
        console.error('Services fetch error:', error);
        req.flash('error', 'Erreur lors du chargement des services');
        res.redirect('/dashboard');
    }
});







router.get('/profile', isAuthenticated, async (req, res) => {

    /**
     * Maps training specializations to their corresponding Font Awesome icons
     * @param {string} specialization - The specialization name
     * @returns {string} - The Font Awesome icon class
     */
    const getSpecializationIcon = (specialization) => {
        const iconMap = {
            'Comportementaliste': 'fa-brain',  // Behavioral Trainer
            'Attaque': 'fa-fist-raised',       // Attack/Protection Training
            'Discipline': 'fa-graduation-cap', // Discipline and Obedience
            'Freestyle': 'fa-dance'            // Freestyle
        };
        return iconMap[specialization] || 'fa-paw';
    };

    try {
        // Fetch trainer with select fields
        const user = await User.findById(req.user._id)
            .select('-password -__v')
            .lean();

        // Calculate missing fields for completion guide
        const missingFields = [];
        if (!user.displayName) missingFields.push('displayName');
        if (!user.bio) missingFields.push('bio');
        if (!user.location?.city) missingFields.push('ville');
        if (!user.phoneNumber) missingFields.push('téléphone');
        if (!user.specializations?.length) missingFields.push('spécialisations');
        if (!user.trainingMethods?.length) missingFields.push('méthodes d\'éducation');
        if (!user.certifications?.length) missingFields.push('certifications');
        if (!user.experience?.description) missingFields.push('expérience');

        // Calculate completion percentage
        const totalFields = 8; // Updated number of required fields
        const completionPercentage = Math.round(
            ((totalFields - missingFields.length) / totalFields) * 100
        );

        // Calculate training metrics
        const completedTrainings = user.metrics?.completedTrainings || 0;
        const totalClients = user.metrics?.totalClients || 0;
        const totalSessions = user.metrics?.totalSessions || 0;
        const successRate = user.metrics?.successRate || 0;

        // Calculate average rating from reviews
        const reviews = await Review.find({ trainerId: user._id });
        const averageRating = reviews.length > 0 
            ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length 
            : 0;

        // Format data for template
        const viewData = {
            page: 'profile',
            user: {
                ...user,
                stats: {
                    clients: totalClients,
                    sessions: totalSessions,
                    completedTrainings,
                    successRate: Number(successRate.toFixed(1)),
                    reviews: reviews.length,
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
            // Training specializations
            specializations: [
                'Comportementaliste',
                'Attaque',
                'Discipline',
                'Freestyle'
            ]
        };

        res.render('user/dashboard/profile', viewData);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
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




// routes/dashboardRoutes.js
const Request = require('../models/request');

// Requests routes
router.get('/requests', async (req, res) => {
    try {
        const { status = 'all', sort = '-createdAt', page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        // Build query
        let query = { serviceProvider: req.user._id };
        if (status !== 'all') {
            query.status = status;
        }
        

        // Get total count for pagination
        const totalRequests = await Request.countDocuments(query);
        const totalPages = Math.ceil(totalRequests / limit);

        // Fetch requests with pagination and sorting
        const requests = await Request.find(query)
            .populate('serviceId', 'serviceName images price')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Get counts for different statuses
        const counts = await Request.aggregate([
            { $match: { serviceProvider: req.user._id } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Format counts
        const statusCounts = {
            all: totalRequests,
            pending: 0,
            accepted: 0,
            rejected: 0
        };
        counts.forEach(item => {
            statusCounts[item._id] = item.count;
        });

        // Mark unread requests as read
        if (requests.length > 0) {
            await Request.updateMany(
                { 
                    serviceProvider: req.user._id, 
                    isRead: false 
                },
                { isRead: true }
            );
        }

        // Render requests page
        res.render('user/dashboard/dashboard', {
            page: 'requests',
            requests,
            unreadRequests,
            statusCounts,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            filters: {
                currentStatus: status,
                currentSort: sort
            }
        });

    } catch (error) {
        console.error('Requests fetch error:', error);
        req.flash('error', 'Erreur lors du chargement des demandes');
        res.redirect('/dashboard');
    }
});

// Update request status
router.patch('/requests/:requestId/status', async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status } = req.body;

        // Validate status
        if (!['pending', 'accepted', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        // Update request
        const request = await Request.findOneAndUpdate(
            { 
                _id: requestId,
                serviceProvider: req.user._id 
            },
            { status },
            { new: true }
        );

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        res.json({
            success: true,
            message: 'Status updated successfully',
            data: request
        });

    } catch (error) {
        console.error('Request update error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating request status'
        });
    }
});

// Delete request
router.delete('/requests/:requestId', async (req, res) => {
    try {
        const { requestId } = req.params;

        const request = await Request.findOneAndDelete({
            _id: requestId,
            serviceProvider: req.user._id
        });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        res.json({
            success: true,
            message: 'Request deleted successfully'
        });

    } catch (error) {
        console.error('Request delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting request'
        });
    }
});

// Get request counts (for notifications)
router.get('/requests/counts', async (req, res) => {
    try {
        const unreadCount = await Request.countDocuments({
            serviceProvider: req.user._id,
            isRead: false
        });

        const pendingCount = await Request.countDocuments({
            serviceProvider: req.user._id,
            status: 'pending'
        });

        res.json({
            success: true,
            data: {
                unread: unreadCount,
                pending: pendingCount
            }
        });

    } catch (error) {
        console.error('Request counts error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching request counts'
        });
    }
});

// Mark request as read
router.patch('/requests/:requestId/read', async (req, res) => {
    try {
        const { requestId } = req.params;

        await Request.findOneAndUpdate(
            { 
                _id: requestId,
                serviceProvider: req.user._id 
            },
            { isRead: true }
        );

        res.json({
            success: true,
            message: 'Request marked as read'
        });

    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking request as read'
        });
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
 
         res.render('user/dashboard/includes/reviews', {
             path: 'reviews',
             unreadRequests,
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





 // Training Sessions
router.get('/training-sessions', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).lean();
        const sessions = await TrainingSession.find({ trainerId: user._id })
            .sort({ startTime: -1 })
            .populate('clientId', 'displayName profileImage')
            .lean();

        res.render('dashboard/training-sessions', {
            page: 'training-sessions',
            user,
            sessions
        });
    } catch (error) {
        console.error('Training sessions error:', error);
        res.status(500).send('Erreur du serveur');
    }
});

// Clients
router.get('/clients', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).lean();
        const clients = await Client.find({ trainerId: user._id })
            .sort({ createdAt: -1 })
            .lean();

        res.render('dashboard/clients', {
            page: 'clients',
            user,
            clients
        });
    } catch (error) {
        console.error('Clients error:', error);
        res.status(500).send('Erreur du serveur');
    }
});

// Schedule
router.get('/schedule', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).lean();
        const sessions = await TrainingSession.find({
            trainerId: user._id,
            startTime: {
                $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                $lte: new Date(new Date().setDate(new Date().getDate() + 30))
            }
        })
            .populate('clientId', 'displayName profileImage')
            .lean();

        res.render('dashboard/schedule', {
            page: 'schedule',
            user,
            sessions
        });
    } catch (error) {
        console.error('Schedule error:', error);
        res.status(500).send('Erreur du serveur');
    }
});

// Training Programs
router.get('/programs', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).lean();
        const programs = await Program.find({ trainerId: user._id })
            .sort({ createdAt: -1 })
            .lean();

        res.render('dashboard/programs', {
            page: 'programs',
            user,
            programs
        });
    } catch (error) {
        console.error('Programs error:', error);
        res.status(500).send('Erreur du serveur');
    }
});

// Export router
module.exports = router;