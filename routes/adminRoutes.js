const express = require('express')
const router = express.Router();

const adminController = require('../controllers/adminController.js')

router.get('/', adminController.getHome)
router.get('/pending-trainer/:id', adminController.getPendingTrainerProfile)
// Route for the dashboard overview
router.get('/dashboard/overview', adminController.getDashboardOverview);
// Route for the statistics page
router.get('/dashboard/stats', adminController.getStatistics);
// Route to approve a trainer
router.post('/pending-trainer/:trainerId/approve', adminController.approveTrainer);




// Route to render the Edit Trainer page
router.get('/trainers/:trainerId/edit', adminController.renderEditTrainerPage);

// Route to handle the Edit Trainer form submission
router.post('/trainers/:trainerId/edit', adminController.updateTrainerInfo);

// approved trainers router
router.get('/trainers/approved', adminController.getApprovedTrainers)

// Routes to deny or delete an approved trainer
router.post('/trainers/:trainerId/:action', adminController.updateTrainerStatus);

// Route to handle the Edit Trainer form submission (POST request)
router.post('/trainers/:trainerId/edit', adminController.updateTrainerInfo);


module.exports = router;