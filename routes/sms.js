
const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const upload = multer({ dest: process.env.UPLOADS_FOLDER || 'uploads/' });


// Render the upload form
router.get('/git', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Upload Image</title>
        </head>
        <body>
            <form action="/upload" method="POST" enctype="multipart/form-data">
                <label for="image">Upload an Image:</label>
                <input type="file" name="image" id="image" required>
                <button type="submit">Upload</button>
            </form>
        </body>
        </html>
    `);
});

// Handle image upload
router.post('/upload', upload.single('image'), async (req, res) => {
    try {
        const imagePath = req.file.path;
        const imageName = req.file.originalname;

        // Read the file and convert it to base64
        const fileContent = fs.readFileSync(imagePath, 'base64');

        // GitHub API endpoint
        const githubApiUrl = `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/images/${imageName}`;

        // Send the file to GitHub
        const response = await axios.put(
            githubApiUrl,
            {
                message: `Upload image ${imageName}`,
                content: fileContent,
            },
            {
                headers: {
                    Authorization: `token ${process.env.GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        // Get the URL of the uploaded image
        const imageUrl = response.data.content.download_url;

        // Clean up local file
        fs.unlinkSync(imagePath);

        // Send the link back to the user
        res.send(`<p>Image uploaded successfully: <a href="${imageUrl}" target="_blank">${imageUrl}</a></p>`);
    } catch (error) {
        console.error('Error uploading to GitHub:', error.message);
        res.status(500).send('Error uploading image.');
    }
});

module.exports = router;