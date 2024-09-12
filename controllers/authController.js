const passport = require('passport');
const Seller = require('../models/seller');  // Assuming sellers are your users

const authController = {
     // Handle successful Google login and redirect based on role
     loginSuccess: async (req, res) => {
          try {
               const seller = await Seller.findOne({ googleId: req.user.googleId });

               if (seller) {
                    // Redirect to seller dashboard or home page after login
                    return res.redirect('/announcements/new');
               }

               // If user is not a seller, redirect to home or an onboarding page
               return res.redirect('/');
          } catch (err) {
               console.error(err);
               res.status(500).send('Server Error');
          }
     },

     // Logout user and destroy session
     logout: (req, res) => {
          req.logout((err) => {
               if (err) {
                    console.error(err);
                    return next(err);
               }
               res.redirect('/');  // Redirect to homepage or login page after logout
          });
     }
};

module.exports = authController;
