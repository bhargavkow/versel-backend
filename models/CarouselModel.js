const mongoose = require('mongoose');

const carouselSchema = new mongoose.Schema({
  image: {
    type: String,
    required: [true, 'Image is required'],
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  order: {
    type: Number,
    required: [true, 'Order is required'],
    min: [1, 'Order must be at least 1'],
    unique: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  link: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty link
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Link must be a valid URL starting with http:// or https://'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // This adds createdAt and updatedAt automatically
});

// Index for better query performance
carouselSchema.index({ isActive: 1 });

// Virtual for formatted creation date
carouselSchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt.toLocaleDateString();
});

// Ensure virtual fields are serialized
carouselSchema.set('toJSON', { virtuals: true });

// Create the Carousel model
const Carousel = mongoose.model('Carousel', carouselSchema);

module.exports = Carousel;
