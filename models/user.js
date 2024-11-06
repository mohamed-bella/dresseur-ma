// models/user.js
const mongoose = require('mongoose');
const slugify = require('slugify');
const Schema = mongoose.Schema;

const serviceProviderSchema = new Schema({
     // Authentication & Basic Info
     googleId: {
          type: String,
          required: true
     },
     email: {
          type: String,
          required: true,
          unique: true
     },
     displayName: {
          type: String,
          required: true
     },
     slug: {
          type: String,
          unique: true,
          required: true
     },

     // Profile Details
     profileImage: {
          type: String,
          // required: true
          default: 'https://images.unsplash.com/photo-1614850715973-58c3167b30a0?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
     },
     coverImage: {
          type: String,
          default: 'https://images.unsplash.com/photo-1614850715973-58c3167b30a0?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
     },
     bio: {
          type: String,
          maxLength: 500,
          trim: true
     },
     phoneNumber: {
          type: String,
          trim: true
     },
     location: {
          city: {
               type: String,
               // required: true,
               default: ''
          },
          address: String,
          coordinates: {
               type: [Number], // [longitude, latitude]
               index: '2dsphere'
          }
     },

     // Professional Info
     specializations: [{
          type: String,
          enum: ['dog-training', 'grooming', 'walking', 'veterinary', 'boarding', 'transport']
     }],
     experience: {
          years: {
               type: Number,
               defalut: 0,
          },
          description: {
               type: String,
               default: 'Sans Experience.'
          }
     },
     qualifications: [{
          title: String,
          institution: String,
          year: Number,
          certificate: String // URL to certificate image
     }],

     // Business Details
     businessHours: {
          monday: { open: String, close: String },
          tuesday: { open: String, close: String },
          wednesday: { open: String, close: String },
          thursday: { open: String, close: String },
          friday: { open: String, close: String },
          saturday: { open: String, close: String },
          sunday: { open: String, close: String }
     },
     languages: [{
          type: String,
          enum: ['french', 'arabic', 'english', 'spanish']
     }],

     // Verification & Status
     isVerified: {
          type: Boolean,
          default: false
     },
     verificationDocuments: [{
          type: String, // URLs to verification documents
          required: true
     }],
     status: {
          type: String,
          enum: ['pending', 'active', 'suspended'],
          default: 'pending'
     },

     // Trust & Safety
     badges: [{
          type: {
               type: String,
               enum: [
                    'top-rated',
                    'verified-professional',
                    'quick-responder',
                    'experienced',
                    'premium-provider'
               ]
          },
          earnedAt: {
               type: Date,
               default: Date.now
          }
     }],
     ndressilikScore: {
          type: Number,
          min: 0,
          max: 100,
          default: 0
     },
     gallery: [{
          type: String,
          required: true
     }],
     trustFactors: {
          responseRate: {
               type: Number,
               default: 0
          },
          completionRate: {
               type: Number,
               default: 0
          },
          onTimeRate: {
               type: Number,
               default: 0
          }
     },

     // Statistics & Metrics
     metrics: {
          totalServices: {
               type: Number,
               default: 0
          },
          totalReviews: {
               type: Number,
               default: 0
          },
          averageRating: {
               type: Number,
               default: 0
          },
          completedBookings: {
               type: Number,
               default: 0
          }
     },

     // Settings & Preferences
     settings: {
          emailNotifications: {
               type: Boolean,
               default: true
          },
          smsNotifications: {
               type: Boolean,
               default: true
          },
          autoAcceptBookings: {
               type: Boolean,
               default: false
          },
          displayPhoneNumber: {
               type: Boolean,
               default: false
          }
     },

     role: {
          type: String,
          enum: ['provider', 'admin'],
          default: 'provider'
     },
     createdAt: {
          type: Date,
          default: Date.now
     }
}, {
     timestamps: true
});

// Pre-save middleware to generate slug
serviceProviderSchema.pre('save', function (next) {
     if (!this.slug || this.isModified('displayName')) {
          this.slug = slugify(this.displayName, { lower: true });
     }
     next();
});

// Virtual for full address
serviceProviderSchema.virtual('fullAddress').get(function () {
     return `${this.location.address}, ${this.location.city}`;
});

// Method to check if provider is available at specific time
serviceProviderSchema.methods.isAvailable = function (day, time) {
     const schedule = this.businessHours[day.toLowerCase()];
     if (!schedule.open || !schedule.close) return false;

     return time >= schedule.open && time <= schedule.close;
};

// Method to calculate NDRESSILIK score
serviceProviderSchema.methods.calculateNdressilikScore = function () {
     let score = 0;

     // Rating contribution (40%)
     score += (this.metrics.averageRating / 5) * 40;

     // Completion rate contribution (20%)
     score += this.trustFactors.completionRate * 20;

     // Response rate contribution (20%)
     score += this.trustFactors.responseRate * 20;

     // On-time rate contribution (20%)
     score += this.trustFactors.onTimeRate * 20;

     // Bonus points for badges (up to 10 extra points)
     const badgeBonus = Math.min(this.badges.length * 2, 10);
     score += badgeBonus;

     // Cap the score at 100
     return Math.min(Math.round(score), 100);
};

// Index for geospatial queries
serviceProviderSchema.index({ 'location.coordinates': '2dsphere' });

const User = mongoose.model('User', serviceProviderSchema);
module.exports = User;