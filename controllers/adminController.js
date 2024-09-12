const User = require('../models/user')
const Review = require('../models/review')




exports.getHome = async (req, res) => {

     const totalTrainers = await User.countDocuments({ role: 'trainer' });

     const oneWeekAgo = new Date();
     oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
     const newUsers = await User.countDocuments({ createdAt: { $gte: oneWeekAgo } });
     const recentReviews = await Review.find().sort({ createdAt: -1 }).limit(5);

     const approvedTrainers = await User.countDocuments({ role: 'trainer', status: 'approved' });
     const pendingTrainers = await User.countDocuments({ role: 'trainer', status: 'Pending' });
     const pendingTrainersList = await User.find({ role: 'trainer', status: 'Pending' });

     // console.log(recentReviews)
     res.render('admin/home', {
          totalTrainers,
          oneWeekAgo,
          newUsers,
          recentReviews,
          approvedTrainers,
          pendingTrainers,
          pendingTrainersList

     })

}

exports.getPendingTrainerProfile = async (req, res) => {
     try {
          const trainerId = req.params.id;

          // Fetch the trainer details from the database
          const trainer = await User.findById(trainerId);

          if (!trainer) {
               return res.status(404).send('Trainer not found');
          }

          // Render the trainer page, passing trainer data
          res.render('admin/pendingTrainer', { trainer });
     } catch (error) {
          console.error(error);
          res.status(500).send('Server error');
     }
}

exports.getDashboardOverview = async (req, res) => {
     try {
          const totalUsers = await User.countDocuments();
          const totalTrainers = await User.countDocuments();
          const totalReviews = await Review.countDocuments();

          res.render('admin/overview', {
               totalUsers,
               totalTrainers,
               totalReviews
          });
     } catch (err) {
          console.error(err);
          res.status(500).send('Server Error');
     }
};

exports.getStatistics = async (req, res) => {
     try {
          const totalUsers = await User.countDocuments();
          const totalTrainers = await User.countDocuments();
          const totalReviews = await Review.countDocuments();

          res.render('admin/statistiques', {
               totalUsers,
               totalTrainers,
               totalReviews
          });
     } catch (err) {
          console.error(err);
          res.status(500).send('Server Error');
     }
};

exports.approveTrainer = async (req, res) => {
     try {
          const { trainerId } = req.params;

          // Find the trainer by ID and update their status to approved
          const trainer = await User.findByIdAndUpdate(trainerId, { status: 'Approved' }, { new: true });

          if (!trainer) {
               return res.status(404).send('Trainer not found');
          }

          // Redirect or send a response after successful update
          res.redirect('/admin');
     } catch (err) {
          console.error(err);
          res.status(500).send('Server Error');
     }
};

// Fetch all approved trainers and render them in the EJS template
exports.getApprovedTrainers = async (req, res) => {
     try {
          const approvedTrainers = await User.find({ role: 'trainer', status: 'Approved' });

          // Render the EJS template and pass the approved trainers data
          res.render('admin/approvedTrainers', { approvedTrainers });
     } catch (error) {
          console.error(error);
          res.status(500).send('Server Error');
     }
};



// Controller for deny and delete actions
exports.updateTrainerStatus = async (req, res) => {
     try {
          const { trainerId, action } = req.params;

          if (action === 'deny') {
               // Change trainer status to 'Denied'
               await User.findByIdAndUpdate(trainerId, { status: 'Denied' });
          } else if (action === 'delete') {
               // Delete the trainer from the database
               await User.findByIdAndDelete(trainerId);
          }

          // Redirect back to the approved trainers page
          res.redirect('/admin/trainers/approved');
     } catch (error) {
          console.error(error);
          res.status(500).send('Server Error');
     }
};


// Controller to render the Edit Trainer page
exports.renderEditTrainerPage = async (req, res) => {
     try {
          const { trainerId } = req.params;
          const trainer = await User.findById(trainerId);

          if (!trainer) {
               return res.status(404).send('Trainer not found');
          }

          // Render the edit page with the trainer data
          res.render('admin/editTrainer', { trainer });
     } catch (error) {
          console.error(error);
          res.status(500).send('Server Error');
     }
};


exports.updateTrainerInfo = async (req, res) => {
     try {
          const { trainerId } = req.params;
          const updatedData = req.body;

          // Ensure nested objects exist before updating them
          if (!updatedData.servicesOffered) updatedData.servicesOffered = {};
          if (!updatedData.contactInfo) updatedData.contactInfo = {};
          if (!updatedData.additionalInfo) updatedData.additionalInfo = {};

          // Convert comma-separated strings back to arrays for fields like specializations, certifications, etc.
          updatedData.specialization = updatedData.specialization ? updatedData.specialization.split(',').map(s => s.trim()) : [];
          updatedData.certifications = updatedData.certifications ? updatedData.certifications.split(',').map(s => s.trim()) : [];
          updatedData.servicesOffered.programs = updatedData.programs ? updatedData.programs.split(',').map(s => s.trim()) : [];
          updatedData.contactInfo.socialMediaLinks = updatedData.socialMediaLinks ? updatedData.socialMediaLinks.split(',').map(s => s.trim()) : [];
          updatedData.additionalInfo.languages = updatedData.languages ? updatedData.languages.split(',').map(l => l.trim()) : [];

          // Update the trainer's info in the database
          await User.findByIdAndUpdate(trainerId, updatedData);

          res.redirect('/trainers/approved');
     } catch (error) {
          console.error(error);
          res.status(500).send('Server Error');
     }
};
