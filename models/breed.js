// models/Breed.js
const mongoose = require('mongoose');

const breedSchema = new mongoose.Schema({
     breedId: {
          type: String,
          required: true,
          unique: true
     },
     breedName: {
          type: String,
          required: true
     },
     breedDescription: {
          type: String,
          required: true
     },
     breedCaracteristiques: {
          type: String
     },
     breedImage: {
          type: String
     },
     breedHtmlContent: {
          type: String // Field to store the raw HTML content
     },
     lastUpdated: {
          type: Date,
          default: Date.now
     }
});

module.exports = mongoose.model('Breed', breedSchema);
