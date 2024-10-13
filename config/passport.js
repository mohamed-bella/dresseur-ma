const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');
const Seller = require('../models/seller');
require('dotenv').config();
const passport = require('passport');
const slugify = require('slugify');

passport.use(
     new GoogleStrategy({
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: '/auth/google/cb',
     },
          async (accessToken, refreshToken, profile, done) => {
               try {
                    // Check if the user is a trainer
                    let user = await User.findOne({ googleId: profile.id });
                    if (user) {
                         return done(null, user);
                    }

                    // Check if the user is a seller
                    let seller = await Seller.findOne({ googleId: profile.id });
                    if (!seller) {
                         // Try to generate a unique slug
                         let slug;
                         let isUniqueSlug = false;
                         let attemptCount = 0;

                         while (!isUniqueSlug && attemptCount < 10) {
                              const randomNum = Math.floor(1000 + Math.random() * 9000);
                              slug = slugify(${profile.displayName}-${randomNum}, { lower: true, strict: true });

                              const existingSeller = await Seller.findOne({ slug });
                              if (!existingSeller) {
                                   isUniqueSlug = true;
                              }
                              attemptCount++;
                         }

                         if (attemptCount === 10) {
                              throw new Error('Failed to generate a unique slug after 10 attempts.');
                         }

                         // Handle the case where no email is returned
                         const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;

                         // Create a new seller
                         seller = new Seller({
                              slug: slug,
                              googleId: profile.id,
                              displayName: profile.displayName || 'Unknown User',
                              image: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
                              email: email || noemail_${profile.id}@unknown.com
                         });

                         await seller.save();
                    }

                    return done(null, seller);
               } catch (err) {
                    console.error('Google OAuth Error:', err);

                    // Custom error handling logic for known cases
                    if (err.message.includes('Failed to generate a unique slug')) {
                         return done(null, false, { message: 'Unable to complete registration. Please try again.' });
                    }

                    return done(err, null);
               }
          })
);

passport.serializeUser((user, done) => {
     done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
     try {
          let user = await User.findById(id);
          if (user) {
               return done(null, user);
          }

          let seller = await Seller.findById(id);
          if (seller) {
               return done(null, seller);
          }

          return done(new Error('User not found'), null);
     } catch (err) {
          console.error('Deserialization error:', err);
          done(err, null);
     }
});
