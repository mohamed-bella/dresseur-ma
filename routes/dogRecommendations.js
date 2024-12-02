const express = require('express');
const router = express.Router();

// GET /chien/recommandation - Afficher le formulaire de recommandation
router.get('/chien/recommandation', (req, res) => {
    res.render('user/dogPost/recommendation');
});

module.exports = router;
