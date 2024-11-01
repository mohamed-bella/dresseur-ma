// schemas/ConsultationSchema.js
const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
     user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
     },
     text: {
          type: String,
          required: [true, 'Le texte du commentaire est requis'],
          trim: true,
          maxLength: [500, 'Le commentaire ne peut pas dépasser 500 caractères']
     },
     createdAt: {
          type: Date,
          default: Date.now
     }
});

const ImageSchema = new mongoose.Schema({
     url: {
          type: String,
          required: true
     },
     publicId: {
          type: String,
          required: true
     }
});

const ConsultationSchema = new mongoose.Schema({
     title: {
          type: String,
          required: [true, 'Le titre est requis'],
          trim: true,
          maxLength: [100, 'Le titre ne peut pas dépasser 100 caractères']
     },
     animalCategory: {
          type: String,
          required: [true, 'La catégorie d\'animal est requise'],
          enum: {
               values: ['dog', 'cat', 'bird', 'reptile', 'other'],
               message: 'Catégorie d\'animal non valide'
          }
     },
     tags: [{
          type: String,
          trim: true,
          maxLength: [20, 'Un tag ne peut pas dépasser 20 caractères']
     }],
     problem: {
          type: String,
          required: [true, 'La description du problème est requise'],
          trim: true,
          maxLength: [2000, 'La description ne peut pas dépasser 2000 caractères']
     },
     symptoms: {
          type: String,
          trim: true,
          maxLength: [1000, 'Les symptômes ne peuvent pas dépasser 1000 caractères']
     },
     solution: {
          type: String,
          required: [true, 'La solution est requise'],
          trim: true,
          maxLength: [2000, 'La solution ne peut pas dépasser 2000 caractères']
     },
     recommendations: {
          type: String,
          trim: true,
          maxLength: [1000, 'Les recommandations ne peuvent pas dépasser 1000 caractères']
     },
     images: [ImageSchema],
     visibility: {
          type: String,
          enum: ['public', 'private'],
          default: 'public'
     },
     createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
     },
     views: {
          type: Number,
          default: 0
     },
     likes: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
     }],
     comments: [CommentSchema],
     status: {
          type: String,
          enum: ['draft', 'published', 'archived'],
          default: 'published'
     }
}, {
     timestamps: true,
     toJSON: { virtuals: true },
     toObject: { virtuals: true }
});

// Indexes
ConsultationSchema.index({ title: 'text', problem: 'text', solution: 'text' });
ConsultationSchema.index({ createdBy: 1, status: 1 });
ConsultationSchema.index({ animalCategory: 1, status: 1 });
ConsultationSchema.index({ createdAt: -1 });
ConsultationSchema.index({ tags: 1 });

// Virtual Fields
ConsultationSchema.virtual('commentCount').get(function () {
     return this.comments.length;
});

ConsultationSchema.virtual('likeCount').get(function () {
     return this.likes.length;
});

ConsultationSchema.virtual('isLiked').get(function () {
     return this.likes.includes(this._id);
});

// Methods
ConsultationSchema.methods.addView = async function () {
     this.views += 1;
     return this.save();
};

ConsultationSchema.methods.toggleLike = async function (userId) {
     const userLikeIndex = this.likes.indexOf(userId);
     if (userLikeIndex === -1) {
          this.likes.push(userId);
     } else {
          this.likes.splice(userLikeIndex, 1);
     }
     return this.save();
};

ConsultationSchema.methods.addComment = async function (userId, text) {
     this.comments.push({ user: userId, text });
     return this.save();
};

// Statics
ConsultationSchema.statics.getPopularTags = async function (limit = 10) {
     return this.aggregate([
          { $unwind: '$tags' },
          { $group: { _id: '$tags', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: limit }
     ]);
};

module.exports = ConsultationSchema;