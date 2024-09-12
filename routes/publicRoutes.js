const router = require('express').Router();

const publicController = require('../controllers/publicController')

router.get('/', publicController.getHome)

module.exports = router;