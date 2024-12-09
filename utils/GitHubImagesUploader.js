const axios = require('axios');

/**
 * Uploads files to GitHub and returns their links or an error.
 * 
 * @param {Array} files - Array of file objects with "path" (key) and "content" (buffer).
 * @returns {Promise<Object>} - Result object with success or error details.
 */
async function uploadToGitHub(files) {
    const GITHUB_OWNER = process.env.GITHUB_OWNER;
    const GITHUB_REPO = process.env.GITHUB_REPO;
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    if (!GITHUB_OWNER || !GITHUB_REPO || !GITHUB_TOKEN) {
        throw new Error('Missing required GitHub environment variables.');
    }

    const uploadedFiles = [];
    const errors = [];

    for (const file of files) {
        try {
            const githubApiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${file.path}`;

            const response = await axios.put(
                githubApiUrl,
                {
                    message: `Upload image ${file.path}`,
                    content: file.content.toString('base64'), // Convert buffer to Base64
                },
                {
                    headers: {
                        Authorization: `token ${GITHUB_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            uploadedFiles.push({
                fileName: file.path,
                url: response.data.content.download_url,
            });
        } catch (error) {
            console.error(`Error uploading ${file.path}:`, error.message);
            errors.push({
                fileName: file.path,
                error: error.message,
            });
        }
    }

    return {
        success: uploadedFiles,
        failed: errors,
    };
}

module.exports = uploadToGitHub;
