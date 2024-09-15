exports.getHome = (req, res) => {
     res.render('marketplace/home', {
          title: 'Home Page'
     })
}