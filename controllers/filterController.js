const Seller = require('../models/seller');

// Filter announcements based on name (title), price, and location
exports.filterAnnouncements = async (req, res) => {
     const { title, minPrice, maxPrice, location } = req.query;
     console.log(req.query)
     try {
          // Build the query object based on the provided filters
          let query = {};

          // If title (name) is provided, use a regular expression for partial and case-insensitive matching
          if (title) {
               query.title = { $regex: new RegExp(title, 'i') }; // Case-insensitive partial match
          }

          // If location is provided, apply case-insensitive matching on the location field
          if (location) {
               query.location = { $regex: new RegExp(location, 'i') }; // Case-insensitive match for location
          }

          // If minPrice and maxPrice are provided, filter announcements by price range
          if (minPrice && maxPrice) {
               query.price = { $gte: parseFloat(minPrice), $lte: parseFloat(maxPrice) }; // Price between minPrice and maxPrice
          } else if (minPrice) {
               query.price = { $gte: parseFloat(minPrice) }; // Price greater than or equal to minPrice
          } else if (maxPrice) {
               query.price = { $lte: parseFloat(maxPrice) }; // Price less than or equal to maxPrice
          }

          // Find all sellers with matching announcements based on the query
          const sellers = await Seller.find().select('announcements');
          let announcements = sellers.reduce((acc, seller) => [...acc, ...seller.announcements], []);

          // Apply the query to filter the announcements
          announcements = announcements.filter((announcement) => {
               return Object.keys(query).every(key => {
                    if (key === 'price') {
                         return query[key].$gte <= announcement[key] && query[key].$lte >= announcement[key];
                    }
                    return query[key].$regex.test(announcement[key]);
               });
          });

          // Render the filtered results
          res.render('marketplace/announcements', { announcements, title: 'Annonces filtrées' });
     } catch (err) {
          console.error('Error filtering announcements:', err);
          res.status(500).render('error', { message: 'Failed to filter announcements' });
     }
}


