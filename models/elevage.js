const mongoose = require('mongoose');

const ElevageSchema = new mongoose.Schema({
     name: {
          type: String,
          required: true,
          trim: true, // Ensures there is no extra whitespace
          maxlength: 100 // Limit the length of the name
     },
     description: {
          type: String,
          required: true,
          maxlength: 2000, // Set a reasonable limit for the description
          trim: true
     },
     location: {
          type: String,
          required: true,
          trim: true
     },
     owner: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Seller', // Reference to the Seller who owns the élevage
          required: true
     },
     // Separate fields for profile and cover images
     profileImage: {
          type: String, // URL for the profile image (e.g., hosted on Cloudinary)
          required: true,
          trim: true
     },
     coverImage: {
          type: String, // URL for the cover image (e.g., hosted on Cloudinary)
          required: true,
          trim: true
     },
     contactNumber: {
          type: String, // Store the contact number of the élevage for potential clients
          required: false, // Optional field
          maxlength: 15
     },
     website: {
          type: String, // Optional website URL for the élevage
          required: false,
          trim: true
     },
     createdAt: {
          type: Date,
          default: Date.now
     }
});

const Elevage = mongoose.model('Elevage', ElevageSchema);

module.exports = Elevage;
