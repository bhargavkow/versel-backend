const express = require('express');
const User = require('../models/UserModel');
const Order = require('../models/OrderModel');
const Address = require('../models/AddressModel');

const router = express.Router();

// Middleware to verify JWT token (imported from auth.js)
const { authenticateToken } = require('./auth');

// GET /api/user/dashboard - Get user dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's recent orders
    const recentOrders = await Order.find({ 'customerInfo.userId': userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderNumber status createdAt totalAmount items');

    // Get user's order statistics
    const orderStats = await Order.aggregate([
      { $match: { 'customerInfo.userId': userId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get user's addresses
    const addresses = await Address.find({ userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .limit(3);

    // Get user's favorite items (if you have a favorites system)
    const favorites = []; // This would come from your favorites collection

    const stats = orderStats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      completedOrders: 0,
      pendingOrders: 0
    };

    res.json({
      success: true,
      data: {
        user: {
          name: req.user.fullName,
          email: req.user.email,
          memberSince: req.user.createdAt
        },
        stats: {
          totalOrders: stats.totalOrders,
          totalSpent: stats.totalSpent,
          completedOrders: stats.completedOrders,
          pendingOrders: stats.pendingOrders
        },
        recentOrders,
        addresses,
        favorites
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      message: error.message
    });
  }
});

// GET /api/user/orders - Get user's orders with pagination
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { 
      page = 1, 
      limit = 10, 
      status, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    // Build filter
    let filter = { 'customerInfo.userId': userId };
    if (status) {
      filter.status = status;
    }

    // Build sort
    let sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('items.productId', 'brand description price image');

    const totalOrders = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalOrders / parseInt(limit)),
          totalOrders,
          hasNext: parseInt(page) < Math.ceil(totalOrders / parseInt(limit)),
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders',
      message: error.message
    });
  }
});

// GET /api/user/orders/:id - Get specific order details
router.get('/orders/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const orderId = req.params.id;

    const order = await Order.findOne({
      _id: orderId,
      'customerInfo.userId': userId
    }).populate('items.productId', 'brand description price image');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: 'Order not found or you do not have permission to view it'
      });
    }

    res.json({
      success: true,
      data: { order }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order',
      message: error.message
    });
  }
});

// GET /api/user/addresses - Get user's addresses
router.get('/addresses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    const addresses = await Address.find({ userId })
      .sort({ isDefault: -1, createdAt: -1 });

    res.json({
      success: true,
      data: { addresses }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch addresses',
      message: error.message
    });
  }
});

// POST /api/user/addresses - Add new address
router.post('/addresses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      firstName,
      lastName,
      streetAddress,
      city,
      state,
      country,
      postalCode,
      phoneNumber,
      addressType,
      isDefault
    } = req.body;

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'streetAddress', 'city', 'state', 'country', 'postalCode'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: `Required fields: ${missingFields.join(', ')}`
      });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await Address.updateMany({ userId }, { isDefault: false });
    }

    const newAddress = await Address.create({
      userId,
      firstName,
      lastName,
      streetAddress,
      city,
      state,
      country,
      postalCode,
      phoneNumber: phoneNumber || req.user.mobileNumber,
      addressType: addressType || 'home',
      isDefault: isDefault || false
    });

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: { address: newAddress }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add address',
      message: error.message
    });
  }
});

// PUT /api/user/addresses/:id - Update address
router.put('/addresses/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const addressId = req.params.id;
    const updateData = req.body;

    // Check if address belongs to user
    const address = await Address.findOne({ _id: addressId, userId });
    if (!address) {
      return res.status(404).json({
        success: false,
        error: 'Address not found',
        message: 'Address not found or you do not have permission to modify it'
      });
    }

    // If setting as default, unset other defaults
    if (updateData.isDefault) {
      await Address.updateMany({ userId, _id: { $ne: addressId } }, { isDefault: false });
    }

    const updatedAddress = await Address.findByIdAndUpdate(
      addressId,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: { address: updatedAddress }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update address',
      message: error.message
    });
  }
});

// DELETE /api/user/addresses/:id - Delete address
router.delete('/addresses/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const addressId = req.params.id;

    // Check if address belongs to user
    const address = await Address.findOne({ _id: addressId, userId });
    if (!address) {
      return res.status(404).json({
        success: false,
        error: 'Address not found',
        message: 'Address not found or you do not have permission to delete it'
      });
    }

    await Address.findByIdAndDelete(addressId);

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete address',
      message: error.message
    });
  }
});

// GET /api/user/preferences - Get user preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user preferences (you might want to create a separate Preferences model)
    const preferences = {
      notifications: {
        email: true,
        sms: true,
        push: true
      },
      privacy: {
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false
      },
      preferences: {
        preferredCategories: [],
        preferredBrands: [],
        preferredSizes: [],
        preferredColors: []
      }
    };

    res.json({
      success: true,
      data: { preferences }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch preferences',
      message: error.message
    });
  }
});

// PUT /api/user/preferences - Update user preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const preferences = req.body;

    // Update user preferences (you might want to create a separate Preferences model)
    // For now, we'll store it in the user document
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { preferences },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences',
      message: error.message
    });
  }
});

// GET /api/user/activity - Get user activity log
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;

    // Get user's recent activity (orders, profile updates, etc.)
    const activities = [];

    // Get recent orders
    const recentOrders = await Order.find({ 'customerInfo.userId': userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber status createdAt totalAmount');

    recentOrders.forEach(order => {
      activities.push({
        type: 'order',
        action: order.status === 'completed' ? 'Order completed' : 'Order placed',
        description: `Order #${order.orderNumber} - $${order.totalAmount}`,
        date: order.createdAt,
        data: { orderId: order._id, orderNumber: order.orderNumber }
      });
    });

    // Sort activities by date
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedActivities = activities.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: {
        activities: paginatedActivities,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(activities.length / parseInt(limit)),
          totalActivities: activities.length,
          hasNext: skip + parseInt(limit) < activities.length,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity',
      message: error.message
    });
  }
});

// GET /api/user/statistics - Get user statistics
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get comprehensive user statistics
    const stats = await Order.aggregate([
      { $match: { 'customerInfo.userId': userId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get monthly spending data
    const monthlySpending = await Order.aggregate([
      { $match: { 'customerInfo.userId': userId } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalSpent: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    // Get favorite categories (if you have product categories)
    const favoriteCategories = await Order.aggregate([
      { $match: { 'customerInfo.userId': userId } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.category',
          count: { $sum: 1 },
          totalSpent: { $sum: '$items.price' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const userStats = stats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0,
      completedOrders: 0,
      pendingOrders: 0,
      cancelledOrders: 0
    };

    res.json({
      success: true,
      data: {
        overview: userStats,
        monthlySpending,
        favoriteCategories,
        memberSince: req.user.createdAt,
        lastLogin: req.user.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

// POST /api/user/feedback - Submit user feedback
router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, subject, message, rating } = req.body;

    // Validate required fields
    if (!type || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Type and message are required'
      });
    }

    // Create feedback entry (you might want to create a Feedback model)
    const feedback = {
      userId,
      type,
      subject: subject || 'General Feedback',
      message,
      rating: rating || null,
      createdAt: new Date(),
      status: 'pending'
    };

    // Here you would save to a Feedback collection
    // await Feedback.create(feedback);

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: { feedback }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback',
      message: error.message
    });
  }
});

// GET /api/user/notifications - Get user notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    // Get user notifications (you might want to create a Notifications model)
    const notifications = [
      {
        id: '1',
        type: 'order',
        title: 'Order Confirmed',
        message: 'Your order #12345 has been confirmed',
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        data: { orderId: '12345' }
      },
      {
        id: '2',
        type: 'promotion',
        title: 'Special Offer',
        message: 'Get 20% off on your next rental',
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        data: { discountCode: 'SAVE20' }
      }
    ];

    // Filter unread if requested
    let filteredNotifications = notifications;
    if (unreadOnly === 'true') {
      filteredNotifications = notifications.filter(n => !n.isRead);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedNotifications = filteredNotifications.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: {
        notifications: paginatedNotifications,
        unreadCount: notifications.filter(n => !n.isRead).length,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(filteredNotifications.length / parseInt(limit)),
          totalNotifications: filteredNotifications.length,
          hasNext: skip + parseInt(limit) < filteredNotifications.length,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      message: error.message
    });
  }
});

// PUT /api/user/notifications/:id/read - Mark notification as read
router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;

    // Mark notification as read (you would update in your Notifications collection)
    // await Notification.findByIdAndUpdate(notificationId, { isRead: true });

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      message: error.message
    });
  }
});

module.exports = router;
