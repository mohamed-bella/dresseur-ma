const express = require('express');
const morgan = require('morgan');
const session = require('express-session');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');
const methodOverride = require('method-override');
const csurf = require('csurf');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet'); // Security headers
require('dotenv').config();

// Initialize the app
const app = express();
app.disable('x-powered-by'); // Disable the 'X-Powered-By' header for security

// Set view engine
app.set('view engine', 'ejs');

// Serve static files
app.use(express.static('public'));

// Middleware: Logging, parsing, cookie handling, and method override
app.use(morgan('dev')); // Log requests for development
app.use(bodyParser.urlencoded({ extended: true })); // Parse form submissions
app.use(cookieParser()); // Parse cookies
app.use(methodOverride('_method')); // Allow method override (for PUT, DELETE)

// Security: Helmet for setting secure HTTP headers
app.use(
     helmet({
          contentSecurityPolicy: {
               useDefaults: true,
               directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
                    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                    scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
                    imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://img.freepik.com'],
               },
          },
          referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
     })
);

// Express session setup with MongoStore for session persistence
app.use(
     session({
          secret: process.env.SESSION_SECRET || 'your-secret-key',
          resave: false,
          saveUninitialized: false,
          cookie: {
               secure: process.env.NODE_ENV === 'production', // Secure cookies in production
               httpOnly: true, // Prevent client-side JavaScript access to cookies
               sameSite: 'strict', // Protect against CSRF attacks
          },
          store: MongoStore.create({
               mongoUrl: process.env.DATABASE_URI, // Store sessions in MongoDB
          }),
     })
);

// Enable flash messages for user feedback
app.use(flash());

// Passport.js setup for authentication
require('./config/passport');
app.use(passport.initialize());
app.use(passport.session()); // Persistent login sessions

// CSRF protection middleware to secure form submissions
const csrfProtection = csurf({ cookie: true });
app.use(csrfProtection);

// Attach CSRF token to all views
app.use((req, res, next) => {
     res.locals.csrfToken = req.csrfToken();
     res.locals.user = req.user || null;
     next();
});

// Express Rate Limiting to protect against DDoS attacks
const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15-minute window
     max: 100, // Limit each IP to 100 requests per window
     message: 'Too many requests from this IP, please try again after 15 minutes.',
});
app.use(limiter);

// Database connection using Mongoose
mongoose
     .connect(process.env.DATABASE_URI, { useNewUrlParser: true, useUnifiedTopology: true })
     .then(() => {
          console.log('Connected to MongoDB');
          app.listen(3000, () => {
               console.log('Server is running on port 3000');
          });
     })
     .catch((err) => {
          console.error('Error connecting to MongoDB:', err);
     });

// Routes
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
// const adminRoutes = require('./routes/adminRoutes'); // Uncomment when needed
// const profileRoutes = require('./routes/profileRoutes'); // Uncomment when needed

app.use(userRoutes);
app.use(authRoutes);
// app.use('/admin', ensureAdminAuthenticated, adminRoutes); // Protect admin routes
// app.use('/profile', profileRoutes);

// Static folder for file uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 404 Handler
app.use((req, res) => {
     res.status(404).render('404', { title: '404 - Page Not Found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
     console.error(err.stack);
     res.status(500).send('Something went wrong!');
});
