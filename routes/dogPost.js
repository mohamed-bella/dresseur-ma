const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const DogPost = require('../models/dogPost');
const { body, validationResult } = require('express-validator');
const asyncHandler = require('express-async-handler');
const sharp = require('sharp');

// AWS S3 configuration
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Seules les images sont autorisées!'), false);
        }
    },
});

// Utility function to upload images to S3
const uploadToS3 = async (buffer, key) => {
    // Resize image using sharp
    const resizedBuffer = await sharp(buffer)
        .resize({ width: 1024, withoutEnlargement: true })
        .toFormat('jpeg')
        .jpeg({ quality: 80 })
        .toBuffer();

    const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
        Body: resizedBuffer,
        ContentType: 'image/jpeg',
        ACL: 'public-read',
    });

    await s3.send(command);

    return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

// GET /chien - List of dog posts with filters
router.get('/chien-adoption-perdus', asyncHandler(async (req, res) => {
    // Validate and sanitize query parameters
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);
    const currentPage = !isNaN(page) && page > 0 ? page : 1;
    const perPage = !isNaN(limit) && limit > 0 ? limit : 9;
    const skip = (currentPage - 1) * perPage;

    // Build the filter object
    const filter = {};

    // Type filter
    if (req.query.type && ['adoption', 'perdu', 'trouve'].includes(req.query.type)) {
        filter.type = req.query.type;
    }

    // Location filter
    if (req.query.location) {
        const sanitizedLocation = req.query.location.trim();
        filter.location = new RegExp(sanitizedLocation, 'i'); // Case-insensitive search
    }

    // Breed filter
    if (req.query.breed) {
        const sanitizedBreed = req.query.breed.trim();
        filter.breed = new RegExp(sanitizedBreed, 'i');
    }

    // Age filter
    if (req.query.ageMin || req.query.ageMax) {
        filter.age = {};
        if (req.query.ageMin) {
            const ageMin = parseInt(req.query.ageMin, 10);
            if (!isNaN(ageMin)) {
                filter.age.$gte = ageMin;
            }
        }
        if (req.query.ageMax) {
            const ageMax = parseInt(req.query.ageMax, 10);
            if (!isNaN(ageMax)) {
                filter.age.$lte = ageMax;
            }
        }
    }

    // Retrieve posts with pagination
    const posts = await DogPost.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .lean();

    const total = await DogPost.countDocuments(filter);
    const totalPages = Math.ceil(total / perPage);

    res.render('user/dogPost/list', {
        posts,
        currentPage,
        totalPages,
        filter: req.query,
        perPage,
    });
}));

// GET /chien/:id - Get details of a specific dog post
router.get('/chien-adoption-perdus/:id', asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const post = await DogPost.findById(postId).lean();

    if (!post) {
        return res.status(404).render('error', { message: 'Annonce non trouvée.' });
    }

    // Find similar posts (same breed or type)
    const similarPosts = await DogPost.find({
        _id: { $ne: postId },
        $or: [
            { breed: post.breed },
            { type: post.type },
        ],
    })
        .limit(6)
        .lean();

    res.render('user/dogPost/details', {
        post,
        similarPosts,
    });
}));

// POST /submit - Submit a new dog post
router.post('/submit', upload.array('images', 5), [
    // Validation and sanitization
    body('type')
        .isIn(['adoption', 'perdu', 'trouve'])
        .withMessage('Type d\'annonce invalide.'),
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Le nom du chien est requis.')
        .isLength({ max: 50 })
        .withMessage('Le nom du chien ne doit pas dépasser 50 caractères.'),
    body('age')
        .isInt({ min: 0 })
        .withMessage('L\'âge doit être un nombre entier positif.'),
    body('breed')
        .trim()
        .notEmpty()
        .withMessage('La race est requise.')
        .isLength({ max: 50 })
        .withMessage('La race ne doit pas dépasser 50 caractères.'),
    body('description')
        .trim()
        .notEmpty()
        .withMessage('La description est requise.')
        .isLength({ max: 1000 })
        .withMessage('La description ne doit pas dépasser 1000 caractères.'),
    body('location')
        .trim()
        .notEmpty()
        .withMessage('La localisation est requise.')
        .isLength({ max: 100 })
        .withMessage('La localisation ne doit pas dépasser 100 caractères.'),
    body('email')
        .isEmail()
        .withMessage('Adresse email invalide.')
        .normalizeEmail(),
    body('phone')
        .trim()
        .matches(/^\+?[0-9\s\-]{7,15}$/)
        .withMessage('Numéro de téléphone invalide.'),
], asyncHandler(async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Return errors as JSON
        return res.status(400).json({ errors: errors.array() });
    }

    const { type, name, age, breed, description, location, email, phone } = req.body;

    // Upload images to S3
    const photoUrls = await Promise.all(req.files.map(async (file) => {
        const key = `dogposts/${Date.now()}_${file.originalname}`;
        const url = await uploadToS3(file.buffer, key);
        return url;
    }));

    // Create and save the post
    const newPost = new DogPost({
        type,
        name,
        age,
        breed,
        description,
        location,
        photos: photoUrls,
        contactInfo: { email, phone },
        createdAt: new Date(),
    });

    await newPost.save();

    res.status(201).json({
        success: true,
        message: 'Annonce publiée avec succès.',
        post: newPost,
    });
}));

// Error handling middleware
router.use((err, req, res, next) => {
    console.error(err.stack);
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        res.status(500).json({ success: false, message: err.message });
    } else {
        res.status(500).render('error', { message: 'Une erreur est survenue.' });
    }
});

module.exports = router;
