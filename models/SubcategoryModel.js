const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema({
  subcategoryName: {
    type: String,
    required: [true, 'Subcategory name is required'],
    trim: true,
    maxlength: [100, 'Subcategory name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category reference is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true // This adds createdAt and updatedAt automatically
});

// Create compound index to ensure unique subcategory names within a category
subcategorySchema.index({ subcategoryName: 1, category: 1 }, { unique: true });

// Create the Subcategory model
const Subcategory = mongoose.model('Subcategory', subcategorySchema);

module.exports = Subcategory;
