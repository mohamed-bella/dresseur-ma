const express = require('express');
const router = express.Router();
const Article = require('../models/article');
const { isAuthor } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');
const slugify = require('slugify');
const Comment = require('../models/comment');

// Set up multer for file uploads
const storage = multer.diskStorage({
     destination: function (req, file, cb) {
          cb(null, 'uploads');
     },
     filename: function (req, file, cb) {
          cb(null, Date.now() + path.extname(file.originalname));
     }
});

const upload = multer({ storage: storage });

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
          const newArticle = new Article({
               title,
               slug, // Save the generated slug
               content,
               category,
               tags: tags.split(',').map(tag => tag.trim()),
               summary,
               featuredImage: req.file ? `/uploads/${req.file.filename}` : null,
               author: author,
               seo: {
                    title: seoTitle,
                    description: seoDescription,
                    keywords: keywords.split(',').map(keyword => keyword.trim())
               }
          });
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
          const article = await Article.findById(req.params.id);
          res.render('admin/editArticle', { article });
     } catch (err) {
          console.error('Error fetching article:', err);
          res.redirect('/admin/dashboard');
     }
});

// POST: Update article
router.post('/admin/articles/:slug', isAuthor, upload.single('featuredImage'), async (req, res) => {
     const { title, content, category, tags, summary, seoTitle, seoDescription, keywords, status } = req.body;

     try {
          const updateData = {
               title,
               content,
               category,
               tags: tags.split(',').map(tag => tag.trim()),
               summary,
               status,
               seo: {
                    title: seoTitle,
                    description: seoDescription,
                    keywords: keywords.split(',').map(keyword => keyword.trim())
               }
          };

          if (req.file) {
               updateData.featuredImage = `/uploads/${req.file.filename}`;
          }

          await Article.findByIdAndUpdate(req.params.id, updateData);
          req.flash('success', 'Article updated successfully');
          res.redirect('/admin/dashboard');
     } catch (err) {
          console.error('Error updating article:', err);
          res.redirect(`/admin/articles/${req.params.id}/edit`);
     }
});

// DELETE: Delete article
router.post('/admin/articles/:slug/delete', isAuthor, async (req, res) => {
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

          res.render('user/article', {
               article,
               comments,
               pageUrl,
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