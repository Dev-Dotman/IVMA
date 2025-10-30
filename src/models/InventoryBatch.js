import mongoose from 'mongoose';

const inventoryBatchSchema = new mongoose.Schema({
  // References
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: [true, 'Product ID is required'],
    index: true
  },

  // Batch identification
  batchCode: {
    type: String,
    required: [true, 'Batch code is required'],
    trim: true,
    uppercase: true,
    index: true
  },

  // Quantity tracking
  quantityIn: {
    type: Number,
    required: [true, 'Initial quantity is required'],
    min: [0, 'Quantity in cannot be negative']
  },
  quantitySold: {
    type: Number,
    required: true,
    min: [0, 'Quantity sold cannot be negative'],
    default: 0
  },
  quantityRemaining: {
    type: Number,
    required: true,
    min: [0, 'Quantity remaining cannot be negative']
  },

  // Pricing information
  costPrice: {
    type: Number,
    required: [true, 'Cost price is required'],
    min: [0, 'Cost price cannot be negative']
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: [0, 'Selling price cannot be negative']
  },

  // Dates
  dateReceived: {
    type: Date,
    required: [true, 'Date received is required'],
    default: Date.now
  },
  expiryDate: {
    type: Date,
    default: null
  },

  // Supplier information
  supplier: {
    type: String,
    trim: true,
    maxlength: [100, 'Supplier name cannot exceed 100 characters'],
    default: ''
  },

  // Additional information
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    default: ''
  },

  // Status tracking
  status: {
    type: String,
    enum: ['active', 'depleted', 'expired', 'damaged'],
    default: 'active',
    index: true
  },

  // Batch location (if different from main product location)
  batchLocation: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters'],
    default: ''
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields
inventoryBatchSchema.virtual('batchValue').get(function() {
  return this.quantityRemaining * this.costPrice;
});

inventoryBatchSchema.virtual('potentialRevenue').get(function() {
  return this.quantityRemaining * this.sellingPrice;
});

inventoryBatchSchema.virtual('totalRevenue').get(function() {
  return this.quantitySold * this.sellingPrice;
});

inventoryBatchSchema.virtual('totalProfit').get(function() {
  return (this.sellingPrice - this.costPrice) * this.quantitySold;
});

inventoryBatchSchema.virtual('profitMargin').get(function() {
  if (this.costPrice === 0) return 0;
  return ((this.sellingPrice - this.costPrice) / this.costPrice) * 100;
});

inventoryBatchSchema.virtual('isExpired').get(function() {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
});

inventoryBatchSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expiryDate) return null;
  const diffTime = this.expiryDate - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

inventoryBatchSchema.virtual('turnoverRate').get(function() {
  if (this.quantityIn === 0) return 0;
  return (this.quantitySold / this.quantityIn) * 100;
});

// Pre-save middleware
inventoryBatchSchema.pre('save', function(next) {
  // Auto-calculate quantity remaining
  this.quantityRemaining = this.quantityIn - this.quantitySold;
  
  // Ensure quantity remaining is not negative
  if (this.quantityRemaining < 0) {
    this.quantityRemaining = 0;
  }
  
  // Update status based on quantity and expiry
  if (this.quantityRemaining <= 0) {
    this.status = 'depleted';
  } else if (this.isExpired) {
    this.status = 'expired';
  } else {
    this.status = 'active';
  }
  
  next();
});

// Generate batch code if not provided - improved to be synchronous
inventoryBatchSchema.pre('save', async function(next) {
  if (!this.batchCode || this.batchCode === '' || this.batchCode === null) {
    try {
      // Generate batch code synchronously first, then refine if needed
      const dateCode = this.dateReceived 
        ? new Date(this.dateReceived).toISOString().slice(2, 10).replace(/-/g, '') 
        : new Date().toISOString().slice(2, 10).replace(/-/g, '');
      
      // Get basic batch code without product lookup initially
      let basicBatchCode = `BTH-${dateCode}`;
      
      try {
        // Try to get the product to use its details
        const Inventory = mongoose.model('Inventory');
        const product = await Inventory.findById(this.productId);
        
        if (product && product.sku) {
          // Use product SKU for better batch code
          const productCode = product.sku.split('-')[0] || 'PRD'; // Get first part of SKU
          basicBatchCode = `${productCode}-${dateCode}`;
        }
      } catch (productError) {
        console.log('Could not fetch product for batch code, using fallback');
        // Use the basic batch code if product lookup fails
      }
      
      // Count existing batches for this product to get next sequence
      let batchCount = 0;
      try {
        batchCount = await this.constructor.countDocuments({ 
          productId: this.productId 
        });
      } catch (countError) {
        console.log('Could not count existing batches, using default sequence');
      }
      
      // Generate batch code: PRODUCTCODE-YYMMDD-B001
      const batchSequence = String(batchCount + 1).padStart(3, '0');
      this.batchCode = `${basicBatchCode}-B${batchSequence}`;
      
      // Ensure uniqueness - if code exists, increment sequence
      let attempts = 0;
      while (attempts < 10) {
        try {
          const existingBatch = await this.constructor.findOne({ 
            batchCode: this.batchCode,
            _id: { $ne: this._id } // Exclude current document if updating
          });
          
          if (!existingBatch) break;
          
          attempts++;
          const newSequence = String(batchCount + 1 + attempts).padStart(3, '0');
          this.batchCode = `${basicBatchCode}-B${newSequence}`;
        } catch (uniqueError) {
          console.log('Error checking batch code uniqueness, proceeding with current code');
          break;
        }
      }
      
    } catch (error) {
      console.error('Batch code generation error:', error);
      // Ultimate fallback batch code
      const timestamp = Date.now().toString().slice(-8);
      this.batchCode = `BTH-${timestamp}`;
    }
  }
  next();
});

// Static methods
inventoryBatchSchema.statics.createBatch = async function(batchData) {
  const batch = new this(batchData);
  return await batch.save();
};

inventoryBatchSchema.statics.getBatchesByProduct = function(productId, options = {}) {
  const { status = null, sortBy = 'dateReceived', sortOrder = -1 } = options;
  
  const query = { productId };
  if (status) query.status = status;
  
  return this.find(query)
    .sort({ [sortBy]: sortOrder })
    .populate('productId', 'productName sku category');
};

inventoryBatchSchema.statics.getBatchesByUser = function(userId, options = {}) {
  const { 
    status = null, 
    page = 1, 
    limit = 50, 
    sortBy = 'dateReceived', 
    sortOrder = -1 
  } = options;
  
  const query = { userId };
  if (status) query.status = status;
  
  const skip = (page - 1) * limit;
  
  return this.find(query)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .populate('productId', 'productName sku category unitOfMeasure');
};

inventoryBatchSchema.statics.getActiveBatches = function(userId) {
  return this.find({ 
    userId,
    status: 'active',
    quantityRemaining: { $gt: 0 }
  })
  .sort({ dateReceived: 1 }) // FIFO - First In, First Out
  .populate('productId', 'productName sku');
};

inventoryBatchSchema.statics.getExpiringBatches = function(userId, days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    userId,
    status: 'active',
    expiryDate: { 
      $exists: true, 
      $ne: null, 
      $lte: futureDate 
    },
    quantityRemaining: { $gt: 0 }
  })
  .sort({ expiryDate: 1 })
  .populate('productId', 'productName sku');
};

inventoryBatchSchema.statics.getBatchStats = async function(userId) {
  const pipeline = [
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalBatches: { $sum: 1 },
        activeBatches: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        depletedBatches: {
          $sum: { $cond: [{ $eq: ['$status', 'depleted'] }, 1, 0] }
        },
        expiredBatches: {
          $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] }
        },
        totalQuantityRemaining: { $sum: '$quantityRemaining' },
        totalBatchValue: { 
          $sum: { $multiply: ['$quantityRemaining', '$costPrice'] }
        },
        totalPotentialRevenue: { 
          $sum: { $multiply: ['$quantityRemaining', '$sellingPrice'] }
        },
        totalRevenue: {
          $sum: { $multiply: ['$quantitySold', '$sellingPrice'] }
        },
        totalProfit: {
          $sum: { 
            $multiply: [
              '$quantitySold', 
              { $subtract: ['$sellingPrice', '$costPrice'] }
            ]
          }
        }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalBatches: 0,
    activeBatches: 0,
    depletedBatches: 0,
    expiredBatches: 0,
    totalQuantityRemaining: 0,
    totalBatchValue: 0,
    totalPotentialRevenue: 0,
    totalRevenue: 0,
    totalProfit: 0
  };
};

// Instance methods
inventoryBatchSchema.methods.sellFromBatch = async function(quantityToSell) {
  if (quantityToSell <= 0) {
    throw new Error('Quantity to sell must be greater than 0');
  }
  
  if (quantityToSell > this.quantityRemaining) {
    throw new Error('Cannot sell more than remaining quantity in batch');
  }
  
  this.quantitySold += quantityToSell;
  this.quantityRemaining -= quantityToSell;
  
  return await this.save();
};

inventoryBatchSchema.methods.removeFromBatch = async function(quantityToRemove, reason = '') {
  if (quantityToRemove <= 0) {
    throw new Error('Quantity to remove must be greater than 0');
  }
  
  if (quantityToRemove > this.quantityRemaining) {
    throw new Error('Cannot remove more than remaining quantity in batch');
  }
  
  this.quantitySold += quantityToRemove; // Track as "sold" (removed from inventory)
  this.quantityRemaining -= quantityToRemove;
  
  // Add note about removal
  if (reason) {
    this.notes = this.notes ? `${this.notes}\nRemoved: ${reason} (-${quantityToRemove})` : `Removed: ${reason} (-${quantityToRemove})`;
  }
  
  return await this.save();
};

inventoryBatchSchema.methods.addToBatch = async function(quantityToAdd, reason = '') {
  if (quantityToAdd <= 0) {
    throw new Error('Quantity to add must be greater than 0');
  }
  
  this.quantityIn += quantityToAdd;
  this.quantityRemaining += quantityToAdd;
  
  // Add note about addition
  if (reason) {
    this.notes = this.notes ? `${this.notes}\nAdded: ${reason} (+${quantityToAdd})` : `Added: ${reason} (+${quantityToAdd})`;
  }
  
  return await this.save();
};

inventoryBatchSchema.methods.adjustQuantity = async function(newQuantityIn, reason = '') {
  const previousQuantityIn = this.quantityIn;
  const difference = newQuantityIn - previousQuantityIn;
  
  this.quantityIn = newQuantityIn;
  this.quantityRemaining += difference;
  
  // Add note about adjustment
  if (reason) {
    this.notes = this.notes ? `${this.notes}\nAdjustment: ${reason}` : `Adjustment: ${reason}`;
  }
  
  return await this.save();
};

// Indexes
inventoryBatchSchema.index({ userId: 1, status: 1 });
inventoryBatchSchema.index({ productId: 1, dateReceived: -1 });
inventoryBatchSchema.index({ batchCode: 1 }, { unique: true });
inventoryBatchSchema.index({ expiryDate: 1 });
inventoryBatchSchema.index({ status: 1, quantityRemaining: 1 });

const InventoryBatch = mongoose.models.InventoryBatch || mongoose.model('InventoryBatch', inventoryBatchSchema);

export default InventoryBatch;
