const Seller = require('../models/seller');

// Middleware to ensure the user is authenticated as a seller
const ensureSellerAuthenticated = async (req, res, next) => {
     if (req.isAuthenticated() && req.user.googleId) {
          try {
               // Check if the authenticated user is a seller
               const seller = await Seller.findOne({ googleId: req.user.googleId });

               if (!seller) {
                    return res.status(403).render('error', { message: 'Unauthorized access. Seller not found.' });
               }

               // Proceed to the next middleware or route if the seller is authenticated
               next();
          } catch (err) {
               console.error(err);
               return res.status(500).render('error', { message: 'Server error during seller authentication.' });
          }
     } else {
          // Redirect to Google login if the user is not authenticated
          res.redirect('/auth/google');
     }
};

module.exports = ensureSellerAuthenticated;
