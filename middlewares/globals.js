// middleware/globals.js
const Request = require('../models/request');

const unreadRequests = async (req, res, next) => {
    try {
        // Only check for unread requests if user is logged in
        if (req.user) {
            const unreadRequests = await Request.countDocuments({
                serviceProvider: req.user._id,
                isRead: false
            });
            
            // Make it available in all views
            res.locals.unreadRequests = unreadRequests;
        } else {
            res.locals.unreadRequests = 0;
        }
        
        next();
    } catch (error) {
        console.error('Global variables error:', error);
        res.locals.unreadRequests = 0;
        next();
    }
};

module.exports = unreadRequests;