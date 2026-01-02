import mongoose from 'mongoose';

// Variant details for batch tracking - ENHANCED to match Inventory variant structure
const BatchVariantSchema = new mongoose.Schema({
  size: {
    type: String,
    required: [true, 'Variant size is required'],
    trim: true
  },
  color: {
    type: String,
    required: [true, 'Variant color is required'],
    trim: true
  },
  variantSku: {
    type: String,
    trim: true, // Reference to main variant SKU from Inventory
    index: true
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId, // Reference to specific variant in Inventory.variants array
    default: null
  },
  // Batch-specific quantities for this variant
  quantityIn: {
    type: Number,
    required: [true, 'Variant quantity in is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  quantitySold: {
    type: Number,
    min: [0, 'Quantity sold cannot be negative'],
    default: 0
  },
  quantityRemaining: {
    type: Number,
    min: [0, 'Quantity remaining cannot be negative'],
    default: 0
  },
  // Variant-specific pricing (may differ from main batch)
  costPrice: {
    type: Number,
    min: [0, 'Cost price cannot be negative'],
    default: null // If null, use batch costPrice
  },
  sellingPrice: {
    type: Number,
    min: [0, 'Selling price cannot be negative'],
    default: null // If null, use batch sellingPrice
  },
  // Variant-specific images in this batch
  images: [{
    type: String
  }],
  // Variant barcode
  barcode: {
    type: String,
    trim: true
  },
  // Status tracking for this variant in batch
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: true });

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

  // Variant tracking
  hasVariants: {
    type: Boolean,
    default: false
  },
  variants: [BatchVariantSchema],

  // Quantity tracking (for non-variant or total batch)
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
    enum: ['active', 'depleted', 'expired', 'damaged', 'archived'],
    default: 'active',
    index: true
  },

  // Batch location (if different from main product location)
  batchLocation: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters'],
    default: ''
  },

  // Archive tracking
  archivedAt: {
    type: Date,
    default: null
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

// Virtual fields for batch variants
BatchVariantSchema.virtual('variantValue').get(function() {
  const costPrice = this.costPrice || this.parent().costPrice;
  return this.quantityRemaining * costPrice;
});

BatchVariantSchema.virtual('variantPotentialRevenue').get(function() {
  const sellingPrice = this.sellingPrice || this.parent().sellingPrice;
  return this.quantityRemaining * sellingPrice;
});

BatchVariantSchema.virtual('variantProfit').get(function() {
  const costPrice = this.costPrice || this.parent().costPrice;
  const sellingPrice = this.sellingPrice || this.parent().sellingPrice;
  return (sellingPrice - costPrice) * this.quantitySold;
});

// Pre-save middleware
inventoryBatchSchema.pre('save', async function(next) {
  // If batch has variants, sync with Inventory model
  if (this.hasVariants && this.variants && this.variants.length > 0) {
    // Validate variants exist in parent Inventory
    if (this.productId) {
      try {
        const Inventory = mongoose.model('Inventory');
        const product = await Inventory.findById(this.productId);
        
        if (product && product.hasVariants) {
          // Match batch variants with inventory variants
          for (const batchVariant of this.variants) {
            const inventoryVariant = product.getVariant(batchVariant.size, batchVariant.color);
            
            if (inventoryVariant) {
              // Sync variant ID and SKU if not set
              if (!batchVariant.variantId) {
                batchVariant.variantId = inventoryVariant._id;
              }
              if (!batchVariant.variantSku) {
                batchVariant.variantSku = inventoryVariant.sku;
              }
              
              // Use inventory selling price if not specified
              if (batchVariant.sellingPrice === null || batchVariant.sellingPrice === undefined) {
                batchVariant.sellingPrice = this.sellingPrice;
              }
              if (batchVariant.costPrice === null || batchVariant.costPrice === undefined) {
                batchVariant.costPrice = this.costPrice;
              }
            } else {
              console.warn(`Variant ${batchVariant.color}-${batchVariant.size} not found in Inventory ${product.productName}`);
            }
          }
        }
      } catch (error) {
        console.error('Error syncing batch variants with inventory:', error);
      }
    }
    
    // Calculate totals from all variants
    this.quantityIn = this.variants.reduce((sum, v) => sum + (v.quantityIn || 0), 0);
    this.quantitySold = this.variants.reduce((sum, v) => sum + (v.quantitySold || 0), 0);
    this.quantityRemaining = this.variants.reduce((sum, v) => sum + (v.quantityRemaining || 0), 0);
    
    // Update each variant's remaining quantity
    this.variants.forEach(variant => {
      variant.quantityRemaining = (variant.quantityIn || 0) - (variant.quantitySold || 0);
      if (variant.quantityRemaining < 0) variant.quantityRemaining = 0;
    });
  } else {
    // Auto-calculate quantity remaining for non-variant batches
    this.quantityRemaining = this.quantityIn - this.quantitySold;
    
    // Ensure quantity remaining is not negative
    if (this.quantityRemaining < 0) {
      this.quantityRemaining = 0;
    }
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
      
      // Generate 4-character random string for uniqueness
      const randomString = Math.random().toString(36).substring(2, 6).toUpperCase();
      
      // Get basic batch code without product lookup initially
      let basicBatchCode = `BTH-${dateCode}-${randomString}`;
      
      try {
        // Try to get the product to use its details
        const Inventory = mongoose.model('Inventory');
        const product = await Inventory.findById(this.productId);
        
        if (product && product.sku) {
          // Use product SKU for better batch code (without spaces)
          const productCode = product.sku.split('-')[0].replace(/\s+/g, '') || 'PRD';
          basicBatchCode = `${productCode}-${dateCode}-${randomString}`;
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
      
      // Generate batch code: PRODUCTCODE-YYMMDD-RANDOM-B001
      const batchSequence = String(batchCount + 1).padStart(3, '0');
      this.batchCode = `${basicBatchCode}-B${batchSequence}`;
      
      // Ensure uniqueness - if code exists, generate new random string
      let attempts = 0;
      while (attempts < 10) {
        try {
          const existingBatch = await this.constructor.findOne({ 
            batchCode: this.batchCode,
            _id: { $ne: this._id } // Exclude current document if updating
          });
          
          if (!existingBatch) break;
          
          attempts++;
          const newRandomString = Math.random().toString(36).substring(2, 6).toUpperCase();
          const newSequence = String(batchCount + 1 + attempts).padStart(3, '0');
          this.batchCode = `${basicBatchCode}-${newRandomString}-B${newSequence}`;
        } catch (uniqueError) {
          console.log('Error checking batch code uniqueness, proceeding with current code');
          break;
        }
      }
      
    } catch (error) {
      console.error('Batch code generation error:', error);
      // Ultimate fallback batch code with random string
      const timestamp = Date.now().toString().slice(-8);
      const randomString = Math.random().toString(36).substring(2, 6).toUpperCase();
      this.batchCode = `BTH-${timestamp}-${randomString}`;
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

// Static method to get variant-specific batch stats
inventoryBatchSchema.statics.getVariantBatchStats = async function(productId, size, color) {
  const pipeline = [
    { 
      $match: { 
        productId: new mongoose.Types.ObjectId(productId),
        hasVariants: true,
        'variants.size': size,
        'variants.color': color
      } 
    },
    { $unwind: '$variants' },
    { 
      $match: { 
        'variants.size': size, 
        'variants.color': color 
      } 
    },
    {
      $group: {
        _id: null,
        totalBatches: { $sum: 1 },
        totalQuantityIn: { $sum: '$variants.quantityIn' },
        totalQuantitySold: { $sum: '$variants.quantitySold' },
        totalQuantityRemaining: { $sum: '$variants.quantityRemaining' }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalBatches: 0,
    totalQuantityIn: 0,
    totalQuantitySold: 0,
    totalQuantityRemaining: 0
  };
};

// Instance methods
inventoryBatchSchema.methods.sellFromBatch = async function(quantityToSell, size = null, color = null) {
  if (quantityToSell <= 0) {
    throw new Error('Quantity to sell must be greater than 0');
  }
  
  // If batch has variants and size/color specified, sell from specific variant
  if (this.hasVariants && size && color) {
    const variant = this.variants.find(v => 
      v.size === size && 
      v.color === color && 
      v.isActive
    );
    
    if (!variant) {
      throw new Error(`Variant ${color} - ${size} not found in this batch`);
    }
    
    if (quantityToSell > variant.quantityRemaining) {
      throw new Error(`Cannot sell more than remaining quantity (${variant.quantityRemaining}) for ${color} - ${size}`);
    }
    
    variant.quantitySold += quantityToSell;
    variant.quantityRemaining -= quantityToSell;
    
    // Totals will be recalculated in pre-save middleware
  } else {
    // Sell from non-variant batch
    if (quantityToSell > this.quantityRemaining) {
      throw new Error('Cannot sell more than remaining quantity in batch');
    }
    
    this.quantitySold += quantityToSell;
    this.quantityRemaining -= quantityToSell;
  }
  
  return await this.save();
};

inventoryBatchSchema.methods.removeFromBatch = async function(quantityToRemove, reason = '', size = null, color = null) {
  if (quantityToRemove <= 0) {
    throw new Error('Quantity to remove must be greater than 0');
  }
  
  // If batch has variants and size/color specified
  if (this.hasVariants && size && color) {
    const variant = this.variants.find(v => v.size === size && v.color === color);
    
    if (!variant) {
      throw new Error(`Variant ${color} - ${size} not found in this batch`);
    }
    
    if (quantityToRemove > variant.quantityRemaining) {
      throw new Error(`Cannot remove more than remaining quantity (${variant.quantityRemaining}) for ${color} - ${size}`);
    }
    
    variant.quantitySold += quantityToRemove;
    variant.quantityRemaining -= quantityToRemove;
    
    // Add note about removal
    if (reason) {
      this.notes = this.notes 
        ? `${this.notes}\nRemoved ${color}-${size}: ${reason} (-${quantityToRemove})` 
        : `Removed ${color}-${size}: ${reason} (-${quantityToRemove})`;
    }
  } else {
    if (quantityToRemove > this.quantityRemaining) {
      throw new Error('Cannot remove more than remaining quantity in batch');
    }
    
    this.quantitySold += quantityToRemove;
    this.quantityRemaining -= quantityToRemove;
    
    // Add note about removal
    if (reason) {
      this.notes = this.notes 
        ? `${this.notes}\nRemoved: ${reason} (-${quantityToRemove})` 
        : `Removed: ${reason} (-${quantityToRemove})`;
    }
  }
  
  return await this.save();
};

inventoryBatchSchema.methods.addToBatch = async function(quantityToAdd, reason = '', size = null, color = null) {
  if (quantityToAdd <= 0) {
    throw new Error('Quantity to add must be greater than 0');
  }
  
  // If batch has variants and size/color specified
  if (this.hasVariants && size && color) {
    let variant = this.variants.find(v => v.size === size && v.color === color);
    
    if (!variant) {
      // Create new variant if it doesn't exist
      variant = {
        size,
        color,
        variantSku: `${this.batchCode}-${color.substring(0, 3).toUpperCase()}-${size}`,
        quantityIn: quantityToAdd,
        quantitySold: 0,
        quantityRemaining: quantityToAdd
      };
      this.variants.push(variant);
    } else {
      variant.quantityIn += quantityToAdd;
      variant.quantityRemaining += quantityToAdd;
    }
    
    // Add note about addition
    if (reason) {
      this.notes = this.notes 
        ? `${this.notes}\nAdded ${color}-${size}: ${reason} (+${quantityToAdd})` 
        : `Added ${color}-${size}: ${reason} (+${quantityToAdd})`;
    }
  } else {
    this.quantityIn += quantityToAdd;
    this.quantityRemaining += quantityToAdd;
    
    // Add note about addition
    if (reason) {
      this.notes = this.notes 
        ? `${this.notes}\nAdded: ${reason} (+${quantityToAdd})` 
        : `Added: ${reason} (+${quantityToAdd})`;
    }
  }
  
  return await this.save();
};

inventoryBatchSchema.methods.adjustQuantity = async function(newQuantityIn, reason = '', size = null, color = null) {
  // If batch has variants and size/color specified
  if (this.hasVariants && size && color) {
    const variant = this.variants.find(v => v.size === size && v.color === color);
    
    if (!variant) {
      throw new Error(`Variant ${color} - ${size} not found in this batch`);
    }
    
    const previousQuantityIn = variant.quantityIn;
    const difference = newQuantityIn - previousQuantityIn;
    
    variant.quantityIn = newQuantityIn;
    variant.quantityRemaining += difference;
    
    // Add note about adjustment
    if (reason) {
      this.notes = this.notes 
        ? `${this.notes}\nAdjustment ${color}-${size}: ${reason}` 
        : `Adjustment ${color}-${size}: ${reason}`;
    }
  } else {
    const previousQuantityIn = this.quantityIn;
    const difference = newQuantityIn - previousQuantityIn;
    
    this.quantityIn = newQuantityIn;
    this.quantityRemaining += difference;
    
    // Add note about adjustment
    if (reason) {
      this.notes = this.notes 
        ? `${this.notes}\nAdjustment: ${reason}` 
        : `Adjustment: ${reason}`;
    }
  }
  
  return await this.save();
};

// Method to get specific variant from batch
inventoryBatchSchema.methods.getVariant = function(size, color) {
  if (!this.hasVariants || !this.variants) return null;
  return this.variants.find(v => v.size === size && v.color === color);
};

// Method to check variant availability in batch
inventoryBatchSchema.methods.isVariantAvailable = function(size, color, quantity = 1) {
  const variant = this.getVariant(size, color);
  return variant && variant.quantityRemaining >= quantity;
};

// Indexes
inventoryBatchSchema.index({ userId: 1, status: 1 });
inventoryBatchSchema.index({ productId: 1, dateReceived: -1 });
inventoryBatchSchema.index({ batchCode: 1 }, { unique: true });
inventoryBatchSchema.index({ expiryDate: 1 });
inventoryBatchSchema.index({ status: 1, quantityRemaining: 1 });
inventoryBatchSchema.index({ 'variants.size': 1, 'variants.color': 1 });
inventoryBatchSchema.index({ 'variants.variantId': 1 });
inventoryBatchSchema.index({ 'variants.variantSku': 1 });
inventoryBatchSchema.index({ productId: 1, 'variants.size': 1, 'variants.color': 1 });

const InventoryBatch = mongoose.models.InventoryBatch || mongoose.model('InventoryBatch', inventoryBatchSchema);

export default InventoryBatch;
