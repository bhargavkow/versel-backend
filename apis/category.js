const express = require('express');
const Category = require('../models/CategoryModel');

const router = express.Router();

// GET /api/categories - Get all categories with filtering
router.get('/', async (req, res) => {
  try {
    const { 
      search, 
      isActive,
      sortBy = 'order',
      sortOrder = 'asc'
    } = req.query;
    
    // Build filter object
    let filter = {};
    
    // Filter by active status
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Search by category name or description
    if (search) {
      filter.$or = [
        { categoryName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    let sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    // Query database
    const categories = await Category.find(filter).sort(sort);

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
      message: error.message
    });
  }
});

// GET /api/categories/:id - Get category by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
        message: `No category found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category',
      message: error.message
    });
  }
});

// POST /api/categories - Create new category
router.post('/', async (req, res) => {
  try {
    const categoryData = req.body;

    // Required field validation
    const requiredFields = ['categoryName', 'description'];
    const missingFields = requiredFields.filter(field => !categoryData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: `Required fields: ${missingFields.join(', ')}`
      });
    }

    // Category name length validation
    if (categoryData.categoryName && categoryData.categoryName.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Category name too long',
        message: 'Category name cannot exceed 100 characters'
      });
    }

    // Description length validation
    if (categoryData.description && categoryData.description.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Description too long',
        message: 'Description cannot exceed 500 characters'
      });
    }

    const newCategory = await Category.create(categoryData);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: newCategory
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Category name already exists',
        message: 'A category with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create category',
      message: error.message
    });
  }
});

// PUT /api/categories/:id - Update category
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Category name length validation
    if (updateData.categoryName && updateData.categoryName.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Category name too long',
        message: 'Category name cannot exceed 100 characters'
      });
    }

    // Description length validation
    if (updateData.description && updateData.description.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Description too long',
        message: 'Description cannot exceed 500 characters'
      });
    }

    const updatedCategory = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
        message: `No category found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: updatedCategory
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Category name already exists',
        message: 'A category with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update category',
      message: error.message
    });
  }
});

// DELETE /api/categories/:id - Delete category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCategory = await Category.findByIdAndDelete(id);

    if (!deletedCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
        message: `No category found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully',
      data: deletedCategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete category',
      message: error.message
    });
  }
});

// PATCH /api/categories/:id/toggle - Toggle category active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
        message: `No category found with ID: ${id}`
      });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id, 
      { isActive: !category.isActive }, 
      { new: true }
    );

    res.json({
      success: true,
      message: `Category ${updatedCategory.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedCategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to toggle category status',
      message: error.message
    });
  }
});

// GET /api/categories/active/list - Get all active categories
router.get('/active/list', async (req, res) => {
  try {
    const { sortBy = 'order', sortOrder = 'asc' } = req.query;

    // Build sort object
    let sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const categories = await Category.find({ isActive: true }).sort(sort);

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active categories',
      message: error.message
    });
  }
});

module.exports = router;

