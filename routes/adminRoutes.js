const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Admin = require('../models/admin'); // Assuming you have an Admin model
const Article = require('../models/article'); // Assuming you have an Article model
require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const Event = require('../models/event');
const User = require('../models/user');
const fs = require('fs');
const { SearchUsersCommand } = require('@aws-sdk/client-rekognition');

// S3 Client initialization
const s3 = new S3Client({
     region: process.env.AWS_REGION,
     credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
     }
});

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({
     storage,
     limits: {
          fileSize: 5 * 1024 * 1024, // 5MB
          files: 1
     },
     fileFilter: (req, file, cb) => {
          if (!file.mimetype.startsWith('image/')) {
               return cb(new Error('Only images are allowed'));
          }
          cb(null, true);
     }
}).single('image');

// Image processing function
const processImage = async (buffer) => {
     return await sharp(buffer)
          .resize(800, 600, {
               fit: 'cover',
               withoutEnlargement: true
          })
          .webp({ quality: 80 })
          .toBuffer();
};

// S3 upload function
const uploadToS3 = async (fileBuffer, key) => {
     const params = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key,
          Body: fileBuffer,
          ContentType: 'image/webp',
          ACL: 'public-read'
     };

     await s3.send(new PutObjectCommand(params));
     return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

const isAdmin = (req, res, next) => {
     if (!req.session.isAuthenticated) {
          return res.redirect('/admin/login');
     }
     next()
}
// Handle Admin Login
router.get('/admin/login', (req, res) => {
     res.render('admin/login');
});

require('dotenv').config(); // Load environment variables from .env


// Admin Login Route
router.post('/admin/login', async (req, res) => {
     const { username, password } = req.body;

     try {
          // Check if the username matches the one in the .env file
          if (username !== process.env.ADMIN_USERNAME && username !== process.env.AUTHOR_USERNAME) {
               req.flash('error', 'Invalid username');
               return res.redirect('/admin/login');
          }

          // If the username is valid, check the password
          const envPassword = username === process.env.ADMIN_USERNAME ? process.env.ADMIN_PASSWORD : process.env.AUTHOR_PASSWORD;

          // Compare the password (if using plain text passwords in .env, otherwise you can use bcrypt for hashing)
          const isMatch = password === envPassword;

          if (!isMatch) {
               req.flash('error', 'Invalid password');
               return res.redirect('/admin/login');
          }

          // Set session and cookies based on the role
          req.session.isAuthenticated = true;
          req.session.adminRole = username === process.env.ADMIN_USERNAME ? 'admin' : 'author'; // Set the role based on the username

          // Redirect to the appropriate dashboard
          res.redirect('/admin/dashboard');
     } catch (err) {
          console.error('Error during admin login:', err);
          res.status(500).send('Server Error');
     }
});


// Dashboard Route
router.get('/admin/dashboard', async (req, res) => {
     if (!req.session.isAuthenticated) {
          return res.redirect('/admin/login');
     }

     try {
          const users = await User.find()
               .select('displayName email profileImage isVerified badges ndressilikScore')
               .sort('-createdAt');
          const articles = await Article.find();
          // Only allow admins to view the full dashboard
          if (req.session.adminRole === 'admin' || req.session.adminRole === 'author') {
               return res.render('admin/dashboard', { role: 'admin', articles, users });
          } else {
               return res.redirect('/admin/login');
          }
     } catch (error) {
          console.error('Error fetching dashboard data:', error);
          res.status(500).send('Server Error');
     }
});

module.exports = router;


// Logout Route
router.get('/admin/logout', (req, res) => {
     req.session.destroy((err) => {
          if (err) {
               return res.status(500).send('Error during logout');
          }
          res.redirect('/admin/login');
     });
});


// GET all events
router.get('/admin/events', async (req, res) => {
     try {
          const events = await Event.find();
          res.render('admin/events/list', { events });
     } catch (err) {
          console.error(err);
          res.status(500).send('Server Error');
     }
});

// GET create event form
router.get('/admin/events/create', (req, res) => {
     res.render('admin/events/create');
});

// POST create event
router.post('/admin/events', upload, async (req, res) => {
     try {
          const { title, description, location, date, time, category, organizer, contactEmail, contactPhone, website, ticketPrice, ticketLink } = req.body;

          let imageUrl = null;

          if (req.file) {
               const processedImage = await processImage(req.file.buffer);
               const uniqueFilename = `events/${Date.now()}-${path.basename(req.file.originalname)}`;
               imageUrl = await uploadToS3(processedImage, uniqueFilename);
          }

          const event = new Event({
               title,
               description,
               location,
               date,
               time,
               image: imageUrl,
               category,
               organizer,
               contactEmail,
               contactPhone,
               website,
               ticketPrice,
               ticketLink,
          });

          await event.save();
          res.redirect('/admin/events');
     } catch (err) {
          console.error(err);
          res.status(500).send('Server Error');
     }
});

// GET edit event form
router.get('/admin/events/:id/edit', async (req, res) => {
     try {
          const event = await Event.findById(req.params.id);
          res.render('admin/events/edit', { event });
     } catch (err) {
          console.error(err);
          res.status(500).send('Server Error');
     }
});

// PUT update event
router.put('/admin/events/:id', upload, async (req, res) => {
     try {
          const { title, description, location, date, time, category, organizer, contactEmail, contactPhone, website, ticketPrice, ticketLink } = req.body;

          const event = await Event.findById(req.params.id);
          event.title = title;
          event.description = description;
          event.location = location;
          event.date = date;
          event.time = time;
          event.category = category;
          event.organizer = organizer;
          event.contactEmail = contactEmail;
          event.contactPhone = contactPhone;
          event.website = website;
          event.ticketPrice = ticketPrice;
          event.ticketLink = ticketLink;

          if (req.file) {
               const processedImage = await processImage(req.file.buffer);
               const uniqueFilename = `events/${Date.now()}-${path.basename(req.file.originalname)}`;
               event.image = await uploadToS3(processedImage, uniqueFilename);
          }

          await event.save();
          res.redirect('/admin/events');
     } catch (err) {
          console.error(err);
          res.status(500).send('Server Error');
     }
});

// DELETE event
router.delete('/admin/events/:id', async (req, res) => {
     try {
          await Event.findByIdAndDelete(req.params.id);
          res.redirect('/admin/events');
     } catch (err) {
          console.error(err);
          res.status(500).send('Server Error');
     }
});


// Get User Data
router.get('/admin/users/:userId', isAdmin, async (req, res) => {
     try {
          const { userId } = req.params;
          const user = await User.findById(userId).select('-password'); // Exclude password if any
          if (!user) {
               return res.status(404).json({ error: 'User not found' });
          }
          res.json(user);
     } catch (error) {
          console.error('Error fetching user:', error);
          res.status(500).json({ error: 'Server error' });
     }
});
// Delete User
router.delete('/admin/users/:userId/delete', isAdmin, async (req, res) => {
     try {
          const { userId } = req.params;

          await User.findByIdAndDelete(userId);
          res.json({ success: true });
     } catch (error) {
          console.error('Error deleting user:', error);
          res.status(500).json({ error: 'Server error' });
     }
});
router.post('/admin/users/:userId/update', isAdmin, async (req, res) => {
     try {
          const { userId } = req.params;
          const { badgeTypes, trustScore, status } = req.body;

          const user = await User.findById(userId);
          if (!user) {
               return res.status(404).json({ error: 'User not found' });
          }

          // Handle Multiple Badges
          if (badgeTypes && Array.isArray(badgeTypes)) {
               // Remove Badges Not in New Selection
               user.badges = user.badges.filter(badge =>
                    badgeTypes.includes(badge.type)
               );

               // Add New Badges That Don't Exist
               badgeTypes.forEach(badgeType => {
                    if (!user.badges.find(b => b.type === badgeType)) {
                         user.badges.push({
                              type: badgeType,
                              earnedAt: new Date()
                         });
                    }
               });
          }

          // Update Trust Score
          if (trustScore !== undefined) {
               user.ndressilikScore = Math.min(Math.max(0, parseInt(trustScore)), 100);
          }

          // Update User Status
          if (status && ['pending', 'active', 'suspended'].includes(status)) {
               user.status = status;
          }

          await user.save();
          res.json({ success: true });
     } catch (error) {
          console.error('Error updating user:', error);
          res.status(500).json({ error: 'Server error' });
     }
});

// Verify user
router.post('/admin/users/:userId/verify', isAdmin, async (req, res) => {
     try {
          const { userId } = req.params;

          const user = await User.findById(userId);
          if (!user) {
               return res.status(404).json({ error: 'User not found' });
          }

          user.isVerified = true;

          // Add verified-professional badge if not present
          if (!user.badges.find(b => b.type === 'verified-professional')) {
               user.badges.push({
                    type: 'verified-professional',
                    earnedAt: new Date()
               });
          }

          await user.save();
          res.json({ success: true });

     } catch (error) {
          console.error('Error verifying user:', error);
          res.status(500).json({ error: 'Server error' });
     }
});



// Import the email service
const { sendBroadcastEmail } = require('../utils/emails');

// Route to render broadcast form in the admin dashboard
router.get('/admin/broadcast', isAdmin, (req, res) => {
     res.render('admin/broadcast'); // Render a form for broadcast (e.g., with subject and message fields)
});

// Route to handle the broadcast email submission
router.post('/admin/broadcast', isAdmin, async (req, res) => {
     const { subject, message } = req.body;

     try {
          // Get all user emails from the database
          const users = await User.find().select('email');
          const emails = users.map(user => user.email); // Extract emails

          // Send broadcast email to all users
          await sendBroadcastEmail(emails, subject, message);

          // Return success response
          res.json({ success: true, message: 'Broadcast email sent successfully to all users.' });
     } catch (error) {
          console.error('Error sending broadcast email:', error);
          res.status(500).json({ success: false, message: 'Error sending broadcast email.' });
     }
});



module.exports = router;
