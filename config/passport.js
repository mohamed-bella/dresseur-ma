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

                    // If not a trainer, check if the user is a seller
                    let seller = await Seller.findOne({ googleId: profile.id });
                    if (!seller) {
                         // Try to generate a unique slug
                         let slug;
                         let isUniqueSlug = false;
                         while (!isUniqueSlug) {
                              const randomNum = Math.floor(1000 + Math.random() * 9000);
                              slug = slugify(`${profile.displayName}-${randomNum}`, { lower: true, strict: true });

                              // Check if the slug already exists
                              const existingSeller = await Seller.findOne({ slug });
                              if (!existingSeller) {
                                   isUniqueSlug = true; // Slug is unique, exit the loop
                              }
                         }

                         // Create a new seller if the seller does not exist
                         seller = new Seller({
                              slug: slug,
                              googleId: profile.id,
                              displayName: profile.displayName,
                              image: profile.photos[0].value,
                              email: profile.emails[0].value,
                              announcements: []
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
