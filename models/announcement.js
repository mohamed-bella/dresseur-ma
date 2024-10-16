const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const announcementSchema = new Schema({
     description: { type: String, required: true },
     announcementType: { type: String, enum: ['sale', 'adoption'], required: true }, // Sale or Adoption
     animalType: { type: String, enum: ['dog', 'cat', 'other'], required: true }, // Type of animal
     breed: { type: String, required: true }, // Animal breed
     age: { type: String, enum: ['puppy', 'adult', 'senior'], required: true }, // Animal age
     gender: { type: String, enum: ['male', 'female', 'unknown'], required: true }, // Gender
     vaccination: { type: String, enum: ['yes', 'no', 'unknown'], required: true }, // Vaccination status
     sterilization: { type: String, enum: ['yes', 'no', 'unknown'], required: true }, // Sterilization status
     price: { type: Number }, // Price (only if it's for sale)
     adoptionFee: { type: Number }, // Adoption fee (only if it's for adoption)
     location: { type: String, required: true }, // Location (city)
     images: [{ type: String }], // Array of image URLs from Cloudinary
     whatsapp: { type: String, required: true }, // Contact WhatsApp number
     email: { type: String }, // Optional contact email
     user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Link to the user who posted
     createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Announcement', announcementSchema);
