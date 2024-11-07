const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const articleSchema = new Schema({
     title: {
          type: String,
          required: true,
          trim: true,
     },
     content: {
          type: String,
     },
     category: {
          type: String,
          required: true,
     },
     tags: [String],
     summary: {
          type: String,
          // required: true,
          trim: true,
     },
     author: {
          type: String,
          // required: true,
          default: 'Ndressilik'
     },
     featuredImage: {
          type: String, // URL or path to the image
     },
     publicationDate: {
          type: Date,
          default: Date.now,
     },
     status: {
          type: String,
          enum: ['Published', 'Draft'],
          default: 'Published',
     },
     seo: {
          title: {
               type: String,
               trim: true,
          },
          description: {
               type: String,
               trim: true,
          },
          keywords: [String],
     },
     createdAt: {
          type: Date,
          default: Date.now,
     },
     comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
     slug: {
          type: String,
          required: true,
          unique: true // Ensure the slug is unique
     },
     updatedAt: {
          type: Date,
          default: Date.now,
     }
});

// Add a pre-save hook to update the 'updatedAt' field
articleSchema.pre('save', function (next) {
     this.updatedAt = new Date();
     next();
});

module.exports = mongoose.model('Article', articleSchema);