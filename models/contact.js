// models/Contact.js
const mongoose = require('mongoose');

// Define the schema for the contact form
const contactSchema = new mongoose.Schema({
     name: {
          type: String,
          required: [true, 'Le nom est requis'],
          trim: true
     },
     email: {
          type: String,
          required: [true, 'L\'email est requis'],
          trim: true,
          match: [/.+\@.+\..+/, 'Veuillez entrer un email valide']
     },
     message: {
          type: String,
          required: [true, 'Le message est requis'],
          trim: true
     },
     createdAt: {
          type: Date,
          default: Date.now
     }
});

// Create the Contact model
module.exports = mongoose.model('Contact', contactSchema);
