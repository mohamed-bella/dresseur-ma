// smsService.js
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

// Message Schema for tracking
const messageSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true
    },
    carrier: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'failed'],
        default: 'pending'
    },
    messageId: String,
    attempts: {
        type: Number,
        default: 0
    },
    sentAt: Date,
    deliveredAt: Date,
    error: String
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

// SMS Templates
const messageTemplates = {
    verification: (code) => ({
        subject: 'Code de vérification',
        text: `Votre code de vérification est: ${code}`
    }),
    welcome: (name) => ({
        subject: 'Bienvenue',
        text: `Bonjour ${name}, bienvenue sur notre plateforme!`
    }),
    notification: (message) => ({
        subject: 'Notification',
        text: message
    }),
    alert: (type, details) => ({
        subject: `Alerte ${type}`,
        text: `Une alerte de type ${type} a été détectée: ${details}`
    })
};

// Phone number validation
function validateMoroccanPhoneNumber(phoneNumber) {
    // Remove all non-digits
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check pattern for Moroccan numbers
    const pattern = /^(?:(?:(?:\+|00)212)|0)?[567]\d{8}$/;
    
    if (!pattern.test(cleaned)) {
        throw new Error('Numéro de téléphone marocain invalide');
    }

    // Format to international format
    let formatted = cleaned;
    if (formatted.startsWith('0')) {
        formatted = '212' + formatted.substring(1);
    }
    if (!formatted.startsWith('212')) {
        formatted = '212' + formatted;
    }

    return formatted;
}

// SMS Gateway configuration
const carriers = {
    maroc_telecom: '@iam.ma',
    orange: '@orange.ma',
    inwi: '@inwi.ma'
};

// Create transporter
const transporter = nodemailer.createTransport({
    service: 'yahoo',
    host: "smtp.mail.yahoo.com",
    port: 465,
    secure: true,
    auth: {
        user: 'ghizlaneakouan@yahoo.com',
        pass: 'vijwurvhmmujirco'
    }
});

// Rate limiter middleware
const createRateLimiter = (windowMs, max) => rateLimit({
    windowMs,
    max,
    message: {
        success: false,
        error: 'Trop de requêtes, veuillez réessayer plus tard'
    }
});

// Enhanced SMS sending function
async function sendSMSviaEmail(phoneNumber, templateName, templateData, carrier, priority = 'normal') {
    try {
        // Validate phone number
        const formattedNumber = validateMoroccanPhoneNumber(phoneNumber);

        // Get carrier gateway
        const gateway = carriers[carrier.toLowerCase()];
        if (!gateway) {
            throw new Error('Opérateur non pris en charge');
        }

        // Get message template
        let messageContent;
        if (typeof templateName === 'string') {
            if (!messageTemplates[templateName]) {
                throw new Error('Template non trouvé');
            }
            messageContent = messageTemplates[templateName](templateData);
        } else {
            messageContent = messageTemplates.notification(templateName);
        }

        // Create message record
        const message = new Message({
            phoneNumber: formattedNumber,
            carrier,
            message: messageContent.text,
            status: 'pending'
        });

        // Construct email
        const mailOptions = {
            from: 'ghizlaneakouan@yahoo.com',
            to: `${formattedNumber}${gateway}`,
            subject: messageContent.subject,
            text: messageContent.text,
            priority: priority,
            headers: {
                'X-Priority': priority === 'high' ? '1' : '3'
            }
        };

        // Send email and update tracking
        const info = await transporter.sendMail(mailOptions);
        
        message.messageId = info.messageId;
        message.status = 'sent';
        message.sentAt = new Date();
        message.attempts += 1;
        await message.save();

        console.log('Message sent successfully:', info.messageId);
        return {
            success: true,
            messageId: info.messageId,
            trackingId: message._id
        };
    } catch (error) {
        console.error('Failed to send SMS via email:', error);
        
        // Log failed attempt if message exists
        if (message) {
            message.status = 'failed';
            message.error = error.message;
            message.attempts += 1;
            await message.save();
        }

        return {
            success: false,
            error: error.message
        };
    }
}

// Message tracking function
async function trackMessage(trackingId) {
    try {
        const message = await Message.findById(trackingId);
        if (!message) {
            throw new Error('Message non trouvé');
        }

        return {
            success: true,
            message: {
                status: message.status,
                sentAt: message.sentAt,
                deliveredAt: message.deliveredAt,
                attempts: message.attempts,
                error: message.error
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = { 
    sendSMSviaEmail, 
    trackMessage, 
    createRateLimiter, 
    messageTemplates,
    validateMoroccanPhoneNumber
};