// routes/profileRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const User = require('../models/user');
const { isAuthenticated } = require('../middlewares/auth');
const Service = require('../models/service');
const Review = require('../models/review');

// S3 Configuration
const s3 = new S3Client({
     region: process.env.AWS_REGION,
     credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
     }
});

// Multer Configuration
const storage = multer.memoryStorage();
const upload = multer({
     storage,
     limits: {
          fileSize: 5 * 1024 * 1024 // 5MB
     },
     fileFilter: (req, file, cb) => {
          if (!file.mimetype.startsWith('image/')) {
               return cb(new Error('Only images are allowed'));
          }
          cb(null, true);
     }
});

// Utility: Process Image


// Utility: Upload to S3
const uploadToS3 = async (fileBuffer, userId, type) => {
     try {
          const key = `users/${userId}/${type}/${Date.now()}.webp`;

          await s3.send(new PutObjectCommand({
               Bucket: process.env.AWS_S3_BUCKET_NAME,
               Key: key,
               Body: fileBuffer,
               ContentType: 'image/webp',
               ACL: 'public-read'
          }));

          return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
     } catch (error) {
          console.error('S3 upload error:', error);
          throw new Error('Failed to upload image');
     }
};

// Utility: Delete from S3
const deleteFromS3 = async (url) => {
     try {
          if (!url) return;
          const key = url.split('.com/')[1];

          await s3.send(new DeleteObjectCommand({
               Bucket: process.env.AWS_S3_BUCKET_NAME,
               Key: key
          }));
     } catch (error) {
          console.error('S3 delete error:', error);
     }
};

// Route: Profile Image Update


// Route: Get Profile Info
router.get('/profile', isAuthenticated, async (req, res) => {
     try {
          // Fetch user with select fields
          const user = await User.findById(req.user._id)
               .select('-password -__v')
               .lean();

          // Calculate missing fields for completion guide
          const missingFields = [];
          if (!user.displayName) missingFields.push('displayName');
          if (!user.bio) missingFields.push('bio');
          if (!user.location?.city) missingFields.push('city');
          if (!user.phoneNumber) missingFields.push('phone');
          if (!user.specializations?.length) missingFields.push('specializations');

          // Calculate completion percentage
          const completionPercentage = Math.round(
               ((5 - missingFields.length) / 5) * 100
          );

          // Calculate service metrics
          const metrics = {
               totalServices: await Service.countDocuments({ createdBy: user._id }),
               totalReviews: await Review.countDocuments({ serviceId: { $in: await Service.find({ createdBy: user._id }).distinct('_id') } }),
               averageRating: await Review.aggregate([
                    {
                         $match: {
                              serviceId: {
                                   $in: await Service.find({ createdBy: user._id }).distinct('_id')
                              }
                         }
                    },
                    {
                         $group: {
                              _id: null,
                              average: { $avg: '$rating' }
                         }
                    }
               ]).then(result => result[0]?.average || 0)
          };

          // Format data for template
          const viewData = {
               user: {
                    ...user,
                    metrics: {
                         ...metrics,
                         averageRating: Number(metrics.averageRating.toFixed(1))
                    }
               },
               completionPercentage,
               missingFields,
               defaultProfileImage: 'https://images.unsplash.com/photo-1614850715973-58c3167b30a0',
               path: 'profile',
               breadcrumbs: [
                    { label: 'Dashboard', url: '/dashboard' },
                    { label: 'Profile', url: '#' }
               ],
               specializations: [
                    { value: 'dog-training', label: 'Dressage', icon: 'fa-dog' },
                    { value: 'grooming', label: 'Toilettage', icon: 'fa-cut' },
                    { value: 'walking', label: 'Promenade', icon: 'fa-walking' },
                    { value: 'veterinary', label: 'Vétérinaire', icon: 'fa-stethoscope' },
                    { value: 'boarding', label: 'Pension', icon: 'fa-home' },
                    { value: 'transport', label: 'Transport', icon: 'fa-car' }
               ]
          };

          // Add verification status
          if (user.verificationStatus === 'pending') {
               viewData.verificationPending = true;
          }
          // console.log(viewData)

          // Render the profile page
          console.log(req.user.businessHours)
          res.render('user/dashboard/profile', viewData);

     } catch (error) {
          console.error('Profile fetch error:', error);


     }
});

// Upload route for profile/cover images
router.post('/profile/update-image', isAuthenticated, upload.single('image'), async (req, res) => {
     try {
          if (!req.file) {
               return res.status(400).json({
                    success: false,
                    message: 'No image provided'
               });
          }

          const { type } = req.body;
          if (!['profile', 'cover'].includes(type)) {
               return res.status(400).json({
                    success: false,
                    message: 'Invalid image type'
               });
          }

          // Process image
          const processedImage = await processImage(req.file.buffer, type);

          // Upload to S3
          const imageUrl = await uploadToS3(processedImage, req.user._id, type);

          // Update user
          const updateField = type === 'profile' ? 'profileImage' : 'coverImage';
          await User.findByIdAndUpdate(req.user._id, {
               [updateField]: imageUrl
          });

          res.json({
               success: true,
               message: 'Image updated successfully',
               url: imageUrl
          });

     } catch (error) {
          console.error('Image update error:', error);
          res.status(500).json({
               success: false,
               message: 'Failed to update image'
          });
     }
});

// Helper function to process images
const processImage = async (buffer, type) => {
     try {
          if (type === 'cover') {
               return await sharp(buffer)
                    .resize(1920, 1080, {
                         fit: 'cover',
                         position: 'center'
                    })
                    .webp({ quality: 80 })
                    .toBuffer();
          } else {
               return await sharp(buffer)
                    .resize(400, 400, {
                         fit: 'cover',
                         position: 'center'
                    })
                    .webp({ quality: 90 })
                    .toBuffer();
          }
     } catch (error) {
          console.error('Image processing error:', error);
          throw new Error('Failed to process image');
     }
};

// Route: Update Profile Visibility
router.put('/profile/visibility', isAuthenticated, async (req, res) => {
     try {
          const { isPublic } = req.body;

          await User.findByIdAndUpdate(req.user._id, {
               'settings.isProfilePublic': isPublic
          });

          res.json({
               success: true,
               message: 'Profile visibility updated'
          });

     } catch (error) {
          console.error('Visibility update error:', error);
          res.status(500).json({
               success: false,
               message: 'Failed to update profile visibility'
          });
     }
});

// routes/profileRoutes.js
// Route: Update Business Hours
router.put('/profile/update-hours', isAuthenticated, async (req, res) => {
     try {
          const { businessHours } = req.body;

          // Coerce isOpen to boolean for each day
          Object.values(businessHours).forEach(day => {
               if (day && typeof day.isOpen === 'string') {
                    day.isOpen = day.isOpen === 'true';
               }
          });

          // Validate business hours format
          const isValidFormat = Object.values(businessHours).every(day => {
               if (!day) return false;
               if (typeof day.isOpen !== 'boolean') return false;
               if (!day.isOpen) return true;

               return typeof day.open === 'string' &&
                    typeof day.close === 'string' &&
                    /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(day.open) &&
                    /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(day.close);
          });

          if (!isValidFormat) {
               return res.status(400).json({
                    success: false,
                    message: 'Format d\'horaires invalide'
               });
          }

          // Validate time ranges
          const isValidTimes = Object.values(businessHours).every(day => {
               if (!day.isOpen) return true;

               const [openHour, openMin] = day.open.split(':').map(Number);
               const [closeHour, closeMin] = day.close.split(':').map(Number);
               const openMinutes = openHour * 60 + openMin;
               const closeMinutes = closeHour * 60 + closeMin;

               return closeMinutes > openMinutes;
          });

          if (!isValidTimes) {
               return res.status(400).json({
                    success: false,
                    message: 'Les heures de fermeture doivent être après les heures d\'ouverture'
               });
          }

          // Update user
          await User.findByIdAndUpdate(req.user._id, {
               $set: { businessHours }
          });

          res.json({
               success: true,
               message: 'Horaires mis à jour avec succès'
          });

     } catch (error) {
          console.error('Business hours update error:', error);
          res.status(500).json({
               success: false,
               message: 'Erreur lors de la mise à jour des horaires'
          });
     }
});

// Route: Update Basic Info
// Route: Update Basic Info
// Assuming this is in routes/profile.js or similar
router.put('/profile/update-basic-info', async (req, res) => {
     try {
         const { displayName, bio, phoneNumber, location, languages, experience } = req.body;
          
         console.log(req.body)
         // Validate required fields
         if (
             !displayName ||
             !bio ||
             !phoneNumber ||
             !location ||
             !location.city
         ) {
             return res.status(400).json({
                 success: false,
                 message: 'Veuillez remplir tous les champs obligatoires',
             });
         }
 
         // Validate phone number format
         const phoneRegex = /^(?:\+212|0)[567]\d{8}$/;
         if (!phoneRegex.test(phoneNumber)) {
             return res.status(400).json({
                 success: false,
                 message:
                     'Numéro de téléphone invalide. Format attendu: +212XXXXXXXXX ou 06XXXXXXXX',
             });
         }
 
         // Validate bio length
         if (bio.length > 500) {
             return res.status(400).json({
                 success: false,
                 message: 'La bio ne doit pas dépasser 500 caractères',
             });
         }
 
         // Validate languages
         const allowedLanguages = ['french', 'arabic', 'english', 'spanish'];
         let languagesArray = [];
 
         if (languages) {
             if (Array.isArray(languages)) {
                 languagesArray = languages;
             } else {
                 languagesArray = [languages];
             }
 
             // Ensure all submitted languages are allowed
             const invalidLanguages = languagesArray.filter(
                 (lang) => !allowedLanguages.includes(lang)
             );
 
             if (invalidLanguages.length > 0) {
                 return res.status(400).json({
                     success: false,
                     message: `Langues invalides sélectionnées: ${invalidLanguages.join(', ')}`,
                 });
             }
         }
 
         // Validate experience
         let experienceData = {
             years: 0,
             description: 'Sans Expérience.',
         };
 
         if (experience) {
             const { years, description } = experience;
 
             // Validate years
             const yearsInt = parseInt(years, 10);
             if (isNaN(yearsInt) || yearsInt < 0) {
                 return res.status(400).json({
                     success: false,
                     message: "Le nombre d'années d'expérience doit être un entier positif",
                 });
             }
 
             // Validate description length
             if (description && description.length > 1000) {
                 return res.status(400).json({
                     success: false,
                     message:
                         "La description de l'expérience ne doit pas dépasser 1000 caractères",
                 });
             }
 
             experienceData = {
                 years: yearsInt,
                 description: description || 'Sans Expérience.',
             };
         }
 
         // Update user
         await User.findByIdAndUpdate(
             req.user._id,
             {
                 displayName,
                 bio,
                 phoneNumber,
                 location: {
                     city: location.city.toLowerCase(),
                 },
                 languages: languagesArray,
                 experience: experienceData,
             },
             { new: true }
         );
 
         res.json({
             success: true,
             message: 'Informations mises à jour avec succès',
         });
     } catch (error) {
         console.error('Basic info update error:', error);
         res.status(500).json({
             success: false,
             message: 'Erreur lors de la mise à jour des informations',
         });
     }
 });
 


// Route: Update Specializations
router.put('/profile/update-specializations', isAuthenticated, async (req, res) => {
     try {
          const { specializations } = req.body;

          if (!Array.isArray(specializations) || specializations.length === 0) {
               return res.status(400).json({
                    success: false,
                    message: 'Veuillez sélectionner au moins une spécialisation'
               });
          }

          // Validate specializations against allowed values
          const allowedSpecializations = [
               'dog-training', 'grooming', 'walking', 'veterinary', 'boarding', 'transport'
          ];

          const isValidSpecializations = specializations.every(spec =>
               allowedSpecializations.includes(spec)
          );

          if (!isValidSpecializations) {
               return res.status(400).json({
                    success: false,
                    message: 'Spécialisations invalides sélectionnées'
               });
          }

          // Update user specializations
          await User.findByIdAndUpdate(req.user._id, {
               specializations
          });

          res.json({
               success: true,
               message: 'Spécialisations mises à jour avec succès'
          });
     } catch (error) {
          console.error('Specializations update error:', error);
          res.status(500).json({
               success: false,
               message: 'Erreur lors de la mise à jour des spécialisations'
          });
     }
});

// Route: Add Qualification
router.post('/profile/qualifications', isAuthenticated, upload.single('certificate'), async (req, res) => {
     try {
          const { title, institution, year } = req.body;

          // Validate required fields
          if (!title || !institution || !year) {
               return res.status(400).json({
                    success: false,
                    message: 'Veuillez remplir tous les champs obligatoires'
               });
          }

          // Validate year
          const currentYear = new Date().getFullYear();
          if (isNaN(year) || year < 1900 || year > currentYear) {
               return res.status(400).json({
                    success: false,
                    message: 'Année invalide'
               });
          }

          // Process certificate image if provided
          let certificateUrl = null;
          if (req.file) {
               // Process image (e.g., resize and convert to webp)
               const processedImage = await sharp(req.file.buffer)
                    .resize(800, 600, {
                         fit: 'cover',
                         position: 'center'
                    })
                    .webp({ quality: 80 })
                    .toBuffer();

               // Upload to S3
               certificateUrl = await uploadToS3(processedImage, req.user._id, 'certificate');
          }

          // Update user's qualifications
          await User.findByIdAndUpdate(req.user._id, {
               $push: {
                    qualifications: {
                         title,
                         institution,
                         year,
                         certificate: certificateUrl
                    }
               }
          });

          res.json({
               success: true,
               message: 'Qualification ajoutée avec succès'
          });
     } catch (error) {
          console.error('Add qualification error:', error);
          res.status(500).json({
               success: false,
               message: 'Erreur lors de l\'ajout de la qualification'
          });
     }
});

// Route: Delete Qualification
router.delete('/profile/qualifications/:qualificationId', isAuthenticated, async (req, res) => {
     try {
          const { qualificationId } = req.params;
          console.log(qualificationId);

          // Find user
          const user = await User.findById(req.user._id);

          if (!user) {
               return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé'
               });
          }

          // Find the qualification
          const qualification = user.qualifications.id(qualificationId);

          if (!qualification) {
               return res.status(404).json({
                    success: false,
                    message: 'Qualification non trouvée'
               });
          }

          // Remove certificate from S3 if exists
          if (qualification.certificate) {
               await deleteFromS3(qualification.certificate);
          }

          // Remove the qualification using pull()
          user.qualifications.pull(qualificationId);

          // Save the updated user document
          await user.save();

          res.json({
               success: true,
               message: 'Qualification supprimée avec succès'
          });
     } catch (error) {
          console.error('Delete qualification error:', error);
          res.status(500).json({
               success: false,
               message: 'Erreur lors de la suppression de la qualification'
          });
     }
});


// Route: Update Settings
router.put('/profile/update-settings', isAuthenticated, async (req, res) => {
     try {
          const { settings } = req.body;

          // Validate settings object
          if (typeof settings !== 'object') {
               return res.status(400).json({
                    success: false,
                    message: 'Données de paramètres invalides'
               });
          }

          // Update user settings
          await User.findByIdAndUpdate(req.user._id, {
               $set: { settings }
          });

          res.json({
               success: true,
               message: 'Paramètres mis à jour avec succès'
          });

     } catch (error) {
          console.error('Settings update error:', error);
          res.status(500).json({
               success: false,
               message: 'Erreur lors de la mise à jour des paramètres'
          });
     }
});
module.exports = router;