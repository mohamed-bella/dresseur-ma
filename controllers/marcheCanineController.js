const Seller = require('../models/seller');
const axios = require('axios');
const cheerio = require('cheerio');
const cloudinary = require('../config/cloudinary'); // Import Cloudinary configuration

// Middleware to ensure the user is authenticated as a seller
const ensureSellerAuthenticated = async (req, res, next) => {
     if (req.isAuthenticated() && req.user.googleId) {
          try {
               const seller = await Seller.findOne({ googleId: req.user.googleId });

               if (!seller) {
                    return res.status(403).render('error', { message: 'Unauthorized access. Seller not found.' });
               }




               // Proceed to the next middleware or route if the seller is authenticated
               next();
          } catch (err) {
               console.error(err);
               return res.status(500).render('error', { message: 'Server error during seller authentication.' });
          }
     } else {
          // Redirect to Google login if the user is not authenticated
          res.redirect('/auth/google');
     }
};
const marcheCanineController = {
     // GET: Fetch all announcements (Home Page)
     async getAnnouncements(req, res) {
          const page = parseInt(req.query.page) || 1;  // Get current page or default to 1
          const totalPages = 100;  // Adjust this based on the actual total number of pages

          try {
               // Helper function to clean up text
               const cleanText = (text) => {
                    return text
                         .replace(/\n/g, ' ')  // Replace newlines with spaces
                         .replace(/\t/g, '')   // Remove tabs
                         .replace(/\s+/g, ' ') // Remove excessive spaces
                         .trim();              // Remove leading/trailing spaces
               };

               // URL to scrape (includes the page number)
               const url = `https://www.animalsouk.ma/Chiens?page=${page}`;
               const response = await axios.get(url);
               const html = response.data;
               const $ = cheerio.load(html);

               // Array to hold scraped data
               let scrapedData = [];

               // Iterate over each `.card` to get individual announcement data
               $('.card').each((index, element) => {
                    // Select elements relative to the `.card` element
                    const title = cleanText($(element).find('.font-weight-light').text());
                    const price = cleanText($(element).find('.price').text());
                    const description = cleanText($(element).find('.text-secondary').text());
                    const link = $(element).attr('href');  // Ensure the correct selector for the link

                    // Try to get the 'src' attribute of the image
                    let image = $(element).find('img').attr('src');

                    // Check if the image is lazy-loaded (e.g., 'data-src' or 'data-original')
                    if (!image) {
                         image = $(element).find('img').attr('data-src') || $(element).find('img').attr('data-original');
                    }

                    // Fallback to placeholder image if no image found
                    if (!image) {
                         image = 'https://via.placeholder.com/150';
                    }

                    // Push scraped data into the array
                    scrapedData.push({
                         title,
                         price,
                         description,
                         image,
                         link
                    });
               });


               // Get seller announcements from the database
               const sellers = await Seller.find().select('announcements');
               const announcements = sellers.reduce((acc, seller) => {
                    return [...acc, ...seller.announcements];
               }, []);

               // Render the home.ejs view, passing the announcements and scraped data
               res.render('marketplace/announcements', {
                    announcements,  // Announcements from the database
                    title: 'Tous les annonces',
                    scrapedData,    // All scraped data
                    currentPage: page,
                    totalPages
               });
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to fetch announcements' });
          }
     },

     // GET: Show form to create a new announcement
     showNewAnnouncementForm(req, res) {
          // Render the newAnnouncement.ejs view
          res.render('marketplace/newAnnouncement', { title: 'Créer une nouvelle annonce' });
     },

     // POST: Add a new announcement (only sellers)
     async addAnnouncement(req, res) {
          const { title, description, price, location, number, images } = req.body;

          // Basic validation
          if (!title || !description || !price || !location || !number) {
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

               // Cloudinary URLs will be stored here
               const imageUrls = [];

               // Iterate over the uploaded files and extract their Cloudinary URLs
               for (let file of req.files) {
                    imageUrls.push(file.path); // `file.path` contains the URL from Cloudinary
               }


               // Add the new announcement with image URLs
               const newAnnouncement = {
                    title,
                    description,
                    price,
                    location,
                    number,
                    images: imageUrls, // Store Cloudinary image URLs
                    sellerDisplayName: seller.displayName,
                    sellerEmail: seller.email,
               };



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
               if (!seller) {
                    return res.status(404).render('error', { message: 'Announcement not found' });
               }

               const announcement = seller.announcements.id(req.params.id);
               // Render the announcementDetail.ejs view
               res.render('marketplace/announcementDetail', { announcement, title: 'Détails de l\'annonce' });
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to retrieve announcement details' });
          }
     },
     // Controller function to handle scraping specific dog pages
     async getDogDetails(req, res) {
          try {

               // Clean The Scraped Text
               const cleanText = (text) => {
                    return text
                         .replace(/\n/g, ' ') // Replace newlines with spaces
                         .replace(/\t/g, '')  // Remove tabs
                         .replace(/\s+/g, ' ') // Remove excessive spaces
                         .trim(); // Remove leading/trailing spaces
               };
               // Extract the dynamic part of the URL (e.g., 'Bichon-maltais-11879')
               const dogSlug = req.params.slug;

               // Construct the URL for scraping from animalsouk.ma
               const url = `https://www.animalsouk.ma/${dogSlug}`;

               // Make an HTTP request to fetch the HTML content of the page
               const response = await axios.get(url);
               const html = response.data;
               const $ = cheerio.load(html);

               // Extract the relevant information (example of scraping)
               const name = cleanText($('.title').text().trim());
               const price = cleanText($('.pricenormal').text().trim());
               const description = cleanText($('.card-body p').text().trim());
               const dateAndLocation = cleanText($('i.fa-clock-o').parent().text());
               const location = cleanText($('i.fa-map-marker-alt').parent().text());
               const number = cleanText($('#number3').text().trim());
               // Scrape images (if available)
               let images = [];

               // Scrape the main image
               const mainImage = $('.container-slide img.card-img-top').attr('src');
               if (mainImage) {
                    images.push(mainImage);
               }

               // Scrape all thumbnail images
               $('.thumb-list li img').each((index, element) => {
                    const thumbImage = $(element).attr('src');
                    if (thumbImage) {
                         images.push(thumbImage);
                    }
               });

               const scrapedData = [
                    name,
                    price,
                    description,
                    number,
                    dateAndLocation,
                    images
               ]
               // console.log(scrapedData);

               // Render a new view and pass the scraped data
               res.render('marketplace/announcementDetailsScraped', {
                    title: 'chien',
                    // scrapedData
                    name,
                    price,
                    description,
                    number,
                    dateAndLocation,
                    images

               });


          } catch (err) {
               console.error('Error scraping dog details:', err);
               res.status(500).send('Error fetching dog details');
          }
     },

     // GET: Show form to edit an existing announcement
     async showEditAnnouncementForm(req, res) {
          try {
               const seller = await Seller.findOne({ googleId: req.user.googleId });
               const announcement = seller.announcements.id(req.params.id);

               if (!announcement) {
                    return res.status(404).render('error', { message: 'Announcement not found' });
               }

               // Render the editAnnouncement.ejs view
               res.render('marketplace/editAnnouncement', { announcement, title: 'Modifier l\'annonce' });
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to load announcement for editing' });
          }
     },

     // PUT: Update an existing announcement
     async updateAnnouncement(req, res) {
          const { title, description, price, images, location } = req.body;

          try {
               const seller = await Seller.findOne({ googleId: req.user.googleId });
               const announcement = seller.announcements.id(req.params.id);

               if (!announcement) {
                    return res.status(404).render('error', { message: 'Announcement not found' });
               }

               // Update announcement details
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
          const newImages = req.files; // Get the newly uploaded files

          try {
               const seller = await Seller.findOne({ googleId: req.user.googleId });
               const announcement = seller.announcements.id(req.params.id);

               if (!announcement) {
                    return res.status(404).render('error', { message: 'Announcement not found' });
               }

               // Handle image deletions
               if (deletedImages) {
                    const imagesToDelete = deletedImages.split(',');
                    for (let imageUrl of imagesToDelete) {
                         const publicId = imageUrl.split('/').pop().split('.')[0];
                         await cloudinary.uploader.destroy(publicId); // Delete from Cloudinary
                         // Remove from the announcement's images array
                         announcement.images = announcement.images.filter(image => image !== imageUrl);
                    }
               }

               // Handle new image uploads
               if (newImages && newImages.length > 0) {
                    for (let file of newImages) {
                         announcement.images.push(file.path); // Cloudinary URL from Multer
                    }
               }

               // Save the updated announcement
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

               console.log(req.params.id)

               if (!announcement) {
                    return res.status(404).render('error', { message: 'Announcement not found' });
               }

               announcement.remove();
               await seller.save();

               res.redirect('/');
          } catch (err) {
               console.error(err);
               res.status(500).render('error', { message: 'Failed to delete announcement' });
          }
     },

     // GET: Filter announcements based on criteria (price, location, etc.)
     async filterAnnouncements(req, res) {
          const { location, price, type } = req.query;

          try {
               const sellers = await Seller.find().select('announcements');
               let announcements = sellers.reduce((acc, seller) => [...acc, ...seller.announcements], []);

               // Apply filters
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

module.exports = {
     marcheCanineController,
     ensureSellerAuthenticated
};
