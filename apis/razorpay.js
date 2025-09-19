const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/PaymentModel');
const Order = require('../models/OrderModel');
const razorpayConfig = require('../config/razorpay');

const router = express.Router();

// Initialize Razorpay instance (Test Mode Only)
const razorpay = new Razorpay({
  key_id: razorpayConfig.test.key_id,
  key_secret: razorpayConfig.test.key_secret,
});

// POST /api/razorpay/create-order - Create Razorpay order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, notes } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount',
        message: 'Amount must be greater than 0'
      });
    }

    if (!receipt) {
      return res.status(400).json({
        success: false,
        error: 'Missing receipt',
        message: 'Receipt is required'
      });
    }

    // Validate currency (Test mode supports INR only)
    const supportedCurrencies = ['INR'];
    if (!supportedCurrencies.includes(currency)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported currency',
        message: `Currency ${currency} is not supported. Supported currencies: ${supportedCurrencies.join(', ')}`
      });
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency,
      receipt: receipt,
      notes: notes || {}
    };

    const razorpayOrder = await razorpay.orders.create(options);

    res.json({
      success: true,
      message: 'Razorpay order created successfully',
      data: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
        status: razorpayOrder.status,
        created_at: razorpayOrder.created_at
      }
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create Razorpay order',
      message: error.message
    });
  }
});

// POST /api/razorpay/verify-payment - Verify payment signature
router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body;

    console.log('=== PAYMENT VERIFICATION DEBUG ===');
    console.log('Received data:', {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature: razorpay_signature ? 'Present' : 'Missing',
      orderData: orderData ? 'Present' : 'Missing'
    });

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.log('Missing required fields:', {
        razorpay_order_id: !!razorpay_order_id,
        razorpay_payment_id: !!razorpay_payment_id,
        razorpay_signature: !!razorpay_signature
      });
      return res.status(400).json({
        success: false,
        error: 'Missing payment verification data',
        message: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required'
      });
    }

    // Verify payment signature (Test Mode Only)
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", razorpayConfig.test.key_secret)
      .update(body.toString())
      .digest("hex");

    console.log('Signature verification:', {
      body,
      expectedSignature,
      receivedSignature: razorpay_signature,
      isAuthentic: expectedSignature === razorpay_signature
    });

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      console.log('Payment signature verification failed');
      return res.status(400).json({
        success: false,
        error: 'Invalid payment signature',
        message: 'Payment verification failed'
      });
    }

    // Get payment details from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    // Create order first
    const orderPayload = {
      customerInfo: {
        firstName: orderData?.customerInfo?.firstName || 'Guest',
        lastName: orderData?.customerInfo?.lastName || 'User',
        email: orderData?.customerInfo?.email || 'guest@example.com',
        phoneNumber: orderData?.customerInfo?.phoneNumber || '0000000000'
      },
      shippingAddress: {
        streetAddress: orderData?.address?.street_address || 'Address',
        city: orderData?.address?.city || 'City',
        state: orderData?.address?.state || 'State',
        postalCode: orderData?.address?.postal_code || '000000',
        country: orderData?.address?.country || 'India'
      },
      billingAddress: {
        streetAddress: orderData?.address?.street_address || 'Address',
        city: orderData?.address?.city || 'City',
        state: orderData?.address?.state || 'State',
        postalCode: orderData?.address?.postal_code || '000000',
        country: orderData?.address?.country || 'India'
      },
      items: orderData?.products?.map(product => ({
        productId: product.id,
        productName: product.name,
        quantity: product.quantity || 1,
        unitPrice: product.price || product.rental_price || 0,
        totalPrice: (product.price || product.rental_price || 0) * (product.quantity || 1)
      })) || [],
      pricing: {
        subtotal: orderData?.totalPrice || 0,
        tax: 0,
        shipping: 0,
        discount: 0,
        total: orderData?.totalPrice || 0
      },
      payment: {
        method: 'Razorpay',
        status: 'Pending',
        transactionId: razorpay_payment_id
      },
      status: 'Pending'
    };

    const newOrder = await Order.create(orderPayload);
    console.log('Order created:', newOrder._id);

    // Create payment record in database
    const paymentData = {
      paymentId: razorpay_payment_id,
      orderNumber: newOrder.orderNumber,
      orderId: newOrder._id,
      customerInfo: {
        firstName: orderData?.customerInfo?.firstName || 'Guest',
        lastName: orderData?.customerInfo?.lastName || 'User',
        email: orderData?.customerInfo?.email || 'guest@example.com',
        phoneNumber: orderData?.customerInfo?.phoneNumber || '0000000000'
      },
      paymentMethod: {
        type: 'Razorpay',
        details: {
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          method: payment.method,
          bank: payment.bank || null,
          wallet: payment.wallet || null,
          vpa: payment.vpa || null
        }
      },
      amount: {
        subtotal: orderData?.totalPrice || (payment.amount / 100), // Use order total or convert from paise
        tax: 0,
        shipping: 0,
        discount: 0,
        total: orderData?.totalPrice || (payment.amount / 100) // Use order total or convert from paise
      },
      status: payment.status === 'captured' ? 'Completed' : 'Processing',
      transactionDetails: {
        transactionId: razorpay_payment_id,
        gatewayTransactionId: razorpay_payment_id,
        gatewayResponse: payment,
        gatewayName: 'Razorpay',
        processingFee: 0
      },
      timestamps: {
        initiatedAt: new Date(),
        processedAt: new Date(),
        completedAt: payment.status === 'captured' ? new Date() : null
      }
    };

    // If orderId is provided, link the payment to the order
    if (orderData?.orderId) {
      paymentData.orderId = orderData.orderId;
    }

    const newPayment = await Payment.create(paymentData);

    res.json({
      success: true,
      message: 'Payment verified and recorded successfully',
      data: {
        payment: newPayment,
        razorpay_order_id: razorpay_order_id,
        razorpay_payment_id: razorpay_payment_id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status
      }
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment',
      message: error.message
    });
  }
});

// GET /api/razorpay/payment/:id - Get payment details
router.get('/payment/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to get payment from Razorpay first
    try {
      const razorpayPayment = await razorpay.payments.fetch(id);
      
      res.json({
        success: true,
        data: {
          razorpay_payment: razorpayPayment,
          amount: razorpayPayment.amount / 100,
          currency: razorpayPayment.currency,
          status: razorpayPayment.status,
          method: razorpayPayment.method,
          created_at: razorpayPayment.created_at
        }
      });
    } catch (razorpayError) {
      // If not found in Razorpay, try database
      const dbPayment = await Payment.findOne({ paymentId: id });
      
      if (!dbPayment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found',
          message: `No payment found with ID: ${id}`
        });
      }

      res.json({
        success: true,
        data: dbPayment
      });
    }

  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment',
      message: error.message
    });
  }
});

// POST /api/razorpay/refund - Process refund
router.post('/refund', async (req, res) => {
  try {
    const { payment_id, amount, notes } = req.body;

    if (!payment_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing payment ID',
        message: 'Payment ID is required for refund'
      });
    }

    // Create refund options
    const refundOptions = {
      payment_id: payment_id,
      notes: notes || { reason: 'Customer request' }
    };

    // Add amount if partial refund
    if (amount && amount > 0) {
      refundOptions.amount = Math.round(amount * 100); // Convert to paise
    }

    // Process refund through Razorpay
    const refund = await razorpay.payments.refund(payment_id, refundOptions);

    // Update payment record in database
    const payment = await Payment.findOne({ paymentId: payment_id });
    if (payment) {
      payment.refundDetails = {
        refundId: refund.id,
        refundAmount: refund.amount / 100,
        refundStatus: refund.status,
        refundReason: notes?.reason || 'Customer request',
        refundedAt: new Date()
      };

      // Update payment status
      if (refund.status === 'processed') {
        payment.status = refund.amount === payment.amount.total * 100 ? 'Refunded' : 'Partially Refunded';
      }

      await payment.save();
    }

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refund_id: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
        created_at: refund.created_at
      }
    });

  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process refund',
      message: error.message
    });
  }
});

// GET /api/razorpay/config - Get Razorpay configuration (Test Mode Only)
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      key_id: razorpayConfig.test.key_id,
      currency: 'INR',
      name: razorpayConfig.app.name,
      description: razorpayConfig.app.description,
      image: razorpayConfig.app.logo,
      mode: 'test'
    }
  });
});

module.exports = router;
