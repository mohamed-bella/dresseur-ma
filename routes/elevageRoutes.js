// routes/breeding.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const Elevage = require('../models/elevage');
const { isAuthenticated } = require('../middlewares/auth');
const slugify = require('slugify');

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
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif)$/)) {
            cb(new Error('Format de fichier non supporté'), false);
        }
        cb(null, true);
    }
});

// Upload utility
const uploadToS3 = async (buffer, key) => {
    try {
        const resizedBuffer = await sharp(buffer)
            .resize(800, 800, { 
                fit: 'cover',
                withoutEnlargement: true
            })
            .webp({ 
                quality: 80,
                effort: 6
            })
            .toBuffer();

        await s3.send(new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: key,
            Body: resizedBuffer,
            ContentType: 'image/webp',
            ACL: 'public-read',
            CacheControl: 'public, max-age=31536000'
        }));

        return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (error) {
        console.error('S3 Upload Error:', error);
        throw new Error('Erreur lors du téléchargement de l\'image');
    }
};

// Generate unique slug
const generateUniqueSlug = async (name, city) => {
    const baseSlug = slugify(`elevage-${name}-${city}-maroc`, {
        lower: true,
        strict: true,
        locale: 'fr'
    });
    
    let slug = baseSlug;
    let counter = 0;
    
    while (counter < 10) {
        const existing = await Elevage.findOne({ slug });
        if (!existing) return slug;
        
        counter++;
        slug = `${baseSlug}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    }
    
    throw new Error('Impossible de générer un slug unique');
};

// Routes
router.post('/dashboard/breedings/add', 
    isAuthenticated, 
    upload.single('logo'),
    async (req, res) => {
        try {
            const { 
                name, description, city, address, 
                phone, email, whatsapp, website,
                services = [], 
            } = req.body;

            // Validate required fields
            const requiredFields = { name, description, city, address, phone, email };
            for (const [field, value] of Object.entries(requiredFields)) {
                if (!value || !value.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: `Le champ ${field} est requis`
                    });
                }
            }

            // Handle logo upload
            let logoUrl = 'https://via.placeholder.com/150?text=Logo';
            if (req.file) {
                const key = `breeding/logos/${Date.now()}-${req.file.originalname}`;
                logoUrl = await uploadToS3(req.file.buffer, key);
            }

            // Generate unique slug
            const slug = await generateUniqueSlug(name, city);

            // Create new breeding
            const newElevage = new Elevage({
                userId: req.user._id,
                logo: logoUrl,
                name,
                description,
                location: { 
                    city, 
                    address 
                },
                contactInfo: { 
                    phone, 
                    email,
                    whatsapp,
                    website
                },
                services: Array.isArray(services) ? services : [],
                slug,
                seo: {
                    metaTitle: `Élevage ${name} à ${city} | NDRESSILIK`,
                    metaDescription: `Découvrez l'élevage ${name} à ${city}. ${description.substring(0, 150)}...`,
                    keywords: [
                        'élevage', 'chiens', city.toLowerCase(),
                        name.toLowerCase(), 'maroc', 'éleveur professionnel',
                        ...services
                    ]
                }
            });

            await newElevage.save();

            res.status(201).json({
                success: true,
                message: 'Élevage créé avec succès',
                data: {
                    id: newElevage._id,
                    slug: newElevage.slug,
                    redirectUrl: '/dashboard/breedings'
                }
            });

        } catch (error) {
            console.error('Error adding breeding:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erreur lors de la création de l\'élevage'
            });
        }
    }
);


const ensureBreeder = (req, res, next) => {
     if (req.user.role !== 'breeder') {
         return res.status(403).render('error', { message: 'Accès refusé.' });
     }
     next();
 };

// Routes


// GET: Dashboard Breeding Page
router.get('/dashboard/breedings', isAuthenticated, async (req, res) => {
     try {
         const elevages = await Elevage.find({ userId: req.user._id }).lean(); // Fetch all breedings
         res.render('user/dashboard/elevage/elevage', { elevages, user: req.user });
     } catch (error) {
         console.error('Error fetching breedings:', error);
         res.status(500).send('Erreur lors de la récupération des élevages.');
     }
 });

router.get('/dashboard/breedings/add', isAuthenticated, async (req, res) => {
     const elevage = await Elevage.findOne({ userId: req.user._id }).lean();
     res.render('user/dashboard/elevage/add', { elevage, user: req.user });
 });

 // GET: View specific breeding details
router.get('/dashboard/breedings/:id', isAuthenticated, async (req, res) => {
     try {
         const elevage = await Elevage.findOne({ _id: req.params.id, userId: req.user._id }).lean();
 
         if (!elevage) {
             return res.status(404).render('error', { message: "Élevage non trouvé." });
         }
 
         res.render('user/dashboard/elevage/details', { elevage, user: req.user });
     } catch (error) {
         console.error('Error fetching breeding details:', error);
         res.status(500).render('error', { message: "Erreur lors de la récupération des détails de l'élevage." });
     }
 });


// Utility Function: Generate Slug
const generateSlug = (name, city) => {
    const date = new Date().toISOString().split('T')[0];
    const randomNumber = Math.floor(Math.random() * 100000);
    return slugify(`elevage-${name}-${city}-maroc-${date}-${randomNumber}`, { lower: true, strict: true });
};

// Routes
// GET: Dashboard Breeding Page
router.get('/dashboard/breedings', isAuthenticated, async (req, res) => {
    try {
        const elevages = await Elevage.find({ userId: req.user._id }).lean();
        res.render('user/dashboard/elevage/elevage', { elevages, user: req.user });
    } catch (error) {
        console.error('Error fetching breedings:', error);
        res.status(500).send('Erreur lors de la récupération des élevages.');
    }
});

// GET: Add Breeding Page
router.get('/dashboard/breedings/add', isAuthenticated, (req, res) => {
    res.render('user/dashboard/elevage/add', { user: req.user });
});


 
// add a dog to a breeding
// Add dog route with validation
router.post('/dashboard/breedings/:id/dogs/add', 
    isAuthenticated, 
    upload.array('images', 5),
    async (req, res) => {
        try {
            const { 
                name, 
                breed, 
                ageYears, 
                ageMonths, 
                gender,
                price, 
                description,
                status = 'Disponible',
                pedigreeHas,
                pedigreeNumber
            } = req.body;

            // Validation
            if (!name || !breed || !description) {
                return res.status(400).json({
                    success: false,
                    message: 'Tous les champs obligatoires doivent être remplis'
                });
            }

            // Find breeding
            const elevage = await Elevage.findOne({ 
                _id: req.params.id, 
                userId: req.user._id 
            });

            if (!elevage) {
                return res.status(404).json({
                    success: false,
                    message: 'Élevage non trouvé'
                });
            }

            // Process images
            const images = [];
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    try {
                        // Resize and optimize image
                        const processedBuffer = await sharp(file.buffer)
                            .resize(800, 800, {
                                fit: 'cover',
                                withoutEnlargement: true
                            })
                            .webp({ quality: 80 })
                            .toBuffer();

                        const key = `breeding/dogs/${Date.now()}-${file.originalname.split('.')[0]}.webp`;
                        const imageUrl = await uploadToS3(processedBuffer, key);
                        
                        images.push({
                            url: imageUrl,
                            isMain: images.length === 0 // First image is main
                        });
                    } catch (error) {
                        console.error('Image processing error:', error);
                    }
                }
            }

            // Create new dog object
            const newDog = {
                name,
                breed,
                age: {
                    years: parseInt(ageYears) || 0,
                    months: parseInt(ageMonths) || 0
                },
                gender,
                price: parseFloat(price),
                description,
                images,
                status,
                pedigree: {
                    has: pedigreeHas === 'true',
                    number: pedigreeNumber
                }
            };

            // Add dog to breeding
            elevage.dogs.push(newDog);
            await elevage.save();

            res.status(201).json({
                success: true,
                message: 'Chien ajouté avec succès',
                data: {
                    breedingId: elevage._id,
                    dogId: elevage.dogs[elevage.dogs.length - 1]._id
                }
            });

        } catch (error) {
            console.error('Error adding dog:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'ajout du chien'
            });
        }
    }
);


 // GET: Edit breeding page
router.get('/dashboard/breedings/:id/edit', isAuthenticated, async (req, res) => {
     try {
         const elevage = await Elevage.findOne({ _id: req.params.id, userId: req.user._id }).lean();
 
         if (!elevage) {
             return res.status(404).render('error', { message: "Élevage non trouvé." });
         }
 
         res.render('user/dashboard/elevage/edit', { elevage, user: req.user });
     } catch (error) {
         console.error('Error fetching breeding for edit:', error);
         res.status(500).render('error', { message: "Erreur lors de la récupération de l'élevage." });
     }
 });
 
 router.post('/dashboard/breedings/:id/edit', 
    isAuthenticated, 
    upload.single('logo'), 
    async (req, res) => {
        try {
            // Extract form data
            const {
                name,
                description,
                status,
                city,
                address,
                phone,
                email,
                whatsapp,
                website,
                services,
                'facilities[area]': area,
                'facilities[hasTrainingArea]': hasTrainingArea,
                'facilities[hasGroomingService]': hasGroomingService,
                'facilities[hasPension]': hasPension,
                'facilities[hasVetService]': hasVetService,
                'socialMedia[facebook]': facebook,
                'socialMedia[instagram]': instagram,
                'socialMedia[youtube]': youtube
            } = req.body;

            // Validation
            if (!name || !description || !city || !address || !phone || !email) {
                return res.status(400).json({
                    success: false,
                    message: 'Tous les champs obligatoires doivent être remplis',
                    errors: {
                        name: !name ? 'Le nom est requis' : null,
                        description: !description ? 'La description est requise' : null,
                        city: !city ? 'La ville est requise' : null,
                        address: !address ? 'L\'adresse est requise' : null,
                        phone: !phone ? 'Le téléphone est requis' : null,
                        email: !email ? 'L\'email est requis' : null
                    }
                });
            }

            // Find breeding
            const elevage = await Elevage.findOne({ 
                _id: req.params.id, 
                userId: req.user._id 
            });

            if (!elevage) {
                return res.status(404).json({
                    success: false,
                    message: 'Élevage non trouvé'
                });
            }

            // Handle logo upload
            if (req.file) {
                try {
                    const key = `breeding/logos/${Date.now()}-${req.file.originalname.split('.')[0]}.webp`;
                    const logoUrl = await uploadToS3(req.file.buffer, key);
                    elevage.logo = logoUrl;
                } catch (error) {
                    console.error('Logo upload error:', error);
                }
            }

            // Update basic info
            elevage.name = name;
            elevage.description = description;
            elevage.status = status;

            // Update location
            elevage.location = {
                city,
                address,
                // You might want to add geocoding here
                coordinates: elevage.location.coordinates
            };

            // Update contact info
            elevage.contactInfo = {
                phone,
                email,
                whatsapp: whatsapp || null,
                website: website || null,
                socialMedia: {
                    facebook: facebook || null,
                    instagram: instagram || null,
                    youtube: youtube || null
                }
            };

            // Update services
            elevage.services = Array.isArray(services) ? services : [];

            // Update facilities
            elevage.facilities = {
                area: parseInt(area) || 0,
                hasTrainingArea: hasTrainingArea === 'true',
                hasGroomingService: hasGroomingService === 'true',
                hasPension: hasPension === 'true',
                hasVetService: hasVetService === 'true'
            };

            // Update SEO
            elevage.seo = {
                metaTitle: `Élevage ${name} à ${city} | NDRESSILIK`,
                metaDescription: `Découvrez l'élevage ${name} à ${city}. ${description.substring(0, 150)}...`,
                keywords: [
                    'élevage', 'chiens', city.toLowerCase(),
                    name.toLowerCase(), 'maroc', 'éleveur professionnel',
                    ...elevage.services
                ]
            };

            // Update slug if name or city changed
            if (elevage.isModified('name') || elevage.isModified('location.city')) {
                const baseSlug = slugify(`elevage-${name}-${city}-maroc`, {
                    lower: true,
                    strict: true,
                    locale: 'fr'
                });
                const timestamp = Date.now();
                const randomString = Math.random().toString(36).substring(2, 8);
                elevage.slug = `${baseSlug}-${timestamp}-${randomString}`;
            }

            await elevage.save();

            res.json({
                success: true,
                message: 'Élevage mis à jour avec succès',
                data: {
                    id: elevage._id,
                    slug: elevage.slug,
                    redirectUrl: `/dashboard/breedings/${elevage._id}`
                }
            });

        } catch (error) {
            console.error('Error updating breeding:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour de l\'élevage',
                error: error.message
            });
        }
    }
);
 // DELETE: Delete an elevage
router.post('/dashboard/breedings/:id/delete', isAuthenticated, async (req, res) => {
     try {
         const elevage = await Elevage.findOne({ _id: req.params.id, userId: req.user._id });
 
         if (!elevage) {
             return res.status(404).send('Élevage non trouvé.');
         }
 
         // Perform deletion
         await Elevage.findByIdAndDelete(req.params.id);
 
         res.redirect('/dashboard/breedings');
     } catch (error) {
         console.error('Error deleting elevage:', error);
         res.status(500).send('Erreur lors de la suppression de l’élevage.');
     }
 });

 // Delete Dog
router.post('/dashboard/breedings/:id/dogs/:dogId/delete', isAuthenticated, async (req, res) => {
     try {
         const elevage = await Elevage.findOne({ _id: req.params.id, userId: req.user._id });
         if (!elevage) return res.status(404).send('Élevage non trouvé.');
 
         elevage.dogs = elevage.dogs.filter(dog => dog._id.toString() !== req.params.dogId);
         await elevage.save();
 
         res.redirect(`/dashboard/breedings/${req.params.id}`);
     } catch (error) {
         console.error('Error deleting dog:', error);
         res.status(500).send('Erreur lors de la suppression du chien.');
     }
 });
 
 // View Dog (optional, you can render a detailed page)
 router.get('/dashboard/breedings/:id/dogs/:dogId', isAuthenticated, async (req, res) => {
     try {
         const elevage = await Elevage.findOne({ _id: req.params.id, userId: req.user._id }).lean();
         if (!elevage) return res.status(404).send('Élevage non trouvé.');
 
         const dog = elevage.dogs.find(d => d._id.toString() === req.params.dogId);
         if (!dog) return res.status(404).send('Chien non trouvé.');
 
         res.render('user/dashboard/elevage/dog_details', { elevage, dog, user: req.user });
     } catch (error) {
         console.error('Error fetching dog details:', error);
         res.status(500).send('Erreur lors de la récupération des détails du chien.');
     }
 });
 

 // GET: Edit Dog Page
router.get('/dashboard/breedings/:id/dogs/:dogId/edit', isAuthenticated, async (req, res) => {
     try {
         const elevage = await Elevage.findOne({ _id: req.params.id, userId: req.user._id }).lean();
         if (!elevage) return res.status(404).send('Élevage non trouvé.');
 
         const dog = elevage.dogs.find(d => d._id.toString() === req.params.dogId);
         if (!dog) return res.status(404).send('Chien non trouvé.');
 
         res.render('user/dashboard/elevage/dog_edit', { elevage, dog, user: req.user });
     } catch (error) {
         console.error('Error fetching dog for edit:', error);
         res.status(500).send('Erreur lors de la récupération des détails du chien.');
     }
 });
 
// routes/breeding.js
router.post('/dashboard/breedings/:id/dogs/:dogId/edit', 
    isAuthenticated, 
    upload.array('images', 5), 
    async (req, res) => {
        try {
            const { 
                name, 
                ageYears, 
                ageMonths, 
                breed, 
                description,
                gender,
                price,
                status,
                pedigreeHas,
                pedigreeNumber 
            } = req.body;

            // Validation
            if (!name || !breed || !description) {
                return res.status(400).json({
                    success: false,
                    message: 'Les champs obligatoires doivent être remplis'
                });
            }

            // Find breeding and dog
            const elevage = await Elevage.findOne({ 
                _id: req.params.id, 
                userId: req.user._id 
            });

            if (!elevage) {
                return res.status(404).json({
                    success: false,
                    message: 'Élevage non trouvé'
                });
            }

            const dogIndex = elevage.dogs.findIndex(d => 
                d._id.toString() === req.params.dogId
            );

            if (dogIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Chien non trouvé'
                });
            }

            // Process new images if uploaded
            const images = [];
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    try {
                        const processedBuffer = await sharp(file.buffer)
                            .resize(800, 800, {
                                fit: 'cover',
                                withoutEnlargement: true
                            })
                            .webp({ quality: 80 })
                            .toBuffer();

                        const key = `breeding/dogs/${Date.now()}-${file.originalname.split('.')[0]}.webp`;
                        const imageUrl = await uploadToS3(processedBuffer, key);
                        
                        images.push({
                            url: imageUrl,
                            isMain: images.length === 0 // First image is main
                        });
                    } catch (error) {
                        console.error('Image processing error:', error);
                    }
                }
            }

            // Update dog details
            const updatedDog = {
                name,
                breed,
                age: {
                    years: parseInt(ageYears) || 0,
                    months: parseInt(ageMonths) || 0
                },
                gender,
                price: parseFloat(price),
                description,
                status: status || 'Disponible',
                pedigree: {
                    has: pedigreeHas === 'true',
                    number: pedigreeNumber
                }
            };

            // Only update images if new ones were uploaded
            if (images.length > 0) {
                updatedDog.images = images;
            }

            // Update the dog in the array
            elevage.dogs[dogIndex] = {
                ...elevage.dogs[dogIndex].toObject(),
                ...updatedDog
            };

            await elevage.save();

            res.json({
                success: true,
                message: 'Chien mis à jour avec succès',
                data: elevage.dogs[dogIndex]
            });

        } catch (error) {
            console.error('Error updating dog:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour du chien'
            });
        }
    }
);

// GET: All breedings with dynamic filters (public view)
router.get('/les-elevages', async (req, res) => {
     try {
         const { city, name } = req.query; // Get filters from query parameters
         const filter = {};
 
         // Add filters dynamically
         if (city) filter['location.city'] = { $regex: city, $options: 'i' }; // Case-insensitive city match
         if (name) filter.name = { $regex: name, $options: 'i' }; // Case-insensitive name match
 
         // Fetch filtered breedings
         const elevages = await Elevage.find(filter).lean();
 
         // Fetch distinct cities for dropdown
         const cities = await Elevage.distinct('location.city');
 
         // Meta information for SEO
         const pageTitle = 'Les Élevages - Trouvez un élevage près de chez vous';
         const description = 'Découvrez une liste complète des élevages disponibles. Trouvez les meilleurs élevages et leurs chiens.';
         const keywords = 'élevages, chiens, adoptions, élevages professionnels';
 
         res.render('user/elevages', {
             elevages,
             cities,
             pageTitle,
             description,
             keywords,
             filters: req.query,
         });
     } catch (error) {
         console.error('Error fetching filtered breedings or cities:', error);
         res.status(500).send('Erreur lors de la récupération des élevages.');
     }
 });
 
 
 // GET: Single breeding details (public view)
 router.get('/les-elevages/:slug', async (req, res) => {
     try {
         const elevage = await Elevage.findOne({slug : req.params.slug}).lean(); // Fetch specific breeding
         if (!elevage) {
             return res.status(404).render('error', { message: "Élevage non trouvé." });
         }
 
         // Meta information for SEO
         const pageTitle = `${elevage.name} - Détails de l'Élevage`;
         const description = `Découvrez l'élevage ${elevage.name} situé à ${elevage.location.city}. Contactez-nous pour plus d'informations.`;
         const keywords = `élevage ${elevage.name}, ${elevage.location.city}, chiens, adoptions`;
 
         res.render('user/elevage-details', { elevage, pageTitle, description, keywords });
     } catch (error) {
         console.error('Error fetching public breeding details:', error);
         res.status(500).send('Erreur lors de la récupération des détails de l’élevage.');
     }
 });
 

module.exports = router;
