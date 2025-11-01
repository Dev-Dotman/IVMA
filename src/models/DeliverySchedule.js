import mongoose from 'mongoose';

const deliveryScheduleSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },

  // Sale/Order references
  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    default: null
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  transactionId: {
    type: String,
    required: [true, 'Transaction ID is required'],
    trim: true
  },

  // Delivery type
  deliveryType: {
    type: String,
    enum: ['order', 'pos_sale'],
    required: [true, 'Delivery type is required']
  },

  // Customer information
  customer: {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true
    },
    email: {
      type: String,
      trim: true,
      default: ''
    }
  },

  // Delivery address
  deliveryAddress: {
    street: {
      type: String,
      trim: true,
      default: ''
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    postalCode: {
      type: String,
      trim: true,
      default: ''
    },
    country: {
      type: String,
      default: 'Nigeria',
      trim: true
    },
    fullAddress: {
      type: String,
      trim: true,
      default: ''
    }
  },

  // Items snapshot - store actual item details at time of delivery scheduling
  items: [{
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    sku: {
      type: String,
      trim: true,
      default: ''
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative']
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
    // Additional metadata for tracking
    deliveredQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Delivered quantity cannot be negative']
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  }],

  // Delivery scheduling
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required']
  },
  timeSlot: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'anytime'],
    default: 'anytime'
  },
  estimatedDuration: {
    type: Number, // in minutes
    default: 30
  },

  // Delivery details
  deliveryFee: {
    type: Number,
    default: 0,
    min: 0
  },
  deliveryMethod: {
    type: String,
    enum: ['self_delivery', 'courier', 'pickup'],
    default: 'self_delivery'
  },
  deliveryNotes: {
    type: String,
    trim: true,
    default: ''
  },

  // Status tracking
  status: {
    type: String,
    enum: ['scheduled', 'in_transit', 'delivered', 'failed', 'cancelled'],
    default: 'scheduled'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // Delivery person assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedDate: {
    type: Date,
    default: null
  },

  // Completion tracking
  deliveredAt: {
    type: Date,
    default: null
  },
  deliveredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  deliveryConfirmation: {
    recipientName: {
      type: String,
      trim: true,
      default: ''
    },
    signature: {
      type: String, // Could store signature image URL
      default: ''
    },
    photo: {
      type: String, // Delivery photo URL
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },

  // Financial information
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: 0
  },
  amountCollected: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending', 'cash_on_delivery', 'partial'],
    default: 'paid'
  },

  // Tracking and updates
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  }],

  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields
deliveryScheduleSchema.virtual('isOverdue').get(function() {
  return this.status === 'scheduled' && new Date() > this.scheduledDate;
});

deliveryScheduleSchema.virtual('timeUntilDelivery').get(function() {
  if (this.status !== 'scheduled') return null;
  return Math.max(0, this.scheduledDate.getTime() - Date.now());
});

deliveryScheduleSchema.virtual('deliveryDuration').get(function() {
  if (!this.deliveredAt || this.status !== 'delivered') return null;
  return this.deliveredAt.getTime() - this.createdAt.getTime();
});

// Instance methods
deliveryScheduleSchema.methods.updateStatus = async function(newStatus, updatedBy, notes = '') {
  this.status = newStatus;
  
  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    updatedBy: updatedBy,
    notes: notes
  });

  // Set completion time if delivered
  if (newStatus === 'delivered') {
    this.deliveredAt = new Date();
    this.deliveredBy = updatedBy;
  }

  return await this.save();
};

deliveryScheduleSchema.methods.assignDeliveryPerson = async function(userId) {
  this.assignedTo = userId;
  this.assignedDate = new Date();
  
  // Add to status history
  this.statusHistory.push({
    status: 'assigned',
    timestamp: new Date(),
    updatedBy: userId,
    notes: 'Delivery person assigned'
  });

  return await this.save();
};

// Static methods
deliveryScheduleSchema.statics.createFromSale = async function(saleData, deliveryData, userId) {
  // Calculate total including delivery fee
  const itemsTotal = saleData.items.reduce((sum, item) => sum + (item.total || 0), 0);
  const deliveryFee = Number(deliveryData.deliveryFee) || 0;
  const totalAmount = itemsTotal + deliveryFee;

  const deliverySchedule = new this({
    userId: userId,
    saleId: saleData._id,
    transactionId: saleData.transactionId,
    deliveryType: saleData.isFromOrder ? 'order' : 'pos_sale',
    orderId: saleData.linkedOrderId || null,
    
    customer: {
      name: deliveryData.customerName || saleData.customer.name,
      phone: deliveryData.customerPhone || saleData.customer.phone,
      email: deliveryData.customerEmail || saleData.customer.email || ''
    },
    
    deliveryAddress: {
      street: deliveryData.address.street || '',
      city: deliveryData.address.city,
      state: deliveryData.address.state,
      postalCode: deliveryData.address.postalCode || '',
      country: deliveryData.address.country || 'Nigeria',
      fullAddress: deliveryData.address.fullAddress
    },
    
    // Create snapshot of items at time of scheduling
    items: saleData.items.map(item => ({
      productName: item.productName,
      sku: item.sku || '',
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      total: Number(item.total),
      deliveredQuantity: 0 // Initialize as undelivered
    })),
    
    scheduledDate: new Date(deliveryData.scheduledDate),
    timeSlot: deliveryData.timeSlot || 'anytime',
    deliveryFee: deliveryFee,
    deliveryMethod: deliveryData.deliveryMethod || 'self_delivery',
    deliveryNotes: deliveryData.notes || '',
    priority: deliveryData.priority || 'medium',
    
    totalAmount: totalAmount,
    paymentStatus: deliveryData.paymentStatus || 'paid',
    
    statusHistory: [{
      status: 'scheduled',
      timestamp: new Date(),
      updatedBy: userId,
      notes: `Delivery scheduled for ${saleData.isFromOrder ? 'order' : 'direct sale'} - ${saleData.items.length} items`
    }]
  });

  return await deliverySchedule.save();
};

deliveryScheduleSchema.statics.getDeliveriesByDate = function(userId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.find({
    userId: userId,
    scheduledDate: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  }).sort({ scheduledDate: 1 });
};

deliveryScheduleSchema.statics.getOverdueDeliveries = function(userId) {
  return this.find({
    userId: userId,
    status: 'scheduled',
    scheduledDate: { $lt: new Date() }
  }).sort({ scheduledDate: 1 });
};

deliveryScheduleSchema.statics.getTodayDeliveries = function(userId) {
  const today = new Date();
  return this.getDeliveriesByDate(userId, today);
};

deliveryScheduleSchema.statics.getUpcomingDeliveries = function(userId, days = 7) {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  return this.find({
    userId: userId,
    status: 'scheduled',
    scheduledDate: {
      $gte: today,
      $lte: futureDate
    }
  }).sort({ scheduledDate: 1 });
};

deliveryScheduleSchema.statics.getDeliveryStats = async function(userId, startDate, endDate) {
  const pipeline = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: null,
        totalDeliveries: { $sum: 1 },
        completedDeliveries: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        },
        scheduledDeliveries: {
          $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] }
        },
        overdueDeliveries: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', 'scheduled'] },
                  { $lt: ['$scheduledDate', new Date()] }
                ]
              },
              1,
              0
            ]
          }
        },
        totalRevenue: { $sum: '$totalAmount' },
        averageDeliveryValue: { $avg: '$totalAmount' }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalDeliveries: 0,
    completedDeliveries: 0,
    scheduledDeliveries: 0,
    overdueDeliveries: 0,
    totalRevenue: 0,
    averageDeliveryValue: 0
  };
};

// Indexes
deliveryScheduleSchema.index({ userId: 1, scheduledDate: 1 });
deliveryScheduleSchema.index({ userId: 1, status: 1 });
deliveryScheduleSchema.index({ transactionId: 1 });
deliveryScheduleSchema.index({ assignedTo: 1 });
deliveryScheduleSchema.index({ 'customer.phone': 1 });
deliveryScheduleSchema.index({ createdAt: -1 });

const DeliverySchedule = mongoose.models.DeliverySchedule || mongoose.model('DeliverySchedule', deliveryScheduleSchema);

export default DeliverySchedule;
