const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // Use environment variable for MongoDB URI, fallback to localhost for development
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://bhargav:bhargav123@stylehub.5xbqe5t.mongodb.net/?retryWrites=true&w=majority&appName=stylehub';
    
    console.log('🔗 Connecting to MongoDB...');
    console.log('📍 URI:', mongoURI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs
    
    const conn = await mongoose.connect(mongoURI);

    console.log(`🗄️  MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('ECONNREFUSED')) {
      console.error('💡 Tip: Make sure MongoDB is running locally or check your MONGODB_URI environment variable');
    } else if (error.message.includes('authentication failed')) {
      console.error('💡 Tip: Check your MongoDB username and password in the connection string');
    } else if (error.message.includes('network')) {
      console.error('💡 Tip: Check your internet connection and MongoDB Atlas network access settings');
    }
    
    process.exit(1);
  }
};

module.exports = connectDB;
