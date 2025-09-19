const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true,
    maxlength: [500, 'Question cannot exceed 500 characters']
  },
  answer: {
    type: String,
    required: [true, 'Answer is required'],
    trim: true,
    maxlength: [2000, 'Answer cannot exceed 2000 characters']
  },
  displayOrder: {
    type: Number,
    required: [true, 'Display order is required'],
    min: [1, 'Display order must be at least 1'],
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // This adds createdAt and updatedAt automatically
});

// Index for better query performance
faqSchema.index({ isActive: 1 });
faqSchema.index({ displayOrder: 1 });

// Virtual for formatted creation date
faqSchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt.toLocaleDateString();
});

// Ensure virtual fields are serialized
faqSchema.set('toJSON', { virtuals: true });

// Create the FAQ model
const FAQ = mongoose.model('FAQ', faqSchema);

module.exports = FAQ;