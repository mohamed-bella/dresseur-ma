const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary'); // Import the Cloudinary configuration

// Configure Cloudinary Storage
const storage = new CloudinaryStorage({
     cloudinary: cloudinary,
     params: {
          folder: 'dogs', // Folder in Cloudinary where images will be stored
          allowed_formats: ['jpg', 'png', 'jpeg'],
     },
});

const upload = multer({ storage });

module.exports = upload;
