const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const HomepageCategory = require('../models/HomepageCategoryModel');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../rental_website/public/uploads');
    console.log('=== HOMEPAGE CATEGORY MULTER DEBUG ===');
    console.log('Upload path:', uploadPath);
    console.log('Current directory:', __dirname);
    console.log('File being uploaded:', file.originalname);
    console.log('File mimetype:', file.mimetype);
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log('Created upload directory:', uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'homepage-category-' + uniqueSuffix + path.extname(file.originalname);
    console.log('Generated homepage category filename:', filename);
    console.log('Original filename:', file.originalname);
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    console.log('Homepage category file filter - mimetype:', file.mimetype);
    console.log('Homepage category file filter - originalname:', file.originalname);
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// GET /api/homepage-categories - Get all homepage categories with filtering
router.get('/', async (req, res) => {
  try {
    const { 
      displayOnHome, 
      search, 
      sortBy = 'homepageOrder',
      sortOrder = 'asc'
    } = req.query;
    
    // Build filter object
    let filter = {};
    
    // Filter by display on home status
    if (displayOnHome !== undefined) {
      filter.displayOnHome = displayOnHome === 'true';
    }

    // Search by name or description
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    let sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    // Query database
    const homepageCategories = await HomepageCategory.find(filter).sort(sort);

    res.json({
      success: true,
      count: homepageCategories.length,
      data: homepageCategories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch homepage categories',
      message: error.message
    });
  }
});

// GET /api/homepage-categories/homepage - Get only categories displayed on homepage ordered by homepageOrder
router.get('/homepage', async (req, res) => {
  try {
    const homepageCategories = await HomepageCategory.find({ displayOnHome: true }).sort({ homepageOrder: 1 });

    res.json({
      success: true,
      count: homepageCategories.length,
      data: homepageCategories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch homepage categories',
      message: error.message
    });
  }
});

// GET /api/homepage-categories/:id - Get homepage category by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const homepageCategory = await HomepageCategory.findById(id);

    if (!homepageCategory) {
      return res.status(404).json({
        success: false,
        error: 'Homepage category not found',
        message: `No homepage category found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      data: homepageCategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch homepage category',
      message: error.message
    });
  }
});

// POST /api/homepage-categories - Create new homepage category
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const homepageCategoryData = req.body;

    console.log('=== POST /api/homepage-categories - Request received ===');
    console.log('req.file:', req.file);
    console.log('req.body:', req.body);

    // Handle uploaded file
    if (req.file) {
      console.log('File uploaded successfully:', req.file.filename);
      console.log('File saved to:', req.file.path);
      console.log('File size:', req.file.size);
      homepageCategoryData.image = `/uploads/${req.file.filename}`;
    } else if (homepageCategoryData.image) {
      console.log('Using provided image URL:', homepageCategoryData.image);
    } else {
      console.log('No image provided');
      return res.status(400).json({
        success: false,
        error: 'No image provided',
        message: 'Please provide either an image file or image URL'
      });
    }

    // Required field validation
    const requiredFields = ['name', 'description'];
    const missingFields = requiredFields.filter(field => !homepageCategoryData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: `Required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate homepage order
    if (isNaN(homepageCategoryData.homepageOrder) || homepageCategoryData.homepageOrder < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid homepage order',
        message: 'Homepage order must be a positive number'
      });
    }

    // Check if homepage order already exists
    const existingCategory = await HomepageCategory.findOne({ homepageOrder: homepageCategoryData.homepageOrder });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: 'Homepage order already exists',
        message: `A homepage category with order ${homepageCategoryData.homepageOrder} already exists`
      });
    }

    const newHomepageCategory = await HomepageCategory.create(homepageCategoryData);

    res.status(201).json({
      success: true,
      message: 'Homepage category created successfully',
      data: newHomepageCategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create homepage category',
      message: error.message
    });
  }
});

// PUT /api/homepage-categories/:id - Update homepage category
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Handle uploaded file
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    } else if (updateData.image) {
      // Keep existing image URL
    }

    // If updating homepage order, check for conflicts
    if (updateData.homepageOrder) {
      const existingCategory = await HomepageCategory.findOne({ 
        homepageOrder: updateData.homepageOrder, 
        _id: { $ne: id } 
      });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          error: 'Homepage order already exists',
          message: `A homepage category with order ${updateData.homepageOrder} already exists`
        });
      }
    }

    const updatedHomepageCategory = await HomepageCategory.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!updatedHomepageCategory) {
      return res.status(404).json({
        success: false,
        error: 'Homepage category not found',
        message: `No homepage category found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      message: 'Homepage category updated successfully',
      data: updatedHomepageCategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update homepage category',
      message: error.message
    });
  }
});

// DELETE /api/homepage-categories/:id - Delete homepage category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedHomepageCategory = await HomepageCategory.findByIdAndDelete(id);

    if (!deletedHomepageCategory) {
      return res.status(404).json({
        success: false,
        error: 'Homepage category not found',
        message: `No homepage category found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      message: 'Homepage category deleted successfully',
      data: deletedHomepageCategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete homepage category',
      message: error.message
    });
  }
});

// PATCH /api/homepage-categories/:id/toggle-display - Toggle homepage category display status
router.patch('/:id/toggle-display', async (req, res) => {
  try {
    const { id } = req.params;
    const homepageCategory = await HomepageCategory.findById(id);

    if (!homepageCategory) {
      return res.status(404).json({
        success: false,
        error: 'Homepage category not found',
        message: `No homepage category found with ID: ${id}`
      });
    }

    const updatedHomepageCategory = await HomepageCategory.findByIdAndUpdate(
      id, 
      { displayOnHome: !homepageCategory.displayOnHome }, 
      { new: true }
    );

    res.json({
      success: true,
      message: `Homepage category ${updatedHomepageCategory.displayOnHome ? 'enabled' : 'disabled'} for homepage display`,
      data: updatedHomepageCategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to toggle homepage category display',
      message: error.message
    });
  }
});

// PATCH /api/homepage-categories/:id/reorder - Update homepage category order
router.patch('/:id/reorder', async (req, res) => {
  try {
    const { id } = req.params;
    const { newOrder } = req.body;

    if (isNaN(newOrder) || newOrder < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order',
        message: 'Order must be a positive number'
      });
    }

    // Check if new order already exists
    const existingCategory = await HomepageCategory.findOne({ 
      homepageOrder: newOrder, 
      _id: { $ne: id } 
    });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: 'Order already exists',
        message: `A homepage category with order ${newOrder} already exists`
      });
    }

    const updatedHomepageCategory = await HomepageCategory.findByIdAndUpdate(
      id, 
      { homepageOrder: newOrder }, 
      { new: true }
    );

    if (!updatedHomepageCategory) {
      return res.status(404).json({
        success: false,
        error: 'Homepage category not found',
        message: `No homepage category found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      message: 'Homepage category order updated successfully',
      data: updatedHomepageCategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update homepage category order',
      message: error.message
    });
  }
});

module.exports = router;
