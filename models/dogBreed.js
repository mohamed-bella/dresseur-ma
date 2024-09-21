const mongoose = require('mongoose');

const dogBreedSchema = new mongoose.Schema({
     breedName: { type: String, required: true },
     breedHistory: { type: String },
     physicalTraits: { type: String },
     memberPhotos: [{ type: String }], // Cloudinary image URLs
     behaviorAndCharacter: { type: String },
     behaviorWithOthers: { type: String },
     education: { type: String },
     livingConditions: { type: String },
     health: { type: String },
     lifeExpectancy: { type: String },
     grooming: { type: String },
     priceAndBudget: { type: String },
     physicalActivity: { type: String },
     createdAt: { type: Date, default: Date.now }
});

const DogBreed = mongoose.model('DogBreed', dogBreedSchema);

module.exports = DogBreed;
