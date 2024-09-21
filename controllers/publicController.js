const BreedDetails = require('../models/breedDetails');
const Breed = require('../models/breed');

exports.getAllBreeds = async (req, res) => {
     try {
          const breeds = await Breed.find(); // Fetch all breeds
          res.render('public/breeds/breed', {
               title: 'Tous Les Races Des Chiens',
               breeds
          });
     } catch (error) {
          console.error('Error fetching breeds:', error);
          res.status(500).send('Error fetching breeds');
     }
};

// Get the breed details for a specific breed by ID
exports.getBreed = async (req, res) => {
     try {
          const dogID = req.params.id;

          // Find the breed details from the BreedDetails collection
          const breedDetails = await BreedDetails.findOne({ breedId: dogID });

          // Fetch the breed's image from the Breed collection
          const breedImage = await Breed.findOne({ breedId: dogID }, 'breedImage breedName');

          if (!breedDetails || !breedImage) {
               return res.status(404).send('Breed details or image not found');
          }

          // Combine the breed image with the breed details
          const breedData = {
               ...breedDetails.toObject(),
               breedImage: breedImage.breedImage // Add image URL from Breed collection
          };

          // Render the breed details page and pass the combined breed data
          res.render('public/breeds/breedDetails', {
               title: `Details for ${breedDetails.breedName}`,
               breed: breedData
          });
     } catch (error) {
          console.error('Error fetching breed details:', error);
          res.status(500).send('Error fetching breed details');
     }
};
