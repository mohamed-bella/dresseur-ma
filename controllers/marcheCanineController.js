const Announcement = require('../models/announcement');
const Seller = require('../models/seller');
const cloudinary = require('../config/cloudinary');
const slugify = require('slugify');
// Middleware to ensure the user is authenticated as a seller
// const ensureSellerAuthenticated = async (req, res, next) => {
//      if (req.isAuthenticated() && req.user.googleId) {
//           try {
//                const seller = await Seller.findOne({ googleId: req.user.googleId });
//                if (!seller) {
//                     return res.status(403).render('error', { message: 'Unauthorized access. Seller not found.' });
//                }
//                next();
//           } catch (err) {
//                console.error(err);
//                return res.status(500).render('error', { message: 'Server error during seller authentication.' });
//           }
//      } else {
//           res.redirect('/auth/google'); // Redirect to Google login if not authenticated
//      }
// };
const marcheCanineController = {
     // GET: Fetch all announcements (Home Page)
     async getAnnouncements(req, res) {
          try {
               const announcements = await Announcement.find({ status: 'approved' }).sort({ datePosted: -1 });

               res.render('marketplace/announcements', {
                    announcements,
                    title: 'Tous les annonces',
                    successMsg: req.flash('success')
               });
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to fetch announcements' });
          }
     },

     // GET: Show form to create a new announcement
     showNewAnnouncementForm(req, res) {
          res.render('marketplace/newAnnouncement', { title: 'Créer une nouvelle annonce', successMsg: req.flash('success') });
     },

     // POST: Add a new announcement (for sellers only)
     async addAnnouncement(req, res) {
          const { breed, description, price, location, number } = req.body;

          // Check if all required fields are filled
          if (!breed || !description || !price || !location || !number) {
               return res.status(400).render('marketplace/newAnnouncement', {
                    message: 'Please fill in all fields',
                    title: 'Créer une nouvelle annonce'
               });
          }

          try {
               const seller = await Seller.findOne({ googleId: req.user.googleId });
               if (!seller) return res.status(404).json({ message: 'Seller not found' });

               // Handle file uploads (images and videos)
               const mediaUrls = req.files.map(file => file.path);

               // Generate slug for the announcement
               const randomNum = Math.floor(1000 + Math.random() * 9000);
               let slug = slugify(`${breed}-${location}-${randomNum}`, { lower: true, strict: true });

               // Ensure slug is unique
               while (await Announcement.findOne({ slug })) {
                    slug = `${slug}-${Math.floor(Math.random() * 100)}`;
               }

               const newAnnouncement = new Announcement({
                    breed,
                    description,
                    price,
                    location,
                    number,
                    media: mediaUrls,
                    slug,
                    sellerDisplayName: seller.displayName,
                    sellerEmail: seller.email
               });

               await newAnnouncement.save();
               req.flash('success', "en Attendant l'Aprouve");
               res.redirect('/announcements');
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to add announcement' });
          }
     },

     // GET: Show details of a specific announcement by slug
     async getAnnouncementBySlug(req, res) {
          try {
               const { slug } = req.params;
               const announcement = await Announcement.findOne({ slug });

               if (!announcement) {
                    return res.status(404).render('error', { message: 'Announcement not found' });
               }

               // Increment views if this is the first time the user is viewing the announcement
               if (!req.cookies[`viewed_${slug}`]) {
                    announcement.views++;
                    await announcement.save();
                    res.cookie(`viewed_${slug}`, true, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
               }

               res.render('marketplace/announcementDetail', { announcement, title: 'Détails de l\'annonce' });
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to retrieve announcement details' });
          }
     },

     // PUT: Update an existing announcement
     async updateAnnouncement(req, res) {
          const { breed, description, price, location, images } = req.body;

          try {
               const announcement = await Announcement.findById(req.params.id);

               if (!announcement) return res.status(404).render('error', { message: 'Announcement not found' });

               announcement.breed = breed || announcement.breed;
               announcement.description = description || announcement.description;
               announcement.price = price || announcement.price;
               announcement.location = location || announcement.location;
               announcement.media = images ? images.split(',') : announcement.media;

               await announcement.save();
               res.redirect('/announcements');
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to update announcement' });
          }
     },

     // DELETE: Remove an existing announcement
     async deleteAnnouncement(req, res) {
          try {
               await Announcement.findByIdAndDelete(req.params.id);
               res.redirect('/announcements');
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to delete announcement' });
          }
     },

     // GET: Filter announcements based on criteria (price, location, etc.)
     async filterAnnouncements(req, res) {
          const { location, price, breed } = req.query;

          try {
               const filterQuery = {};

               if (location) filterQuery.location = { $regex: new RegExp(location, 'i') };
               if (price) filterQuery.price = { $lte: price };
               if (breed) filterQuery.breed = { $regex: new RegExp(breed, 'i') };

               const announcements = await Announcement.find(filterQuery).sort({ datePosted: -1 });

               res.render('marketplace/announcements', {
                    announcements,
                    title: 'Annonces filtrées'
               });
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to filter announcements' });
          }
     }
};

module.exports = { marcheCanineController };
