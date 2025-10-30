import mongoose from 'mongoose';

const inventoryActivitySchema = new mongoose.Schema({
  // User and inventory references
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: [true, 'Inventory ID is required']
  },

  // Activity details
  activityType: {
    type: String,
    enum: [
      'created',
      'updated',
      'stock_added',
      'stock_removed',
      'order_processed', // New type for order processing
      'price_updated',
      'status_changed',
      'deleted',
      'image_updated',
      'category_changed',
      'location_changed'
    ],
    required: [true, 'Activity type is required']
  },
  description: {
    type: String,
    required: [true, 'Activity description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },

  // Change tracking
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  previousValues: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  newValues: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Stock movement specific data
  stockMovement: {
    type: {
      type: String,
      enum: ['add', 'subtract', 'set', 'order_processed'], // Add order_processed type
      default: null
    },
    quantity: {
      type: Number,
      default: null
    },
    reason: {
      type: String,
      default: null
    },
    previousStock: {
      type: Number,
      default: null
    },
    newStock: {
      type: Number,
      default: null
    }
  },

  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // User agent and IP for audit trail
  userAgent: {
    type: String,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Static methods
inventoryActivitySchema.statics.createActivity = async function(activityData) {
  const activity = new this(activityData);
  return await activity.save();
};

inventoryActivitySchema.statics.getInventoryActivities = function(inventoryId, options = {}) {
  const { 
    page = 1, 
    limit = 50, 
    activityType = null,
    startDate = null,
    endDate = null 
  } = options;

  const query = { inventoryId };
  
  if (activityType) query.activityType = activityType;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'firstName lastName email')
    .populate('inventoryId', 'productName sku');
};

inventoryActivitySchema.statics.getUserActivities = function(userId, options = {}) {
  const { 
    page = 1, 
    limit = 50, 
    activityType = null 
  } = options;

  const query = { userId };
  if (activityType) query.activityType = activityType;

  const skip = (page - 1) * limit;

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('inventoryId', 'productName sku image');
};

inventoryActivitySchema.statics.getActivityStats = async function(inventoryId) {
  const pipeline = [
    { $match: { inventoryId: new mongoose.Types.ObjectId(inventoryId) } },
    {
      $group: {
        _id: '$activityType',
        count: { $sum: 1 },
        lastActivity: { $max: '$createdAt' }
      }
    },
    { $sort: { count: -1 } }
  ];

  return await this.aggregate(pipeline);
};

// Indexes
inventoryActivitySchema.index({ inventoryId: 1, createdAt: -1 });
inventoryActivitySchema.index({ userId: 1, createdAt: -1 });
inventoryActivitySchema.index({ activityType: 1 });
inventoryActivitySchema.index({ createdAt: -1 });

const InventoryActivity = mongoose.models.InventoryActivity || mongoose.model('InventoryActivity', inventoryActivitySchema);

export default InventoryActivity;
