const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for the Dog model
const dogSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    breed: {
        type: String,
        required: true,
        trim: true
    },
    age: {
        type: Number,
        required: true,
        min: 0
    },
    sex: {
        type: String,
        enum: ['Male', 'Female'],
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    location: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    image: {
        type: String, // URL to the image
        trim: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
        required: true
    },
    status: {
        type: String,
        enum: ['Available', 'Sold', 'Adopted'],
        default: 'Available'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Create the model from the schema
const Dog = mongoose.model('Dog', dogSchema);

module.exports = Dog;
