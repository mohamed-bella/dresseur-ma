const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');
const winston = require('winston'); // Add a logger to capture errors

const storage = new CloudinaryStorage({
     cloudinary: cloudinary,
     params: async (req, file) => {
          try {
               const isImage = file.mimetype.startsWith('image/');

               const transformations = isImage ? [
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
               ] : [];

               return {
                    folder: 'announcements',
                    resource_type: 'auto',
                    transformation: transformations,
               };
          } catch (error) {
               winston.error("Cloudinary upload error:", error);  // Log the error
               throw error;
          }
     }
});

const upload = multer({ storage });

module.exports = upload;
