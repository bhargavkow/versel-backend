const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Product = require('../models/ProductModel');
const Category = require('../models/CategoryModel');
const Subcategory = require('../models/SubcategoryModel');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../rental_website/public/uploads/products');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `product-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Single file upload for main image
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit per file
  }
});

// Multiple files upload for other images
const uploadMultiple = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 10 // Maximum 10 additional images
  }
});

// GET /api/products - Get all products with filtering
router.get('/', async (req, res) => {
  try {
    const { 
      minPrice, 
      maxPrice, 
      search, 
      brand, 
      color, 
      size, 
      fabric,
      category,
      subcategory,
      isActive,
      featured,
      sortBy,
      sortOrder = 'asc'
    } = req.query;
    
    // Build filter object
    let filter = {};
    
    // Filter by brand
    if (brand) {
      filter.brand = { $regex: brand, $options: 'i' };
    }

    // Filter by color
    if (color) {
      filter.color = { $regex: color, $options: 'i' };
    }

    // Filter by size
    if (size) {
      filter.sizes = { $in: [size] };
    }

    // Filter by fabric
    if (fabric) {
      filter.fabric = { $regex: fabric, $options: 'i' };
    }

    // Filter by category
    if (category) {
      filter.category = category;
    }

    // Filter by subcategory
    if (subcategory) {
      filter.subcategory = subcategory;
    }

    // Filter by active status
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Filter by featured status
    if (featured !== undefined) {
      filter.featured = featured === 'true';
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Search by product name, description, or brand
    if (search) {
      filter.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    let sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    // Query database with population
    const products = await Product.find(filter)
      .populate('category', 'categoryName description')
      .populate('subcategory', 'subcategoryName description')
      .sort(sort);

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      message: error.message
    });
  }
});

// GET /api/products/:id - Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id)
      .populate('category', 'categoryName description')
      .populate('subcategory', 'subcategoryName description');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: `No product found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product',
      message: error.message
    });
  }
});

// POST /api/products - Create new product
router.post('/', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'other_images', maxCount: 10 }
]), async (req, res) => {
  try {
    const productData = req.body;

    // Required field validation
    const requiredFields = ['productName', 'brand', 'description', 'fabric', 'color', 'price', 'sizes', 'category', 'subcategory'];
    const missingFields = requiredFields.filter(field => !productData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: `Required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate main image
    if (!req.files || !req.files.image || !req.files.image[0]) {
      return res.status(400).json({
        success: false,
        error: 'Product image is required'
      });
    }

    // Validate category exists
    const categoryExists = await Category.findById(productData.category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category',
        message: 'Category not found'
      });
    }

    // Validate subcategory exists and belongs to the category
    const subcategoryExists = await Subcategory.findOne({
      _id: productData.subcategory,
      category: productData.category
    });
    if (!subcategoryExists) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subcategory',
        message: 'Subcategory not found or does not belong to the specified category'
      });
    }

    // Parse and validate sizes array
    let parsedSizes;
    try {
      parsedSizes = JSON.parse(productData.sizes);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sizes format',
        message: 'Sizes must be a valid JSON array'
      });
    }

    if (!Array.isArray(parsedSizes) || parsedSizes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sizes',
        message: 'At least one size is required'
      });
    }

    // Price validation
    if (isNaN(productData.price) || productData.price <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid price',
        message: 'Price must be a positive number'
      });
    }

    // Stock validation
    if (productData.stock !== undefined && (isNaN(productData.stock) || productData.stock < 0)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stock',
        message: 'Stock must be a non-negative number'
      });
    }

    // Process uploaded images
    const mainImageUrl = `/uploads/products/${req.files.image[0].filename}`;
    console.log('Uploaded main image:', req.files.image[0]);
    console.log('Generated main image URL:', mainImageUrl);

    // Process other images if any
    let otherImagesUrls = [];
    if (req.files.other_images && req.files.other_images.length > 0) {
      otherImagesUrls = req.files.other_images.map(file => `/uploads/products/${file.filename}`);
      console.log('Uploaded other images:', req.files.other_images);
      console.log('Generated other images URLs:', otherImagesUrls);
    }

    // Create product with images
    const productDataWithImages = {
      ...productData,
      image: mainImageUrl,
      other_images: otherImagesUrls,
      sizes: parsedSizes, // Use already parsed sizes
      price: parseFloat(productData.price),
      stock: parseInt(productData.stock) || 0,
      isActive: productData.isActive !== 'false',
      featured: productData.featured === 'true',
      tags: productData.tags ? (Array.isArray(productData.tags) ? productData.tags : (() => {
        try {
          return JSON.parse(productData.tags);
        } catch (error) {
          return productData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        }
      })()) : []
    };

    console.log('Final product data with images:', productDataWithImages);

    const newProduct = await Product.create(productDataWithImages);
    
    // Populate the created product with category and subcategory details
    const populatedProduct = await Product.findById(newProduct._id)
      .populate('category', 'categoryName description')
      .populate('subcategory', 'subcategoryName description');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: populatedProduct
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create product',
      message: error.message
    });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'other_images', maxCount: 10 }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('PUT request received:', {
      id,
      body: updateData,
      files: req.files,
      existing_other_images: updateData.existing_other_images
    });

    // Handle other images - combine existing and new ones (always process this)
    let finalOtherImages = [];
    
    // Add existing images if provided
    if (updateData.existing_other_images) {
      try {
        const existingImages = JSON.parse(updateData.existing_other_images);
        finalOtherImages = [...existingImages];
        console.log('Preserving existing other images:', existingImages);
      } catch (error) {
        console.error('Error parsing existing other images:', error);
      }
    }
    
    // Add new uploaded images if any
    if (req.files && req.files.other_images && req.files.other_images.length > 0) {
      const newImagesUrls = req.files.other_images.map(file => `/uploads/products/${file.filename}`);
      finalOtherImages = [...finalOtherImages, ...newImagesUrls];
      console.log('Added new other images:', newImagesUrls);
    }
    
    // Update the other_images field if we have any images
    if (finalOtherImages.length > 0 || updateData.existing_other_images) {
      updateData.other_images = finalOtherImages;
      console.log('Final other images:', finalOtherImages);
    }
    
    // Remove the temporary field
    delete updateData.existing_other_images;

    // Process uploaded main image if any
    if (req.files && req.files.image && req.files.image[0]) {
      const imageUrl = `/uploads/products/${req.files.image[0].filename}`;
      updateData.image = imageUrl;
      console.log('Updated product main image:', imageUrl);
    }

    // Parse sizes if provided
    if (updateData.sizes) {
      try {
        updateData.sizes = JSON.parse(updateData.sizes);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid sizes format',
          message: 'Sizes must be a valid JSON array'
        });
      }
    }

    // Parse tags if provided
    if (updateData.tags) {
      try {
        updateData.tags = JSON.parse(updateData.tags);
      } catch (error) {
        // If JSON parsing fails, treat as comma-separated string
        updateData.tags = updateData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
    }

    // Convert numeric fields
    if (updateData.price) {
      updateData.price = parseFloat(updateData.price);
    }
    if (updateData.stock) {
      updateData.stock = parseInt(updateData.stock);
    }

    // Convert boolean fields
    if (updateData.isActive !== undefined) {
      updateData.isActive = updateData.isActive !== 'false';
    }
    if (updateData.featured !== undefined) {
      updateData.featured = updateData.featured === 'true';
    }

    console.log('Updating product with data:', updateData);

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    }).populate('category', 'categoryName description')
      .populate('subcategory', 'subcategoryName description');

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: `No product found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update product',
      message: error.message
    });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: `No product found with ID: ${id}`
      });
    }

    // Delete associated image files from frontend uploads folder
    if (deletedProduct.image) {
      const filename = path.basename(deletedProduct.image);
      const filePath = path.join(__dirname, '../../rental_website/public/uploads/products', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete other images if any
    if (deletedProduct.other_images && deletedProduct.other_images.length > 0) {
      deletedProduct.other_images.forEach(imageUrl => {
        const filename = path.basename(imageUrl);
        const filePath = path.join(__dirname, '../../rental_website/public/uploads/products', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully',
      data: deletedProduct
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete product',
      message: error.message
    });
  }
});

// PATCH /api/products/:id/stock - Update product stock
router.patch('/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { stock, operation } = req.body; // operation: 'add', 'subtract', or 'set'

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: `No product found with ID: ${id}`
      });
    }

    if (isNaN(stock) || stock < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stock value',
        message: 'Stock must be a non-negative number'
      });
    }

    let newStock;
    switch (operation) {
      case 'add':
        newStock = product.stock + stock;
        break;
      case 'subtract':
        newStock = Math.max(0, product.stock - stock);
        break;
      case 'set':
      default:
        newStock = stock;
        break;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id, 
      { stock: newStock }, 
      { new: true }
    );

    res.json({
      success: true,
      message: `Stock ${operation || 'set'} successfully`,
      data: updatedProduct
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update stock',
      message: error.message
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: 'File size must be less than 5MB'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type',
      message: 'Only image files are allowed'
    });
  }
  
  next(error);
});

module.exports = router;
