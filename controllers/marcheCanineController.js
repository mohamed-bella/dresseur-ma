const Seller = require('../models/seller');
const axios = require('axios');
const cheerio = require('cheerio');
const cloudinary = require('../config/cloudinary'); // Import Cloudinary configuration

// Helper function to clean up text
const cleanText = (text) => {
     return text
          .replace(/\n/g, ' ') // Replace newlines with spaces
          .replace(/\t/g, '')  // Remove tabs
          .replace(/\s+/g, ' ') // Remove excessive spaces
          .trim(); // Remove leading/trailing spaces
};

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

     // Helper function to clean up text
     cleanText(text) {
          return text
               .replace(/\n/g, ' ') // Replace newlines with spaces
               .replace(/\t/g, '') // Remove tabs
               .replace(/\s+/g, ' ') // Remove excessive spaces
               .trim(); // Remove leading/trailing spaces
     },

     // GET: Fetch all announcements (Home Page)
     async getAnnouncements(req, res) {
          const page = parseInt(req.query.page) || 1;
          const totalPages = 100; // Adjust this based on the actual total number of pages
          const url = `https://www.animalsouk.ma/Chiens?page=${page}`;

          try {
               const response = await axios.get(url);
               const html = response.data;
               const $ = cheerio.load(html);

               let scrapedData = [];

               // Scraping data from the website
               $('.card').each((index, element) => {
                    const title = cleanText($(element).find('.font-weight-light').text());
                    const price = cleanText($(element).find('.price').text());
                    const description = cleanText($(element).find('.text-secondary').text());
                    const link = $(element).attr('href');
                    let image = $(element).find('img').attr('src') || $(element).find('img').attr('data-src') || 'https://via.placeholder.com/150';

                    scrapedData.push({ title, price, description, image, link });
               });

               const sellers = await Seller.find().select('announcements');
               const announcements = sellers.reduce((acc, seller) => [...acc, ...seller.announcements], []);

               res.render('marketplace/announcements', { announcements, scrapedData, currentPage: page, totalPages, title: 'Tous les annonces' });
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to fetch announcements' });
          }
     },

     // GET: Show form to create a new announcement
     showNewAnnouncementForm(req, res) {
          res.render('marketplace/newAnnouncement', { title: 'Créer une nouvelle annonce' });
     },

     // POST: Add a new announcement (for sellers only)
     async addAnnouncement(req, res) {
          const { title, description, price, location, number } = req.body;

          if (!title || !description || !price || !location || !number) {
               return res.status(400).render('marketplace/newAnnouncement', { message: 'Please fill in all fields', title: 'Créer une nouvelle annonce' });
          }

          try {
               const seller = await Seller.findOne({ googleId: req.user.googleId });
               if (!seller) return res.status(404).json({ message: 'Seller not found' });

               const imageUrls = req.files.map(file => file.path);

               const newAnnouncement = { title, description, price, location, number, images: imageUrls, sellerDisplayName: seller.displayName, sellerEmail: seller.email };
               seller.announcements.push(newAnnouncement);

               await seller.save();
               res.redirect('/');
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to add announcement' });
          }
     },

     // GET: Show details of a specific announcement by ID
     async getAnnouncementById(req, res) {
          try {
               const seller = await Seller.findOne({ 'announcements._id': req.params.id });
               if (!seller) return res.status(404).render('error', { message: 'Announcement not found' });

               const announcement = seller.announcements.id(req.params.id);
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
          const { title, description, price, location, images } = req.body;

          try {
               const seller = await Seller.findOne({ googleId: req.user.googleId });
               const announcement = seller.announcements.id(req.params.id);

               if (!announcement) return res.status(404).render('error', { message: 'Announcement not found' });

               announcement.title = title || announcement.title;
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
     async getDogDetails(req, res) {
          try {
               const dogSlug = req.params.slug;
               const url = `https://www.animalsouk.ma/${dogSlug}`;
               const response = await axios.get(url);
               const html = response.data;
               const $ = cheerio.load(html);

               const name = this.cleanText($('.title').text().trim());
               const price = this.cleanText($('.pricenormal').text().trim());
               const description = this.cleanText($('.card-body p').text().trim());
               const dateAndLocation = this.cleanText($('i.fa-clock-o').parent().text());
               const location = this.cleanText($('i.fa-map-marker-alt').parent().text());
               const number = this.cleanText($('#number3').text().trim());

               let images = [];
               const mainImage = $('.container-slide img.card-img-top').attr('src');
               if (mainImage) images.push(mainImage);
               $('.thumb-list li img').each((index, element) => {
                    const thumbImage = $(element).attr('src');
                    if (thumbImage) images.push(thumbImage);
               });

               res.render('marketplace/announcementDetailsScraped', { name, price, description, number, dateAndLocation, images, title: 'chien' });
          } catch (err) {
               console.error('Error scraping dog details:', err);
               res.status(500).send('Error fetching dog details');
          }
     },

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
