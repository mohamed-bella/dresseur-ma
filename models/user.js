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
     author: {

          type: String,
          // required: true

     },
     email: {
          type: String,
          // required: true
     },
     role: {
          type: String,
          enum: ['user', 'writer', 'admin'],
          default: 'user'
     },
     createdAt: {
          type: Date,
          default: Date.now
     }
});


const User = mongoose.model('User', sellerSchema);
module.exports = User;
