const mongoose = require('mongoose');

// Define the Service schema
const serviceSchema = new mongoose.Schema({
     serviceName: { type: String, required: true },
     description: { type: String, required: true },
     priceRange: { type: String, required: true },
     location: { type: String, required: true },
     serviceOptions: [{ type: String, required: true }],
     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
     createdAt: { type: Date, default: Date.now },
     likes: { type: Number, default: 0 },
     dislikes: { type: Number, default: 0 },
     views: { type: Number, default: 0 }
});

// Create the Service model
const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;
