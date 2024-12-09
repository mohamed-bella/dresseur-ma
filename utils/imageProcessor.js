const sharp = require('sharp');

/**
 * Process and resize the uploaded image.
 * 
 * @param {Buffer} imageBuffer - The buffer of the uploaded image.
 * @param {Object} options - Options for image processing.
 * @param {number} [options.width] - Desired width of the image (optional).
 * @param {number} [options.height] - Desired height of the image (optional).
 * @returns {Promise<Buffer>} - The processed image buffer.
 */
async function processImage(imageBuffer, options = {}) {
    try {
        // Default options
        const { width = 800, height = null } = options;

        // Process the image (resize and optimize)
        const processedImage = await sharp(imageBuffer)
            .resize({
                width,
                height,
                fit: sharp.fit.inside, // Maintain aspect ratio
                withoutEnlargement: true, // Avoid enlarging small images
            })
            .toFormat('webp') // Convert to WebP format for optimization
            .toBuffer();

        return processedImage;
    } catch (error) {
        console.error('Error processing image:', error.message);
        throw new Error('Image processing failed.');
    }
}

module.exports = {
    processImage,
};
