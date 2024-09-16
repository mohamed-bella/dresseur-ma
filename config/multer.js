const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary'); // Import the Cloudinary configuration


// Configure multer to store files on Cloudinary
const storage = new CloudinaryStorage({
     cloudinary: cloudinary,
     params: {
          folder: 'announcements', // Folder name in Cloudinary
          resource_type: 'auto', // This will allow both images and videos to be uploaded
          transformation: [
               {
                    overlay: {
                         font_family: "Arial",
                         font_size: 80, // Increase font size for a bigger watermark
                         font_weight: "bold",
                         text: "Ndressilik"
                    },
                    gravity: "center", // Center the watermark
                    opacity: 50, // Adjust opacity as needed
                    x: 0, // No horizontal offset
                    y: 0  // No vertical offset
               }
          ]

     }
});

const upload = multer({ storage });


module.exports = upload;
