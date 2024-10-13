const path = require('path');
const BreedDetails = require('../models/breedDetails');
const Breed = require('../models/breed');

exports.getAllBreeds = async (req, res) => {
     try {
          const breeds = await Breed.find(); // Fetch all breeds

          const breedsWithFilename = breeds.map(breed => {
               const breedImageFilename = path.basename(breed.breedImage);
               return {
                    ...breed.toObject(),
                    breedImageFilename
               };
          });

          res.render('public/breeds/breed', {
               title: 'Tous Les Races Des Chiens',
               breeds: breedsWithFilename
          });
     } catch (error) {
          console.error('Error fetching breeds in getAllBreeds:', error);
          res.status(500).send('Internal Server Error');
     }
};

exports.getBreed = async (req, res) => {
     try {
          const dogID = req.params.id;

          // Execute both queries concurrently
          const [breedDetails, breedImage] = await Promise.all([
               BreedDetails.findOne({ breedId: dogID }),
               Breed.findOne({ breedId: dogID }, 'breedImage breedName')
          ]);

          if (!breedDetails || !breedImage) {
               return res.status(404).send('Breed details or image not found');
          }

          const breedImageFilename = path.basename(breedImage.breedImage);

          const breedData = {
               ...breedDetails.toObject(),
               breedImage: breedImage.breedImage,
               breedImageFilename
          };

          res.render('public/breeds/breedDetails', {
               title: `Details for ${breedDetails.breedName}`,
               breed: breedData
          });
     } catch (error) {
          console.error('Error fetching breed details in getBreed:', error);
          res.status(500).send('Internal Server Error');
     }
};
const Seller = require('../models/seller');
const Announcement = require('../models/announcement');

exports.getDashboard = async (req, res) => {
     try {
          // Fetch seller's details
          const seller = await Seller.findOne({ googleId: req.user.googleId });
          if (!seller) {
               return res.status(404).render('error', { message: 'Vendeur non trouvé.' });
          }

          // Fetch seller's active announcements
          const announcements = await Announcement.find({ seller: seller._id, status: 'approved' });

          // Calculate total views across all announcements
          const totalViews = announcements.reduce((acc, announcement) => acc + announcement.views, 0);

          // Render the dashboard with the necessary data
          res.render('public/dashboard/home', {
               title: 'Tableau de bord',
               seller, // Seller details for profile display
               announcements, // Seller's announcements
               totalViews, // Total number of views
               totalEarnings: calculateTotalEarnings(announcements), // Assuming you want to show earnings
               announcementCount: announcements.length // Number of active announcements
          });
     } catch (error) {
          console.error('Erreur lors du chargement du tableau de bord:', error);
          res.status(500).render('error', { message: 'Erreur lors du chargement du tableau de bord.' });
     }
};

// Helper function to calculate total earnings from announcements
function calculateTotalEarnings(announcements) {
     return announcements.reduce((acc, announcement) => acc + (announcement.price || 0), 0);
}
const Elevage = require('../models/elevage');
const cloudinary = require('cloudinary').v2;

// Controller for creating a new élevage
exports.newElevage = async (req, res) => {
     try {
          // Extract the form data from the request
          const { name, description, location, contactNumber, website } = req.body;
          let images = {};

          console.log('Form data:', req.body); // Debug form data
          console.log('Uploaded files:', req.files); // Debug uploaded files

          // Validate required fields
          if (!name || !description || !location) {
               return res.status(400).render('public/dashboard/newElevage', {
                    title: 'Créer un nouvel élevage',
                    error: 'Veuillez remplir tous les champs obligatoires.',
                    formData: { name, description, location, contactNumber, website }
               });
          }

          // Handle file uploads via Cloudinary
          if (req.files && Array.isArray(req.files) && req.files.length > 0) {
               for (const file of req.files) {
                    try {
                         console.log('Uploading file:', file.path); // Debug each file being uploaded

                         // Upload the file to Cloudinary and determine if it's a profile or cover image
                         const result = await cloudinary.uploader.upload(file.path, {
                              folder: 'elevage_images', // Optional folder name in Cloudinary
                              use_filename: true
                         });

                         console.log('Uploaded to Cloudinary:', result.secure_url); // Debug Cloudinary response

                         // Based on the file field name, assign the image appropriately
                         if (file.fieldname === 'profileImage') {
                              images.profileImage = result.secure_url;
                         } else if (file.fieldname === 'coverImage') {
                              images.coverImage = result.secure_url;
                         }
                    } catch (uploadError) {
                         console.error('Error uploading image:', uploadError);
                         return res.status(500).render('error', { message: 'Erreur lors du téléchargement de l\'image.' });
                    }
               }
          }

          // Set default images if they weren't uploaded
          if (!images.profileImage) {
               images.profileImage = 'https://res.cloudinary.com/dxg2nsnkj/image/upload/v1727954743/Elevage_Default_Profile.png'; // Default profile image URL
          }

          if (!images.coverImage) {
               images.coverImage = 'https://res.cloudinary.com/dxg2nsnkj/image/upload/v1727954743/Elevage_Default_Cover.png'; // Default cover image URL
          }

          // Create the new élevage instance
          const newElevage = new Elevage({
               name,
               description,
               location,
               contactNumber,
               website,
               profileImage: images.profileImage, // Save the profile image URL
               coverImage: images.coverImage,     // Save the cover image URL
               owner: req.user._id // Link the élevage to the authenticated seller (assuming user is authenticated)
          });

          // Save the new élevage to the database
          await newElevage.save();

          // Redirect the user to the élevage management page after successful creation
          req.flash('success', 'Votre élevage a été créé avec succès.');
          res.redirect('/dashboard'); // Adjust the redirect URL to your desired location
     } catch (error) {
          console.error('Erreur lors de la création de l\'élevage:', error);
          res.status(500).render('error', { message: 'Erreur lors de la création de l\'élevage.' });
     }
};
