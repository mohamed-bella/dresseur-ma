const express = require('express')
const morgan = require('morgan')
const session = require('express-session')
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');
const methodOverride = require('method-override');
const bodyParser = require('body-parser')
const minifyHTML = require('express-minify-html');

const flash = require('connect-flash')
// const consultationRoutes = require('./routes/consultationRoutes');
// const ensureAdminAuthenticated = require('./middlewares/ensureAdminAuthenticated')

require('./config/passport')
require('dotenv').config()
const app = express()

app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }))
// Express session middleware
app.use(session({
     secret: 'your-secret-key',
     resave: false,
     saveUninitialized: true,
     store: MongoStore.create({
          mongoUrl: process.env.DATABASE_URI,
          ttl: 14 * 24 * 60 * 60, // Keep session for 14 days
          autoRemove: 'native' // Automatically remove expired sessions
     })
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(flash());
// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// CONNECT TO DATAbase
mongoose.connect(process.env.DATABASE_URI).then(() => {
     app.listen(3000)
     console.log('database connected and listen to port 3000')
}).catch((e) => {
     console.log(e)
})
// GLOBAL MIDDLEWARE
app.use((req, res, next) => {
     res.locals.user = req.user || null;
     next();
});

// Middleware to make flash messages available in all views
app.use((req, res, next) => {
     res.locals.messages = req.flash();
     next();
});
app.use(minifyHTML({
     override: true,
     htmlMinifier: {
          removeComments: true,
          collapseWhitespace: true,
          minifyJS: true,
          minifyCSS: true
     }
}));
// ROUTES
const userRoutes = require('./routes/userRoutes')
app.use(userRoutes)

const authRoutes = require('./routes/authRoutes')
app.use(authRoutes)


const adminRoutes = require('./routes/adminRoutes')
app.use(adminRoutes)


const articleRoutes = require('./routes/articleRoutes')
app.use(articleRoutes)
// const marcheCanineRoutes = require('./routes/marcheCanineRoutes')
// app.use(marcheCanineRoutes)



// const profileRoutes = require('./routes/profileRoutes')
// app.use('/profile', profileRoutes)


// const sellerRoutes = require('./routes/sellerRoutes')
// app.use('/seller', sellerRoutes)

// app.use(consultationRoutes);

// 404 page

app.use((req, res) => {
     res.send('404')
})