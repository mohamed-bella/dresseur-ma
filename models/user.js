const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
     googleId: {
          type: String,
          required: true
     },
     displayName: {
          type: String,
          required: true
     },
     firstName: String,
     lastName: String,
     image: String,
     email: String,
     role: {
          type: String,
          default: 'trainer'
     },
     location: String,
     bio: String,
     experience: {
          type: Number, // Number of years of experience
          min: 0
     },
     specialization: [String], // Array for storing specializations (e.g., 'Fitness', 'Nutrition')
     certifications: [String], // Array of certifications
     trainingMethods: [String], // Array to allow for multiple training methods
     servicesOffered: {
          programs: [String], // Array of training programs (e.g., 'Program A')
          pricing: String, // Pricing structure as a string range (e.g., '100 - 500€')
          availability: String // Availability details
     },
     reviewCount: {
          type: Number,
          default: 0
     },
     contactInfo: {
          phone: String,
          email: String,
          socialMediaLinks: {
               facebook: String,
               instagram: String,
               twitter: String
          } // Social media links stored as an object for specific platforms
     },
     additionalInfo: {
          languages: [String], // Array of languages spoken by the trainer
          travelRadius: String, // Area the trainer is willing to travel
          cancellationPolicy: String, // Information on cancellation policy
          faq: [
               {
                    question: String,
                    answer: String
               }
          ]
     },
     photos: {
          type: [String], // Array of strings to store image URLs
          default: []
     },
     createdAt: {
          type: Date,
          default: Date.now
     },
     avgRating: {
          type: Number,
          default: 0
     },
     tags: [String], // Array for storing relevant tags
     status: {
          type: String,
          enum: ['Pending', 'Approved', 'Rejected'],
          default: 'Pending'
     },
     views: {
          type: Number,
          default: 0
     },
     onboardingComplete: {
          type: Boolean,
          default: false
     }
});

const User = mongoose.model('User', UserSchema);
module.exports = User;
