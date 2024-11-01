const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
     serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
     userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
     rating: { type: Number, required: true, min: 1, max: 5, default: 0 },
     comment: { type: String },
     createdAt: { type: Date, default: Date.now }
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
