const express = require('express');
const FAQ = require('../models/FAQModel');

const router = express.Router();

// GET /api/faqs - Get all FAQs with filtering
router.get('/', async (req, res) => {
  try {
    const { 
      isActive, 
      search, 
      sortBy = 'displayOrder',
      sortOrder = 'asc'
    } = req.query;
    
    // Build filter object
    let filter = {};
    
    // Filter by active status
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Search by question or answer
    if (search) {
      filter.$or = [
        { question: { $regex: search, $options: 'i' } },
        { answer: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    let sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    // Query database
    const faqs = await FAQ.find(filter).sort(sort);

    res.json({
      success: true,
      count: faqs.length,
      data: faqs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch FAQs',
      message: error.message
    });
  }
});

// GET /api/faqs/active - Get only active FAQs ordered by displayOrder
router.get('/active', async (req, res) => {
  try {
    const faqs = await FAQ.find({ isActive: true }).sort({ displayOrder: 1 });

    res.json({
      success: true,
      count: faqs.length,
      data: faqs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active FAQs',
      message: error.message
    });
  }
});

// GET /api/faqs/:id - Get FAQ by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const faq = await FAQ.findById(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        error: 'FAQ not found',
        message: `No FAQ found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      data: faq
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch FAQ',
      message: error.message
    });
  }
});

// POST /api/faqs - Create new FAQ
router.post('/', async (req, res) => {
  try {
    const faqData = req.body;

    // Required field validation
    const requiredFields = ['question', 'answer', 'displayOrder'];
    const missingFields = requiredFields.filter(field => !faqData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: `Required fields: ${missingFields.join(', ')}`
      });
    }

    // Convert display order to number and validate
    faqData.displayOrder = parseInt(faqData.displayOrder) || 1;

    // Auto-assign display order if not provided or conflicts exist
    if (!faqData.displayOrder || faqData.displayOrder < 1) {
      const maxOrder = await FAQ.findOne().sort({ displayOrder: -1 });
      faqData.displayOrder = maxOrder ? maxOrder.displayOrder + 1 : 1;
    } else {
      // Check if display order already exists
      const existingFAQ = await FAQ.findOne({ displayOrder: faqData.displayOrder });
      if (existingFAQ) {
        // Auto-increment to next available order
        const maxOrder = await FAQ.findOne().sort({ displayOrder: -1 });
        faqData.displayOrder = maxOrder ? maxOrder.displayOrder + 1 : faqData.displayOrder;
      }
    }

    const newFAQ = await FAQ.create(faqData);

    res.status(201).json({
      success: true,
      message: 'FAQ created successfully',
      data: newFAQ
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create FAQ',
      message: error.message
    });
  }
});

// PUT /api/faqs/:id - Update FAQ
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Handle display order updates
    if (updateData.displayOrder) {
      updateData.displayOrder = parseInt(updateData.displayOrder) || 1;
      
      // Check for conflicts with other FAQs
      const existingFAQ = await FAQ.findOne({ 
        displayOrder: updateData.displayOrder, 
        _id: { $ne: id } 
      });
      
      if (existingFAQ) {
        // Auto-increment to next available order
        const maxOrder = await FAQ.findOne().sort({ displayOrder: -1 });
        updateData.displayOrder = maxOrder ? maxOrder.displayOrder + 1 : updateData.displayOrder;
      }
    }

    const updatedFAQ = await FAQ.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!updatedFAQ) {
      return res.status(404).json({
        success: false,
        error: 'FAQ not found',
        message: `No FAQ found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      message: 'FAQ updated successfully',
      data: updatedFAQ
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update FAQ',
      message: error.message
    });
  }
});

// DELETE /api/faqs/:id - Delete FAQ
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedFAQ = await FAQ.findByIdAndDelete(id);

    if (!deletedFAQ) {
      return res.status(404).json({
        success: false,
        error: 'FAQ not found',
        message: `No FAQ found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      message: 'FAQ deleted successfully',
      data: deletedFAQ
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete FAQ',
      message: error.message
    });
  }
});

// PATCH /api/faqs/:id/toggle-status - Toggle FAQ active status
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;
    const faq = await FAQ.findById(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        error: 'FAQ not found',
        message: `No FAQ found with ID: ${id}`
      });
    }

    const updatedFAQ = await FAQ.findByIdAndUpdate(
      id, 
      { isActive: !faq.isActive }, 
      { new: true }
    );

    res.json({
      success: true,
      message: `FAQ ${updatedFAQ.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedFAQ
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to toggle FAQ status',
      message: error.message
    });
  }
});

// PATCH /api/faqs/:id/reorder - Update FAQ display order
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
    const existingFAQ = await FAQ.findOne({ 
      displayOrder: newOrder, 
      _id: { $ne: id } 
    });
    
    if (existingFAQ) {
      // Swap orders - move existing FAQ to current FAQ's order
      const currentFAQ = await FAQ.findById(id);
      if (currentFAQ) {
        await FAQ.findByIdAndUpdate(existingFAQ._id, { 
          displayOrder: currentFAQ.displayOrder 
        });
      }
    }

    const updatedFAQ = await FAQ.findByIdAndUpdate(
      id, 
      { displayOrder: newOrder }, 
      { new: true }
    );

    if (!updatedFAQ) {
      return res.status(404).json({
        success: false,
        error: 'FAQ not found',
        message: `No FAQ found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      message: 'FAQ display order updated successfully',
      data: updatedFAQ
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update FAQ display order',
      message: error.message
    });
  }
});

module.exports = router;
