const express = require('express');
const router = express.Router();
const User = require('../models/user'); // Replace with the correct path
const multer = require('multer');
const { processImage } = require('../utils/imageProcessor');
const uploadToGitHub = require('../utils/GitHubImagesUploader');

// Multer configuration for image uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per image
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    },
});

// Route: Render gallery page
router.get('/gallery', async (req, res) => {
    res.render('user/dashboard/gallery', {
        path: 'gallery',
        pageTitle: "Galerie de " + req.user.displayName,
        user: req.user,
    });
});

// Route: Upload photos to gallery
router.post('/gallery/upload', upload.array('filepond', 20), async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        // Check gallery size limit
        if (user.gallery.length + req.files.length > 20) {
            return res.status(400).json({ success: false, message: 'Maximum de 20 photos autorisées.' });
        }

        const photoUrls = await Promise.all(
            req.files.map(async (file) => {
                // Resize and optimize image
                const resizedImage = await processImage(file.buffer);

                // Define GitHub path
                const key = `users/${user._id}/gallery/${Date.now()}_${file.originalname}`;

                // Upload to GitHub
                const uploadResult = await uploadToGitHub([
                    {
                        path: key,
                        content: resizedImage,
                    },
                ]);

                if (uploadResult.success.length > 0) {
                    return uploadResult.success[0].url;
                } else {
                    throw new Error('Failed to upload image to GitHub');
                }
            })
        );

        // Add URLs to user's gallery
        user.gallery.push(...photoUrls);
        await user.save();

        res.json({ success: true, message: 'Photos téléchargées avec succès.', photoUrls });
    } catch (error) {
        console.error('Gallery upload error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors du téléchargement.' });
    }
});

// Route: Delete a photo from gallery
router.delete('/gallery/delete', async (req, res) => {
    try {
        const { photo } = req.body;
        const user = await User.findById(req.user._id);

        if (!user.gallery.includes(photo)) {
            return res.status(404).json({ success: false, message: 'Photo non trouvée dans la galerie.' });
        }

        const key = photo.split('.com/')[1]; // Extract the GitHub path from the URL

        // Simulate GitHub deletion (if necessary, implement a delete function for GitHub)
        // GitHub API does not natively allow deletions via direct calls; this logic depends on the project setup.
        // For now, remove the URL from the gallery.
        user.gallery = user.gallery.filter((url) => url !== photo);
        await user.save();

        res.json({ success: true, message: 'Photo supprimée avec succès.' });
    } catch (error) {
        console.error('Gallery delete error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la suppression.' });
    }
});

module.exports = router;
