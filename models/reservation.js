// models/Reservation.js
const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
     serviceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Service',
          required: true
     },
     userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
     },
     providerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
     },
     date: {
          type: Date,
          required: true
     },
     time: {
          type: String,
          required: true
     },
     message: {
          type: String,
          trim: true
     },
     status: {
          type: String,
          enum: ['pending', 'confirmed', 'completed', 'cancelled'],
          default: 'pending'
     },
     totalAmount: {
          type: Number,
          required: true
     },
     paymentStatus: {
          type: String,
          enum: ['pending', 'paid', 'refunded'],
          default: 'pending'
     }
}, {
     timestamps: true
});

module.exports = mongoose.model('Reservation', reservationSchema);