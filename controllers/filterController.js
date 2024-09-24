const Announcement = require('../models/announcement');

// Filter Announcements by Breed, Price, Location, and handle Pagination
exports.filterAnnouncements = async (req, res) => {
     const { breed, minPrice, maxPrice, location, page = 1, limit = 2 } = req.query; // Default values for page and limit
     try {
          let matchQuery = {};

          // Filter by breed (partial match, case insensitive)
          if (breed) {
               matchQuery['breed'] = { $regex: new RegExp(breed, 'i') }; // Match anywhere in the string, case insensitive
          }

          // Filter by location (partial match, case insensitive)
          if (location) {
               matchQuery['location'] = { $regex: new RegExp(location, 'i') };
          }

          // Filter by price range
          if (minPrice && maxPrice) {
               matchQuery['price'] = { $gte: parseFloat(minPrice), $lte: parseFloat(maxPrice) };
          } else if (minPrice) {
               matchQuery['price'] = { $gte: parseFloat(minPrice) };
          } else if (maxPrice) {
               matchQuery['price'] = { $lte: parseFloat(maxPrice) };
          }

          const perPage = parseInt(limit) || 9; // Default limit to 9 per page
          const currentPage = parseInt(page) || 1;

          const totalAnnouncements = await Announcement.countDocuments(matchQuery); // Count total filtered announcements
          const announcements = await Announcement.find(matchQuery)
               .sort({ datePosted: -1 })
               .skip((currentPage - 1) * perPage)
               .limit(perPage);

          // Render the results with pagination
          res.render('marketplace/announcements', {
               announcements,
               current: currentPage,
               pages: Math.ceil(totalAnnouncements / perPage),
               perPage: perPage,
               total: totalAnnouncements,
               title: 'Résultats Filtrés'
          });
     } catch (err) {
          console.error('Error filtering announcements:', err);
          res.status(500).render('error', { message: 'Failed to filter announcements' });
     }
};
