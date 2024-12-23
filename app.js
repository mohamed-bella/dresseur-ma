const express = require('express');
const session = require('express-session');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');
const minifyHTML = require('express-minify-html');
const flash = require('connect-flash');
require('dotenv').config();
const Elevage = require('./models/elevage')
require('./config/passport');

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser()); // Ensure cookieParser is before session middleware
require('punycode');

// View Engine
app.set('view engine', 'ejs');

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Express session middleware with MongoDB store

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false, // Recommended to save only authenticated sessions
    store: MongoStore.create({
        mongoUrl: process.env.DATABASE_URI,
        collectionName: 'sessions', // Optional: use a specific collection
        ttl: 14 * 24 * 60 * 60, // Session expiration in seconds
        autoRemove: 'native' // Auto-remove expired sessions
    }),
    cookie: {
        maxAge: 14 * 24 * 60 * 60 * 1000, // Match TTL in milliseconds
    }
}));



// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Method override for PUT and DELETE methods in forms
app.use(methodOverride('_method'));

// Flash messages middleware
app.use(flash());
app.use((req, res, next) => {
     res.locals.messages = req.flash(); // This will make `messages` available in all views
     next();
});

// Global variables for flash messages and user info
app.use((req, res, next) => {
     res.locals.success = req.flash('success');
     res.locals.error = req.flash('error');
     res.locals.user = req.user || null; // Make user globally available in views
     next();
});
app.use((req, res, next) => {
     const originalSend = res.send;
     res.send = function (body) {
          const contentLength = Buffer.byteLength(body);
          console.log(`Response size: ${contentLength} bytes`);
          res.set('Content-Length', contentLength);
          originalSend.call(this, body);
     };
     next();
});

// HTML Minification middleware
// app.use(minifyHTML({
//      override: true,
//      htmlMinifier: {
//           removeComments: true,
//           collapseWhitespace: true,
//           minifyJS: true,
//           minifyCSS: true,
//      },
// }));

// CONNECT TO DATABASE
mongoose.connect(process.env.DATABASE_URI, {
     useNewUrlParser: true,
     useUnifiedTopology: true,
})
     .then(() => {
          app.listen(3000, () => console.log('Database connected and listening on port 3000'));
     })
     .catch((err) => console.log(`Error connecting to the database: ${err.message}`));

// Routes
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const articleRoutes = require('./routes/articleRoutes');
const contactRoute = require('./routes/contactRoute');
const serviceRoutes = require('./routes/serviceRoutes');
const aiRoutes = require('./routes/aiRoutes');
const profileRoutes = require('./routes/profileRoutes');
const galeryRoutes = require('./routes/galeryRoutes');
const analyzeBreedRouter = require('./routes/analyzeBreed');
const dogPostRouter = require('./routes/dogPost');
const smsRouter = require('./routes/sms');
const breedsRoutes = require('./routes/breedRoutes');
const elevageRoutes = require('./routes/elevageRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const dogRecommendationsRouter = require('./routes/dogRecommendations');
app.use('/', dogRecommendationsRouter);

app.get('/sms', (req, res) => {
     res.render('user/sms')
})
app.get('/dog-breeds-analyzer', (req, res) => {
     res.render('user/dog-breeds-analyzer', {
          pageTitle: 'تحليل سلالات الكلاب - اكتشف سلالة الكلب من الصورة',
          description: 'استخدم أداة تحليل سلالات الكلاب الخاصة بنا لمعرفة سلالة الكلب من خلال صورة. اكتشف المزيد حول السلالات المختلفة وخصائصها.',
          keywords: 'تحليل سلالات الكلاب, اكتشف سلالة الكلب, معرفة سلالة الكلب من الصورة, سلالات الكلاب, الكلاب في المغرب',
          currentUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`
     });
});

app.use('/', analyzeBreedRouter);

const checkBreedingStatus = async (req, res, next) => {
     try {
         if (req.user) {
             // Check if user has any breeding
             const breeding = await Elevage.findOne({ userId: req.user._id });
             res.locals.hasBreeding = !!breeding;
             res.locals.userBreeding = breeding; // Pass the breeding object if needed
         } else {
             res.locals.hasBreeding = false;
             res.locals.userBreeding = null;
         }
         next();
     } catch (error) {
         console.error('Error checking breeding status:', error);
         res.locals.hasBreeding = false;
         res.locals.userBreeding = null;
         next();
     }
 };
 app.use(checkBreedingStatus)

app.use(userRoutes);
app.use(breedsRoutes);
app.use(elevageRoutes)
app.use(dogPostRouter);
app.use(authRoutes);
app.use(adminRoutes);
app.use(articleRoutes);
app.use(contactRoute);
app.use(serviceRoutes);
app.use(aiRoutes);
app.use(smsRouter);
app.use('/dashboard', profileRoutes);
app.use('/dashboard', galeryRoutes);
app.get('/test', (req, res) => {
     res.render('test')
})
const searchRouter = require('./routes/search');
app.use(searchRouter);
app.use('/dashboard', dashboardRoutes)

const unreadRequests = require('./middlewares/globals');

// Add after your authentication middleware
app.use('/dashboard',unreadRequests);

// Error handling middleware (404)
app.use((req, res) => {
     res.status(404).render('user/404', { message: 'Page Not Found' });
});

// Global error handling middleware
app.use((err, req, res, next) => {
     console.error(err.stack);
     res.status(500).render('user/500', { message: 'Something went wrong!' });
});
