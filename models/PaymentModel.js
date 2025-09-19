const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    unique: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required']
  },
  orderNumber: {
    type: String,
    required: [true, 'Order number is required'],
    trim: true
  },
  customerInfo: {
    firstName: {
      type: String,
      required: [true, 'Customer first name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Customer last name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Customer email is required'],
      trim: true,
      lowercase: true
    },
    phoneNumber: {
      type: String,
      required: [true, 'Customer phone number is required'],
      trim: true
    }
  },
  paymentMethod: {
    type: {
      type: String,
      required: [true, 'Payment method type is required'],
      enum: ['Credit Card', 'Debit Card', 'PayPal', 'Bank Transfer', 'Cash on Delivery', 'Digital Wallet', 'Razorpay']
    },
    details: {
      cardNumber: {
        type: String,
        trim: true
      },
      cardHolderName: {
        type: String,
        trim: true
      },
      expiryDate: {
        type: String,
        trim: true
      },
      cvv: {
        type: String,
        trim: true
      },
      bankName: {
        type: String,
        trim: true
      },
      accountNumber: {
        type: String,
        trim: true
      },
      walletProvider: {
        type: String,
        trim: true
      },
      // Razorpay specific fields
      razorpayOrderId: {
        type: String,
        trim: true
      },
      razorpayPaymentId: {
        type: String,
        trim: true
      },
      razorpaySignature: {
        type: String,
        trim: true
      },
      method: {
        type: String,
        trim: true
      },
      bank: {
        type: String,
        trim: true
      },
      wallet: {
        type: String,
        trim: true
      },
      vpa: {
        type: String,
        trim: true
      }
    }
  },
  amount: {
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative']
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Tax cannot be negative']
    },
    shipping: {
      type: Number,
      default: 0,
      min: [0, 'Shipping cannot be negative']
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative']
    },
    total: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative']
    }
  },
  status: {
    type: String,
    required: [true, 'Payment status is required'],
    enum: ['Pending', 'Processing', 'Completed', 'Failed', 'Cancelled', 'Refunded', 'Partially Refunded'],
    default: 'Pending'
  },
  transactionDetails: {
    transactionId: {
      type: String,
      trim: true
    },
    gatewayTransactionId: {
      type: String,
      trim: true
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed
    },
    gatewayName: {
      type: String,
      trim: true
    },
    processingFee: {
      type: Number,
      default: 0,
      min: [0, 'Processing fee cannot be negative']
    }
  },
  refundDetails: {
    refundId: {
      type: String,
      trim: true
    },
    refundAmount: {
      type: Number,
      min: [0, 'Refund amount cannot be negative']
    },
    refundReason: {
      type: String,
      trim: true
    },
    refundStatus: {
      type: String,
      enum: ['Pending', 'Processed', 'Failed'],
      default: 'Pending'
    },
    refundedAt: {
      type: Date
    }
  },
  timestamps: {
    initiatedAt: {
      type: Date,
      default: Date.now
    },
    processedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    failedAt: {
      type: Date
    }
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true // This adds createdAt and updatedAt automatically
});

// Generate payment ID before saving
paymentSchema.pre('save', async function(next) {
  if (!this.paymentId) {
    const count = await mongoose.model('Payment').countDocuments();
    this.paymentId = `PAY-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Create the Payment model
const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;

