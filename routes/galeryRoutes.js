const express = require('express');
const router = express.Router();
const User = require('../models/user'); // Replace with the correct path
const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// S3 Configuration
const s3 = new S3Client({
     region: process.env.AWS_REGION,
     credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
     }
});

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
     }
});

router.get('/galery', async (req, res) => {
     res.render('user/dashboard/galery', {
          pageTitle: "Galerie de " + req.user.displayName,
          user: req.user
     });

})

// Route: Upload photos to gallery
router.post('/gallery/upload', upload.array('filepond', 20), async (req, res) => {
     try {
          const user = await User.findById(req.user._id);
          if (user.gallery.length + req.files.length > 20) {
               return res.status(400).json({ success: false, message: 'Maximum de 20 photos autorisées.' });
          }

          const photoUrls = await Promise.all(
               req.files.map(async (file) => {
                    const key = `users/${user._id}/gallery/${Date.now()}_${file.originalname}`;

                    await s3.send(new PutObjectCommand({
                         Bucket: process.env.AWS_S3_BUCKET_NAME,
                         Key: key,
                         Body: file.buffer,
                         ContentType: file.mimetype,
                         ACL: 'public-read'
                    }));

                    return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
               })
          );

          user.gallery.push(...photoUrls);
          await user.save();

          res.json({ success: true, message: 'Photos téléchargées avec succès.' });
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

          const key = photo.split('.com/')[1];

          await s3.send(new DeleteObjectCommand({
               Bucket: process.env.AWS_S3_BUCKET_NAME,
               Key: key
          }));

          user.gallery = user.gallery.filter((url) => url !== photo);
          await user.save();

          res.json({ success: true, message: 'Photo supprimée avec succès.' });
     } catch (error) {
          console.error('Gallery delete error:', error);
          res.status(500).json({ success: false, message: 'Erreur lors de la suppression.' });
     }
});

module.exports = router;
