const express = require('express');
const router = express.Router();
const multer = require('multer');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Configure multer for in-memory storage
const upload = multer({ storage: multer.memoryStorage() });

// POST route to analyze dog breed
router.post('/analyze-breed', upload.single('image'), async (req, res) => {
     try {
          if (!req.file) {
               return res.status(400).json({ error: 'No image file provided' });
          }

          const API_KEY = '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';
          const MODEL_URL = 'https://api-inference.huggingface.co/models/microsoft/resnet-50';

          const imageBase64 = req.file.buffer.toString('base64');

          const response = await fetch(MODEL_URL, {
               method: 'POST',
               headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
               },
               body: JSON.stringify({ inputs: imageBase64 })
          });

          if (!response.ok) {
               throw new Error(`API Error: ${response.status} - ${await response.text()}`);
          }

          const results = await response.json();
          res.json(results);

     } catch (error) {
          console.error('Error analyzing breed:', error);
          res.status(500).json({ error: error.message || 'Failed to analyze breed' });
     }
});

module.exports = router;
