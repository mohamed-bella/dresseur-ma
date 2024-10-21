const express = require('express');
const router = express.Router();
const Article = require('../models/article');
const { isAuthor } = require('../middlewares/auth');
const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const path = require('path');
require('dotenv').config();
const sharp = require('sharp');
const slugify = require('slugify');
const Comment = require('../models/comment');
const { body, validationResult } = require('express-validator');


// Set up multer for file uploads (saving locally)
const storage = multer.memoryStorage();


const upload = multer({
     storage: storage, // Use memory storage to hold files in buffer
     limits: { fileSize: 10 * 1024 * 1024 } // Limit file size to 10MB (adjust as needed)
});

// Configure AWS S3 Client with the correct region
const s3 = new S3Client({
     region: 'eu-north-1', // Ensure the region matches your S3 bucket
     credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
     }
});




// GET: Create new article
router.get('/admin/articles/new', isAuthor, (req, res) => {
     res.render('admin/newArticle', { title: 'New Article' });
});

// POST: Submit new article
router.post('/admin/articles', isAuthor, upload.single('featuredImage'), async (req, res) => {

     const { title, category, summary, seoTitle, seoDescription, keywords, author } = req.body;
     let { tags } = req.body;

     // Ensure 'tags' is treated as a string
     if (Array.isArray(tags)) {
          tags = tags.join(','); // If it comes as an array, convert it to a string
     }

     let content = req.body.content;

     // If content is received as an array, join it into a single string
     if (Array.isArray(content)) {
          content = content.join(' ');  // Joins array elements into a single string
     }

     // Generate slug
     const currentDate = new Date().toISOString().slice(0, 10); // Get current date in YYYY-MM-DD format
     const randomNum = Math.floor(1000 + Math.random() * 9000); // Generate a random 4-digit number
     const slug = slugify(`${title}-${currentDate}-${randomNum}`, { lower: true, strict: true });

     try {
          // Initialize imageUrl as null (for when no image is uploaded)
          let imageUrl = null;

          // Handle image upload to S3 if a file was uploaded
          if (req.file) {
               const buffer = await sharp(req.file.buffer)
                    .webp({ quality: 80 })
                    .toBuffer();

               const key = `uploads/${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;

               const uploadParams = {
                    Bucket: process.env.AWS_S3_BUCKET_NAME, // Your S3 bucket name
                    Key: key,
                    Body: buffer,
                    ContentType: 'image/webp'
               };

               const parallelUploads3 = new Upload({
                    client: s3,
                    params: uploadParams
               });

               const data = await parallelUploads3.done();
               imageUrl = data.Location; // Save the uploaded image URL
          }

          // Create new article
          const newArticle = new Article({
               title,
               slug, // Save the generated slug
               content,
               category,
               tags: tags.split(',').map(tag => tag.trim()),
               summary,
               featuredImage: imageUrl, // Store the S3 URL or null if no image was uploaded
               author,
               seo: {
                    title: seoTitle,
                    description: seoDescription,
                    keywords: keywords.split(',').map(keyword => keyword.trim())
               }
          });

          // Save the new article in the database
          await newArticle.save();

          // Send back a proper JSON response
          req.flash('success', 'Article created successfully');
          res.json({
               success: true,
               message: 'Article created successfully',
               articleId: newArticle._id, // Send article ID back to the client
               slug: newArticle.slug  // Include the generated slug in the response
          });
     } catch (error) {
          console.error('Error creating article:', error);
          res.status(500).json({
               success: false,
               message: 'Server Error: Unable to create article'
          });
     }
});
// GET: Edit article
router.get('/admin/articles/:slug/edit', isAuthor, async (req, res) => {
     try {
          const article = await Article.find({ slug: req.params.slug });
          res.render('admin/editArticle', { article: article[0] });
     } catch (err) {
          console.error('Error fetching article:', err);
          res.redirect('/admin/dashboard');
     }
});

router.post('/admin/articles/:slug/edit', async (req, res) => {
     const { slug } = req.params;
     console.log(req.body)

     // Validation errors


     try {
          const updatedData = {
               title: req.body.title,
               summary: req.body.summary,
               content: req.body.content,
               category: req.body.category,
               seo: {
                    title: req.body.seoTitle,
                    description: req.body.seoDescription,
                    keywords: req.body.keywords ? req.body.keywords.split(',').map(keyword => keyword.trim()) : []
               },
               tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
               author: req.body.author
          };



          // console.log(updatedData)

          // Update article in the database
          await Article.findOneAndUpdate({ slug }, updatedData, { new: true });

          req.flash('success', 'Article updated successfully.');
          res.redirect('/admin/dashboard');
     } catch (error) {
          console.error(error);
          req.flash('error', 'Error updating article.');
          res.redirect(`/admin/articles/${slug}/edit`);
     }
});

// DELETE: Delete article
router.post('/admin/articles/:id/delete', isAuthor, async (req, res) => {
     try {
          await Article.findByIdAndDelete(req.params.id);
          req.flash('success', 'Article deleted successfully');
          res.redirect('/admin/dashboard');
     } catch (err) {
          console.error('Error deleting article:', err);
          res.redirect('/admin/dashboard');
     }
});

// GET THE ARTICLE BY SLUG AND DISPLAY IT IN THE ARTICLE PAGE
router.get('/articles/:slug', async (req, res) => {

     const calculateReadingTime = (content) => {
          const wordsPerMinute = 200; // Average reading speed
          const text = content.replace(/<[^>]*>/g, ''); // Remove HTML tags if any
          const wordCount = text.trim().split(/\s+/).length; // Count the words
          const readingTime = Math.ceil(wordCount / wordsPerMinute); // Calculate the reading time
          return readingTime;
     };



     const slug = req.params.slug;

     try {
          // Find the article by slug
          const article = await Article.findOne({ slug });
          const pageUrl = `https://www.ndressilik.com/articles/${article.slug}`;

          if (!article) {
               return res.status(404).send('Article not found');
          }

          // Find comments related to this article
          const comments = await Comment.find({ article: article._id });

          // Fetch suggested articles from the same category, limit to 5
          const suggestedArticles = await Article.find({
               category: article.category,
               _id: { $ne: article._id } // Exclude the current article
          }).limit(5);
          const readTime = calculateReadingTime(article.content);
          console.log(readTime)
          res.render('user/article', {
               article,
               comments,
               pageUrl,
               readTime,
               suggestedArticles, // Pass the suggested articles to the template
               success: req.flash('success'),
               error: req.flash('error')
          });
     } catch (err) {
          console.error('Error fetching article:', err);
          res.status(500).send('Server Error');
     }
});


// POST comment on an article
router.post('/articles/:slug/comments', async (req, res) => {
     const { name, email, comment } = req.body;
     const slug = req.params.slug;

     try {
          const article = await Article.findOne({ slug });

          if (!article) {
               req.flash('error', 'Article not found');
               return res.redirect(`/articles/${slug}`);
          }

          // Create a new comment
          const newComment = new Comment({
               article: article._id,
               name,
               email,
               comment,
               createdAt: new Date()
          });

          await newComment.save();

          req.flash('success', 'Comment added successfully');
          res.redirect(`/articles/${slug}`);
     } catch (err) {
          console.error('Error posting comment:', err);
          req.flash('error', 'Error adding comment');
          res.redirect(`/articles/${slug}`);
     }
});
module.exports = router;