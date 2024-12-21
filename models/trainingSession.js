// models/trainingSession.js
const mongoose = require('mongoose');

const trainingSessionSchema = new mongoose.Schema({
    trainerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    duration: {
        type: Number, // in minutes
        required: true
    },
    type: {
        type: String,
        enum: [
            'Cours particuliers',
            'Cours collectifs',
            'Stage intensif',
            'Consultation comportementale',
            'Formation à domicile',
            'Cours en visioconférence'
        ],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled'],
        default: 'pending'
    },
    price: {
        type: Number,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    notes: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const TrainingSession = mongoose.model('TrainingSession', trainingSessionSchema);
module.exports = TrainingSession;

// models/client.js
const clientSchema = new mongoose.Schema({
    trainerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    displayName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phoneNumber: String,
    profileImage: String,
    dogs: [{
        name: String,
        breed: String,
        age: Number,
        issues: [String]
    }],
    notes: String,
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    completedSessions: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Client = mongoose.model('Client', clientSchema);
module.exports = Client;

// models/program.js


// models/review.js
// const reviewSchema = new mongoose.Schema({
//     trainerId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User',
//         required: true
//     },
//     clientId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Client',
//         required: true
//     },
//     sessionId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'TrainingSession',
//         required: true
//     },
//     rating: {
//         type: Number,
//         required: true,
//         min: 1,
//         max: 5
//     },
//     comment: {
//         type: String,
//         required: true
//     },
//     createdAt: {
//         type: Date,
//         default: Date.now
//     }
// });

// const Review = mongoose.model('Review', reviewSchema);
// module.exports = Review;