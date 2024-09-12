const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user'); // For trainers
const Seller = require('../models/seller'); // For sellers
require('dotenv').config();

passport.use(
     new GoogleStrategy({
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: '/auth/google/cb'
     },
          async (accessToken, refreshToken, profile, done) => {
               try {
                    // Check if the user is a trainer
                    let user = await User.findOne({ googleId: profile.id });
                    if (user) {
                         return done(null, user);
                    }

                    // If not a trainer, check if the user is a seller
                    let seller = await Seller.findOne({ googleId: profile.id });
                    if (!seller) {
                         // If neither exist, create a new seller (you can also modify this for trainers)
                         seller = new Seller({
                              googleId: profile.id,
                              displayName: profile.displayName,
                              image: profile.photos[0].value,
                              email: profile.emails[0].value
                         });
                         await seller.save();
                    }

                    done(null, seller);
               } catch (err) {
                    console.error(err);
                    done(err, null);
               }
          })
);

passport.serializeUser((user, done) => {
     done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
     try {
          // Check both User (trainer) and Seller (seller) collections
          let user = await User.findById(id);
          if (user) {
               done(null, user);
          } else {
               let seller = await Seller.findById(id);
               done(null, seller);
          }
     } catch (err) {
          done(err, null);
     }
});
