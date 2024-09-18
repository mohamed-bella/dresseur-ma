const Seller = require('../models/seller');

// View a user's profile by slug
exports.viewProfile = async (req, res) => {
     try {
          const { slug } = req.params;

          // Find the seller by slug
          const seller = await Seller.findOne({ slug });
          if (!seller) {
               return res.status(404).send('User profile not found.');
          }

          res.render('profile/viewProfile', { seller, title: `${seller.displayName}'s Profile` });
     } catch (err) {
          console.error('Error fetching profile:', err);
          res.status(500).send('Server error.');
     }
};

// View user-specific announcements
exports.viewUserAnnouncements = async (req, res) => {
     try {
          const { slug } = req.params;

          // Find the seller by slug and get announcements
          const seller = await Seller.findOne({ slug });
          if (!seller) {
               return res.status(404).send('User profile not found.');
          }

          res.render('profile/userAnnouncements', { seller, announcements: seller.announcements, title: `${seller.displayName}'s Announcements` });
     } catch (err) {
          console.error('Error fetching announcements:', err);
          res.status(500).send('Server error.');
     }
};
