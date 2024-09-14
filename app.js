const express = require('express')
const morgan = require('morgan')
const session = require('express-session')
const mongoose = require('mongoose');
const passport = require('passport');
const MongoStore = require('connect-mongo');
const methodOverride = require('method-override');
const bodyParser = require('body-parser')
const flash = require('connect-flash')
const consultationRoutes = require('./routes/consultationRoutes');

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


// const publicRoutes = require('./routes/publicRoutes')
// app.use(publicRoutes)

// const marcheCanineRoutes = require('./routes/marcheCanineRoutes')
// app.use(marcheCanineRoutes)

// const authRoutes = require('./routes/authRoutes')
// app.use('/auth', authRoutes)

// const sellerRoutes = require('./routes/sellerRoutes')
// app.use('/seller', sellerRoutes)


// Other app configurations...

app.use(consultationRoutes);

app.use((req, res) => {
     res.render('404', {
          title: 'page Not Found'
     })
})