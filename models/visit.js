const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
    providerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    device: {
        type: {
            type: String,
            enum: ['Mobile', 'Tablet', 'Desktop', 'Smart TV', 'Console', 'Other'],
            required: true
        },
        brand: String,
        model: String,
        os: {
            name: String,
            version: String,
            platform: String
        },
        screen: {
            width: Number,
            height: Number,
            colorDepth: Number,
            orientation: String
        }
    },
    browser: {
        name: String,
        version: String,
        engine: String,
        language: String,
        languages: [String],
        plugins: [String],
        cookiesEnabled: Boolean,
        doNotTrack: Boolean
    },
    network: {
        effectiveType: String,
        downlink: Number,
        rtt: Number,
        saveData: Boolean,
        connectionType: String
    },
    location: {
        country: String,
        region: String,
        city: String,
        timezone: String,
        language: String,
        currency: String,
        ip: String,
        connectionType: String
    },
    session: {
        id: String,
        startTime: Date,
        duration: Number,
        path: String,
        referrer: String,
        source: String,
        medium: String,
        campaign: String,
        previousVisits: Number,
        queryParams: mongoose.Schema.Types.Mixed
    },
    userAgent: {
        type: String,
        required: true
    },
    hardware: {
        deviceMemory: Number,
        hardwareConcurrency: Number,
        maxTouchPoints: Number,
        webGL: String
    },
    system: {
        platform: String,
        vendor: String,
        encoding: String,
        preference: {
            reducedMotion: Boolean,
            colorScheme: String,
            contrast: String
        }
    },
    performance: {
        loadTime: Number,
        domComplete: Number,
        renderTime: Number,
        networkLatency: Number,
        pageLoadTime: Number,
        dnsTime: Number,
        serverResponseTime: Number
    }
}, {
    timestamps: true
});

// Indexes for better query performance
visitSchema.index({ providerId: 1, createdAt: -1 });
visitSchema.index({ 'location.country': 1 });
visitSchema.index({ 'device.type': 1 });
visitSchema.index({ createdAt: 1 });
visitSchema.index({ 'session.id': 1 });
visitSchema.index({ 'browser.name': 1 });

module.exports = mongoose.model('Visit', visitSchema);