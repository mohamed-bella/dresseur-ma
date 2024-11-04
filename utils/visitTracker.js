const Visit = require('../models/visit');

// Function to capture visit data
const captureVisit = async (req, providerId) => {
     try {
          const userAgent = req.headers['user-agent'];
          const device = /mobile/i.test(userAgent) ? 'Mobile' : 'Desktop';

          // Replace this with an actual location service call if needed
          const ip = req.ip || req.connection.remoteAddress; // Capture IP address
          const location = { country: 'Unknown', city: 'Unknown' }; // Placeholder for location logic

          // Optionally, use a location service, e.g., geoip-lite or ipinfo, to populate 'location'
          // const locationData = geoip.lookup(ip); // Example if using geoip-lite

          await Visit.create({
               providerId,
               userId: req.user ? req.user._id : null, // Null for guests
               device,
               location: {
                    country: location.country,
                    city: location.city
               },
               userAgent
          });
     } catch (error) {
          console.error('Error capturing visit:', error);
     }
};

module.exports = captureVisit;
