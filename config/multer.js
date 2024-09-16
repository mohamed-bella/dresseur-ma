const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary'); // Import the Cloudinary configuration


// Configure multer to store files on Cloudinary
const storage = new CloudinaryStorage({
     cloudinary: cloudinary,
     params: {
          folder: 'announcements', // Folder name in Cloudinary
          resource_type: 'auto', // This will allow both images and videos to be uploaded
     }
});

const upload = multer({ storage });


module.exports = upload;
