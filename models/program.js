const mongoose = require('mongoose');
const programSchema = new mongoose.Schema({
     trainerId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         required: true
     },
     title: {
         type: String,
         required: true
     },
     description: String,
     duration: {
         type: Number, // in weeks
         required: true
     },
     sessionCount: {
         type: Number,
         required: true
     },
     price: {
         type: Number,
         required: true
     },
     type: {
         type: String,
         enum: [
             'Éducation de base',
             'Comportement canin',
             'Obéissance avancée',
             'Agility',
             'Rééducation comportementale'
         ],
         required: true
     },
     status: {
         type: String,
         enum: ['active', 'inactive'],
         default: 'active'
     },
     createdAt: {
         type: Date,
         default: Date.now
     }
 });
 
 const Program = mongoose.model('Program', programSchema);
 module.exports = Program;