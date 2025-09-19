const express = require('express');
const Address = require('../models/AddressModel');

const router = express.Router();

// GET /api/addresses - Get all addresses with filtering
router.get('/', async (req, res) => {
  try {
    const { 
      search, 
      city,
      state,
      country,
      addressType,
      isDefault,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build filter object
    let filter = {};
    
    // Filter by city
    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }

    // Filter by state
    if (state) {
      filter.state = { $regex: state, $options: 'i' };
    }

    // Filter by country
    if (country) {
      filter.country = { $regex: country, $options: 'i' };
    }

    // Filter by address type
    if (addressType) {
      filter.addressType = addressType;
    }

    // Filter by default status
    if (isDefault !== undefined) {
      filter.isDefault = isDefault === 'true';
    }

    // Search by name, email, or address
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { streetAddress: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    let sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    // Query database
    const addresses = await Address.find(filter).sort(sort);

    res.json({
      success: true,
      count: addresses.length,
      data: addresses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch addresses',
      message: error.message
    });
  }
});

// GET /api/addresses/:id - Get address by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findById(id);

    if (!address) {
      return res.status(404).json({
        success: false,
        error: 'Address not found',
        message: `No address found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      data: address
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch address',
      message: error.message
    });
  }
});

// POST /api/addresses - Create new address
router.post('/', async (req, res) => {
  try {
    const addressData = req.body;

    // Required field validation
    const requiredFields = [
      'firstName', 
      'lastName', 
      'email', 
      'phoneNumber', 
      'streetAddress', 
      'city', 
      'state', 
      'postalCode', 
      'country'
    ];
    const missingFields = requiredFields.filter(field => !addressData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: `Required fields: ${missingFields.join(', ')}`
      });
    }

    // Email validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(addressData.email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        message: 'Please enter a valid email address'
      });
    }

    // Phone number validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(addressData.phoneNumber.replace(/[\s\-\(\)]/g, ''))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number',
        message: 'Please enter a valid phone number'
      });
    }

    // If this is set as default, unset other defaults
    if (addressData.isDefault) {
      await Address.updateMany({}, { isDefault: false });
    }

    const newAddress = await Address.create(addressData);

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      data: newAddress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create address',
      message: error.message
    });
  }
});

// PUT /api/addresses/:id - Update address
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Email validation if provided
    if (updateData.email) {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(updateData.email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format',
          message: 'Please enter a valid email address'
        });
      }
    }

    // Phone number validation if provided
    if (updateData.phoneNumber) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(updateData.phoneNumber.replace(/[\s\-\(\)]/g, ''))) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone number',
          message: 'Please enter a valid phone number'
        });
      }
    }

    // If this is set as default, unset other defaults
    if (updateData.isDefault) {
      await Address.updateMany({ _id: { $ne: id } }, { isDefault: false });
    }

    const updatedAddress = await Address.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!updatedAddress) {
      return res.status(404).json({
        success: false,
        error: 'Address not found',
        message: `No address found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: updatedAddress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update address',
      message: error.message
    });
  }
});

// DELETE /api/addresses/:id - Delete address
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedAddress = await Address.findByIdAndDelete(id);

    if (!deletedAddress) {
      return res.status(404).json({
        success: false,
        error: 'Address not found',
        message: `No address found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      message: 'Address deleted successfully',
      data: deletedAddress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete address',
      message: error.message
    });
  }
});

// PATCH /api/addresses/:id/set-default - Set address as default
router.patch('/:id/set-default', async (req, res) => {
  try {
    const { id } = req.params;

    // First, unset all other defaults
    await Address.updateMany({}, { isDefault: false });

    // Then set this address as default
    const updatedAddress = await Address.findByIdAndUpdate(
      id, 
      { isDefault: true }, 
      { new: true }
    );

    if (!updatedAddress) {
      return res.status(404).json({
        success: false,
        error: 'Address not found',
        message: `No address found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      message: 'Address set as default successfully',
      data: updatedAddress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to set default address',
      message: error.message
    });
  }
});

// GET /api/addresses/default - Get default address
router.get('/default/address', async (req, res) => {
  try {
    const defaultAddress = await Address.findOne({ isDefault: true });

    if (!defaultAddress) {
      return res.status(404).json({
        success: false,
        error: 'No default address found',
        message: 'No address is currently set as default'
      });
    }

    res.json({
      success: true,
      data: defaultAddress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch default address',
      message: error.message
    });
  }
});

// GET /api/addresses/type/:type - Get addresses by type
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { isDefault } = req.query;

    const filter = {
      addressType: type
    };

    if (isDefault !== undefined) {
      filter.isDefault = isDefault === 'true';
    }

    const addresses = await Address.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: addresses.length,
      addressType: type,
      data: addresses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch addresses by type',
      message: error.message
    });
  }
});

module.exports = router;

