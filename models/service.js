// service model 
const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
     serviceName: {
          type: String,
          required: true,
          trim: true
     },
     description: {
          type: String,
          required: true,
          trim: true
     },
     views: {
          type: Number,
          default: 0
     },
     priceRange: {
          type: String,
          required: true
     },
     location: {
          type: String,
          required: true,
          lowercase: true
     },
     serviceOptions: {
          type: String,
          required: true,
          // enum: ['dressage', 'toilettage', 'promonade', 'veterinaire', 'pension', 'transport']
     },
     createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
     },
     slug: {
          type: String
     },
     images: [{
          type: String,
          required: true
     }],
     isActive: {
          type: Boolean,
          default: true
     },
     createdAt: {
          type: Date,
          default: Date.now
     }
}, {
     timestamps: true
});

// Virtual for status
serviceSchema.virtual('status').get(function () {
     return this.isActive ? 'active' : 'inactive';
});

// Ensure virtuals are included in JSON
serviceSchema.set('toJSON', { virtuals: true });
serviceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Service', serviceSchema);