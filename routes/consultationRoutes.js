const express = require('express');
const router = express.Router();
const consultationController = require('../controllers/consultationController');

// Middleware to show login prompt
const adminAuthMiddleware = (req, res, next) => {
     res.send(`
        <html>
            <head>
                <script>
                    const username = prompt('Enter username:', '');
                    const password = prompt('Enter password:', '');

                    if (username === 'ndressilik' && password === '1234') {
                        window.location.href = '/admin/dashboard'; // Redirect to the admin page
                    } else {
                        alert('Invalid username or password!');
                        window.location.href = '/'; // Redirect to home page on failure
                    }
                </script>
            </head>
            <body></body>
        </html>
    `);
};

router.get('/admin', adminAuthMiddleware);
router.get('/', (req, res) => {
     res.redirect('/consultation')
});

// Route to display the consultation form
router.get('/consultation', consultationController.showConsultationForm);

// Route to handle consultation form submission
router.post('/consultation', consultationController.submitConsultation);

// Actual admin dashboard route, protected by the prompt
router.get('/admin/dashboard', consultationController.showConsultationsForAdmin);

module.exports = router;
