const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const eventSchema = new Schema({
     title: {
          type: String,
          required: true,
          trim: true,
     },
     description: {
          type: String,
          required: true,
     },
     location: {
          type: String,
          required: true,
     },
     date: {
          type: Date,
          required: true,
     },
     time: {
          type: String,
          required: true,
     },
     image: {
          type: String,
     },
     category: {
          type: String,
          // enum: ['training', 'competition', 'socializing', 'other'],
          required: true,
     },
     organizer: {
          type: String,
          required: true,
     },
     contactEmail: {
          type: String,
          required: true,
     },
     contactPhone: {
          type: String,
     },
     website: {
          type: String,
     },
     ticketPrice: {
          type: Number,
     },
     ticketLink: {
          type: String,
     },
     createdAt: {
          type: Date,
          default: Date.now,
     },
});

module.exports = mongoose.model('Event', eventSchema);