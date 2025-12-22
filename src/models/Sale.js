import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: [true, 'Inventory ID is required']
  },
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be greater than 0']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  total: {
    type: Number,
    required: [true, 'Item total is required'],
    min: [0, 'Item total cannot be negative']
  },
  
  // Variant information (if item has variants)
  variant: {
    hasVariant: {
      type: Boolean,
      default: false
    },
    size: {
      type: String,
      trim: true,
      default: null
    },
    color: {
      type: String,
      trim: true,
      default: null
    },
    variantSku: {
      type: String,
      trim: true,
      default: null
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    images: [{
      type: String // Variant-specific images
    }]
  },
  
  // Batch tracking for sales
  batchesSoldFrom: [{
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryBatch'
    },
    batchCode: String,
    quantityFromBatch: Number,
    costPriceFromBatch: Number,
    // Variant info from batch if applicable
    batchVariant: {
      size: String,
      color: String,
      variantSku: String
    }
  }],
  
  // Cost and profit tracking
  costBreakdown: {
    totalCost: {
      type: Number,
      default: 0
    },
    weightedAverageCost: {
      type: Number,
      default: 0
    },
    profit: {
      type: Number,
      default: 0
    }
  },
  
  // Category-specific snapshot (capture product details at time of sale)
  categoryDetails: {
    category: {
      type: String,
      trim: true
    },
    // Clothing details snapshot
    clothingDetails: {
      gender: String,
      productType: String,
      material: String,
      style: [String],
      occasion: [String]
    },
    // Shoes details snapshot
    shoesDetails: {
      gender: String,
      shoeType: String,
      material: String,
      occasion: [String]
    },
    // Accessories details snapshot
    accessoriesDetails: {
      accessoryType: String,
      gender: String,
      material: String
    },
    // Perfume details snapshot
    perfumeDetails: {
      fragranceType: String,
      gender: String,
      volume: String,
      scentFamily: String,
      concentration: String,
      occasion: [String]
    },
    // Food details snapshot
    foodDetails: {
      foodType: String,
      cuisineType: [String],
      servingSize: String,
      spiceLevel: String,
      allergens: [String]
    },
    // Beverages details snapshot
    beveragesDetails: {
      beverageType: String,
      volume: String,
      packaging: String,
      isAlcoholic: Boolean,
      isCarbonated: Boolean,
      flavorProfile: [String]
    },
    // Electronics details snapshot
    electronicsDetails: {
      productType: String,
      brand: String,
      model: String,
      condition: String,
      warranty: {
        hasWarranty: Boolean,
        duration: String
      }
    },
    // Books details snapshot
    booksDetails: {
      bookType: String,
      author: String,
      publisher: String,
      isbn: String,
      format: String,
      condition: String
    },
    // Home & Garden details snapshot
    homeGardenDetails: {
      productType: String,
      room: [String],
      material: String,
      assemblyRequired: Boolean
    },
    // Sports details snapshot
    sportsDetails: {
      sportType: String,
      productType: String,
      brand: String,
      performanceLevel: String
    },
    // Automotive details snapshot
    automotiveDetails: {
      productType: String,
      brand: String,
      partNumber: String,
      condition: String,
      compatibleVehicles: [{
        make: String,
        model: String,
        year: String
      }]
    },
    // Health & Beauty details snapshot
    healthBeautyDetails: {
      productType: String,
      brand: String,
      skinType: [String],
      volume: String,
      scent: String,
      isOrganic: Boolean
    }
  }
});

const saleSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },

  // Transaction Information
  transactionId: {
    type: String,
    unique: true,
    // Will be auto-generated in pre-save middleware
  },

  // Items sold
  items: [saleItemSchema],

  // Customer information
  customer: {
    name: {
      type: String,
      trim: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      default: ''
    }
  },

  // Financial Information with proper defaults and validation
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative'],
    default: 0,
    set: function(value) {
      return Number(value) || 0;
    }
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    set: function(value) {
      return Number(value) || 0;
    }
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative'],
    set: function(value) {
      return Number(value) || 0;
    }
  },
  total: {
    type: Number,
    required: [true, 'Total is required'],
    min: [0, 'Total cannot be negative'],
    default: 0,
    set: function(value) {
      return Number(value) || 0;
    }
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['cash', 'transfer', 'pos', 'credit'],
    default: 'cash'
  },
  amountReceived: {
    type: Number,
    required: [true, 'Amount received is required'],
    min: [0, 'Amount received cannot be negative'],
    default: 0,
    set: function(value) {
      return Number(value) || 0;
    }
  },
  balance: {
    type: Number,
    default: 0,
    set: function(value) {
      return Number(value) || 0;
    }
  },

  // Sale metadata
  saleDate: {
    type: Date,
    required: [true, 'Sale date is required'],
    default: Date.now
  },
  status: {
    type: String,
    enum: ['completed', 'refunded', 'partially_refunded'],
    default: 'completed'
  },
  soldBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sold by user is required']
  },
  saleLocation: {
    type: String,
    default: 'Main Store'
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },

  // Order processing specific fields
  isFromOrder: {
    type: Boolean,
    default: false
  },
  linkedOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  orderNumber: {
    type: String,
    default: null
  },
  isOrderProcessing: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save middleware to generate transaction ID
saleSchema.pre('save', async function(next) {
  // Only generate transactionId if it doesn't exist
  if (!this.transactionId) {
    try {
      // Generate unique transaction ID
      const now = new Date();
      const dateStr = now.getFullYear().toString() + 
                     (now.getMonth() + 1).toString().padStart(2, '0') + 
                     now.getDate().toString().padStart(2, '0');
      const timeStr = now.getHours().toString().padStart(2, '0') + 
                     now.getMinutes().toString().padStart(2, '0') + 
                     now.getSeconds().toString().padStart(2, '0');
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Format: TXN-YYYYMMDD-HHMMSS-RANDOM
      this.transactionId = `TXN-${dateStr}-${timeStr}-${randomSuffix}`;
      
      // Ensure uniqueness by checking for existing transaction IDs
      let attempts = 0;
      while (attempts < 5) {
        const existing = await this.constructor.findOne({ 
          transactionId: this.transactionId 
        });
        
        if (!existing) break;
        
        // If exists, add attempt number
        attempts++;
        this.transactionId = `TXN-${dateStr}-${timeStr}-${randomSuffix}-${attempts}`;
      }
    } catch (error) {
      console.error('Transaction ID generation error:', error);
      // Fallback transaction ID if generation fails
      this.transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }
  }
  
  // Ensure all numeric fields are actually numbers
  this.subtotal = Number(this.subtotal) || 0;
  this.discount = Number(this.discount) || 0;
  this.tax = Number(this.tax) || 0;
  this.total = Number(this.total) || 0;
  this.amountReceived = Number(this.amountReceived) || 0;
  this.balance = Number(this.balance) || 0;
  
  // Log the values being saved for debugging
  console.log('Saving sale with financial data:', {
    subtotal: this.subtotal,
    total: this.total,
    transactionId: this.transactionId
  });
  
  next();
});

// Virtual for profit calculation
saleSchema.virtual('totalProfit').get(function() {
  return this.items.reduce((sum, item) => {
    return sum + (item.costBreakdown?.profit || 0);
  }, 0);
});

// Virtual for total cost
saleSchema.virtual('totalCost').get(function() {
  return this.items.reduce((sum, item) => {
    return sum + (item.costBreakdown?.totalCost || 0);
  }, 0);
});

// Static methods
saleSchema.statics.getSalesByUser = function(userId, options = {}) {
  const { 
    page = 1, 
    limit = 20, 
    sortBy = 'saleDate', 
    sortOrder = -1,
    startDate = null,
    endDate = null,
    paymentMethod = null,
    status = null
  } = options;

  const query = { userId };
  
  if (startDate || endDate) {
    query.saleDate = {};
    if (startDate) query.saleDate.$gte = new Date(startDate);
    if (endDate) query.saleDate.$lte = new Date(endDate);
  }
  
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  return this.find(query)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .populate('soldBy', 'firstName lastName')
    .populate('items.inventoryId', 'productName sku');
};

saleSchema.statics.getSalesStats = async function(userId) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const pipeline = [
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        avgSaleAmount: { $avg: '$total' },
        todaySales: {
          $sum: {
            $cond: [{ $gte: ['$saleDate', startOfToday] }, 1, 0]
          }
        },
        todayRevenue: {
          $sum: {
            $cond: [{ $gte: ['$saleDate', startOfToday] }, '$total', 0]
          }
        },
        weekSales: {
          $sum: {
            $cond: [{ $gte: ['$saleDate', startOfWeek] }, 1, 0]
          }
        },
        weekRevenue: {
          $sum: {
            $cond: [{ $gte: ['$saleDate', startOfWeek] }, '$total', 0]
          }
        },
        monthSales: {
          $sum: {
            $cond: [{ $gte: ['$saleDate', startOfMonth] }, 1, 0]
          }
        },
        monthRevenue: {
          $sum: {
            $cond: [{ $gte: ['$saleDate', startOfMonth] }, '$total', 0]
          }
        }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalSales: 0,
    totalRevenue: 0,
    avgSaleAmount: 0,
    todaySales: 0,
    todayRevenue: 0,
    weekSales: 0,
    weekRevenue: 0,
    monthSales: 0,
    monthRevenue: 0
  };
};

// Instance methods
saleSchema.methods.refundSale = async function(refundAmount = null, reason = '') {
  if (this.status === 'refunded') {
    throw new Error('Sale is already fully refunded');
  }

  const refundTotal = refundAmount || this.total;
  
  if (refundTotal > this.total) {
    throw new Error('Refund amount cannot exceed sale total');
  }

  this.status = refundTotal === this.total ? 'refunded' : 'partially_refunded';
  this.notes = this.notes ? `${this.notes}\nRefund: ${refundTotal} - ${reason}` : `Refund: ${refundTotal} - ${reason}`;
  
  return await this.save();
};

// Indexes
saleSchema.index({ userId: 1, saleDate: -1 });
saleSchema.index({ transactionId: 1 }, { unique: true });
saleSchema.index({ linkedOrderId: 1 });
saleSchema.index({ userId: 1, status: 1 });
saleSchema.index({ userId: 1, paymentMethod: 1 });

const Sale = mongoose.models.Sale || mongoose.model('Sale', saleSchema);

export default Sale;
