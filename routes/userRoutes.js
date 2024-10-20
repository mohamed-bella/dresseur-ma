const express = require('express');
const router = express.Router();
const passport = require('passport');
const multer = require('multer');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

const fs = require('fs');
const Article = require('../models/article');
const slugify = require('slugify');
const sharp = require('sharp');
// const upload = require('../config/multer'); // Multer config with Cloudinary
const Announcement = require('../models/announcement'); // Your announcement model



// Set up multer for file uploads (saving locally)
const storage = multer.memoryStorage();


const upload = multer({
     storage: storage, // Use memory storage to hold files in buffer
     limits: { fileSize: 10 * 1024 * 1024 } // Limit file size to 10MB (adjust as needed)
});
// GET: Homepage with Announcements and Articles Slider
router.get('/', async (req, res) => {
     try {
          // Fetch the latest 6 announcements
          const announcements = await Announcement.find().limit(6);

          // Fetch the latest 6 articles
          const articles = await Article.find().limit(6);

          // Render both announcements and articles to the homepage view
          res.render('user/index', {
               announcements,
               articles // Pass the articles to the view
          });
     } catch (error) {
          console.error('Error fetching announcements and articles:', error);
          res.status(500).send('Server Error');
     }
});
// GET ALL ARTICLES
router.get('/articles', async (req, res) => {
     try {
          // Fetch all articles
          const articles = await Article.find();

          // Get unique categories from articles
          const categories = [...new Set(articles.map(article => article.category.trim()))];

          // Extract tags from all articles, flatten them, and get unique, non-empty tags
          const allTags = articles.flatMap(article => article.tags);
          const topics = [...new Set(allTags.filter(tag => tag && tag.trim().length > 0))]; // Filter out empty tags

          // Render the page with articles, categories, and tags
          res.render('user/articles', { articles, categories, topics });
     } catch (error) {
          console.error('Error fetching articles:', error);
          res.status(500).send('Server Error');
     }
});



// GET: User Dashboard with Real Data
router.get('/dashboard', async (req, res) => {

     if (req.isAuthenticated()) {
          try {
               // Fetch user's announcements
               const announcements = await Announcement.find({ user: req.user._id });
               console.log(announcements)
               // Ensure announcements is always an array, even if it's empty
               const announcementsCount = announcements ? announcements.length : 0;

               // Handle cases where 'views' or 'responses' might be undefined
               const totalViews = announcements.reduce((acc, curr) => acc + (curr.views || 0), 0);
               const totalResponses = announcements.reduce((acc, curr) => acc + (curr.responses ? curr.responses.length : 0), 0);

               // Placeholder for user rating (can be dynamic later)
               const userRating = req.user.rating || 4.8; // Adjust as necessary, or fetch from a rating source

               // Example recent activity, can be fetched from a database or log source
               const recentActivity = [
                    { description: 'New message from Ahmed' },
                    { description: 'Your announcement "Berger Allemand" got 5 new views' },
                    { description: 'Password changed successfully' }
               ];

               // Render the dashboard with real data
               res.render('user/dashboard/dashboard', {
                    user: req.user,
                    announcementsCount,
                    totalViews,
                    totalResponses,
                    userRating,
                    recentAnnouncements: announcements.slice(0, 5), // Show the latest 5 announcements
                    recentActivity // Example recent activity, static for now
               });
          } catch (err) {
               console.error('Error loading dashboard:', err);
               res.status(500).send('Server Error');
          }
     } else {
          res.redirect('/');
     }
});


// Configure AWS S3 Client for SDK v3
const s3 = new S3Client({
     region: process.env.AWS_REGION,
     credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
     }
});

// POST route to create a new announcement
router.post('/announcements/new', upload.array('images', 10), async (req, res) => {
     console.log('Image upload to S3 started');

     try {
          // Extract form data
          const {
               description,
               announcementType,
               animalType,
               breed,
               age,
               gender,
               vaccination,
               sterilization,
               price,
               adoptionFee,
               location,
               whatsapp,
               email
          } = req.body;

          // Validate required fields
          if (!description || !announcementType || !animalType || !breed || !age || !gender || !location || !whatsapp) {
               return res.status(400).json({ success: false, message: 'All required fields must be filled out.' });
          }

          // Check if files were uploaded
          if (!req.files || req.files.length === 0) {
               return res.status(400).json({ success: false, message: 'No images uploaded' });
          }

          const imageUrls = [];

          // Convert uploaded images to WebP format and upload to S3
          for (const file of req.files) {
               try {
                    // Convert image buffer to WebP format
                    const buffer = await sharp(file.buffer)
                         .webp({ quality: 80 })
                         .toBuffer();

                    // Generate unique file name for WebP image
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    const key = `uploads/${uniqueSuffix}.webp`;

                    // Upload the WebP image to S3
                    const uploadParams = {
                         Bucket: process.env.AWS_S3_BUCKET_NAME,
                         Key: key,
                         Body: buffer,
                         ContentType: 'image/webp',
                         ACL: 'public-read' // Make the image public
                    };

                    const parallelUploads3 = new Upload({
                         client: s3,
                         params: uploadParams
                    });

                    const data = await parallelUploads3.done();
                    imageUrls.push(data.Location); // Store the URL of the uploaded image
               } catch (sharpError) {
                    console.error('Error processing image:', sharpError);
                    return res.status(500).json({ success: false, message: 'Image processing failed', error: sharpError });
               }
          }

          // Generate a slug for the announcement
          const date = new Date().toISOString().slice(0, 10);
          const typeInFrench = announcementType === 'sale' ? 'vendre' : 'adoption';
          const randomNum = Math.floor(1000 + Math.random() * 9000);
          const slug = slugify(`${breed}-${gender}-${typeInFrench}-${date}-${randomNum}-maroc`, { lower: true, strict: true });

          // Create a new announcement
          const newAnnouncement = new Announcement({
               description,
               announcementType,
               animalType,
               breed,
               age,
               gender,
               vaccination,
               sterilization,
               price: announcementType === 'sale' ? price : null,
               adoptionFee: announcementType === 'adoption' ? adoptionFee : null,
               location,
               images: imageUrls, // Store the S3 URLs
               whatsapp,
               email,
               slug,
               user: req.user._id // Link announcement to the logged-in user
          });

          // Save the announcement to the database
          await newAnnouncement.save();

          // Respond with success message
          res.json({ success: true, message: 'Announcement added successfully!' });
     } catch (err) {
          console.error('Error adding announcement:', err);
          res.status(500).json({ success: false, message: 'Internal Server Error' });
     }
});

// GET adopted dogs only
router.get('/adoptions', async (req, res) => {
     try {
          // Fetch only adopted dogs from the database
          const adoptedDogs = await Announcement.find({ announcementType: 'adopted' }); // assuming 'status' field in Dog model

          res.render('user/adoption', { announcements: adoptedDogs });
     } catch (error) {
          console.error('Error fetching adopted dogs:', error);
          res.status(500).send('Server Error');
     }
});



// POST: Handle New Announcement
// router.post('/announcements/new', upload.array('images', 10), async (req, res) => {
//      console.log('uploading image started ')
//      console.log(JSON.stringify(req.file, null, 2)); // Pretty-print the object
//      try {
//           // Extract form data
//           const {

//                description,
//                announcementType,
//                animalType,
//                breed,
//                age,
//                gender,
//                vaccination,
//                sterilization,
//                price,
//                adoptionFee,
//                location,
//                whatsapp,
//                email
//           } = req.body;

//           // Extract uploaded files from Cloudinary (returned by Multer)
//           const imageUrls = req.files.map(file => file.path);

//           // Create new announcement
//           const newAnnouncement = new Announcement({

//                description,
//                announcementType,
//                animalType,
//                breed,
//                age,
//                gender,
//                vaccination,
//                sterilization,
//                price: announcementType === 'sale' ? price : null, // Only store price for sale announcements
//                adoptionFee: announcementType === 'adoption' ? adoptionFee : null, // Only store adoption fee for adoption
//                location,
//                images: imageUrls, // Store Cloudinary URLs
//                whatsapp,
//                email,
//                user: req.user._id, // Link announcement to the logged-in user
//           });

//           // Save the announcement to the database
//           await newAnnouncement.save();

//           // Respond with success message in JSON format
//           res.json({ success: true, message: 'Announcement added successfully!' });

//      } catch (err) {
//           console.error('Error adding announcement:', err);


//           // Send error message in JSON format
//           res.status(500).json({ success: false, message: 'Internal Server Error' });
//      }
// });


// DELETE: Handle Deleting an Announcement
router.post('/announcements/:id/delete', async (req, res) => {
     try {
          // Find the announcement by ID and remove it
          await Announcement.findByIdAndDelete(req.params.id);
          req.flash('success', 'Announcement deleted successfully!');
          res.redirect('/dashboard'); // Redirect to the dashboard after deletion
     } catch (err) {
          console.error('Error deleting announcement:', err);
          req.flash('error', 'Error deleting announcement.');
          res.redirect('/dashboard');
     }
});


// GET: View an announcement by its ID
router.get('/announcement/:id', async (req, res) => {
     try {
          // Fetch the announcement from the database by ID
          const announcement = await Announcement.findById(req.params.id);
          if (!announcement) {
               return res.status(404).send('Announcement not found');
          }

          // Render the EJS template with the announcement data
          res.render('user/announcementDetail', { announcement });
     } catch (err) {
          console.error('Error fetching announcement:', err);
          res.status(500).send('Server Error');
     }
});




// =============================== ALL ANNOUNCEMENTS PAGE ROUTS ======================


// AJAX route for filtering announcements
// Route to fetch announcements with filtering (no AJAX)
// Route to fetch announcements with filtering (no AJAX)
// Route to fetch announcements with filtering (GET request)
router.get('/tous-les-annonces', async (req, res) => {
     try {
          // Destructure query parameters for filtering
          const { quickSearch, animalType, location, gender } = req.query;

          // Define filters object based on query params
          const filters = {};

          if (quickSearch) filters.breed = new RegExp(quickSearch, 'i');
          if (animalType) filters.animalType = animalType;
          if (location) filters.location = location;
          if (gender) filters.gender = gender;

          // Fetch filtered announcements (limit to latest 10)
          const announcements = await Announcement.find(filters)
               .sort({ createdAt: -1 }) // Sort by newest
               .limit(10);

          // Render the page with filtered announcements and filters
          res.render('user/allAnnouncements', {
               announcements,
               filters: req.query || {},  // Pass the filters back to repopulate the form
          });
     } catch (err) {
          console.error('Error fetching filtered announcements:', err);
          res.status(500).send('Internal Server Error');
     }
});
// Route for Privacy Policy Page
router.get('/politique-de-confidentialite', (req, res) => {
     res.render('user/privacyPolicy');
});
// Route for Terms of Use Page
router.get('/conditions-d-utilisation', (req, res) => {
     res.render('user/terms');
});

// Route for FAQ Page
router.get('/faq', (req, res) => {
     res.render('user/faq');
});


// Route for contact
router.get('/contact', (req, res) => {
     res.render('user/contact', { formData: {} });
});



module.exports = router;
