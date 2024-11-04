const captureVisit = require('../utils/visitTracker');

const visitMiddleware = (providerIdField) => async (req, res, next) => {
     const providerId = req.params[providerIdField] || req.body[providerIdField];
     if (providerId) {
          await captureVisit(req, providerId);
     }
     next();
};

module.exports = visitMiddleware;
