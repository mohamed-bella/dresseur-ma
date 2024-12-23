const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
     userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
     rating: { type: Number, required: true, min: 1, max: 5, default: 0 },
     comment: { type: String },
     createdAt: { type: Date, default: Date.now }
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
