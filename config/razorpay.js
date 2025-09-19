// Razorpay Configuration Guide
// This file contains the configuration needed for Razorpay integration

const razorpayConfig = {
  // Test Credentials (for development)
  test: {
    key_id: 'rzp_test_RJAp2Z3ZQjQh05',
    key_secret: 'KVRm4qSsf2kMhVD2fKvr0AZj'
  },
  
  // App Configuration
  app: {
    name: 'Rental Website',
    description: 'Rental Service Payment',
    logo: '/logo.png'
  }
};

module.exports = razorpayConfig;
