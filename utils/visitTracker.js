// utils/visitTracker.js
const Visit = require('../models/visit');
const UAParser = require('ua-parser-js');
const { v4: uuidv4 } = require('uuid');
const dns = require('dns').promises;
const os = require('os');
const net = require('net');

// Sophisticated device detection
function getDeviceInfo(userAgent) {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    
    // Enhanced OS detection
    const osInfo = {
        name: result.os.name || 'Unknown',
        version: result.os.version || 'Unknown',
        platform: result.os.platform || result.engine.name || 'Unknown'
    };

    // Enhanced device type detection
    const deviceType = (() => {
        const ua = userAgent.toLowerCase();
        if (/tablet|ipad|playbook|silk/i.test(ua)) return 'Tablet';
        if (/mobile|iphone|ipod|android|blackberry|opera mini|opera mobi|skyfire|maemo|windows phone|palm|iemobile|symbian|symbianos|fennec/i.test(ua)) return 'Mobile';
        if (/smart-tv|smarttv|googletv|appletv|hbbtv|pov_tv|netcast.tv/i.test(ua)) return 'Smart TV';
        if (/xbox|playstation|nintendo/i.test(ua)) return 'Console';
        return 'Desktop';
    })();

    return {
        type: deviceType,
        brand: result.device.vendor || result.device.manufacturer || 'Unknown',
        model: result.device.model || 'Unknown',
        os: osInfo
    };
}

// Enhanced browser detection
function getBrowserInfo(req) {
    const parser = new UAParser(req.headers['user-agent']);
    const result = parser.getResult();
    const acceptLanguage = req.headers['accept-language'] || '';
    
    return {
        name: result.browser.name || 'Unknown',
        version: result.browser.version || 'Unknown',
        engine: result.engine.name || 'Unknown',
        language: acceptLanguage.split(',')[0] || 'Unknown',
        languages: acceptLanguage.split(',').map(lang => lang.trim()),
        plugins: parsePlugins(req.headers['sec-ch-ua']),
        cookiesEnabled: !!req.headers.cookie,
        doNotTrack: req.headers['dnt'] === '1'
    };
}

// Network and location detection without external APIs
async function getLocationInfo(req) {
    const ip = getClientIp(req);
    const info = {
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: req.headers['accept-language']?.split(',')[0] || 'Unknown',
        currency: getCurrencyFromTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone),
        ip: ip,
        connectionType: getConnectionType(ip)
    };

    try {
        // Try to get more location info from Accept-Language header
        const languages = req.headers['accept-language']?.split(',') || [];
        if (languages.length > 0) {
            const primaryLang = languages[0].split('-');
            if (primaryLang.length > 1) {
                info.country = primaryLang[1].toUpperCase();
            }
        }

        // Try to get region info from timezone
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timezone) {
            const parts = timezone.split('/');
            if (parts.length > 1) {
                info.region = parts[1].replace(/_/g, ' ');
                info.city = parts[parts.length - 1].replace(/_/g, ' ');
            }
        }

        // Get ISP info from reverse DNS
        if (net.isIP(ip)) {
            try {
                const hostnames = await dns.reverse(ip);
                if (hostnames && hostnames.length > 0) {
                    const hostname = hostnames[0].toLowerCase();
                    if (hostname.includes('mobile')) info.connectionType = 'mobile';
                    if (hostname.includes('dsl')) info.connectionType = 'dsl';
                    if (hostname.includes('fiber')) info.connectionType = 'fiber';
                }
            } catch (e) {
                console.log('DNS reverse lookup failed:', e.message);
            }
        }

    } catch (error) {
        console.error('Error getting location info:', error);
    }

    return info;
}

// Get client IP with fallbacks
function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.headers['x-real-ip'] || 
           req.connection?.remoteAddress?.replace('::ffff:', '') || 
           req.socket?.remoteAddress || 
           'Unknown';
}

// Determine connection type from IP
function getConnectionType(ip) {
    if (!ip || ip === 'Unknown') return 'Unknown';
    if (ip.startsWith('192.168.') || ip.startsWith('10.')) return 'LAN';
    return 'WAN';
}

// Get currency from timezone
function getCurrencyFromTimezone(timezone) {
    const currencyMap = {
        'America/': 'USD',
        'Europe/': 'EUR',
        'Asia/Tokyo': 'JPY',
        'Asia/Dubai': 'AED',
        // Add more mappings as needed
    };

    for (const [region, currency] of Object.entries(currencyMap)) {
        if (timezone.startsWith(region)) return currency;
    }
    return 'Unknown';
}

// Parse browser plugins from User-Agent Client Hints
function parsePlugins(uaClientHints) {
    if (!uaClientHints) return [];
    try {
        return uaClientHints
            .split(', ')
            .map(hint => hint.replace(/"/g, ''))
            .filter(hint => hint.length > 0);
    } catch (e) {
        return [];
    }
}

// Main visit capture function
const captureVisit = async (req, providerId) => {
    try {
        console.log('Starting visit capture for provider:', providerId);
        const startTime = process.hrtime();

        // Get basic request info
        const userAgent = req.headers['user-agent'] || '';
        
        // Get device and browser info
        const deviceInfo = getDeviceInfo(userAgent);
        const browserInfo = getBrowserInfo(req);
        
        // Get location and network info
        const locationInfo = await getLocationInfo(req);

        // Get screen info from headers
        const screen = {
            width: parseInt(req.headers['sec-ch-viewport-width']) || null,
            height: parseInt(req.headers['sec-ch-viewport-height']) || null,
            colorDepth: parseInt(req.headers['sec-ch-color-depth']) || null,
            orientation: req.headers['sec-ch-viewport-orientation'] || null
        };

        // Calculate performance metrics
        const endTime = process.hrtime(startTime);
        const performanceMetrics = {
            loadTime: (endTime[0] * 1e9 + endTime[1]) / 1e6,
            domComplete: req.headers['server-timing']?.['domComplete']?.duration || null,
            renderTime: req.headers['server-timing']?.['render']?.duration || null,
            networkLatency: req.headers['server-timing']?.['network']?.duration || null,
            pageLoadTime: req.headers['server-timing']?.['pageLoad']?.duration || null,
            dnsTime: req.headers['server-timing']?.['dns']?.duration || null,
            serverResponseTime: req.headers['server-timing']?.['response']?.duration || null
        };

        // Create visit document
        const visit = new Visit({
            providerId,
            userId: req.user?._id || null,
            device: {
                ...deviceInfo,
                screen
            },
            browser: browserInfo,
            location: locationInfo,
            session: {
                id: uuidv4(),
                startTime: new Date(),
                path: req.originalUrl || '/',
                referrer: req.headers.referer || 'direct',
                source: req.query.utm_source || null,
                medium: req.query.utm_medium || null,
                campaign: req.query.utm_campaign || null,
                queryParams: req.query
            },
            userAgent,
            hardware: {
                deviceMemory: parseInt(req.headers['device-memory']) || null,
                hardwareConcurrency: parseInt(req.headers['hardware-concurrency']) || null,
                maxTouchPoints: parseInt(req.headers['max-touch-points']) || null,
                webGL: req.headers['webgl-renderer'] || null
            },
            system: {
                platform: req.headers['sec-ch-ua-platform'] || null,
                vendor: req.headers['sec-ch-ua-platform-version'] || null,
                encoding: req.headers['accept-charset'] || null,
                preference: {
                    reducedMotion: req.headers['sec-ch-prefers-reduced-motion'] === 'reduce',
                    colorScheme: req.headers['sec-ch-prefers-color-scheme'] || null,
                    contrast: req.headers['sec-ch-prefers-contrast'] || null
                }
            },
            performance: performanceMetrics
        });

        
        // Save to database
        await visit.save();
        console.log('Visit saved successfully');
        
        return visit;

    } catch (error) {
        console.error('Error capturing visit:', {
            error: error.message,
            stack: error.stack,
            providerId,
            path: req.path
        });
        throw error;
    }
};

module.exports = captureVisit;