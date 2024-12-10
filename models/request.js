// models/Request.js
const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
  serviceName: {
    type: String,
    required: true
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  serviceProvider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please provide your name']
  },
  whatsapp: {
    type: String,
    required: [true, 'Please provide your WhatsApp number'],
    match: [/^\+?[1-9]\d{9,14}$/, 'Please provide a valid phone number']
  },
  message: {
    type: String,
    required: [true, 'Please provide a message'],
    maxlength: [500, 'Message cannot be more than 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Request', RequestSchema);