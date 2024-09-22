// models/announcement.js

const mongoose = require('mongoose');
const slugify = require('slugify');
const Schema = mongoose.Schema;

const announcementSchema = new Schema({
     views: { type: Number, default: 0 },
     slug: {
          type: String,
          // unique: true,
          // required: true,
     },
     breed: {
          type: String,
          required: true
     },
     description: {
          type: String,
          required: true
     },
     price: {
          type: Number,
          required: true
     },
     location: {
          type: String,
          required: true
     },
     number: {
          type: String,
          required: true
     },
     media: [{
          type: String // URLs for images
     }],
     status: {
          type: String,
          enum: ['pending', 'approved'],
          default: 'pending'
     },
     seller: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Seller', // Reference to Seller
          required: true
     },
     sellerDisplayName: {
          type: String,
          required: true
     },
     sellerEmail: {
          type: String,
          required: true
     },
     datePosted: {
          type: Date,
          default: Date.now
     }
});

announcementSchema.pre('save', function (next) {
     if (this.isNew || this.isModified('breed')) {
          const randomNum = Math.floor(1000 + Math.random() * 9000);
          this.slug = slugify(`${this.breed}-${randomNum}`, { lower: true, strict: true });
     }
     next();
});

const Announcement = mongoose.model('Announcement', announcementSchema);
module.exports = Announcement;
