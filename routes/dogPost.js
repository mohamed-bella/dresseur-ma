const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const DogPost = require('../models/dogPost'); // Adjust path if needed

// S3 Configuration
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Multer Configuration for Image Uploads
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
  },
});

// Route: Get All Approved Posts (Adoption or Lost)
router.get('/dogpost', async (req, res) => {
  try {
    const { type } = req.query; // 'adoption' or 'lost'
    const posts = await DogPost.find({ type, status: 'approved' }).sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ success: false, message: 'Error fetching posts.' });
  }
});
// get add page
router.get('/dogpost/add', (req, res) => {
     res.render('user/dogPost/submit.ejs', {
      pageTitle :'',
      description : '',
      keywords : ''
     })
});

// Route: Submit a New Post
router.post('/submit', upload.single('photo'), async (req, res) => {
  try {
    const { type, name, age, breed, description, location, email, phone } = req.body;

    // Upload image to S3 if provided
    let photoUrl = null;
    if (req.file) {
      const key = `dogposts/${Date.now()}_${req.file.originalname}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
          ACL: 'public-read',
        })
      );
      photoUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    }

    // Save post to MongoDB
    const newPost = new DogPost({
      type,
      name,
      age,
      breed,
      description,
      location,
      photo: photoUrl,
      contactInfo: { email, phone },
      status: 'pending', // Admin approval required
    });
    await newPost.save();

    res.status(201).json({ success: true, message: 'Post submitted for review.', post: newPost });
  } catch (error) {
    console.error('Error submitting post:', error);
    res.status(500).json({ success: false, message: 'Error submitting post.' });
  }
});

router.get('/post/:id', async (req, res) => {
  try {
      const { id } = req.params;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(404).render('error', {
              message: 'Annonce non trouvée'
          });
      }

      // Fetch post with related posts
      const [post, relatedPosts] = await Promise.all([
          // Main post
          DogPost.findById(id).lean(),
          
          // Related posts (same type or breed)
          // DogPost.find({
          //     _id: { $ne: id },
          //     $or: [
          //         { type: post?.type },
          //         { breed: post?.breed }
          //     ]
          // })
          // .limit(3)
          // .lean()
      ]);

      if (!post) {
          return res.status(404).render('error', {
              message: 'Annonce non trouvée'
          });
      }

      // Increment view count
      await DogPost.findByIdAndUpdate(id, {
          $inc: { viewCount: 1 }
      });

      // Render template
      res.render('user/dogPost/details', {
        pageTitle : '',
        description : '',
        keywords : '',
          post,
          relatedPosts,
          pageTitle: `${post.name} - ${post.type === 'adoption' ? 'Adoption' : 'Chien perdu'}`
      });

  } catch (error) {
      console.error('Error fetching dog post details:', error);
      res.status(500).render('error', {
          message: 'Une erreur est survenue'
      });
  }
});

// Middleware to parse query parameters and set defaults
const parseQueryParams = (req, res, next) => {
  req.queryParams = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 12,
      sort: req.query.sort || '-createdAt',
      type: req.query.type,
      breed: req.query.breed,
      location: req.query.location,
      status: req.query.status || 'approved',
      search: req.query.search,
      minAge: req.query.minAge,
      maxAge: req.query.maxAge,
  };
  next();
};

// Get all dog posts with advanced filters and pagination
router.get('/chiens-adoption-et-perdus', parseQueryParams, async (req, res) => {
  try {
      const {
          page,
          limit,
          sort,
          type,
          breed,
          location,
          status,
          search,
          minAge,
          maxAge
      } = req.queryParams;
      // console.log(req.queryParams)

      // Build filter query
      const filters = { status: status };

      // Type filter
      if (type && ['adoption', 'lost'].includes(type)) {
          filters.type = type;
      }

      // Breed filter with case-insensitive regex
      if (breed) {
          filters.breed = { $regex: new RegExp(breed, 'i') };
      }

      // Location filter with case-insensitive regex
      if (location) {
          filters.location = { $regex: new RegExp(location, 'i') };
      }

      // Age range filter
      if (minAge || maxAge) {
          filters.age = {};
          if (minAge) filters.age.$gte = parseInt(minAge);
          if (maxAge) filters.age.$lte = parseInt(maxAge);
      }

      // Search functionality across multiple fields
      if (search) {
          filters.$or = [
              { name: { $regex: new RegExp(search, 'i') } },
              { description: { $regex: new RegExp(search, 'i') } },
              { breed: { $regex: new RegExp(search, 'i') } },
              { location: { $regex: new RegExp(search, 'i') } }
          ];
      }

      // Calculate skip value for pagination
      const skip = (page - 1) * limit;

      // Build sort object
      const sortObj = {};
      const [sortField, sortOrder] = sort.startsWith('-') ? 
          [sort.slice(1), -1] : [sort, 1];
      sortObj[sortField] = sortOrder;

      // Execute queries in parallel
      const [posts, total, aggregations] = await Promise.all([
          // Get paginated posts
          DogPost.find(filters)
              .sort(sortObj)
              .skip(skip)
              .limit(limit)
              .select('-__v')
              .lean(),

          // Get total count
          DogPost.countDocuments(filters),

          // Get aggregated stats
          DogPost.aggregate([
              { $match: filters },
              {
                  $group: {
                      _id: null,
                      totalAdoption: {
                          $sum: { $cond: [{ $eq: ['$type', 'adoption'] }, 1, 0] }
                      },
                      totalLost: {
                          $sum: { $cond: [{ $eq: ['$type', 'lost'] }, 1, 0] }
                      },
                      breeds: { $addToSet: '$breed' },
                      locations: { $addToSet: '$location' },
                      avgAge: { $avg: '$age' },
                      recentlyAdded: { 
                          $sum: { 
                              $cond: [
                                  { $gte: ['$createdAt', new Date(Date.now() - 24*60*60*1000)] },
                                  1,
                                  0
                              ]
                          }
                      }
                  }
              }
          ])
      ]);

      // Calculate pagination info
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      // Transform posts data if needed
      const transformedPosts = posts.map(post => ({
          ...post,
          createdAtFormatted: new Date(post.createdAt).toLocaleDateString('fr-FR'),
          isRecent: (Date.now() - new Date(post.createdAt)) < 24*60*60*1000,
          imageUrl: post.images?.[0]?.url || '/images/default-dog.jpg'
      }));

      // Prepare filter options for the frontend
      const filterOptions = {
          breeds: [...new Set(aggregations[0]?.breeds || [])].filter(Boolean).sort(),
          locations: [...new Set(aggregations[0]?.locations || [])].filter(Boolean).sort(),
          types: ['adoption', 'lost'],
          sortOptions: [
              { value: '-createdAt', label: 'Plus récents' },
              { value: 'createdAt', label: 'Plus anciens' },
              { value: 'name', label: 'Nom (A-Z)' },
              { value: '-name', label: 'Nom (Z-A)' }
          ]
      };

      // Send JSON if requested
      if (req.xhr || req.query.format === 'json') {
          return res.json({
              success: true,
              data: {
                  posts: transformedPosts,
                  pagination: {
                      current: page,
                      total: totalPages,
                      hasNext: hasNextPage,
                      hasPrev: hasPrevPage
                  },
                  stats: aggregations[0],
                  filterOptions
              }
          });
      }

      // Render the view
      console.log(transformedPosts)
      res.render('user/dogPost/list', {
        announcements: transformedPosts,
          total: totalPages,

          pagination: {
              current: page,
              total: totalPages,
              hasNext: hasNextPage,
              hasPrev: hasPrevPage
          },
          filters: req.queryParams,
          filterOptions,
          stats: aggregations[0] || {
              totalAdoption: 0,
              totalLost: 0,
              recentlyAdded: 0,
              avgAge: 0
          },
          currentUrl: req.originalUrl.split('?')[0],
          query: req.query,
          pageTitle: 'Chiens à Adopter et Chiens Perdus au Maroc | Trouvez ou Adoptez un Chien',
          description: 'Découvrez les annonces de chiens à adopter et de chiens perdus au Maroc. Trouvez un compagnon fidèle ou aidez à réunir un chien avec son propriétaire. Consultez les annonces près de chez vous.',
          keywords: 'adoption chien Maroc, chiens à adopter, chiens perdus, chiens disparus Maroc, adopter un chien Maroc, retrouver chien perdu',
      
      });

  } catch (error) {
      console.error('Error fetching dog posts:', error);

      // Send appropriate error response based on request type
      if (req.xhr || req.query.format === 'json') {
          return res.status(500).json({
              success: false,
              error: 'Une erreur est survenue lors de la récupération des annonces'
          });
      }

      res.status(500).render('error', {
          message: 'Une erreur est survenue lors de la récupération des annonces',
          error: process.env.NODE_ENV === 'development' ? error : {}
      });
  }
});

// Add post status update route
router.patch('/posts/:id/status', async (req, res) => {
  try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['active', 'resolved', 'expired'].includes(status)) {
          return res.status(400).json({
              success: false,
              error: 'Statut invalide'
          });
      }

      const post = await DogPost.findByIdAndUpdate(
          id,
          { 
              status,
              resolvedAt: status === 'resolved' ? new Date() : null
          },
          { new: true }
      );

      if (!post) {
          return res.status(404).json({
              success: false,
              error: 'Annonce non trouvée'
          });
      }

      res.json({
          success: true,
          data: post
      });

  } catch (error) {
      console.error('Error updating post status:', error);
      res.status(500).json({
          success: false,
          error: 'Une erreur est survenue lors de la mise à jour du statut'
      });
  }
});

// Add route for getting post statistics
router.get('/posts/stats', async (req, res) => {
  try {
      const stats = await DogPost.aggregate([
          {
              $group: {
                  _id: null,
                  totalPosts: { $sum: 1 },
                  totalAdoption: {
                      $sum: { $cond: [{ $eq: ['$type', 'adoption'] }, 1, 0] }
                  },
                  totalLost: {
                      $sum: { $cond: [{ $eq: ['$type', 'lost'] }, 1, 0] }
                  },
                  resolvedPosts: {
                      $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
                  },
                  avgResolutionTime: {
                      $avg: {
                          $cond: [
                              { $eq: ['$status', 'resolved'] },
                              { $subtract: ['$resolvedAt', '$createdAt'] },
                              null
                          ]
                      }
                  },
                  locationStats: {
                      $push: {
                          location: '$location',
                          type: '$type'
                      }
                  }
              }
          }
      ]);

      res.json({
          success: true,
          data: stats[0]
      });

  } catch (error) {
      console.error('Error fetching post statistics:', error);
      res.status(500).json({
          success: false,
          error: 'Une erreur est survenue lors de la récupération des statistiques'
      });
  }
});

// Route: Admin Approve a Post
router.post('/approve/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const post = await DogPost.findById(id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    post.status = 'approved';
    await post.save();

    res.json({ success: true, message: 'Post approved successfully.' });
  } catch (error) {
    console.error('Error approving post:', error);
    res.status(500).json({ success: false, message: 'Error approving post.' });
  }
});

// Route: Admin Reject a Post
router.post('/reject/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;
    const post = await DogPost.findById(id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    post.status = 'rejected';
    post.adminFeedback = feedback;
    await post.save();

    res.json({ success: true, message: 'Post rejected with feedback.' });
  } catch (error) {
    console.error('Error rejecting post:', error);
    res.status(500).json({ success: false, message: 'Error rejecting post.' });
  }
});

// Route: Delete a Post (Admin or Owner)
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const post = await DogPost.findById(id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    // Delete photo from S3 if exists
    if (post.photo) {
      const key = post.photo.split('.com/')[1];
      await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME, Key: key }));
    }

    // Delete post from MongoDB
    await DogPost.findByIdAndDelete(id);

    res.json({ success: true, message: 'Post deleted successfully.' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, message: 'Error deleting post.' });
  }
});

module.exports = router;
