// models/Consultation.js
const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
    // Consultation Basic Info
    type: {
        type: String,
        enum: ['free', 'paid'],
        required: true
    },
    category: {
        type: String,
        enum: ['behavior', 'training', 'health', 'other'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'cancelled'],
        default: 'pending'
    },

    // Dog Information
    dog: {
        name: {
            type: String,
            required: true
        },
        age: String,
        breed: String,
        gender: {
            type: String,
            enum: ['male', 'female', '']
        }
    },

    // Owner Information
    owner: {
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        preferredContact: {
            type: String,
            enum: ['whatsapp', 'phone', 'email'],
            required: true
        }
    },

    // Problem Details
    problem: {
        description: {
            type: String,
            required: true
        }
    },

    // Availability Preferences
    availability: [{
        type: String,
        enum: ['morning', 'afternoon', 'evening', 'weekend']
    }],

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },

    // Optional Expert Assignment
    assignedExpert: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Optional Feedback
    feedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: String,
        givenAt: Date
    }
});

// Update timestamp middleware
consultationSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const Consultation = mongoose.model('Consultation', consultationSchema);

module.exports = Consultation;