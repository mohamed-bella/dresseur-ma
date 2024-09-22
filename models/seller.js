// models/seller.js

const mongoose = require('mongoose');
const slugify = require('slugify');
const Schema = mongoose.Schema;

const sellerSchema = new Schema({
     googleId: {
          type: String,
          required: true
     },
     slug: {
          type: String,
          unique: true,
          required: true
     },
     displayName: {
          type: String,
          required: true
     },
     image: {
          type: String,
          required: true
     },
     email: {
          type: String,
          required: true
     },
     role: {
          type: String,
          enum: ['user', 'admin'],
          default: 'user'
     },
     createdAt: {
          type: Date,
          default: Date.now
     }
});

sellerSchema.pre('save', function (next) {
     if (this.isNew || this.isModified('displayName')) {
          const randomNum = Math.floor(1000 + Math.random() * 9000);
          this.slug = slugify(`${this.displayName}-${randomNum}`, { lower: true, strict: true });
     }
     next();
});

const Seller = mongoose.model('Seller', sellerSchema);
module.exports = Seller;
