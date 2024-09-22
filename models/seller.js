const mongoose = require('mongoose');
const slugify = require('slugify');
const Schema = mongoose.Schema;

// Define the Seller schema
const sellerSchema = new Schema({
     googleId: {
          type: String,
          required: true,
     },
     slug: {
          type: String,
          unique: true,
          required: true, // Ensure slug is required for the seller
     },
     displayName: {
          type: String,
          required: true,
     },
     image: {
          type: String,
          required: true,
     },
     email: {
          type: String,
          required: true,
     },
     role: {
          type: String,
          enum: ['user', 'admin'],
          default: 'user',
     },
     createdAt: {
          type: Date,
          default: Date.now,
     },
     announcements: [{
          views: { type: Number, default: 0 },
          slug: {
               type: String,
          },
          breed: {
               type: String,
          },
          description: {
               type: String,
          },
          price: {
               type: Number,
          },
          location: {
               type: String,
          },
          number: {
               type: String,
          },
          media: [{
               type: String,
          }],
          status: {
               type: String,
               enum: ['pending', 'approved'],
               default: 'pending',
          },
          sellerDisplayName: {
               type: String,
               required: true,
          },
          sellerEmail: {
               type: String,
               required: true,
          },
          datePosted: {
               type: Date,
               default: Date.now,
          },
     }],
});

// Pre-save hook to generate slugs for sellers and announcements
sellerSchema.pre('save', function (next) {
     const seller = this;

     // Generate slug for the seller if needed
     if (seller.isNew || seller.isModified('displayName')) {
          const randomNum = Math.floor(1000 + Math.random() * 9000);
          seller.slug = slugify(`${seller.displayName}-${randomNum}`, { lower: true, strict: true });
     }

     // Ensure each announcement has a slug generated
     seller.announcements.forEach((announcement) => {
          if (!announcement.slug) {
               const randomNum = Math.floor(1000 + Math.random() * 9000);
               announcement.slug = slugify(`${announcement.breed}-${randomNum}`, { lower: true, strict: true });
          }
     });

     next();
});

const Seller = mongoose.models.Seller || mongoose.model('Seller', sellerSchema);
module.exports = Seller; 