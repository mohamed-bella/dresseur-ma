const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const axios = require('axios');

// Multer setup for file upload
const storage = multer.memoryStorage();
const upload = multer({
     storage: storage,
     limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).single('image');

// Routes
router.get('/analyse-chien', (req, res) => {
     res.render('user/ai', {
          pageTitle: 'Analyse de Race de Chien - NDRESSILIK',
          description: 'Découvrez la race de votre chien grâce à notre outil d\'analyse par IA',
          keywords: 'analyse chien, race de chien, IA, reconnaissance de race'
     });
});

router.post('/api/analyze-dog', upload, async (req, res) => {
     if (!req.file) {
          return res.status(400).json({
               success: false,
               message: 'Veuillez sélectionner une image'
          });
     }

     try {
          // Process image
          const processedImage = await sharp(req.file.buffer)
               .resize(400, 400, { fit: 'inside' })
               .toBuffer();

          // Send image to Nyckel API for breed analysis
          const nyckelResponse = await axios.post('https://www.nyckel.com/v1/functions/dog-breed-identifier/invoke',
               processedImage, {
               headers: {
                    'Authorization': `Bearer py0j620qb4ami28suz5c4zwdzjuj6n5n1yoc20l6jd0yx92tnq7jvfdp1nkm7gko`, // Use the API key securely
                    'Content-Type': 'multipart/form-data',
                    'X-Client-ID': `lv4qfppootfda2jr8k4c27vkvvj2j1rh` // Include the Client ID as a custom header
               }
          });

          // Handle the response from Nyckel API
          const { predicted_breed, confidence, other_possibilities } = nyckelResponse.data;

          res.status(200).json({
               success: true,
               data: {
                    breed: predicted_breed,
                    confidence: Math.round(confidence * 100),
                    otherPredictions: other_possibilities
               }
          });
     } catch (error) {
          console.error('Error:', error);
          res.status(500).json({
               success: false,
               message: 'Erreur lors de l\'analyse de l\'image'
          });
     }
});

module.exports = router;
