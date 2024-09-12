// models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
     trainer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
     },
     email: {
          type: String,
          required: true
     },
     rating: {
          type: Number,
          min: 1,
          max: 5,
          required: true
     },
     review: {
          type: String,
          required: true
     },
     status: {
          type: Boolean,
          default: false
     },
     createdAt: {
          type: Date,
          default: Date.now
     },

});

module.exports = mongoose.model('Review', reviewSchema);
