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
            console.log('Google Profile ID:', profile.id); // Log Google profile ID

            // Check if the user is a trainer
            let user = await User.findOne({ googleId: profile.id });
            if (user) {
                console.log('Trainer user found:', user); // Log if user is found
                return done(null, user);
            }

            // Check if the user is a seller
            let seller = await Seller.findOne({ googleId: profile.id });
            if (seller) {
                console.log('Seller user found:', seller); // Log if seller is found
                return done(null, seller);
            }

            // Seller not found, create new one
            console.log('No seller found, creating new seller for Google ID:', profile.id);

            // Try to generate a unique slug
            let slug;
            let isUniqueSlug = false;
            let attemptCount = 0;

            console.log(`Generating slug for: ${profile.displayName}`);

            while (!isUniqueSlug && attemptCount < 10) {
                const randomNum = Math.floor(1000 + Math.random() * 9000);
                slug = slugify(`${profile.displayName}-${randomNum}`, { lower: true, strict: true });

                console.log(`Attempt ${attemptCount + 1}: Trying slug - ${slug}`);

                const existingSeller = await Seller.findOne({ slug });
                if (!existingSeller) {
                    isUniqueSlug = true;
                    console.log('Unique slug found:', slug); // Log the unique slug
                }
                attemptCount++;
            }

            if (attemptCount === 10) {
                console.error('Failed to generate a unique slug after 10 attempts.');
                throw new Error('Failed to generate a unique slug after 10 attempts.');
            }

            // Handle the case where no email is returned
            const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;

            if (!email) {
                console.warn(`No email returned for user with Google ID: ${profile.id}`); // Log warning if no email is available
            }

            // Create a new seller
            seller = new Seller({
                slug: slug,
                googleId: profile.id,
                displayName: profile.displayName || 'Unknown User',
                image: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
                email: email || `noemail_${profile.id}@unknown.com`
            });

            console.log('Saving new seller:', seller);
            await seller.save();

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
    console.log('Serializing user with ID:', user.id); // Log user serialization
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        console.log('Deserializing user with ID:', id); // Log user deserialization

        let user = await User.findById(id);
        if (user) {
            console.log('User found during deserialization:', user); // Log user found
            return done(null, user);
        }

        let seller = await Seller.findById(id);
        if (seller) {
            console.log('Seller found during deserialization:', seller); // Log seller found
            return done(null, seller);
        }

        console.error('User not found during deserialization'); // Log if user is not found
        return done(new Error('User not found'), null);
    } catch (err) {
        console.error('Deserialization error:', err); // Log any deserialization errors
        done(err, null);
    }
});
