const mongoose = require('mongoose');

const homepageCategorySchema = new mongoose.Schema({
  image: {
    type: String,
    required: [true, 'Image is required'],
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [300, 'Description cannot exceed 300 characters']
  },
  displayOnHome: {
    type: Boolean,
    default: true
  },
  homepageOrder: {
    type: Number,
    required: [true, 'Homepage order is required'],
    min: [1, 'Homepage order must be at least 1'],
    unique: true,
    index: true
  },
  linkTo: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        // Allow empty strings or valid URLs/paths
        return !v || /^\/.+/.test(v) || /^https?:\/\/.+/.test(v);
      },
      message: 'Link to must be a valid URL starting with http:// or https://, or a valid path starting with /'
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
homepageCategorySchema.index({ displayOnHome: 1 });
homepageCategorySchema.index({ homepageOrder: 1 });

// Virtual for formatted creation date
homepageCategorySchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt.toLocaleDateString();
});

// Ensure virtual fields are serialized
homepageCategorySchema.set('toJSON', { virtuals: true });

// Create the HomepageCategory model
const HomepageCategory = mongoose.model('HomepageCategory', homepageCategorySchema);

module.exports = HomepageCategory;
