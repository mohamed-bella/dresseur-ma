// middleware/auth.js
module.exports = {
     ensureAuthenticated: function (req, res, next) {
          if (req.isAuthenticated()) {
               return next();
          }
          req.flash('error_msg', 'Veuillez vous connecter pour continuer');
          res.redirect('/auth');
     }
};
