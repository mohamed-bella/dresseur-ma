// models/DogPost.js
const mongoose = require('mongoose');

const dogPostSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['adoption', 'lost'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  age: String,
  breed: String,
  description: String,
  location: String,
  photo: String, // URL ou chemin du fichier
  contactInfo: {
    email: String,
    phone: String
  },
  tips: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  adminFeedback: String // Feedback en cas de rejet
});

module.exports = mongoose.model('DogPost', dogPostSchema);
