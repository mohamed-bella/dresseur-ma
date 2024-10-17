// Middleware to ensure only authors have access
module.exports.isAuthor = (req, res, next) => {
     if (req.session.adminRole === 'author') {
          return next();
     } else {
          req.flash('error', 'You are not authorized to access this resource');
          res.redirect('/admin/login');
     }
};

// Middleware to ensure only admins have access
module.exports.isAdmin = (req, res, next) => {
     if (req.session.adminRole === 'admin') {
          return next();
     } else {
          req.flash('error', 'You are not authorized to access this resource');
          res.redirect('/admin/login');
     }
};
