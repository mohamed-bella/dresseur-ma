const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const DogPost = require('../models/dogPost');

// Configuration S3
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Configuration Multer
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Seules les images sont autorisées!'), false);
        }
    },
});

// Page principale avec filtres
router.get('/chien', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;

        // Construire le filtre
        const filter = {};
        if (req.query.type) filter.type = req.query.type;
        if (req.query.location) filter.location = new RegExp(req.query.location, 'i');
        if (req.query.date) {
            const searchDate = new Date(req.query.date);
            filter.createdAt = {
                $gte: searchDate,
                $lt: new Date(searchDate.getTime() + 24 * 60 * 60 * 1000)
            };
        }

        // Récupérer les posts
        const posts = await DogPost.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await DogPost.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        res.render('user/dogPost/list', {
            posts,
            currentPage: page,
            totalPages,
            filter: req.query
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des annonces:', error);
        res.status(500).render('error', { 
            message: 'Erreur lors de la récupération des annonces.' 
        });
    }
});

// Récupérer les détails d'un post
router.get('/api/posts/:id', async (req, res) => {
    try {
        const post = await DogPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ 
                success: false, 
                message: 'Annonce non trouvée.' 
            });
        }
        res.json(post);
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération de l\'annonce.' 
        });
    }
});

// Soumettre une nouvelle annonce
router.post('/submit', upload.array('images', 5), async (req, res) => {
    try {
        const { type, name, age, breed, description, location, email, phone } = req.body;

        // Upload des images vers S3
        const photoUrls = await Promise.all(req.files.map(async file => {
            const key = `dogposts/${Date.now()}_${file.originalname}`;
            await s3.send(
                new PutObjectCommand({
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                    ACL: 'public-read',
                })
            );
            return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        }));

        // Créer et sauvegarder le post
        const newPost = new DogPost({
            type,
            name,
            age,
            breed,
            description,
            location,
            photos: photoUrls,
            contactInfo: { email, phone },
            createdAt: new Date()
        });
        await newPost.save();

        res.status(201).json({ 
            success: true, 
            message: 'Annonce publiée avec succès.',
            post: newPost 
        });
    } catch (error) {
        console.error('Erreur lors de la création de l\'annonce:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la publication de l\'annonce.' 
        });
    }
});

module.exports = router;