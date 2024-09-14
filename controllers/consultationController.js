const Consultation = require('../models/consultation');

const consultationController = {
     // GET: Show consultation form
     showConsultationForm(req, res) {
          res.render('public/consultationForm', { title: 'Consultation', message: null });
     },

     // POST: Handle form submission
     async submitConsultation(req, res) {
          const { whatsappNumber, problemDescription } = req.body;

          // Basic validation
          if (!whatsappNumber || !problemDescription) {
               return res.status(400).render('public/consultationForm', {
                    title: 'Consultation',
                    message: 'Please fill in all fields.'
               });
          }

          try {
               const newConsultation = new Consultation({
                    whatsappNumber,
                    problemDescription
               });

               await newConsultation.save();

               res.render('public/consultationSuccess', {
                    title: 'Consultation Submitted',
                    message: null
               });
          } catch (err) {
               console.error('Error saving consultation:', err);
               res.status(500).render('error', { message: 'Failed to submit consultation' });
          }
     },

     // GET: Show all consultations for admin
     async showConsultationsForAdmin(req, res) {
          try {
               const consultations = await Consultation.find().sort({ dateSubmitted: -1 }); // Sort by latest first
               res.render('public/adminConsultations', { title: 'Admin - Consultations', consultations });
          } catch (err) {
               console.error('Error fetching consultations:', err);
               res.status(500).render('error', { message: 'Failed to fetch consultations' });
          }
     }
};

module.exports = consultationController;
