// models/user.js
const mongoose = require('mongoose');
const slugify = require('slugify');
const Schema = mongoose.Schema;

const dogTrainerSchema = new Schema({
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
          enum: [
               'Comportementaliste',
               'Attaque',
               'Discipline',
               'Freestyle',
          ]
     }],
     trainingMethods: [{
          type: String,
          enum: [
               'Renforcement positif',
               'Clicker training',
               'Méthode traditionnelle',
               'Éducation en douceur',
               'Conditionnement opérant'
          ]
     }],
     experience: {
          years: {
               type: Number,
               default: 0,
          },
          description: {
               type: String,
               default: 'Sans expérience.'
          }
     },
     qualifications: [{
          title: String,
          institution: String,
          year: Number,
          certificate: String // URL to certificate image
     }],
     certifications: [{
          type: String,
          enum: [
               'CPDT-KA',
               'CTC',
               'CCPDT',
               'APDT',
               'Moniteur canin',
               'Éducateur canin professionnel',
               'Comportementaliste canin'
          ]
     }],

     // Training Specifics
     trainingServices: [{
          type: String,
          enum: [
               'Cours particuliers',
               'Cours collectifs',
               'Stage intensif',
               'Pension éducative',
               'Consultation comportementale',
               'Formation à domicile',
               'Cours en visioconférence'
          ]
     }],
     dogTypes: [{
          type: String,
          enum: [
               'Chiots',
               'Chiens adultes',
               'Chiens seniors',
               'Chiens agressifs',
               'Chiens anxieux',
               'Races spécifiques'
          ]
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
          enum: ['Français', 'Arabe', 'Anglais', 'Espagnol']
     }],

     // Verification & Status
     isVerified: {
          type: Boolean,
          default: false
     },
     verificationDocuments: [{
          type: String,
          required: true
     }],
     status: {
          type: String,
          enum: ['En attente', 'Actif', 'Suspendu'],
          default: 'En attente'
     },

     // Trust & Safety
     badges: [{
          type: {
               type: String,
               enum: [
                    'Expert en éducation',
                    'Spécialiste comportement',
                    'Formateur certifié',
                    'Excellence du service',
                    'Top éducateur'
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

     // Training Success Metrics
     metrics: {
          totalClients: {
               type: Number,
               default: 0
          },
          totalSessions: {
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
          completedTrainings: {
               type: Number,
               default: 0
          },
          successRate: {
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
          },
          maxSimultaneousClients: {
               type: Number,
               default: 5
          }
     },

     role: {
          type: String,
          enum: ['éducateur', 'admin'],
          default: 'éducateur'
     },
     createdAt: {
          type: Date,
          default: Date.now
     }
}, {
     timestamps: true
});

// Pre-save middleware to generate slug
dogTrainerSchema.pre('save', function (next) {
     if (!this.slug || this.isModified('displayName')) {
          this.slug = slugify(this.displayName, { lower: true });
     }
     next();
});

// Virtual for full address
dogTrainerSchema.virtual('fullAddress').get(function () {
     return `${this.location.address}, ${this.location.city}`;
});

// Method to check if trainer is available at specific time
dogTrainerSchema.methods.isAvailable = function (day, time) {
     const schedule = this.businessHours[day.toLowerCase()];
     if (!schedule.open || !schedule.close) return false;
     return time >= schedule.open && time <= schedule.close;
};

// Method to calculate NDRESSILIK score with training-specific factors
dogTrainerSchema.methods.calculateNdressilikScore = function () {
     let score = 0;

     // Rating contribution (35%)
     score += (this.metrics.averageRating / 5) * 35;

     // Success rate contribution (25%)
     score += (this.metrics.successRate / 100) * 25;

     // Completion rate contribution (15%)
     score += this.trustFactors.completionRate * 15;

     // Response rate contribution (15%)
     score += this.trustFactors.responseRate * 15;

     // On-time rate contribution (10%)
     score += this.trustFactors.onTimeRate * 10;

     // Bonus points for certifications and badges (up to 10 extra points)
     const certificationsBonus = Math.min((this.certifications?.length || 0) * 2, 5);
     const badgesBonus = Math.min((this.badges?.length || 0) * 1, 5);
     score += certificationsBonus + badgesBonus;

     // Cap the score at 100
     return Math.min(Math.round(score), 100);
};

// Index for geospatial queries
dogTrainerSchema.index({ 'location.coordinates': '2dsphere' });

const User = mongoose.model('User', dogTrainerSchema);
module.exports = User;