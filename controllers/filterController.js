const Seller = require('../models/seller');

// Filter Announcements by Breed, Price, and Location
exports.filterAnnouncements = async (req, res) => {
     const { breed, minPrice, maxPrice, location } = req.query;

     try {
          let matchQuery = {};

          // Filter by breed (partial match, case insensitive)
          if (breed) {
               matchQuery['announcements.breed'] = { $regex: new RegExp(`^${breed}`, 'i') }; // Match starting with the first letters
          }

          // Filter by location (case insensitive)
          if (location) {
               matchQuery['announcements.location'] = { $regex: new RegExp(location, 'i') };
          }

          // Filter by price range
          if (minPrice && maxPrice) {
               matchQuery['announcements.price'] = { $gte: parseFloat(minPrice), $lte: parseFloat(maxPrice) };
          } else if (minPrice) {
               matchQuery['announcements.price'] = { $gte: parseFloat(minPrice) };
          } else if (maxPrice) {
               matchQuery['announcements.price'] = { $lte: parseFloat(maxPrice) };
          }

          // Perform the aggregation query to flatten the announcements across sellers
          const filteredAnnouncements = await Seller.aggregate([
               { $unwind: '$announcements' },  // Unwind the announcements array to work with individual announcements
               { $match: matchQuery },          // Apply the filters
               {
                    $project: {                    // Select the fields you want to return
                         'announcements': 1,
                         '_id': 0
                    }
               }
          ]);

          // Map the result to just the announcements
          const announcements = filteredAnnouncements.map(seller => seller.announcements);

          // Render the results
          res.render('marketplace/announcements', { announcements, title: 'Résultats Filtrés' });
     } catch (err) {
          console.error('Error filtering announcements:', err);
          res.status(500).render('error', { message: 'Failed to filter announcements' });
     }
};
