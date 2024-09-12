const Seller = require('../models/seller');
const cloudinary = require('../config/cloudinary'); // Import Cloudinary configuration


const sellerController = {
     // GET: Seller dashboard
     getDashboard: async (req, res) => {
          try {
               const seller = await Seller.findOne({ googleId: req.user.googleId });
               if (!seller) {
                    return res.status(404).render('error', { message: 'Seller not found' });
               }
               res.render('seller/dashboard', { seller, title: 'Seller Dashboard' });
          } catch (err) {
               console.error(err);
               res.send('error')
               // res.status(500).render('error', { message: 'Failed to load seller dashboard' });
          }
     },

     // GET: Seller profile
     getProfile: async (req, res) => {
          try {
               const seller = await Seller.findOne({ googleId: req.user.googleId });
               if (!seller) {
                    return res.status(404).render('error', { message: 'Seller not found' });
               }
               res.render('seller/profile', { seller, title: 'Seller Profile' });
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to load seller profile' });
          }
     },

     // POST: Update seller profile
     updateProfile: async (req, res) => {
          const { firstName, lastName, phone, location } = req.body;
          try {
               const seller = await Seller.findOne({ googleId: req.user.googleId });
               if (!seller) {
                    return res.status(404).render('error', { message: 'Seller not found' });
               }

               // Update seller profile
               seller.firstName = firstName || seller.firstName;
               seller.lastName = lastName || seller.lastName;
               seller.phone = phone || seller.phone;
               seller.location = location || seller.location;

               await seller.save();
               res.redirect('/seller/profile');
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to update seller profile' });
          }
     },

     // GET: Seller's announcements
     getMyAnnouncements: async (req, res) => {
          try {
               const seller = await Seller.findOne({ googleId: req.user.googleId });
               if (!seller) {
                    return res.status(404).render('error', { message: 'Seller not found' });
               }
               const announcements = seller.announcements;
               res.render('seller/myAnnouncements', { announcements, title: 'My Announcements' });
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to load announcements' });
          }
     },

     // GET: Show form to edit a specific announcement
     showEditAnnouncementForm: async (req, res) => {
          try {
               const seller = await Seller.findOne({ googleId: req.user.googleId });
               const announcement = seller.announcements.id(req.params.id);
               if (!announcement) {
                    return res.status(404).render('error', { message: 'Announcement not found' });
               }
               res.render('seller/editAnnouncement', { announcement, title: 'Edit Announcement' });
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to load edit form' });
          }
     },

     // POST: Update a specific announcement
     async updateAnnouncement(req, res) {
          const { title, description, price, location, deleteImages } = req.body;
          const newImages = req.files; // This will contain the new images uploaded

          try {
               console.log(req.body)
               const seller = await Seller.findOne({ googleId: req.user.googleId });
               const announcement = seller.announcements.id(req.params.id);

               if (!announcement) {
                    return res.status(404).render('error', { message: 'Announcement not found' });
               }

               // Update basic fields
               announcement.title = title || announcement.title;
               announcement.description = description || announcement.description;
               announcement.price = price || announcement.price;
               announcement.location = location || announcement.location;

               // Handle image deletions
               if (deleteImages && deleteImages.length > 0) {
                    deleteImages.forEach(async (index) => {
                         const imageUrl = announcement.images[index];

                         // Remove from Cloudinary
                         const publicId = imageUrl.split('/').pop().split('.')[0]; // Extract Cloudinary public ID
                         await cloudinary.uploader.destroy(publicId);
                         console.log(publicId)
                         // Remove from the announcement images array
                         announcement.images.splice(index, 1);
                    });
               }

               // Handle new image uploads
               if (newImages && newImages.length > 0) {
                    for (let file of newImages) {
                         announcement.images.push(file.path); // Cloudinary URL
                    }
               }

               // Save the updated announcement
               await seller.save();
               res.redirect('/seller/announcements');
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to update announcement' });
          }
     },

     // DELETE: Remove a specific announcement
     deleteAnnouncement: async (req, res) => {
          try {
               const seller = await Seller.findOne({ googleId: req.user.googleId });

               // Check if the seller exists
               if (!seller) {
                    return res.status(404).render('error', { message: 'Seller not found' });
               }

               // Find the index of the announcement to delete
               const announcement = seller.announcements.id(req.params.id);

               // Check if the announcement exists
               if (!announcement) {
                    return res.status(404).render('error', { message: 'Announcement not found' });
               }

               // Use the `pull` method to remove the announcement from the array
               seller.announcements.pull({ _id: req.params.id });
               await seller.save();  // Save the updated seller with the removed announcement

               // Redirect to the seller's announcements page after deletion
               res.redirect('/seller/announcements');
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to delete announcement' });
          }
     }

};

module.exports = sellerController;
