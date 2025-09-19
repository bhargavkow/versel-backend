const express = require('express');
const router = express.Router();
const PhotoCarousel = require('../models/PhotoCarouselModel');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../rental_website/public/uploads/photo-carousel');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'photo-carousel-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Test endpoint to verify the route is working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Photo Carousel API is working!',
    timestamp: new Date().toISOString()
  });
});

// Get all photo carousel items
router.get('/', async (req, res) => {
  try {
    const { active } = req.query;
    let query = {};
    
    if (active === 'true') {
      query.isActive = true;
    }
    
    const carouselItems = await PhotoCarousel.find(query).sort({ order: 1, createdAt: -1 });
    
    res.json({
      success: true,
      data: carouselItems,
      count: carouselItems.length
    });
  } catch (error) {
    console.error('Error fetching photo carousel:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching photo carousel items',
      error: error.message
    });
  }
});

// Get active photo carousel items for frontend
router.get('/active', async (req, res) => {
  try {
    const carouselItems = await PhotoCarousel.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .select('title image altText link order');
    
    res.json({
      success: true,
      data: carouselItems,
      count: carouselItems.length
    });
  } catch (error) {
    console.error('Error fetching active photo carousel:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active photo carousel items',
      error: error.message
    });
  }
});

// Get single photo carousel item
router.get('/:id', async (req, res) => {
  try {
    const carouselItem = await PhotoCarousel.findById(req.params.id);
    
    if (!carouselItem) {
      return res.status(404).json({
        success: false,
        message: 'Photo carousel item not found'
      });
    }
    
    res.json({
      success: true,
      data: carouselItem
    });
  } catch (error) {
    console.error('Error fetching photo carousel item:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching photo carousel item',
      error: error.message
    });
  }
});

// Create new photo carousel item
router.post('/', upload.single('image'), async (req, res) => {
  try {
    console.log('POST /api/photo-carousel - Request body:', req.body);
    console.log('POST /api/photo-carousel - File:', req.file);
    
    const { title, altText, link, order, isActive } = req.body;
    
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'Image file is required'
      });
    }
    
    const carouselItem = new PhotoCarousel({
      title: title || 'Untitled',
      image: `/uploads/photo-carousel/${req.file.filename}`,
      altText: altText || '',
      link: link || '', // Link is optional
      order: order ? parseInt(order) : 0,
      isActive: isActive === 'true' || isActive === true
    });
    
    console.log('Creating carousel item:', carouselItem);
    await carouselItem.save();
    
    res.status(201).json({
      success: true,
      message: 'Photo carousel item created successfully',
      data: carouselItem
    });
  } catch (error) {
    console.error('Error creating photo carousel item:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating photo carousel item',
      error: error.message
    });
  }
});

// Update photo carousel item
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    console.log('PUT /api/photo-carousel/:id - Request body:', req.body);
    console.log('PUT /api/photo-carousel/:id - File:', req.file);
    
    const { title, altText, link, order, isActive } = req.body;
    const updateData = {
      title: title || 'Untitled',
      altText: altText || '',
      link: link || '', // Link is optional
      order: order ? parseInt(order) : 0,
      isActive: isActive === 'true' || isActive === true,
      updatedAt: new Date()
    };
    
    // If new image is uploaded, update the image path
    if (req.file) {
      updateData.image = `/uploads/photo-carousel/${req.file.filename}`;
      
      // Delete old image file
      const existingItem = await PhotoCarousel.findById(req.params.id);
      if (existingItem && existingItem.image) {
        const oldImagePath = path.join(__dirname, '../../rental_website/public', existingItem.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }
    
    console.log('Updating carousel item with data:', updateData);
    const carouselItem = await PhotoCarousel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!carouselItem) {
      return res.status(404).json({
        success: false,
        message: 'Photo carousel item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Photo carousel item updated successfully',
      data: carouselItem
    });
  } catch (error) {
    console.error('Error updating photo carousel item:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating photo carousel item',
      error: error.message
    });
  }
});

// Delete photo carousel item
router.delete('/:id', async (req, res) => {
  try {
    const carouselItem = await PhotoCarousel.findById(req.params.id);
    
    if (!carouselItem) {
      return res.status(404).json({
        success: false,
        message: 'Photo carousel item not found'
      });
    }
    
    // Delete image file
    if (carouselItem.image) {
      const imagePath = path.join(__dirname, '../../rental_website/public', carouselItem.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await PhotoCarousel.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Photo carousel item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting photo carousel item:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting photo carousel item',
      error: error.message
    });
  }
});

// Update order of photo carousel items
router.put('/update-order', async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }
    
    const updatePromises = items.map((item, index) => 
      PhotoCarousel.findByIdAndUpdate(item.id, { order: index }, { new: true })
    );
    
    await Promise.all(updatePromises);
    
    res.json({
      success: true,
      message: 'Order updated successfully'
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order',
      error: error.message
    });
  }
});

// Toggle active status
router.put('/:id/toggle-active', async (req, res) => {
  try {
    const carouselItem = await PhotoCarousel.findById(req.params.id);
    
    if (!carouselItem) {
      return res.status(404).json({
        success: false,
        message: 'Photo carousel item not found'
      });
    }
    
    carouselItem.isActive = !carouselItem.isActive;
    await carouselItem.save();
    
    res.json({
      success: true,
      message: `Photo carousel item ${carouselItem.isActive ? 'activated' : 'deactivated'} successfully`,
      data: carouselItem
    });
  } catch (error) {
    console.error('Error toggling active status:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling active status',
      error: error.message
    });
  }
});

module.exports = router;
