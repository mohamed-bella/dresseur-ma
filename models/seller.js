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
          // required: 3true
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
     }, // Add role field
     createdAt: {
          type: Date,
          default: Date.now, // Automatically set the creation date when a new seller is created
     },

     announcements: [{
          views: { type: Number, default: 0 },  // Add views field

          slug: {
               type: String,
               unique: true, // Ensure slugs are unique
               required: true
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
               type: String, // URLs for images
          }],
          status: {
               type: String,
               enum: ['pending', 'approved'],
               default: 'pending'
          }, // Add status field

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

// Generate a slug based on the display name and a random number
sellerSchema.pre('save', function (next) {
     if (this.isNew || this.isModified('displayName')) {
          const randomNum = Math.floor(1000 + Math.random() * 9000); // Random 4-digit number
          this.slug = slugify(`${this.displayName}-${randomNum}`, { lower: true, strict: true });
     }
     next();
});

// Check if the Seller model is already compiled or compile it
const Seller = mongoose.models.Seller || mongoose.model('Seller', sellerSchema);

module.exports = Seller;
