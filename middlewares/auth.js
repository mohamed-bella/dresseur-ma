const express = require('express');
const router = express.Router();
const passport = require('passport');
const nodemailer = require('nodemailer');

// Yahoo SMTP configuration with debugging enabled
const transporter = nodemailer.createTransport({
    service: 'yahoo',
    auth: {
        user: process.env.YAHOO_EMAIL,  // Yahoo app-specific password
        pass: process.env.YAHOO_APP_PASSWORD,      // Your Yahoo email
    },
    logger: true,  // Logs to console
    debug: true    // Enable debugging
});

// Function to send a welcome email
const sendWelcomeEmail = async (toEmail) => {
    const mailOptions = {
        from: process.env.YAHOO_EMAIL,
        to: toEmail,
        subject: 'Welcome to Our Service!',
        html: `
          <!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Poppins', Arial, sans-serif;
            line-height: 1.6;
            background-color: #f4f4f4;
        }

        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .header {
            background: linear-gradient(135deg, #4F46E5, #7C3AED);
            padding: 40px 20px;
            text-align: center;
        }

        .logo {
            width: 120px;
            height: auto;
            margin-bottom: 20px;
        }

        .content {
            padding: 40px 30px;
            background-color: #ffffff;
        }

        h1 {
            color: #ffffff;
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 10px;
        }

        .welcome-text {
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
        }

        h2 {
            color: #1F2937;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 20px;
        }

        p {
            color: #4B5563;
            font-size: 16px;
            margin-bottom: 20px;
        }

        .features {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 30px 0;
        }

        .feature {
            padding: 20px;
            background-color: #F3F4F6;
            border-radius: 12px;
            text-align: center;
        }

        .feature svg {
            width: 40px;
            height: 40px;
            margin-bottom: 10px;
            color: #4F46E5;
        }

        .feature h3 {
            color: #1F2937;
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 8px;
        }

        .feature p {
            color: #6B7280;
            font-size: 14px;
            margin: 0;
        }

        .cta-button {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #4F46E5, #7C3AED);
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            margin: 20px 0;
            transition: transform 0.2s;
        }

        .cta-button:hover {
            transform: translateY(-2px);
        }

        .footer {
            background-color: #F9FAFB;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #E5E7EB;
        }

        .social-links {
            margin-bottom: 20px;
        }

        .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: #6B7280;
            text-decoration: none;
        }

        .footer-text {
            color: #9CA3AF;
            font-size: 14px;
        }

        @media (max-width: 600px) {
            .features {
                grid-template-columns: 1fr;
            }

            .content {
                padding: 30px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <img src="[Your Logo URL]" alt="Logo" class="logo">
            <h1>Welcome to Our Service!</h1>
            <p class="welcome-text">We're excited to have you onboard</p>
        </div>

        <div class="content">
            <h2>Get Started with Your Journey</h2>
            <p>Thank you for joining us! We're thrilled to have you as part of our community. Here are some features you might want to explore:</p>

            <div class="features">
                <div class="feature">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                    <h3>Quick Start</h3>
                    <p>Set up your profile and start exploring our services</p>
                </div>

                <div class="feature">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
                    </svg>
                    <h3>Customize</h3>
                    <p>Personalize your experience to match your needs</p>
                </div>
            </div>

            <p>Ready to begin? Click the button below to access your dashboard:</p>

            <a href="https://ndressilik.com/dashboard" class="cta-button">Go to Dashboard</a>
        </div>

        <div class="footer">
            <div class="social-links">
                <a href="#">Twitter</a>
                <a href="#">Facebook</a>
                <a href="#">LinkedIn</a>
            </div>
            <p class="footer-text">© 2024 Your Company. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,
        text: 'Thank you for logging in. We’re excited to have you onboard!'
    };

    try {
        console.log('Attempting to send email to:', toEmail);
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.response);
    } catch (error) {
        console.error('Error sending welcome email:', error);
    }
};

// Google OAuth Routes
router.get('/auth/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
);

router.get('/auth/google/cb',
    passport.authenticate('google', {
        failureRedirect: '/login',
        failureFlash: true
    }),
    async (req, res) => {
        // Save the session after successful login
        req.session.save((err) => {
            if (err) {
                console.error('Error saving session:', err);
            } else {
                console.log('Session saved successfully.');
            }
        });

        // Send a welcome email
        await sendWelcomeEmail(req.user.email);

        // Redirect to the dashboard
        res.redirect('/dashboard/new-service');
    }
);


// Logout route
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Error logging out:', err);
        }
        res.clearCookie('user_info'); // Clear custom cookie
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
            }
            res.redirect('/');
        });
    });
});


// Auth middleware
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated() && req.session) {
        return next();
    }
    res.redirect('/auth/google');
};


const isNotAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return next();
    }
    res.redirect('/dashboard');
};

module.exports = {
    router,
    isAuthenticated,
    isNotAuthenticated
};
