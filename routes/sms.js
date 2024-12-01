// routes/sms.js
const express = require('express');
const router = express.Router();
const { 
    sendSMSviaEmail, 
    trackMessage, 
    createRateLimiter, 
    validateMoroccanPhoneNumber 
} = require('../utils/smsService');

// Rate limiters
const sendSmsLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 requests per 15 minutes
const trackingLimiter = createRateLimiter(60 * 1000, 10); // 10 requests per minute

// Send SMS with template
router.post('/send', sendSmsLimiter, async (req, res) => {
    try {
        const { phoneNumber, templateName, templateData, carrier, priority } = req.body;

        // Validate inputs
        if (!phoneNumber || !templateName || !carrier) {
            return res.status(400).json({
                success: false,
                error: 'Tous les champs requis ne sont pas renseignés'
            });
        }

        try {
            validateMoroccanPhoneNumber(phoneNumber);
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        const result = await sendSMSviaEmail(
            phoneNumber,
            templateName,
            templateData,
            carrier,
            priority
        );

        if (result.success) {
            res.json({
                success: true,
                messageId: result.messageId,
                trackingId: result.trackingId,
                message: 'SMS envoyé avec succès'
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error in SMS route:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'envoi du SMS'
        });
    }
});

// Track message status
router.get('/track/:trackingId', trackingLimiter, async (req, res) => {
    try {
        const result = await trackMessage(req.params.trackingId);
        
        if (result.success) {
            res.json({
                success: true,
                message: result.message
            });
        } else {
            res.status(404).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erreur lors du suivi du message'
        });
    }
});

module.exports = router;