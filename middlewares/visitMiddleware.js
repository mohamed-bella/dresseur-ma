// middleware/visitMiddleware.js
const captureVisit = require('../utils/visitTracker');

const visitMiddleware = (providerIdField) => async (req, res, next) => {
    try {
        const providerId = req.params[providerIdField] || 
                          req.body[providerIdField] || 
                          req.query[providerIdField];

        if (providerId) {
            // Track visit asynchronously
            captureVisit(req, providerId).catch(error => {
                console.error('Visit middleware error:', {
                    error: error.message,
                    providerId,
                    path: req.path
                });
            });
        }
    } catch (error) {
        console.error('Visit middleware error:', error);
    }
    
    next();
};

module.exports = visitMiddleware;