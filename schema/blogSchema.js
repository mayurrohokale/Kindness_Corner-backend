const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: false,
  },
  author: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: false,
    default: Date.now,
  },
  status: { type: String, enum: ['pending', 'approved'], default: 'pending' },
});

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;
