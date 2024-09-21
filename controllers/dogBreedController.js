const DogBreed = require('../models/dogBreed');
const cloudinary = require('../config/cloudinary'); // Import Cloudinary configuration


// Get form to add a dog breed
exports.getAddDogBreed = (req, res) => {
     res.render('admin/addDogBreed', { title: 'Add Dog Breed' });
};

// Handle form submission to add a dog breed
exports.postAddDogBreed = async (req, res) => {
     try {
          const { breedName, breedHistory, physicalTraits, behaviorAndCharacter, behaviorWithOthers, education, memberPhotos, livingConditions, health, lifeExpectancy, grooming, priceAndBudget, physicalActivity } = req.body;


          const newDogBreed = new DogBreed({
               breedName,
               breedHistory,
               physicalTraits,
               memberPhotos,
               behaviorAndCharacter,
               behaviorWithOthers,
               education,
               livingConditions,
               health,
               lifeExpectancy,
               grooming,
               priceAndBudget,
               physicalActivity,
               memberPhotos
          });

          await newDogBreed.save();
          res.redirect('/admin/dog-breeds/list'); // Redirect to breed list
     } catch (error) {
          console.error(error);
          res.status(500).send('Server Error');
     }
};

// Edit a breed
exports.getEditDogBreed = async (req, res) => {
     const breed = await DogBreed.findById(req.params.id);
     res.render('admin/editDogBreed', { title: 'Edit Dog Breed', breed });
};

exports.postEditDogBreed = async (req, res) => {
     try {
          const { breedName, breedHistory, physicalTraits, behaviorAndCharacter, behaviorWithOthers, education, livingConditions, health, lifeExpectancy, grooming, priceAndBudget, physicalActivity } = req.body;
          const memberPhotos = [];

          // Upload new images to Cloudinary if available
          if (req.files && req.files.memberPhotos) {
               for (let file of req.files.memberPhotos) {
                    const result = await cloudinary.uploader.upload(file.path);
                    memberPhotos.push(result.secure_url);
               }
          }

          await DogBreed.findByIdAndUpdate(req.params.id, {
               breedName,
               breedHistory,
               physicalTraits,
               memberPhotos,
               behaviorAndCharacter,
               behaviorWithOthers,
               education,
               livingConditions,
               health,
               lifeExpectancy,
               grooming,
               priceAndBudget,
               physicalActivity
          });

          res.redirect('/admin/dog-breeds/list'); // Redirect to breed list
     } catch (error) {
          console.error(error);
          res.status(500).send('Server Error');
     }
};

// List all dog breeds
exports.getDogBreeds = async (req, res) => {
     const breeds = await DogBreed.find();
     res.render('admin/dogBreedList', { title: 'List of Dog Breeds', breeds });
};

// Delete a breed
exports.deleteDogBreed = async (req, res) => {
     try {
          await DogBreed.findByIdAndDelete(req.params.id);
          res.redirect('/admin/dog-breeds/list'); // Redirect to breed list
     } catch (error) {
          console.error(error);
          res.status(500).send('Server Error');
     }
};
