const express = require('express')
const morgan = require('morgan')
const session = require('express-session')
const mongoose = require('mongoose');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');
const methodOverride = require('method-override');
const bodyParser = require('body-parser')
const flash = require('connect-flash')
const consultationRoutes = require('./routes/consultationRoutes');
const ensureAdminAuthenticated = require('./middlewares/ensureAdminAuthenticated')

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
          mongoUrl: process.env.DATABASE_URI
     })
}));
app.use(flash());
// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Method-override to support DELETE and PUT methods
app.use(methodOverride('_method'));
app.use(cookieParser());



mongoose.connect(process.env.DATABASE_URI).then(() => {
     app.listen(3000)
     console.log('database connected and listen to port 3000')
}).catch((e) => {
     console.log(e)
})

app.use((req, res, next) => {
     res.locals.user = req.user || null;
     next();
});


const publicRoutes = require('./routes/publicRoutes')
app.use(publicRoutes)

// const adminRoutes = require('./routes/adminRoutes')
// app.use('/admin', ensureAdminAuthenticated, adminRoutes)

// const marcheCanineRoutes = require('./routes/marcheCanineRoutes')
// app.use(marcheCanineRoutes)

// const authRoutes = require('./routes/authRoutes')
// app.use('/auth', authRoutes)


// const profileRoutes = require('./routes/profileRoutes')
// app.use('/profile', profileRoutes)


// const sellerRoutes = require('./routes/sellerRoutes')
// app.use('/seller', sellerRoutes)

// app.use(consultationRoutes);

app.use((req, res) => {
     res.render('marketplace/error', {
          title: 'عذرًا، الموقع تحت الصيانة'
     })
})