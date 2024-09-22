// controllers/announcementController.js

const Announcement = require('../models/announcement');
const Seller = require('../models/seller');

exports.createAnnouncement = async (req, res) => {
     try {
          const { breed, description, price, location, number, media } = req.body;
          const sellerId = req.user._id;  // Assuming logged in seller

          const newAnnouncement = new Announcement({
               breed,
               description,
               price,
               location,
               number,
               media,
               seller: sellerId
          });

          await newAnnouncement.save();
          res.status(201).json({ message: 'Announcement created successfully' });
     } catch (error) {
          console.error('Error creating announcement:', error);
          res.status(500).send('Error creating announcement');
     }
};

exports.getAllAnnouncements = async (req, res) => {
     try {
          const announcements = await Announcement.find().populate('seller');
          res.render('marketplace/announcements', { announcements });
     } catch (error) {
          console.error('Error fetching announcements:', error);
          res.status(500).send('Error fetching announcements');
     }
};
