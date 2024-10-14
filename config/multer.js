const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary'); // Import the Cloudinary configuration


// Configure multer to store files on Cloudinary
const storage = new CloudinaryStorage({
     cloudinary: cloudinary,
     params: async (req, file) => {
          const isImage = file.mimetype.startsWith('image/');

          // Apply transformations only if the file is an image
          const transformations = isImage
               ? [
                    {
                         overlay: {
                              font_family: "Arial",
                              font_size: 50,
                              font_weight: "bold",
                              text: "Ndressilik"
                         },
                         gravity: "center",
                         opacity: 30,
                         x: 0,
                         y: 0
                    }
               ]
               : [];

          return {
               folder: 'announcements',
               resource_type: 'auto',
               transformation: transformations,
          };
     }
});


const upload = multer({ storage });


module.exports = upload;
