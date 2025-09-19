const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Carousel = require('../models/CarouselModel');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../rental_website/public/uploads');
    console.log('=== MULTER DEBUG ===');
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
    const filename = 'carousel-' + uniqueSuffix + path.extname(file.originalname);
    console.log('Generated filename:', filename);
    console.log('Original filename:', file.originalname);
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    console.log('File filter - mimetype:', file.mimetype);
    console.log('File filter - originalname:', file.originalname);
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// GET /api/carousels - Get all carousels with filtering
router.get('/', async (req, res) => {
  try {
    const { 
      isActive, 
      search, 
      sortBy = 'order',
      sortOrder = 'asc'
    } = req.query;
    
    // Build filter object
    let filter = {};
    
    // Filter by active status
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Search by title or description
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    let sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    // Query database
    const carousels = await Carousel.find(filter).sort(sort);

    res.json({
      success: true,
      count: carousels.length,
      data: carousels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch carousels',
      message: error.message
    });
  }
});

// GET /api/carousels/active - Get only active carousels ordered by order field
router.get('/active', async (req, res) => {
  try {
    const carousels = await Carousel.find({ isActive: true }).sort({ order: 1 });

    res.json({
      success: true,
      count: carousels.length,
      data: carousels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active carousels',
      message: error.message
    });
  }
});

// GET /api/carousels/:id - Get carousel by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const carousel = await Carousel.findById(id);

    if (!carousel) {
      return res.status(404).json({
        success: false,
        error: 'Carousel not found',
        message: `No carousel found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      data: carousel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch carousel',
      message: error.message
    });
  }
});

// POST /api/carousels - Create new carousel
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const carouselData = req.body;

    console.log('=== POST /api/carousels - Request received ===');
    console.log('req.file:', req.file);
    console.log('req.body:', req.body);

    // Handle uploaded file - ONLY accept file uploads, no URLs
    if (req.file) {
      console.log('File uploaded successfully:', req.file.filename);
      console.log('File saved to:', req.file.path);
      console.log('File size:', req.file.size);
      carouselData.image = `/uploads/${req.file.filename}`;
    } else {
      console.log('No image file provided');
      return res.status(400).json({
        success: false,
        error: 'No image file provided',
        message: 'Please upload an image file. URL uploads are not supported.'
      });
    }

    // Required field validation
    const requiredFields = ['image', 'title', 'description', 'order'];
    const missingFields = requiredFields.filter(field => !carouselData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: `Required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate image
    if (!carouselData.image || typeof carouselData.image !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid image',
        message: 'Image file upload failed'
      });
    }

    // Convert order to number and validate
    carouselData.order = parseInt(carouselData.order) || 1;

    // Auto-assign order if not provided or conflicts exist
    if (!carouselData.order || carouselData.order < 1) {
      const maxOrder = await Carousel.findOne().sort({ order: -1 });
      carouselData.order = maxOrder ? maxOrder.order + 1 : 1;
    } else {
      // Check if order already exists
      const existingCarousel = await Carousel.findOne({ order: carouselData.order });
      if (existingCarousel) {
        // Auto-increment to next available order
        const maxOrder = await Carousel.findOne().sort({ order: -1 });
        carouselData.order = maxOrder ? maxOrder.order + 1 : carouselData.order;
      }
    }

    const newCarousel = await Carousel.create(carouselData);

    res.status(201).json({
      success: true,
      message: 'Carousel created successfully',
      data: newCarousel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create carousel',
      message: error.message
    });
  }
});

// PUT /api/carousels/:id - Update carousel
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Handle uploaded file - ONLY accept file uploads, no URLs
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }
    // If no file uploaded, keep existing image (don't change it)

    // Handle order updates
    if (updateData.order) {
      updateData.order = parseInt(updateData.order) || 1;
      
      // Check for conflicts with other carousels
      const existingCarousel = await Carousel.findOne({ 
        order: updateData.order, 
        _id: { $ne: id } 
      });
      
      if (existingCarousel) {
        // Auto-increment to next available order
        const maxOrder = await Carousel.findOne().sort({ order: -1 });
        updateData.order = maxOrder ? maxOrder.order + 1 : updateData.order;
      }
    }

    const updatedCarousel = await Carousel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!updatedCarousel) {
      return res.status(404).json({
        success: false,
        error: 'Carousel not found',
        message: `No carousel found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      message: 'Carousel updated successfully',
      data: updatedCarousel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update carousel',
      message: error.message
    });
  }
});

// DELETE /api/carousels/:id - Delete carousel
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCarousel = await Carousel.findByIdAndDelete(id);

    if (!deletedCarousel) {
      return res.status(404).json({
        success: false,
        error: 'Carousel not found',
        message: `No carousel found with ID: ${id}`
      });
    }

    // Delete the associated image file
    if (deletedCarousel.image) {
      const imagePath = path.join(__dirname, '../../rental_website/public', deletedCarousel.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log('Deleted image file:', imagePath);
      }
    }

    res.json({
      success: true,
      message: 'Carousel deleted successfully',
      data: deletedCarousel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete carousel',
      message: error.message
    });
  }
});

// PATCH /api/carousels/:id/toggle-status - Toggle carousel active status
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;
    const carousel = await Carousel.findById(id);

    if (!carousel) {
      return res.status(404).json({
        success: false,
        error: 'Carousel not found',
        message: `No carousel found with ID: ${id}`
      });
    }

    const updatedCarousel = await Carousel.findByIdAndUpdate(
      id, 
      { isActive: !carousel.isActive }, 
      { new: true }
    );

    res.json({
      success: true,
      message: `Carousel ${updatedCarousel.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedCarousel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to toggle carousel status',
      message: error.message
    });
  }
});

// PATCH /api/carousels/:id/reorder - Update carousel order
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

    // Check if new order already exists and handle conflict
    const existingCarousel = await Carousel.findOne({ 
      order: newOrder, 
      _id: { $ne: id } 
    });
    
    if (existingCarousel) {
      // Swap orders - move existing carousel to current carousel's order
      const currentCarousel = await Carousel.findById(id);
      if (currentCarousel) {
        await Carousel.findByIdAndUpdate(existingCarousel._id, { 
          order: currentCarousel.order 
        });
      }
    }

    const updatedCarousel = await Carousel.findByIdAndUpdate(
      id, 
      { order: newOrder }, 
      { new: true }
    );

    if (!updatedCarousel) {
      return res.status(404).json({
        success: false,
        error: 'Carousel not found',
        message: `No carousel found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      message: 'Carousel order updated successfully',
      data: updatedCarousel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update carousel order',
      message: error.message
    });
  }
});

module.exports = router;
