const Seller = require('../models/seller');
const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');

const cloudinary = require('../config/cloudinary'); // Import Cloudinary configuration

// Helper function to clean up text
// const cleanText = (text) => {
//      return text
//           .replace(/\n/g, ' ') // Replace newlines with spaces
//           .replace(/\t/g, '')  // Remove tabs
//           .replace(/\s+/g, ' ') // Remove excessive spaces
//           .trim(); // Remove leading/trailing spaces
// };

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

     // GET: Fetch all announcements (Home Page)
     async getAnnouncements(req, res) {
          try {
               const sellers = await Seller.find().select('announcements');

               // Combine and filter announcements with approved status
               const announcements = sellers.reduce((acc, seller) => [
                    ...acc,
                    ...seller.announcements.filter(a => a.status === 'approved')
               ], []);

               // Sort announcements by datePosted (newest first)
               announcements.sort((a, b) => new Date(b.datePosted) - new Date(a.datePosted));

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

          if (!breed || !description || !price || !location || !number) {
               return res.status(400).render('marketplace/newAnnouncement', { message: 'Please fill in all fields', title: 'Créer une nouvelle annonce' });
          }

          try {
               const seller = await Seller.findOne({ googleId: req.user.googleId });
               if (!seller) return res.status(404).json({ message: 'Seller not found' });

               // Handle file uploads (images and videos)
               const mediaUrls = req.files.map(file => file.path); // URLs for both images and videos from Cloudinary

               const newAnnouncement = {
                    breed,
                    description,
                    price,
                    location,
                    number,
                    media: mediaUrls, // Store media (images/videos) in an array
                    sellerDisplayName: seller.displayName,
                    sellerEmail: seller.email
               };

               seller.announcements.push(newAnnouncement);
               req.flash('success', "en Attendant l'Aprouve");

               await seller.save();
               res.redirect('/announcements');
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to add announcement' });
          }
     },


     // GET: Show details of a specific announcement by ID
     async getAnnouncementById(req, res) {
          try {
               // Validate if req.params.id is a valid ObjectId
               if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                    return res.status(400).render('error', { message: 'Invalid announcement ID' });
               }

               // Find the seller that has the announcement with the provided ID
               const seller = await Seller.findOne({ 'announcements._id': req.params.id });

               // If no seller or announcement is found
               if (!seller) {
                    return res.status(404).render('error', { message: 'Announcement not found' });
               }

               // Find the announcement by its ID within the seller's announcements
               const announcement = seller.announcements.id(req.params.id);
               if (!announcement) {
                    return res.status(404).render('error', { message: 'Announcement not found' });
               }

               // Render the announcement details
               res.render('marketplace/announcementDetail', { announcement, title: 'Détails de l\'annonce' });
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to retrieve announcement details' });
          }
     },

     // GET: Show form to edit an existing announcement
     async showEditAnnouncementForm(req, res) {
          try {
               const seller = await Seller.findOne({ googleId: req.user.googleId });
               const announcement = seller.announcements.id(req.params.id);

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
               const seller = await Seller.findOne({ googleId: req.user.googleId });
               const announcement = seller.announcements.id(req.params.id);

               if (!announcement) return res.status(404).render('error', { message: 'Announcement not found' });

               announcement.breed = breed || announcement.breed;
               announcement.description = description || announcement.description;
               announcement.price = price || announcement.price;
               announcement.location = location || announcement.location;
               announcement.images = images ? images.split(',') : announcement.images;

               await seller.save();
               res.redirect('/');
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to update announcement' });
          }
     },

     // POST: Add/Delete Images for an Announcement
     async updateAnnouncementImages(req, res) {
          const { deletedImages } = req.body;
          const newImages = req.files;

          try {
               const seller = await Seller.findOne({ googleId: req.user.googleId });
               const announcement = seller.announcements.id(req.params.id);

               if (!announcement) return res.status(404).render('error', { message: 'Announcement not found' });

               // Handle image deletions
               if (deletedImages) {
                    const imagesToDelete = deletedImages.split(',');
                    for (let imageUrl of imagesToDelete) {
                         const publicId = imageUrl.split('/').pop().split('.')[0];
                         await cloudinary.uploader.destroy(publicId);
                         announcement.images = announcement.images.filter(image => image !== imageUrl);
                    }
               }

               // Handle new image uploads
               if (newImages && newImages.length > 0) {
                    newImages.forEach(file => announcement.images.push(file.path));
               }

               await seller.save();
               res.redirect(`/seller/announcements/${req.params.id}/edit`);
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to update images' });
          }
     },

     // DELETE: Remove an existing announcement
     async deleteAnnouncement(req, res) {
          try {
               const seller = await Seller.findOne({ googleId: req.user.googleId });
               const announcement = seller.announcements.id(req.params.id);

               if (!announcement) return res.status(404).render('error', { message: 'Announcement not found' });

               announcement.remove();
               await seller.save();

               res.redirect('/');
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to delete announcement' });
          }
     },

     // Controller function to handle scraping specific dog pages

     // GET: Filter announcements based on criteria (price, location, etc.)
     async filterAnnouncements(req, res) {
          const { location, price, type } = req.query;

          try {
               const sellers = await Seller.find().select('announcements');
               let announcements = sellers.reduce((acc, seller) => [...acc, ...seller.announcements], []);

               if (location) announcements = announcements.filter(a => a.location.toLowerCase().includes(location.toLowerCase()));
               if (price) announcements = announcements.filter(a => a.price <= price);
               if (type) announcements = announcements.filter(a => a.type === type);

               res.render('marketplace/announcements', { announcements, title: 'Annonces filtrées' });
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to filter announcements' });
          }
     }

};

module.exports = { marcheCanineController, ensureSellerAuthenticated };
