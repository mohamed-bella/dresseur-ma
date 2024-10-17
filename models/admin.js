const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Check if the model has already been compiled
const AdminSchema = new mongoose.Schema({
     username: { type: String, required: true, unique: true },
     password: { type: String, required: true },
     role: { type: String, enum: ['admin', 'author'], required: true }
});

// Hash password before saving
AdminSchema.pre('save', async function (next) {
     if (!this.isModified('password')) return next();
     const salt = await bcrypt.genSalt(10);
     this.password = await bcrypt.hash(this.password, salt);
     next();
});

// Export the model, checking if it's already compiled
module.exports = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
