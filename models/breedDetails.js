const mongoose = require('mongoose');

const breedSchema = new mongoose.Schema({
     breedId: { type: String, required: true },
     breedName: { type: String, required: true },
     description: { type: String, required: true },
     history: { type: String, required: true },
     physicalCharacteristics: { type: String, required: true },
     behaviorAndCharacter: { type: String, required: true },
     interactionWithOthers: { type: String, required: true },
     training: { type: String, required: true },
     livingConditions: { type: String, required: true },
     health: { type: String, required: true },
     lifeExpectancy: { type: String, required: true },
     careAndHygiene: { type: String, required: true },
     costAndBudget: { type: String, required: true },
     physicalActivity: { type: String, required: true }
});

const Breed = mongoose.model('BreedDetail', breedSchema);
module.exports = Breed