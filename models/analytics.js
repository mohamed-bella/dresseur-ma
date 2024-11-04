// models/Visit.js
const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
     providerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
     },
     serviceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Service',
          required: false // Optional as they might just visit the profile
     },
     visitorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: false // Optional for non-authenticated visitors
     },
     ipAddress: String,
     userAgent: String,
     page: {
          type: String,
          enum: ['profile', 'service', 'gallery'],
          required: true
     },
     duration: Number, // Time spent on page in seconds
     exitPage: String,
     referrer: String,
     createdAt: {
          type: Date,
          default: Date.now,
          expires: 30 * 24 * 60 * 60 // Automatically delete after 30 days
     }
}, {
     timestamps: true
});

// Index for efficient querying
visitSchema.index({ providerId: 1, createdAt: -1 });
visitSchema.index({ serviceId: 1, createdAt: -1 });

// Analytics Methods
visitSchema.statics.getDailyVisits = async function (providerId, days = 7) {
     const startDate = new Date();
     startDate.setDate(startDate.getDate() - days);

     return this.aggregate([
          {
               $match: {
                    providerId: mongoose.Types.ObjectId(providerId),
                    createdAt: { $gte: startDate }
               }
          },
          {
               $group: {
                    _id: {
                         $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    count: { $sum: 1 }
               }
          },
          { $sort: { '_id': 1 } }
     ]);
};

// Model for tracking metrics
const metricSchema = new mongoose.Schema({
     providerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
     },
     date: {
          type: Date,
          required: true
     },
     metrics: {
          views: { type: Number, default: 0 },
          uniqueVisitors: { type: Number, default: 0 },
          reservations: { type: Number, default: 0 },
          revenue: { type: Number, default: 0 },
          reviews: { type: Number, default: 0 },
          averageRating: { type: Number, default: 0 },
          completionRate: { type: Number, default: 0 },
          responseRate: { type: Number, default: 0 }
     },
     serviceMetrics: [{
          serviceId: {
               type: mongoose.Schema.Types.ObjectId,
               ref: 'Service'
          },
          views: { type: Number, default: 0 },
          reservations: { type: Number, default: 0 },
          revenue: { type: Number, default: 0 }
     }]
}, {
     timestamps: true
});

// Index for efficient querying
metricSchema.index({ providerId: 1, date: -1 });

// Methods for metrics
metricSchema.statics.incrementMetric = async function (providerId, metricName, amount = 1) {
     const today = new Date();
     today.setHours(0, 0, 0, 0);

     const update = {};
     update[`metrics.${metricName}`] = amount;

     return this.findOneAndUpdate(
          {
               providerId,
               date: today
          },
          { $inc: update },
          {
               upsert: true,
               new: true
          }
     );
};

// Analytics summary model for caching aggregated data
const analyticsSummarySchema = new mongoose.Schema({
     providerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
     },
     period: {
          type: String,
          enum: ['daily', 'weekly', 'monthly', 'yearly'],
          required: true
     },
     startDate: {
          type: Date,
          required: true
     },
     endDate: {
          type: Date,
          required: true
     },
     summary: {
          totalViews: Number,
          uniqueVisitors: Number,
          totalReservations: Number,
          totalRevenue: Number,
          averageRating: Number,
          completionRate: Number,
          topServices: [{
               serviceId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Service'
               },
               views: Number,
               reservations: Number,
               revenue: Number
          }],
          dailyStats: [{
               date: Date,
               views: Number,
               revenue: Number,
               reservations: Number
          }]
     }
}, {
     timestamps: true
});

// Index for efficient querying
analyticsSummarySchema.index({ providerId: 1, period: 1, startDate: -1 });

const Visit = mongoose.model('Visit', visitSchema);
const Metric = mongoose.model('Metric', metricSchema);
const AnalyticsSummary = mongoose.model('AnalyticsSummary', analyticsSummarySchema);

module.exports = {
     Visit,
     Metric,
     AnalyticsSummary
};