import mongoose from 'mongoose';

const itemSaleSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },

  // Inventory item reference
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: [true, 'Inventory ID is required'],
    index: true
  },

  // Sale transaction reference (optional - links to the main Sale record)
  saleTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: false,
    index: true
  },

  // Batch tracking information - NEW
  batchesSoldFrom: [{
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryBatch',
      required: true
    },
    batchCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    quantitySoldFromBatch: {
      type: Number,
      required: true,
      min: [0.01, 'Quantity sold from batch must be greater than 0']
    },
    unitCostPriceFromBatch: {
      type: Number,
      required: true,
      min: [0, 'Unit cost price from batch cannot be negative']
    },
    batchDateReceived: {
      type: Date,
      required: true
    },
    batchSupplier: {
      type: String,
      trim: true,
      default: ''
    }
  }],

  // Item details at time of sale (snapshot for historical accuracy)
  itemSnapshot: {
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
      uppercase: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true
    },
    brand: {
      type: String,
      trim: true,
      default: ''
    },
    unitOfMeasure: {
      type: String,
      required: [true, 'Unit of measure is required'],
      default: 'Piece'
    }
  },

  // Sale details
  quantitySold: {
    type: Number,
    required: [true, 'Quantity sold is required'],
    min: [0.01, 'Quantity sold must be greater than 0']
  },
  
  unitSalePrice: {
    type: Number,
    required: [true, 'Unit sale price is required'],
    min: [0, 'Unit sale price cannot be negative']
  },
  
  totalSaleAmount: {
    type: Number,
    required: [true, 'Total sale amount is required'],
    min: [0, 'Total sale amount cannot be negative']
  },

  // Cost information (calculated from batches) - UPDATED
  unitCostPrice: {
    type: Number,
    required: [true, 'Unit cost price is required'],
    min: [0, 'Unit cost price cannot be negative']
  },
  
  totalCostAmount: {
    type: Number,
    required: [true, 'Total cost amount is required'],
    min: [0, 'Total cost amount cannot be negative']
  },

  // Batch cost breakdown - NEW
  batchCostBreakdown: {
    totalBatchCost: {
      type: Number,
      required: true,
      default: 0
    },
    weightedAverageCost: {
      type: Number,
      required: true,
      default: 0
    },
    batchCount: {
      type: Number,
      required: true,
      default: 0
    }
  },

  // Payment information
  paymentMethod: {
    type: String,
    enum: ['cash', 'transfer', 'pos', 'credit'],
    required: [true, 'Payment method is required']
  },

  // Customer information (optional)
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
      lowercase: true,
      default: ''
    }
  },

  // Sale metadata
  saleDate: {
    type: Date,
    required: [true, 'Sale date is required'],
    default: Date.now,
    index: true
  },
  
  status: {
    type: String,
    enum: ['completed', 'refunded', 'partially_refunded'],
    default: 'completed',
    index: true
  },

  // Refund information
  refundInfo: {
    isRefunded: {
      type: Boolean,
      default: false
    },
    refundDate: {
      type: Date,
      default: null
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: [0, 'Refund amount cannot be negative']
    },
    refundQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Refund quantity cannot be negative']
    },
    refundReason: {
      type: String,
      trim: true,
      default: ''
    }
  },

  // Tracking information
  soldBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sold by user ID is required']
  },

  // Location information
  saleLocation: {
    type: String,
    trim: true,
    default: 'Main Store'
  },

  // Additional notes
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    default: ''
  },

  // Order processing flags
  isFromOrder: {
    type: Boolean,
    default: false
  },
  linkedOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields - UPDATED
itemSaleSchema.virtual('profit').get(function() {
  return this.totalSaleAmount - this.totalCostAmount;
});

itemSaleSchema.virtual('profitMargin').get(function() {
  if (this.totalCostAmount === 0) return 0;
  return ((this.totalSaleAmount - this.totalCostAmount) / this.totalCostAmount) * 100;
});

itemSaleSchema.virtual('batchProfitBreakdown').get(function() {
  return this.batchesSoldFrom.map(batch => ({
    batchCode: batch.batchCode,
    quantitySold: batch.quantitySoldFromBatch,
    costPrice: batch.unitCostPriceFromBatch,
    salePrice: this.unitSalePrice,
    profit: (this.unitSalePrice - batch.unitCostPriceFromBatch) * batch.quantitySoldFromBatch,
    profitMargin: batch.unitCostPriceFromBatch > 0 
      ? ((this.unitSalePrice - batch.unitCostPriceFromBatch) / batch.unitCostPriceFromBatch) * 100 
      : 0
  }));
});

itemSaleSchema.virtual('netQuantitySold').get(function() {
  return this.quantitySold - (this.refundInfo.refundQuantity || 0);
});

itemSaleSchema.virtual('netSaleAmount').get(function() {
  return this.totalSaleAmount - (this.refundInfo.refundAmount || 0);
});

itemSaleSchema.virtual('netProfit').get(function() {
  const netAmount = this.netSaleAmount;
  const costForNetQuantity = this.netQuantitySold * this.unitCostPrice;
  return netAmount - costForNetQuantity;
});

// Indexes for better query performance
itemSaleSchema.index({ userId: 1, saleDate: -1 });
itemSaleSchema.index({ inventoryId: 1, saleDate: -1 });
itemSaleSchema.index({ userId: 1, inventoryId: 1 });
itemSaleSchema.index({ 'itemSnapshot.category': 1, saleDate: -1 });
itemSaleSchema.index({ paymentMethod: 1, saleDate: -1 });
itemSaleSchema.index({ status: 1, saleDate: -1 });
itemSaleSchema.index({ saleTransactionId: 1 });

// Pre-save middleware - UPDATED
itemSaleSchema.pre('save', function(next) {
  // Calculate total amounts if not provided
  if (!this.totalSaleAmount) {
    this.totalSaleAmount = this.quantitySold * this.unitSalePrice;
  }
  
  // Calculate batch cost breakdown
  if (this.batchesSoldFrom && this.batchesSoldFrom.length > 0) {
    const totalBatchCost = this.batchesSoldFrom.reduce((sum, batch) => 
      sum + (batch.quantitySoldFromBatch * batch.unitCostPriceFromBatch), 0
    );
    
    this.batchCostBreakdown = {
      totalBatchCost: totalBatchCost,
      weightedAverageCost: this.quantitySold > 0 ? totalBatchCost / this.quantitySold : 0,
      batchCount: this.batchesSoldFrom.length
    };
    
    // Update unit cost price with weighted average
    this.unitCostPrice = this.batchCostBreakdown.weightedAverageCost;
    this.totalCostAmount = totalBatchCost;
  } else if (!this.totalCostAmount) {
    this.totalCostAmount = this.quantitySold * this.unitCostPrice;
  }

  next();
});

// Static methods
itemSaleSchema.statics.recordItemSale = async function(saleData) {
  const itemSale = new this(saleData);
  return await itemSale.save();
};

itemSaleSchema.statics.recordMultipleItemSales = async function(salesArray) {
  return await this.insertMany(salesArray);
};

itemSaleSchema.statics.getItemSalesReport = async function(userId, options = {}) {
  const {
    startDate,
    endDate,
    inventoryId,
    category,
    paymentMethod,
    status = 'completed',
    groupBy = 'day' // day, week, month, year
  } = options;

  const matchStage = {
    userId: new mongoose.Types.ObjectId(userId),
    status: status
  };

  if (startDate || endDate) {
    matchStage.saleDate = {};
    if (startDate) matchStage.saleDate.$gte = new Date(startDate);
    if (endDate) matchStage.saleDate.$lte = new Date(endDate);
  }

  if (inventoryId) {
    matchStage.inventoryId = new mongoose.Types.ObjectId(inventoryId);
  }

  if (category) {
    matchStage['itemSnapshot.category'] = category;
  }

  if (paymentMethod) {
    matchStage.paymentMethod = paymentMethod;
  }

  // Group by date format
  let dateGroupFormat;
  switch (groupBy) {
    case 'week':
      dateGroupFormat = { $dateToString: { format: "%Y-W%U", date: "$saleDate" } };
      break;
    case 'month':
      dateGroupFormat = { $dateToString: { format: "%Y-%m", date: "$saleDate" } };
      break;
    case 'year':
      dateGroupFormat = { $dateToString: { format: "%Y", date: "$saleDate" } };
      break;
    default: // day
      dateGroupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$saleDate" } };
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: dateGroupFormat,
        totalQuantitySold: { $sum: '$quantitySold' },
        totalSalesAmount: { $sum: '$totalSaleAmount' },
        totalCostAmount: { $sum: '$totalCostAmount' },
        totalProfit: { $sum: { $subtract: ['$totalSaleAmount', '$totalCostAmount'] } },
        salesCount: { $sum: 1 },
        averageSalePrice: { $avg: '$unitSalePrice' },
        topSellingItems: {
          $push: {
            inventoryId: '$inventoryId',
            productName: '$itemSnapshot.productName',
            quantitySold: '$quantitySold',
            totalAmount: '$totalSaleAmount'
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ];

  return await this.aggregate(pipeline);
};

itemSaleSchema.statics.getTopSellingItems = async function(userId, options = {}) {
  const {
    startDate,
    endDate,
    limit = 10,
    category
  } = options;

  const matchStage = {
    userId: new mongoose.Types.ObjectId(userId),
    status: 'completed'
  };

  if (startDate || endDate) {
    matchStage.saleDate = {};
    if (startDate) matchStage.saleDate.$gte = new Date(startDate);
    if (endDate) matchStage.saleDate.$lte = new Date(endDate);
  }

  if (category) {
    matchStage['itemSnapshot.category'] = category;
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$inventoryId',
        productName: { $first: '$itemSnapshot.productName' },
        sku: { $first: '$itemSnapshot.sku' },
        category: { $first: '$itemSnapshot.category' },
        totalQuantitySold: { $sum: '$quantitySold' },
        totalRevenue: { $sum: '$totalSaleAmount' },
        totalProfit: { $sum: { $subtract: ['$totalSaleAmount', '$totalCostAmount'] } },
        salesCount: { $sum: 1 },
        averageUnitPrice: { $avg: '$unitSalePrice' },
        lastSaleDate: { $max: '$saleDate' }
      }
    },
    { $sort: { totalQuantitySold: -1 } },
    { $limit: limit }
  ];

  return await this.aggregate(pipeline);
};

itemSaleSchema.statics.getItemPerformance = async function(inventoryId, options = {}) {
  const {
    startDate,
    endDate,
    groupBy = 'month'
  } = options;

  const matchStage = {
    inventoryId: new mongoose.Types.ObjectId(inventoryId),
    status: 'completed'
  };

  if (startDate || endDate) {
    matchStage.saleDate = {};
    if (startDate) matchStage.saleDate.$gte = new Date(startDate);
    if (endDate) matchStage.saleDate.$lte = new Date(endDate);
  }

  let dateGroupFormat;
  switch (groupBy) {
    case 'week':
      dateGroupFormat = { $dateToString: { format: "%Y-W%U", date: "$saleDate" } };
      break;
    case 'year':
      dateGroupFormat = { $dateToString: { format: "%Y", date: "$saleDate" } };
      break;
    default: // month
      dateGroupFormat = { $dateToString: { format: "%Y-%m", date: "$saleDate" } };
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: dateGroupFormat,
        totalQuantitySold: { $sum: '$quantitySold' },
        totalRevenue: { $sum: '$totalSaleAmount' },
        totalProfit: { $sum: { $subtract: ['$totalSaleAmount', '$totalCostAmount'] } },
        salesCount: { $sum: 1 },
        averageUnitPrice: { $avg: '$unitSalePrice' }
      }
    },
    { $sort: { _id: 1 } }
  ];

  return await this.aggregate(pipeline);
};

// Instance methods
itemSaleSchema.methods.processRefund = async function(refundQuantity, refundReason = '') {
  if (refundQuantity > this.quantitySold) {
    throw new Error('Refund quantity cannot exceed sold quantity');
  }

  const refundAmount = refundQuantity * this.unitSalePrice;
  
  this.refundInfo = {
    isRefunded: refundQuantity === this.quantitySold,
    refundDate: new Date(),
    refundAmount: refundAmount,
    refundQuantity: refundQuantity,
    refundReason: refundReason
  };

  if (refundQuantity === this.quantitySold) {
    this.status = 'refunded';
  } else {
    this.status = 'partially_refunded';
  }

  return await this.save();
};

itemSaleSchema.statics.getBatchSalesReport = async function(userId, options = {}) {
  const {
    startDate,
    endDate,
    batchId,
    inventoryId
  } = options;

  const matchStage = {
    userId: new mongoose.Types.ObjectId(userId),
    status: 'completed'
  };

  if (startDate || endDate) {
    matchStage.saleDate = {};
    if (startDate) matchStage.saleDate.$gte = new Date(startDate);
    if (endDate) matchStage.saleDate.$lte = new Date(endDate);
  }

  if (inventoryId) {
    matchStage.inventoryId = new mongoose.Types.ObjectId(inventoryId);
  }

  const pipeline = [
    { $match: matchStage },
    { $unwind: '$batchesSoldFrom' },
    ...(batchId ? [{ $match: { 'batchesSoldFrom.batchId': new mongoose.Types.ObjectId(batchId) } }] : []),
    {
      $group: {
        _id: '$batchesSoldFrom.batchCode',
        batchId: { $first: '$batchesSoldFrom.batchId' },
        totalQuantitySold: { $sum: '$batchesSoldFrom.quantitySoldFromBatch' },
        totalRevenue: { $sum: { $multiply: ['$batchesSoldFrom.quantitySoldFromBatch', '$unitSalePrice'] } },
        totalCost: { $sum: { $multiply: ['$batchesSoldFrom.quantitySoldFromBatch', '$batchesSoldFrom.unitCostPriceFromBatch'] } },
        salesCount: { $sum: 1 },
        averageCostPrice: { $avg: '$batchesSoldFrom.unitCostPriceFromBatch' },
        batchSupplier: { $first: '$batchesSoldFrom.batchSupplier' },
        batchDateReceived: { $first: '$batchesSoldFrom.batchDateReceived' }
      }
    },
    {
      $addFields: {
        totalProfit: { $subtract: ['$totalRevenue', '$totalCost'] },
        profitMargin: {
          $cond: [
            { $eq: ['$totalCost', 0] },
            0,
            { $multiply: [{ $divide: [{ $subtract: ['$totalRevenue', '$totalCost'] }, '$totalCost'] }, 100] }
          ]
        }
      }
    },
    { $sort: { totalQuantitySold: -1 } }
  ];

  return await this.aggregate(pipeline);
};

const ItemSale = mongoose.models.ItemSale || mongoose.model('ItemSale', itemSaleSchema);

export default ItemSale;
