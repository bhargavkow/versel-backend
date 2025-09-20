// Test script to check if the photo carousel API is working
const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:5000';

async function testAPI() {
  try {
    console.log('🔍 Testing Photo Carousel API...');
    
    // Test 1: Health check
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_URL}/api/health`);
    console.log('✅ Health check:', healthResponse.data);
    
    // Test 2: Photo carousel test endpoint
    console.log('\n2. Testing photo carousel test endpoint...');
    const testResponse = await axios.get(`${API_URL}/api/photo-carousel/test`);
    console.log('✅ Photo carousel test:', testResponse.data);
    
    // Test 3: Get all photo carousel items
    console.log('\n3. Testing get all photo carousel items...');
    const getResponse = await axios.get(`${API_URL}/api/photo-carousel`);
    console.log('✅ Get all items:', getResponse.data);
    
    console.log('\n🎉 All tests passed! API is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Backend server is not running. Please start it with: cd backend && npm start');
    }
  }
}

testAPI();
