require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const productRoutes = require('./apis/product');
const addressRoutes = require('./apis/address');
const categoryRoutes = require('./apis/category');
const subcategoryRoutes = require('./apis/subcategory');
const orderRoutes = require('./apis/order');
const paymentRoutes = require('./apis/payment');
const razorpayRoutes = require('./apis/razorpay');
const carouselRoutes = require('./apis/carousel');
const photoCarouselRoutes = require('./apis/photoCarousel');
const homepageCategoryRoutes = require('./apis/homepagecategory');
const faqRoutes = require('./apis/faq');
const userRoutes = require('./apis/user');
const { router: authRoutes } = require('./apis/auth');
const uploadRoutes = require('./apis/upload');
const connectDB = require('./config/database');

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000', 
      'http://127.0.0.1:3000',
      'https://versel-frontend.vercel.app',
      'https://stylehub-lime.vercel.app',
      'https://stylehub-backend-nu.vercel.app'
    ];
    
    // Check if origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Check if it's a Vercel subdomain
      if (origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (uploaded images) from frontend public folder
app.use('/uploads', express.static(path.join(__dirname, '../rental_website/public/uploads')));

// Routes
app.use('/api/products', productRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subcategoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/razorpay', razorpayRoutes);
app.use('/api/carousels', carouselRoutes);
app.use('/api/photo-carousel', photoCarouselRoutes);
app.use('/api/homepage-categories', homepageCategoryRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);

// Debug: Log all routes
console.log('📋 Registered API Routes:');
console.log('  - /api/products');
console.log('  - /api/addresses');
console.log('  - /api/categories');
console.log('  - /api/subcategories');
console.log('  - /api/orders');
console.log('  - /api/payments');
console.log('  - /api/razorpay');
console.log('  - /api/carousels');
console.log('  - /api/photo-carousel');
console.log('  - /api/homepage-categories');
console.log('  - /api/faqs');
console.log('  - /api/user');
console.log('  - /api/auth');
console.log('  - /api/upload');

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Product API Backend is running',
    version: '1.0.0',
    endpoints: [
      '/api/products',
      '/api/categories',
      '/api/auth',
      '/api/health'
    ],
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Product API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}` 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
