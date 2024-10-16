const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user'); // Use the User model instead of Seller
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
                    // Check if the user already exists in the database
                    let user = await User.findOne({ googleId: profile.id });

                    if (!user) {
                         // Try to generate a unique slug for the user
                         let slug;
                         let isUniqueSlug = false;
                         let attemptCount = 0;

                         while (!isUniqueSlug && attemptCount < 10) {
                              const randomNum = Math.floor(1000 + Math.random() * 9000);
                              slug = slugify(`${profile.displayName}-${randomNum}`, { lower: true, strict: true });

                              const existingUser = await User.findOne({ slug });
                              if (!existingUser) {
                                   isUniqueSlug = true;
                              }
                              attemptCount++;
                         }

                         if (attemptCount === 10) {
                              throw new Error('Failed to generate a unique slug after 10 attempts.');
                         }

                         // Handle the case where no email is returned from the Google profile
                         const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;

                         // Create a new user in the database
                         user = new User({
                              slug: slug,
                              googleId: profile.id,
                              displayName: profile.displayName || 'Unknown User',
                              image: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
                              email: email || `noemail_${profile.id}@unknown.com`, // Generate a placeholder email if none is provided
                         });

                         await user.save();
                    }

                    return done(null, user);
               } catch (err) {
                    console.error('Google OAuth Error:', err);

                    // Custom error handling logic for known cases
                    if (err.message.includes('Failed to generate a unique slug')) {
                         return done(null, false, { message: 'Unable to complete registration. Please try again.' });
                    }

                    return done(err, null);
               }
          }
     )
);

// Serialize user information into the session
passport.serializeUser((user, done) => {
     done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
     try {
          const user = await User.findById(id);
          if (user) {
               return done(null, user);
          }

          return done(new Error('User not found'), null);
     } catch (err) {
          console.error('Deserialization error:', err);
          done(err, null);
     }
});
