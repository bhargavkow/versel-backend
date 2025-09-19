const express = require('express');
const router = express.Router();
const Subcategory = require('../models/SubcategoryModel');
const Category = require('../models/CategoryModel');

// GET all subcategories
router.get('/', async (req, res) => {
  try {
    const subcategories = await Subcategory.find()
      .populate('category', 'categoryName description')
      .sort({ order: 1, createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: subcategories,
      count: subcategories.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching subcategories',
      error: error.message
    });
  }
});

// GET subcategories by category
router.get('/category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const subcategories = await Subcategory.find({ category: categoryId })
      .populate('category', 'categoryName description')
      .sort({ order: 1, createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: subcategories,
      count: subcategories.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching subcategories by category',
      error: error.message
    });
  }
});

// GET single subcategory by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const subcategory = await Subcategory.findById(id)
      .populate('category', 'categoryName description');
    
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: subcategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching subcategory',
      error: error.message
    });
  }
});

// POST create new subcategory
router.post('/', async (req, res) => {
  try {
    const { subcategoryName, description, category, order } = req.body;
    
    // Validate required fields
    if (!subcategoryName || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory name, description, and category are required'
      });
    }
    
    // Check if category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    const subcategory = new Subcategory({
      subcategoryName,
      description,
      category,
      order: order || 0
    });
    
    const savedSubcategory = await subcategory.save();
    
    // Add subcategory to category's subcategories array
    await Category.findByIdAndUpdate(
      category,
      { $push: { subcategories: savedSubcategory._id } },
      { new: true }
    );
    
    const populatedSubcategory = await Subcategory.findById(savedSubcategory._id)
      .populate('category', 'categoryName description');
    
    res.status(201).json({
      success: true,
      message: 'Subcategory created successfully',
      data: populatedSubcategory
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory name already exists in this category'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating subcategory',
      error: error.message
    });
  }
});

// PUT update subcategory
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const subcategory = await Subcategory.findById(id);
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }
    
    // If category is being changed, update both categories
    if (updateData.category && updateData.category !== subcategory.category.toString()) {
      // Check if new category exists
      const newCategory = await Category.findById(updateData.category);
      if (!newCategory) {
        return res.status(400).json({
          success: false,
          message: 'New category not found'
        });
      }
      
      // Remove from old category
      await Category.findByIdAndUpdate(
        subcategory.category,
        { $pull: { subcategories: id } }
      );
      
      // Add to new category
      await Category.findByIdAndUpdate(
        updateData.category,
        { $push: { subcategories: id } }
      );
    }
    
    const updatedSubcategory = await Subcategory.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('category', 'categoryName description');
    
    res.status(200).json({
      success: true,
      message: 'Subcategory updated successfully',
      data: updatedSubcategory
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory name already exists in this category'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating subcategory',
      error: error.message
    });
  }
});

// DELETE subcategory
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const subcategory = await Subcategory.findById(id);
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }
    
    // Remove subcategory from category's subcategories array
    await Category.findByIdAndUpdate(
      subcategory.category,
      { $pull: { subcategories: id } }
    );
    
    await Subcategory.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Subcategory deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting subcategory',
      error: error.message
    });
  }
});

// PATCH toggle subcategory active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    
    const subcategory = await Subcategory.findById(id);
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }
    
    subcategory.isActive = !subcategory.isActive;
    await subcategory.save();
    
    const populatedSubcategory = await Subcategory.findById(id)
      .populate('category', 'categoryName description');
    
    res.status(200).json({
      success: true,
      message: `Subcategory ${subcategory.isActive ? 'activated' : 'deactivated'} successfully`,
      data: populatedSubcategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error toggling subcategory status',
      error: error.message
    });
  }
});

module.exports = router;
