const ensureAdminAuthenticated = (req, res, next) => {
     if (req.isAuthenticated() && req.user.role === 'admin') {
          return next();
     }
     res.redirect('/'); // Redirect to login if not authenticated
};

module.exports = ensureAdminAuthenticated;
