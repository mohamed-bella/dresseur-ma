const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const multer = require('multer');

// Configure multer for image upload
const upload = multer({ storage: multer.memoryStorage() });

// POST route to handle image analysis
router.post('/analyze-breed', upload.single('image'), async (req, res) => {
     try {
          // Check if file exists
          if (!req.file) {
               return res.status(400).json({ error: 'No image file provided' });
          }

          const API_KEY = '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';
          // Using a specific dog breed classification model
          const MODEL_URL = 'https://api-inference.huggingface.co/models/microsoft/resnet-50';

          // Convert the image buffer to base64
          const imageBase64 = req.file.buffer.toString('base64');

          // Send the image for analysis
          const response = await fetch(MODEL_URL, {
               method: 'POST',
               headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
               },
               body: JSON.stringify({
                    // Properly format the base64 image with data URI scheme
                    inputs: `data:${req.file.mimetype};base64,${imageBase64}`
               })
          });

          if (!response.ok) {
               const errorText = await response.text();
               throw new Error(`API Error: ${response.status} - ${errorText}`);
          }

          const results = await response.json();

          // Process and format the results
          const formattedResults = results[0].map(prediction => ({
               breed: prediction.label,
               confidence: (prediction.score * 100).toFixed(2) + '%'
          }));

          // Send back the formatted results
          res.json({
               success: true,
               predictions: formattedResults
          });

     } catch (error) {
          console.error('Error analyzing breed:', error);
          res.status(500).json({
               success: false,
               error: error.message || 'Failed to analyze breed'
          });
     }
});

// Add a health check route
router.get('/health', (req, res) => {
     res.json({ status: 'ok' });
});

module.exports = router;