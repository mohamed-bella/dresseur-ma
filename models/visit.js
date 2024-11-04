const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
     providerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
     },
     userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null // Null for guest visits
     },
     device: {
          type: String,
          required: true
     },
     location: {
          country: { type: String },
          city: { type: String }
     },
     userAgent: {
          type: String,
          required: true
     },
     createdAt: {
          type: Date,
          default: Date.now
     }
}, {
     timestamps: true
});

// Index for optimized queries
visitSchema.index({ providerId: 1, createdAt: -1 });

module.exports = mongoose.model('Visit', visitSchema);
