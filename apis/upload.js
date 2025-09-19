const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Middleware to verify JWT token (imported from auth.js)
const { authenticateToken } = require('./auth');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Save to frontend public/uploads folder
    const uploadPath = path.join(__dirname, '../../rental_website/public/uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + extension;
    cb(null, filename);
  }
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WebP) are allowed!'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// POST /api/upload/image - Upload single image (admin only)
router.post('/image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Admin access required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please select an image file to upload'
      });
    }

    // Return the file information
    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: `/uploads/${req.file.filename}`,
        url: `${process.env.FRONTEND_URL || 'https://versel-frontend.vercel.app'}/uploads/${req.file.filename}` // Frontend URL
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error.message
    });
  }
});

// POST /api/upload/images - Upload multiple images (admin only)
router.post('/images', authenticateToken, upload.array('images', 10), async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Admin access required'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded',
        message: 'Please select image files to upload'
      });
    }

    // Process uploaded files
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      path: `/uploads/${file.filename}`,
      url: `${process.env.FRONTEND_URL || 'https://versel-frontend.vercel.app'}/uploads/${file.filename}`
    }));

    res.json({
      success: true,
      message: `${req.files.length} images uploaded successfully`,
      data: {
        files: uploadedFiles,
        count: req.files.length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error.message
    });
  }
});

// GET /api/upload/images - Get list of uploaded images (admin only)
router.get('/images', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Admin access required'
      });
    }

    const uploadPath = path.join(__dirname, '../../rental_website/public/uploads');
    
    // Check if uploads directory exists
    if (!fs.existsSync(uploadPath)) {
      return res.json({
        success: true,
        data: {
          images: [],
          count: 0
        }
      });
    }

    // Read all files from uploads directory
    const files = fs.readdirSync(uploadPath);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    // Get file information
    const images = imageFiles.map(filename => {
      const filePath = path.join(uploadPath, filename);
      const stats = fs.statSync(filePath);
      
      return {
        filename: filename,
        path: `/uploads/${filename}`,
        url: `${process.env.FRONTEND_URL || 'https://versel-frontend.vercel.app'}/uploads/${filename}`,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    });

    res.json({
      success: true,
      data: {
        images: images,
        count: images.length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch images',
      message: error.message
    });
  }
});

// DELETE /api/upload/image/:filename - Delete uploaded image (admin only)
router.delete('/image/:filename', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Admin access required'
      });
    }

    const filename = req.params.filename;
    const uploadPath = path.join(__dirname, '../../rental_website/public/uploads', filename);

    // Check if file exists
    if (!fs.existsSync(uploadPath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'The requested image file does not exist'
      });
    }

    // Delete the file
    fs.unlinkSync(uploadPath);

    res.json({
      success: true,
      message: 'Image deleted successfully',
      data: {
        filename: filename
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete image',
      message: error.message
    });
  }
});

module.exports = router;
