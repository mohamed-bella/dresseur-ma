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
          default: 'user'
     },
     createdAt: {
          type: Date,
          default: Date.now,
     },

     announcements: [{
          views: { type: Number, default: 0 },

          slug: {
               type: String,
               unique: true, // Ensure slugs are unique
               required: true
          },
          breed: String,
          description: String,
          price: Number,
          location: String,
          number: String,
          media: [{
               type: String, // URLs for images
          }],
          status: {
               type: String,
               enum: ['pending', 'approved'],
               default: 'pending'
          },
          sellerDisplayName: {
               type: String, // Seller's display name
               required: true
          },
          sellerEmail: {
               type: String, // Seller's email
               required: true
          },
          datePosted: {
               type: Date,
               default: Date.now,
          },
     }],
});

// Generate a slug for the seller's display name
sellerSchema.pre('save', function (next) {
     if (this.isNew || this.isModified('displayName')) {
          const randomNum = Math.floor(1000 + Math.random() * 9000); // Random 4-digit number
          this.slug = slugify(`${this.displayName}-${randomNum}`, { lower: true, strict: true });
     }
     next();
});

// Pre-save hook for announcements to generate unique slugs
sellerSchema.pre('save', function (next) {
     if (this.isModified('announcements')) {
          this.announcements.forEach((announcement) => {
               if (!announcement.slug) {
                    const randomNum = Math.floor(1000 + Math.random() * 9000); // Random 4-digit number
                    announcement.slug = slugify(`${announcement.breed}-${randomNum}`, { lower: true, strict: true });
               }
          });
     }
     next();
});

// Check if the Seller model is already compiled or compile it
const Seller = mongoose.models.Seller || mongoose.model('Seller', sellerSchema);

module.exports = Seller;
