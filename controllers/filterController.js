const Seller = require('../models/seller');

// Filter Announcements by Title, Price, and Location
exports.filterAnnouncements = async (req, res) => {
     const { title, minPrice, maxPrice, location } = req.query;
     console.log('filter contr')
     try {
          let query = {};

          // Filter by title (name) if provided
          if (title) {
               query['announcements.title'] = { $regex: new RegExp(title, 'i') };
          }

          // Filter by location
          if (location) {
               query['announcements.location'] = { $regex: new RegExp(location, 'i') };
          }

          // Filter by price range
          if (minPrice && maxPrice) {
               query['announcements.price'] = { $gte: parseFloat(minPrice), $lte: parseFloat(maxPrice) };
          } else if (minPrice) {
               query['announcements.price'] = { $gte: parseFloat(minPrice) };
          } else if (maxPrice) {
               query['announcements.price'] = { $lte: parseFloat(maxPrice) };
          }

          // Perform the query
          const sellers = await Seller.find(query).select('announcements');
          let filteredAnnouncements = sellers.reduce((acc, seller) => [...acc, ...seller.announcements], []);

          res.render('marketplace/announcements', { announcements: filteredAnnouncements, title: 'Résultats Filtrés' });
     } catch (err) {
          console.error('Error filtering announcements:', err);
          res.status(500).render('error', { message: 'Failed to filter announcements' });
     }
};


