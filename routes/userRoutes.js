const express = require('express');
const router = express.Router();
const passport = require('passport');
// const upload = require('../config/multer'); // Multer config with Cloudinary
const Announcement = require('../models/announcement'); // Your announcement model

// GET: Homepage with Announcements Slider
router.get('/', async (req, res) => {
     try {
          const announcements = await Announcement.find().limit(6); // Get the latest 6 announcements
          res.render('user/index', { announcements });
     } catch (error) {
          console.error('Error fetching announcements:', error);
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


const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Set up multer for file uploads (saving locally)
const storage = multer.diskStorage({
     destination: (req, file, cb) => {
          const uploadDir = path.join(__dirname, '../uploads');
          if (!fs.existsSync(uploadDir)) {
               fs.mkdirSync(uploadDir);
          }
          cb(null, uploadDir);
     },
     filename: (req, file, cb) => {
          cb(null, Date.now() + path.extname(file.originalname));  // Original extension
     }
});

const upload = multer({ storage: storage });

router.post('/announcements/new', upload.array('images', 10), async (req, res) => {
     console.log('Image upload started');

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

          // Check if files were uploaded
          if (!req.files || req.files.length === 0) {
               return res.status(400).json({ success: false, message: 'No images uploaded' });
          }

          const imageUrls = [];

          // Convert uploaded images to WebP format and save them
          for (const file of req.files) {
               const localFilePath = path.join(__dirname, '../uploads', file.filename);
               const webpFilePath = path.join(__dirname, '../uploads', Date.now() + '.webp');

               // Convert to WebP using sharp
               await sharp(localFilePath)
                    .webp({ quality: 80 })
                    .toFile(webpFilePath);

               // Remove the original image
               fs.unlinkSync(localFilePath);

               // Save the WebP file URL
               imageUrls.push(`/uploads/${path.basename(webpFilePath)}`);
          }

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
               price: announcementType === 'sale' ? price : null,  // Only store price for sale announcements
               adoptionFee: announcementType === 'adoption' ? adoptionFee : null,  // Only store adoption fee for adoption
               location,
               images: imageUrls,  // Store WebP URLs
               whatsapp,
               email,
               user: req.user._id  // Link announcement to the logged-in user
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


module.exports = router;
