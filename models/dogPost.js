const mongoose = require('mongoose');

const dogPostSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['adoption', 'perdu', 'trouve'],
        required: true
    },
    name: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        required: true
    },
    breed: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    photos: [{
        type: String,
        required: true
    }],
    contactInfo: {
        email: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const DogPost = mongoose.model('DogPost', dogPostSchema);

module.exports = DogPost;
