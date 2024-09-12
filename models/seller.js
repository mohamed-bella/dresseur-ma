const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Check if the Seller model is already compiled
const Seller = mongoose.models.Seller || mongoose.model('Seller', new Schema({
     googleId: {
          type: String,
          required: true,
     },
     displayName: {
          type: String,
          required: true,
     },
     image: {
          type: String,
          required: true,
     },
     email: {
          type: String,
          required: true,
     },
     announcements: [{
          title: {
               type: String,
          },
          description: {
               type: String,
          },
          price: {
               type: Number,
          },
          location: {
               type: String,
          },
          number: {
               type: String,
          },
          images: [{
               type: String, // URLs for images
          }],
          sellerDisplayName: {
               type: String, // Seller's display name
               // required: true
          },
          sellerEmail: {
               type: String, // Seller's email
               // required: true
          },
          datePosted: {
               type: Date,
               default: Date.now,
          },
     }],
}));

module.exports = Seller;
