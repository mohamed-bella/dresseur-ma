// models/elevage.js
const mongoose = require('mongoose');

const elevageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    logo: {
        type: String,
        default: 'https://via.placeholder.com/150?text=Elevage'
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxLength: 2000
    },
    location: {
        city: { 
            type: String, 
            required: true, 
            trim: true 
        },
        address: { 
            type: String, 
            required: true, 
            trim: true 
        },
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    contactInfo: {
        phone: { 
            type: String, 
            required: true 
        },
        email: { 
            type: String, 
            required: true 
        },
        whatsapp: String,
        website: String,
        socialMedia: {
            facebook: String,
            instagram: String,
            youtube: String
        }
    },

    services: [{
        type: String,
        // enum: ['Élevage', 'Pension', 'Dressage', 'Formation', 'Toilettage'],
    }],
    facilities: {
        area: Number, // in square meters
        hasTrainingArea: Boolean,
        hasGroomingService: Boolean,
        hasPension: Boolean,
        hasVetService: Boolean
    },
    dogs: [{
        name: { type: String, required: true },
        breed: { type: String, required: true },
        age: {
            years: Number,
            months: Number
        },
        gender: {
            type: String,
            enum: ['Mâle', 'Femelle']
        },
        price: Number,
        description: String,
        images: [{
            url: String,
            isMain: { type: Boolean, default: false }
        }],
        status: {
            type: String,
            enum: ['Disponible', 'Réservé', 'Vendu'],
            default: 'Disponible'
        },
        pedigree: {
            has: { type: Boolean, default: false },
            number: String
        }
    }],
    certification: {
        isVerified: { type: Boolean, default: false },
        documents: [{
            type: String,
            url: String,
            verifiedAt: Date
        }]
    },
    stats: {
        totalDogs: { type: Number, default: 0 },
        availableDogs: { type: Number, default: 0 },
        averageRating: { type: Number, default: 0 },
        totalReviews: { type: Number, default: 0 }
    },
    slug: {
        type: String,
     //    required: true,
        unique: true
    },
    seo: {
        metaTitle: String,
        metaDescription: String,
        keywords: [String]
    },
    status: {
        type: String,
        enum: ['active', 'pending', 'suspended'],
        default: 'pending'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Pre-save middleware to update stats
elevageSchema.pre('save', function(next) {
    if (this.isModified('dogs')) {
        // Update dogs stats
        this.stats.totalDogs = this.dogs.length;
        this.stats.availableDogs = this.dogs.filter(dog => dog.status === 'Disponible').length;
    }
    next();
});



module.exports = mongoose.model('Elevage', elevageSchema);