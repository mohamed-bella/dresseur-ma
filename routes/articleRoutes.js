const express = require('express');
const router = express.Router();
const Article = require('../models/article');
const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const path = require('path');
require('dotenv').config();
const sharp = require('sharp');
const cheerio = require('cheerio');
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


const isAdmin = (req, res, next) => {
     if (!req.session.isAuthenticated) {
          return res.redirect('/admin/login');
     }
     next()
}

// GET: Create new article
router.get('/admin/articles/new',isAdmin,  (req, res) => {
     // Categories array with value/label pairs
     const categories = [
          { value: 'dog-training', label: 'Dressage de chiens' },
          { value: 'dog-behavior', label: 'Comportement canin' },
          { value: 'puppy-training', label: 'Éducation des chiots' },
          { value: 'nutrition', label: 'Nutrition et alimentation' },
          { value: 'health', label: 'Santé et bien-être' },
          { value: 'grooming', label: 'Toilettage' },
          { value: 'breeds', label: 'Races de chiens' },
          { value: 'adoption', label: 'Adoption et sauvetage' },
          { value: 'tips', label: 'Conseils pratiques' },
          { value: 'accessories', label: 'Accessoires et équipement' },
          { value: 'veterinary', label: 'Soins vétérinaires' },
          { value: 'events', label: 'Événements canins' }
     ];

     // Tags array with common dog-related tags
     const tags = [
          'dressage',
          'comportement',
          'chiots',
          'alimentation',
          'santé',
          'toilettage',
          'races',
          'adoption',
          'conseils',
          'équipement',
          'vétérinaire',
          'événements',
          'obéissance',
          'socialisation',
          'jeux',
          'exercice',
          'propreté',
          'agressivité',
          'stress',
          'anxiété',
          'protection',
          'éducation',
          'dressage-positif',
          'clicker-training',
          'promenade',
          'sport-canin',
          'agility',
          'premiers-soins',
          'vaccination',
          'parasites',
          'nutrition',
          'régime-alimentaire',
          'accessoires',
          'jouets',
          'colliers',
          'laisses',
          'cages',
          'transport',
          'voyages',
          'garde',
          'pension',
          'assurance',
          'législation',
          'reproduction',
          'stérilisation'
     ];

     res.render('admin/newArticle',
          {
               title: 'New Article',
               categories,
               tags
          });
});

// GET : All Articles For Admin 
// GET: Fetch all articles
router.get('/admin/articles', isAdmin,  async (req, res) => {
     try {
         // Fetch all articles from the database, sorted by creation date (most recent first)
         const articles = await Article.find()
             .sort('-createdAt') // Sort by newest first
             .populate('comments') // Populate comments if needed
             .exec();
 
         // Render the articles management page and pass the articles data
         res.render('admin/articles', { articles });
     } catch (error) {
         console.error('Error fetching articles:', error);
         res.status(500).send('Server Error: Unable to fetch articles');
     }
 });

// POST: Submit new article
router.post('/admin/articles', upload.single('featuredImage'), async (req, res) => {
     console.log(req.body)
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
router.get('/admin/articles/:slug/edit', isAdmin, async (req, res) => {
     try {
         // Fetch the article using findOne for a single result
         const article = await Article.findOne({ slug: req.params.slug });
 
         // Check if the article exists
         if (!article) {
             req.flash('error', 'Article not found');
             return res.redirect('/admin/dashboard');
         }
 
         // Prepare categories and tags for rendering (replace with actual values)
         const categories = [
             { value: 'dog-trainers', label: 'Dresseurs de chiens' },
             { value: 'veterinarians', label: 'Vétérinaires' },
             { value: 'pet-stores', label: 'Magasins pour animaux' },
             { value: 'dog-sitters', label: 'Gardiens de chiens' },
             { value: 'behavioral-psychology', label: 'Psychologie comportementale' },
             { value: 'educational-training', label: 'Formation éducative' },
             { value: 'puppy-training', label: 'Formation des chiots' },
             { value: 'obedience-training', label: 'Formation à l\'obéissance' },
         ];
 
         const tags = [
             'dressage', 'comportement', 'chiots', 'alimentation', 
             'santé', 'toilettage', 'races', 'adoption',
         ];
 
         // Render the editArticle view with the necessary data
         res.render('admin/editArticle', { article, categories, tags });
     } catch (err) {
         console.error('Error fetching article:', err);
         req.flash('error', 'An error occurred while fetching the article');
         res.redirect('/admin/dashboard');
     }
 });
 

router.post('/admin/articles/:slug/edit',isAdmin, async (req, res) => {
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
router.post('/admin/articles/:id/delete',isAdmin, async (req, res) => {
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
     const slug = req.params.slug;

     try {
          const article = await Article.findOne({ slug });
          if (!article) {
               return res.status(404).send('Article not found');
          }

          // Load article content with Cheerio
          const $ = cheerio.load(article.content);
          const headings = [];

          // Extract headings and assign unique IDs
          $('h2').each(function (i, elem) {
               const headingText = $(this).text();
               const headingId = 'heading-' + i;
               headings.push({ id: headingId, text: headingText });
               $(this).attr('id', headingId); // Add unique ID to each heading
          });

          // Update article content with IDs
          article.content = $.html();
          const calculateReadingTime = (content) => {
               const wordsPerMinute = 200; // Average reading speed
               const text = content.replace(/<[^>]*>/g, ''); // Remove HTML tags
               const wordCount = text.trim().split(/\s+/).length; // Count words
               return Math.ceil(wordCount / wordsPerMinute); // Calculate reading time in minutes
          };

         // Dynamic SEO metadata
const pageTitle = `${article.title} - Articles sur ${article.category} | NDRESSILIK`;
const description = article.summary || 
    `${article.title} - Lisez notre article détaillé sur ${article.category} et obtenez des conseils pratiques, des informations utiles, et bien plus encore pour le bien-être des animaux.`;
const keywords = `${article.tags.join(', ')}, ${article.category}, bien-être animal, conseils animaux, articles NDRESSILIK`;

          const comments = await Comment.find({ article: article._id });

          // Pass data to the template
          res.render('user/article', {
               pageTitle,
               comments,
               description,
               keywords,
               article,
               headings,
               pageUrl: `https://www.ndressilik.com/articles/${slug}`,
               readTime: calculateReadingTime(article.content),
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