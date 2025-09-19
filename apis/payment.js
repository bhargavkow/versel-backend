const express = require('express');
const Payment = require('../models/PaymentModel');
const Order = require('../models/OrderModel');

const router = express.Router();

// GET /api/payments - Get all payments
router.get('/', async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('orderId', 'orderNumber customerInfo items pricing')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Payments retrieved successfully',
      data: payments
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      error: 'Something went wrong!',
      message: error.message
    });
  }
});

// GET /api/payments/:id - Get payment by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await Payment.findById(id)
      .populate('orderId', 'orderNumber customerInfo items pricing');

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
        message: 'No payment found with the provided ID'
      });
    }

    res.json({
      success: true,
      message: 'Payment retrieved successfully',
      data: payment
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      error: 'Something went wrong!',
      message: error.message
    });
  }
});

// GET /api/payments/order/:orderId - Get payment by order ID
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const payment = await Payment.findOne({ orderId })
      .populate('orderId', 'orderNumber customerInfo items pricing');

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
        message: 'No payment found for the provided order ID'
      });
    }

    res.json({
      success: true,
      message: 'Payment retrieved successfully',
      data: payment
    });
  } catch (error) {
    console.error('Error fetching payment by order:', error);
    res.status(500).json({
      success: false,
      error: 'Something went wrong!',
      message: error.message
    });
  }
});

// POST /api/payments - Create new payment
router.post('/', async (req, res) => {
  try {
    const paymentData = req.body;

    // Validate required fields
    if (!paymentData.orderId || !paymentData.paymentMethod || !paymentData.amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Order ID, payment method, and amount are required'
      });
    }

    // Validate payment method
    const validPaymentMethods = ['Credit Card', 'Debit Card', 'PayPal', 'Bank Transfer', 'Cash on Delivery', 'Digital Wallet', 'Razorpay'];
    if (!validPaymentMethods.includes(paymentData.paymentMethod.type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment method',
        message: `Payment method must be one of: ${validPaymentMethods.join(', ')}`
      });
    }

    // Validate amount
    if (!paymentData.amount.subtotal || paymentData.amount.subtotal <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount',
        message: 'Subtotal must be greater than 0'
      });
    }

    // Check if order exists
    const order = await Order.findById(paymentData.orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: 'No order found with the provided ID'
      });
    }

    // Create payment
    const newPayment = await Payment.create(paymentData);

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: newPayment
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({
      success: false,
      error: 'Something went wrong!',
      message: error.message
    });
  }
});

// PUT /api/payments/:id - Update payment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const payment = await Payment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
        message: 'No payment found with the provided ID'
      });
    }

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: payment
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({
      success: false,
      error: 'Something went wrong!',
      message: error.message
    });
  }
});

// DELETE /api/payments/:id - Delete payment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findByIdAndDelete(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
        message: 'No payment found with the provided ID'
      });
    }

    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({
      success: false,
      error: 'Something went wrong!',
      message: error.message
    });
  }
});

// PUT /api/payments/:id/status - Update payment status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Processing', 'Completed', 'Failed', 'Cancelled', 'Refunded', 'Partially Refunded'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const payment = await Payment.findByIdAndUpdate(
      id,
      { 
        status,
        timestamps: {
          ...payment.timestamps,
          processedAt: status === 'Completed' ? new Date() : payment.timestamps.processedAt,
          completedAt: status === 'Completed' ? new Date() : payment.timestamps.completedAt,
          failedAt: status === 'Failed' ? new Date() : payment.timestamps.failedAt
        }
      },
      { new: true, runValidators: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
        message: 'No payment found with the provided ID'
      });
    }

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: payment
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      error: 'Something went wrong!',
      message: error.message
    });
  }
});

// GET /api/payments/customer/:email - Get payments by customer email
router.get('/customer/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const payments = await Payment.find({ 'customerInfo.email': email })
      .populate('orderId', 'orderNumber customerInfo items pricing')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Customer payments retrieved successfully',
      data: payments
    });
  } catch (error) {
    console.error('Error fetching customer payments:', error);
    res.status(500).json({
      success: false,
      error: 'Something went wrong!',
      message: error.message
    });
  }
});

module.exports = router;