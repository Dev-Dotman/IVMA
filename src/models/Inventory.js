import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },

  // Product Information
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters']
  },
  sku: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true
    // Removed required: true since we auto-generate
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  brand: {
    type: String,
    trim: true,
    maxlength: [50, 'Brand cannot exceed 50 characters'],
    default: ''
  },
  unitOfMeasure: {
    type: String,
    required: [true, 'Unit of measure is required'],
    enum: ['Piece', 'Pack', 'Carton', 'Kg', 'Liter', 'Meter', 'Box', 'Dozen', 'Other'],
    default: 'Piece'
  },

  // Stock Information
  quantityInStock: {
    type: Number,
    required: [true, 'Quantity in stock is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  totalStockedQuantity: {
    type: Number,
    required: [true, 'Total stocked quantity is required'],
    min: [0, 'Total stocked quantity cannot be negative'],
    default: 0
  },
  soldQuantity: {
    type: Number,
    required: [true, 'Sold quantity is required'],
    min: [0, 'Sold quantity cannot be negative'],
    default: 0
  },
  reorderLevel: {
    type: Number,
    required: [true, 'Reorder level is required'],
    min: [0, 'Reorder level cannot be negative'],
    default: 5
  },
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

  // Additional fields
  supplier: {
    type: String,
    trim: true,
    maxlength: [100, 'Supplier name cannot exceed 100 characters'],
    default: ''
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters'],
    default: 'Main Store'
  },
  qrCode: {
    type: String,
    trim: true,
    default: ''
  },
  image: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    default: ''
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Discontinued'],
    default: 'Active'
  },
  webVisibility: {
    type: Boolean,
    default: true,
    required: true // Ensure this field is always present
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields
inventorySchema.virtual('stockValue').get(function() {
  return this.quantityInStock * this.costPrice;
});

inventorySchema.virtual('totalRevenue').get(function() {
  return this.soldQuantity * this.sellingPrice;
});

inventorySchema.virtual('totalProfit').get(function() {
  return (this.sellingPrice - this.costPrice) * this.soldQuantity;
});

inventorySchema.virtual('profitMargin').get(function() {
  if (this.costPrice === 0) return 0;
  return ((this.sellingPrice - this.costPrice) / this.costPrice) * 100;
});

inventorySchema.virtual('isLowStock').get(function() {
  return this.quantityInStock <= this.reorderLevel;
});

inventorySchema.virtual('stockStatus').get(function() {
  if (this.quantityInStock === 0) return 'Out of Stock';
  if (this.quantityInStock <= this.reorderLevel) return 'Low Stock';
  return 'In Stock';
});

inventorySchema.virtual('turnoverRate').get(function() {
  if (this.totalStockedQuantity === 0) return 0;
  return (this.soldQuantity / this.totalStockedQuantity) * 100;
});

inventorySchema.virtual('remainingQuantityPercentage').get(function() {
  if (this.totalStockedQuantity === 0) return 0;
  return (this.quantityInStock / this.totalStockedQuantity) * 100;
});

// Pre-save middleware
inventorySchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  
  // Ensure totalStockedQuantity is at least the sum of current stock and sold quantity
  const minimumTotal = this.quantityInStock + this.soldQuantity;
  if (this.totalStockedQuantity < minimumTotal) {
    this.totalStockedQuantity = minimumTotal;
  }
  
  next();
});

// Generate SKU if not provided - improved logic
inventorySchema.pre('save', async function(next) {
  if (!this.sku || this.sku === '' || this.sku === null) {
    try {
      // Get the first 3 characters of category, fallback to 'ITM'
      const categoryCode = this.category ? this.category.substring(0, 3).toUpperCase() : 'ITM';
      
      // Count existing items for this user to get next number
      const count = await this.constructor.countDocuments({ userId: this.userId });
      
      // Generate SKU with format: CATEGORY-001
      this.sku = `${categoryCode}-${String(count + 1).padStart(3, '0')}`;
      
      // Check if this SKU already exists (for uniqueness)
      let attempts = 0;
      while (attempts < 10) {
        const existingSku = await this.constructor.findOne({ sku: this.sku });
        if (!existingSku) break;
        
        // If SKU exists, increment and try again
        attempts++;
        this.sku = `${categoryCode}-${String(count + 1 + attempts).padStart(3, '0')}`;
      }
    } catch (error) {
      console.error('SKU generation error:', error);
      // Fallback SKU if generation fails
      this.sku = `ITM-${Date.now().toString().slice(-6)}`;
    }
  }
  next();
});

// Instance methods
inventorySchema.methods.updateStock = async function(newQuantity, type = 'set') {
  const previousQuantity = this.quantityInStock;
  
  if (type === 'add') {
    this.quantityInStock += newQuantity;
    // When adding stock, also update total stocked quantity
    this.totalStockedQuantity += newQuantity;
  } else if (type === 'subtract') {
    this.quantityInStock = Math.max(0, this.quantityInStock - newQuantity);
  } else {
    this.quantityInStock = newQuantity;
  }
  
  this.lastUpdated = new Date();
  return await this.save();
};

inventorySchema.methods.recordSale = async function(quantitySold) {
  if (quantitySold <= 0) {
    throw new Error('Quantity sold must be greater than 0');
  }
  
  if (quantitySold > this.quantityInStock) {
    throw new Error('Cannot sell more than available stock');
  }
  
  // Update quantities
  this.quantityInStock -= quantitySold;
  this.soldQuantity += quantitySold;
  this.lastUpdated = new Date();
  
  return await this.save();
};

inventorySchema.methods.addInitialStock = async function(quantity) {
  this.quantityInStock += quantity;
  this.totalStockedQuantity += quantity;
  this.lastUpdated = new Date();
  return await this.save();
};

inventorySchema.methods.adjustPrices = async function(costPrice, sellingPrice) {
  if (costPrice !== undefined) this.costPrice = costPrice;
  if (sellingPrice !== undefined) this.sellingPrice = sellingPrice;
  this.lastUpdated = new Date();
  return await this.save();
};

// Static methods
inventorySchema.statics.getInventoryByUser = function(userId, options = {}) {
  const { 
    page = 1, 
    limit = 10, 
    sortBy = 'productName', 
    sortOrder = 1,
    category = null,
    status = 'Active',
    search = null 
  } = options;

  const query = { userId };
  
  if (category) query.category = category;
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { productName: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;

  return this.find(query)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);
};

inventorySchema.statics.getLowStockItems = function(userId) {
  return this.find({ 
    userId,
    status: 'Active',
    $expr: { $lte: ['$quantityInStock', '$reorderLevel'] }
  }).sort({ quantityInStock: 1 });
};

inventorySchema.statics.getOutOfStockItems = function(userId) {
  return this.find({ 
    userId,
    status: 'Active',
    quantityInStock: 0 
  });
};

inventorySchema.statics.getInventoryStats = async function(userId) {
  const pipeline = [
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'Active' } },
    {
      $group: {
        _id: null,
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantityInStock' },
        totalStockedQuantity: { $sum: '$totalStockedQuantity' },
        totalSoldQuantity: { $sum: '$soldQuantity' },
        totalStockValue: { $sum: { $multiply: ['$quantityInStock', '$costPrice'] } },
        totalSellingValue: { $sum: { $multiply: ['$quantityInStock', '$sellingPrice'] } },
        totalRevenue: { $sum: { $multiply: ['$soldQuantity', '$sellingPrice'] } },
        totalProfit: { $sum: { $multiply: ['$soldQuantity', { $subtract: ['$sellingPrice', '$costPrice'] }] } },
        lowStockItems: {
          $sum: {
            $cond: [{ $lte: ['$quantityInStock', '$reorderLevel'] }, 1, 0]
          }
        },
        outOfStockItems: {
          $sum: {
            $cond: [{ $eq: ['$quantityInStock', 0] }, 1, 0]
          }
        }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalItems: 0,
    totalQuantity: 0,
    totalStockedQuantity: 0,
    totalSoldQuantity: 0,
    totalStockValue: 0,
    totalSellingValue: 0,
    totalRevenue: 0,
    totalProfit: 0,
    lowStockItems: 0,
    outOfStockItems: 0
  };
};

inventorySchema.statics.getTopSellingItems = function(userId, limit = 10) {
  return this.find({ userId, status: 'Active' })
    .sort({ soldQuantity: -1 })
    .limit(limit);
};

inventorySchema.statics.getSlowMovingItems = function(userId, limit = 10) {
  return this.find({ 
    userId, 
    status: 'Active',
    totalStockedQuantity: { $gt: 0 }
  })
  .sort({ soldQuantity: 1 })
  .limit(limit);
};

inventorySchema.statics.getCategorySummary = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'Active' } },
    {
      $group: {
        _id: '$category',
        itemCount: { $sum: 1 },
        totalQuantity: { $sum: '$quantityInStock' },
        totalStockedQuantity: { $sum: '$totalStockedQuantity' },
        totalSoldQuantity: { $sum: '$soldQuantity' },
        totalValue: { $sum: { $multiply: ['$quantityInStock', '$costPrice'] } },
        totalRevenue: { $sum: { $multiply: ['$soldQuantity', '$sellingPrice'] } }
      }
    },
    { $sort: { totalValue: -1 } }
  ]);
};

// Indexes
inventorySchema.index({ userId: 1, status: 1 });
inventorySchema.index({ userId: 1, category: 1 });
inventorySchema.index({ userId: 1, sku: 1 }, { unique: true });
inventorySchema.index({ productName: 'text', description: 'text', brand: 'text' });
inventorySchema.index({ quantityInStock: 1, reorderLevel: 1 });

const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema);

export default Inventory;
