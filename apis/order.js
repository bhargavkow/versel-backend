const express = require('express');
const Order = require('../models/OrderModel');
const Payment = require('../models/PaymentModel');
const Product = require('../models/ProductModel');

const router = express.Router();

// GET /api/orders - Get all orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('items.productId', 'productName image price')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Orders retrieved successfully',
      data: orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: 'Something went wrong!',
      message: error.message
    });
  }
});

// GET /api/orders/:id - Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findById(id)
      .populate('items.productId', 'productName image price description');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: 'No order found with the provided ID'
      });
    }

    // Get payment details for this order
    const payment = await Payment.findOne({ orderId: id });

    res.json({
      success: true,
      message: 'Order retrieved successfully',
      data: {
        order,
        payment
      }
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      error: 'Something went wrong!',
      message: error.message
    });
  }
});

// POST /api/orders - Create new order
router.post('/', async (req, res) => {
  try {
    const orderData = req.body;

    // Validate required fields
    if (!orderData.customerInfo || !orderData.items || !orderData.pricing) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Customer info, items, and pricing are required'
      });
    }

    // Validate items
    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid items',
        message: 'At least one item is required'
      });
    }

    // Validate pricing
    if (!orderData.pricing.total || orderData.pricing.total <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pricing',
        message: 'Total amount must be greater than 0'
      });
    }

    // Create order
    const newOrder = await Order.create(orderData);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: newOrder
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: 'Something went wrong!',
      message: error.message
    });
  }
});

// PUT /api/orders/:id - Update order
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const order = await Order.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: 'No order found with the provided ID'
      });
    }

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({
      success: false,
      error: 'Something went wrong!',
      message: error.message
    });
  }
});

// DELETE /api/orders/:id - Delete order
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: 'No order found with the provided ID'
      });
    }

    // Also delete associated payment
    await Payment.deleteOne({ orderId: id });

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      error: 'Something went wrong!',
      message: error.message
    });
  }
});

// GET /api/orders/customer/:email - Get orders by customer email
router.get('/customer/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const orders = await Order.find({ 'customerInfo.email': email })
      .populate('items.productId', 'productName image price')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Customer orders retrieved successfully',
      data: orders
    });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({
      success: false,
      error: 'Something went wrong!',
      message: error.message
    });
  }
});

// PUT /api/orders/:id/status - Update order status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: 'No order found with the provided ID'
      });
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      error: 'Something went wrong!',
      message: error.message
    });
  }
});

module.exports = router;