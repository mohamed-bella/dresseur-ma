const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentSchema = new Schema({
     article: { type: Schema.Types.ObjectId, ref: 'Article', required: true },  // Reference to the article
     name: { type: String, required: true },  // Guest name
     email: { type: String },  // Optional guest email
     comment: { type: String, required: true },  // Comment content
     createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', commentSchema);
