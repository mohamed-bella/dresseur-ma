const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const consultationSchema = new Schema({
     whatsappNumber: {
          type: String,
          required: true
     },
     problemDescription: {
          type: String,
          required: true
     },
     dateSubmitted: {
          type: Date,
          default: Date.now
     }
});

const Consultation = mongoose.model('Consultation', consultationSchema);

module.exports = Consultation;
