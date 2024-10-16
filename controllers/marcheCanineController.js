const Announcement = require('../models/announcement');
const Seller = require('../models/seller');
const cloudinary = require('../config/cloudinary');
const slugify = require('slugify');

// Middleware to ensure the user is authenticated as a seller
const ensureSellerAuthenticated = async (req, res, next) => {
     if (req.isAuthenticated() && req.user.googleId) {
          try {
               const seller = await Seller.findOne({ googleId: req.user.googleId });
               if (!seller) {
                    return res.status(403).render('error', { message: 'Unauthorized access. Seller not found.' });
               }
               next();
          } catch (err) {
               console.error(err);
               return res.status(500).render('error', { message: 'Server error during seller authentication.' });
          }
     } else {
          res.redirect('/auth/google'); // Redirect to Google login if not authenticated
     }
};

const marcheCanineController = {

     // GET: Fetch all announcements (Home Page with Pagination)
     async getAnnouncements(req, res) {
          try {
               const perPage = parseInt(req.query.limit) || 9;
               const page = parseInt(req.query.page) || 1;

               const totalAnnouncements = await Announcement.countDocuments({ status: 'approved' });
               const announcements = await Announcement.find({ status: 'approved' })
                    .sort({ datePosted: -1 })
                    .skip((page - 1) * perPage)
                    .limit(perPage);

               res.render('marketplace/announcements', {
                    announcements,
                    current: page,
                    pages: Math.ceil(totalAnnouncements / perPage),
                    total: totalAnnouncements,
                    perPage,
                    title: 'Tous les annonces',
                    successMsg: req.flash('success')
               });
          } catch (err) {
               console.error('Error adding announcement:', JSON.stringify(err, null, 2)); // Detailed logging
               res.status(500).render('error', { message: 'Failed to add announcement', error: JSON.stringify(err, null, 2) });
          }
     },

     // GET: Show form to create a new announcement
     showNewAnnouncementForm(req, res) {
          res.render('marketplace/newAnnouncement', { title: 'Créer une nouvelle annonce', successMsg: req.flash('success') });
     },

     // POST: Add a new announcement (for sellers only)
     // POST: Add a new announcement (for sellers only)
     async addAnnouncement(req, res) {
          const { breed, description, price, location, number } = req.body;

          // Validate the form data
          if (!breed || !description || !price || !location || !number) {
               return res.status(400).render('marketplace/newAnnouncement', {
                    message: 'Please fill in all fields',
                    title: 'Créer une nouvelle annonce'
               });
          }

          try {
               const seller = await Seller.findOne({ googleId: req.user.googleId });
               if (!seller) {
                    return res.status(404).json({ message: 'Seller not found' });
               }

               // Save the text information in a temporary storage (session or database)
               req.session.newAnnouncement = {
                    breed,
                    description,
                    price,
                    location,
                    number,
                    seller: seller._id
               };

               // Redirect to the media upload page
               res.redirect('/announcements/upload-media');
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to save the announcement' });
          }
     },

     // POST: Update announcement images
     async updateAnnouncementImages(req, res) {
          const { deletedImages } = req.body;
          const newImages = req.files;

          try {
               const announcement = await Announcement.findById(req.params.id);
               if (!announcement) return res.status(404).render('error', { message: 'Announcement not found' });

               // Handle image deletions from Cloudinary
               if (deletedImages) {
                    const imagesToDelete = deletedImages.split(',');
                    for (let imageUrl of imagesToDelete) {
                         const publicId = imageUrl.split('/').pop().split('.')[0];
                         await cloudinary.uploader.destroy(publicId);
                         announcement.media = announcement.media.filter(image => image !== imageUrl);
                    }
               }

               // Handle new image uploads
               if (newImages && newImages.length > 0) {
                    const uploadPromises = newImages.map(file =>
                         cloudinary.uploader.upload(file.path, { resource_type: "auto" })
                    );
                    const results = await Promise.all(uploadPromises);
                    const newMediaUrls = results.map(result => result.secure_url);
                    announcement.media.push(...newMediaUrls);
               }

               await announcement.save();
               res.redirect(`/announcements/${req.params.id}/edit`);
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to update images' });
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

     // GET: Show form to edit an existing announcement
     async showEditAnnouncementForm(req, res) {
          try {
               const announcement = await Announcement.findById(req.params.id);
               if (!announcement) return res.status(404).render('error', { message: 'Announcement not found' });

               res.render('marketplace/editAnnouncement', { announcement, title: 'Modifier l\'annonce' });
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to load announcement for editing' });
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
     }
};

module.exports = { marcheCanineController, ensureSellerAuthenticated };
