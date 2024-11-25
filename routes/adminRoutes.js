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
const { sendBroadcastEmail, sendEmail } = require('../utils/emails');
const cookieParser = require('cookie-parser');
router.use(cookieParser()); // Middleware for handling cookies
const {adminAuth, ensureAdmin} = require('../middlewares/auth')
require('dotenv').config(); // Load environment variables from .env



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




router.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Validate credentials
        const validUsernames = [process.env.ADMIN_USERNAME, process.env.AUTHOR_USERNAME];
        const validPasswords = {
            [process.env.ADMIN_USERNAME]: process.env.ADMIN_PASSWORD,
            [process.env.AUTHOR_USERNAME]: process.env.AUTHOR_PASSWORD,
        };

        if (!validUsernames.includes(username) || password !== validPasswords[username]) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/admin/login');
        }

        // Set cookies for 9 days
        res.cookie('isAuthenticated', true, { maxAge: 9 * 24 * 60 * 60 * 1000, httpOnly: true });
        res.cookie('adminRole', username === process.env.ADMIN_USERNAME ? 'admin' : 'author', { maxAge: 9 * 24 * 60 * 60 * 1000 });

        // Redirect to the dashboard
        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send('Server Error');
    }
});



router.get('/admin', adminAuth, (req, res) => {
     res.redirect('/admin/login');
 });
 
 router.get('/admin/login', adminAuth, (req, res) => {
     res.render('admin/login');
 });
 
 router.get('/admin/dashboard', ensureAdmin, async (req, res) => {
     try {
         const users = await User.find().select('displayName email profileImage isVerified badges ndressilikScore').sort('-createdAt');
         const articles = await Article.find();
         res.render('admin/dashboard', { role: req.cookies.adminRole, users, articles });
     } catch (err) {
         console.error('Error fetching dashboard:', err);
         res.status(500).send('Server Error');
     }
 });
 




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
router.get('/admin/users/:userId', ensureAdmin, async (req, res) => {
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
router.delete('/admin/users/:userId/delete',ensureAdmin, async (req, res) => {
     try {
          const { userId } = req.params;

          await User.findByIdAndDelete(userId);
          res.json({ success: true });
     } catch (error) {
          console.error('Error deleting user:', error);
          res.status(500).json({ error: 'Server error' });
     }
});
router.post('/admin/users/:userId/update', ensureAdmin, async (req, res) => {
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
router.post('/admin/users/:userId/verify', ensureAdmin, async (req, res) => {
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
// Email templates
const EMAIL_TEMPLATES = {
    welcome: {
        name: 'Welcome Email',
        subject: 'Welcome to our platform!',
        content: `
            Hi {{name}},
            Welcome to our platform! We're excited to have you here.
            Best regards,
            The Team
        `
    },
    newsletter: {
        name: 'Monthly Newsletter',
        subject: 'Monthly Newsletter - {{month}}',
        content: `
            Dear {{name}},
            Here are our latest updates for {{month}}.
            {{content}}
            Best regards,
            The Team
        `
    },
    promotion: {
        name: 'Special Promotion',
        subject: 'Special Offer for You!',
        content: `
            Hello {{name}},
            We have a special offer just for you!
            {{content}}
            Best regards,
            The Team
        `
    }
};

// Route to render broadcast form in the admin dashboard
router.get('/admin/broadcast', ensureAdmin, async (req, res) => {
    try {
        const users = await User.find().select('email displayName customFields');
        res.render('admin/broadcast', { 
            users,
            templates: EMAIL_TEMPLATES
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Error fetching users.');
    }
});

// Route to handle sending an email to a single user
router.post('/admin/send-email', ensureAdmin, async (req, res) => {
    const { email, subject, message, template, customFields } = req.body;

    if (!email || !subject || (!message && !template)) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    try {
        const user = await User.findOne({ email });
        let finalMessage = message;

        if (template && EMAIL_TEMPLATES[template]) {
            finalMessage = EMAIL_TEMPLATES[template].content
                .replace('{{name}}', user.name || 'Valued Customer')
                .replace('{{content}}', message)
                .replace('{{month}}', new Date().toLocaleString('default', { month: 'long' }));

            // Replace custom fields
            if (customFields) {
                Object.entries(customFields).forEach(([key, value]) => {
                    finalMessage = finalMessage.replace(`{{${key}}}`, value);
                });
            }
        }

        await sendEmail(email, subject, finalMessage);
        res.json({ success: true });
    } catch (error) {
        console.error(`Error sending email to ${email}:`, error);
        res.status(500).json({ success: false, message: `Error sending email to ${email}` });
    }
});


module.exports = router;
