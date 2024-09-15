const express = require('express');
const router = express.Router();
const consultationController = require('../controllers/consultationController');



// Route to display the consultation form
router.get('/consultation', consultationController.showConsultationForm);

// Route to handle consultation form submission
router.post('/consultation', consultationController.submitConsultation);

// Actual admin dashboard route, protected by the prompt
router.get('/admin/consultations', consultationController.showConsultationsForAdmin);

module.exports = router;
