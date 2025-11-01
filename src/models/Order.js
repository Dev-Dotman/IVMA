import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  // Product snapshot at time of order
  productSnapshot: {
    productName: {
      type: String,
      required: true
    },
    sku: String,
    image: String,
    category: String,
    unitOfMeasure: String
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  // Store/Seller information
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  storeSnapshot: {
    storeName: {
      type: String,
      required: true
    },
    storeSlug: String,
    storePhone: String,
    storeEmail: String,
    storeAddress: {
      street: String,
      city: String,
      state: String,
      country: String
    }
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Item-level status for multi-vendor orders
  itemStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'processed'],
    default: 'pending'
  },
  // Item-level tracking
  itemTracking: {
    carrier: String,
    trackingNumber: String,
    shippedAt: Date,
    deliveredAt: Date
  },
  // Batch information if applicable
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryBatch',
    default: null
  },
  batchCode: {
    type: String,
    default: null
  }
}, { _id: true });

const customerSnapshotSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  // Store additional customer data as needed
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    // Remove required: true since we auto-generate it
    index: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  // Customer snapshot at time of order
  customerSnapshot: customerSnapshotSchema,
  items: [OrderItemSchema],
  
  // Order financials
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  shippingFee: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  couponDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Order status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'processed'],
    default: 'pending',
    index: true
  },
  
  // Shipping information
  shippingAddress: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String }, // Optional, will contain "City, State" if not provided
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true, default: 'Nigeria' },
    postalCode: String
  },
  
  // Billing address (if different from shipping)
  billingAddress: {
    firstName: String,
    lastName: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  
  // Payment information
  paymentInfo: {
    method: {
      type: String,
      enum: ['card', 'bank_transfer', 'cash_to_vendor', 'wallet', 'paystack', 'flutterwave'],
      required: true
    },
    provider: {
      type: String,
      enum: ['paystack', 'flutterwave', 'stripe', 'manual'],
      default: 'manual'
    },
    transactionId: String,
    reference: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
      index: true
    },
    paidAt: Date,
    refundedAt: Date,
    refundAmount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Tracking information
  tracking: {
    carrier: String,
    trackingNumber: String,
    trackingUrl: String,
    estimatedDelivery: Date,
    shippedAt: Date,
    deliveredAt: Date
  },
  
  // Order timeline
  timeline: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String,
    updatedBy: {
      type: String,
      enum: ['system', 'customer', 'admin', 'seller'],
      default: 'system'
    }
  }],
  
  // Coupon/Voucher used
  couponCode: {
    type: String,
    uppercase: true,
    trim: true
  },
  
  // Multi-vendor order grouping
  stores: [{
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store'
    },
    storeName: String,
    itemCount: Number,
    subtotal: Number,
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending'
    }
  }],
  
  // Order notes
  customerNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Customer notes cannot exceed 500 characters']
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
  },
  
  // Cancellation/Refund information
  cancellation: {
    reason: String,
    cancelledBy: {
      type: String,
      enum: ['customer', 'admin', 'seller', 'system']
    },
    cancelledAt: Date
  },
  
  // Order source
  orderSource: {
    type: String,
    enum: ['web', 'mobile', 'pos', 'phone', 'email'],
    default: 'web'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields
OrderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

OrderSchema.virtual('isMultiVendor').get(function() {
  const uniqueStores = new Set(this.items.map(item => item.store.toString()));
  return uniqueStores.size > 1;
});

OrderSchema.virtual('isPaid').get(function() {
  return this.paymentInfo.status === 'completed';
});

OrderSchema.virtual('canBeCancelled').get(function() {
  return ['pending', 'confirmed'].includes(this.status);
});

OrderSchema.virtual('canBeRefunded').get(function() {
  return this.isPaid && ['delivered', 'cancelled'].includes(this.status);
});

// Generate order number before saving
OrderSchema.pre('save', async function(next) {
  try {
    // Generate order number if not exists
    if (!this.orderNumber) {
      const count = await this.constructor.countDocuments();
      this.orderNumber = `ORD-${String(count + 1).padStart(6, '0')}`;
    }

    // Ensure customer snapshot has required fields
    if (this.customerSnapshot) {
      if (!this.customerSnapshot.firstName) this.customerSnapshot.firstName = 'Guest';
      if (!this.customerSnapshot.lastName) this.customerSnapshot.lastName = 'Customer';
      if (!this.customerSnapshot.email) this.customerSnapshot.email = 'guest@example.com';
      if (!this.customerSnapshot.phone) this.customerSnapshot.phone = '';
    }
    
    // Calculate subtotal from items
    this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Calculate total
    this.totalAmount = this.subtotal + this.tax + this.shippingFee - this.discount - this.couponDiscount;
    
    // Group items by store
    const storeGroups = {};
    this.items.forEach(item => {
      const storeId = item.store.toString();
      if (!storeGroups[storeId]) {
        storeGroups[storeId] = {
          store: item.store,
          storeName: item.storeSnapshot.storeName,
          itemCount: 0,
          subtotal: 0,
          status: item.itemStatus
        };
      }
      storeGroups[storeId].itemCount += item.quantity;
      storeGroups[storeId].subtotal += item.subtotal;
    });
    
    this.stores = Object.values(storeGroups);
    
    next();
  } catch (error) {
    console.error('Error in order pre-save middleware:', error);
    next(error);
  }
});

// Instance methods
OrderSchema.methods.addTimelineEvent = async function(status, note = '', updatedBy = 'system') {
  this.timeline.push({
    status,
    timestamp: new Date(),
    note,
    updatedBy
  });
  
  return await this.save();
};

OrderSchema.methods.updateStatus = async function(newStatus, note = '', updatedBy = 'system') {
  this.status = newStatus;
  
  await this.addTimelineEvent(newStatus, note, updatedBy);
  
  // Update timestamps based on status
  if (newStatus === 'shipped' && !this.tracking.shippedAt) {
    this.tracking.shippedAt = new Date();
  } else if (newStatus === 'delivered' && !this.tracking.deliveredAt) {
    this.tracking.deliveredAt = new Date();
  } else if (newStatus === 'cancelled' && !this.cancellation.cancelledAt) {
    this.cancellation.cancelledAt = new Date();
  }
  
  return await this.save();
};

OrderSchema.methods.markAsPaid = async function(transactionId, reference) {
  this.paymentInfo.status = 'completed';
  this.paymentInfo.transactionId = transactionId;
  this.paymentInfo.reference = reference;
  this.paymentInfo.paidAt = new Date();
  
  await this.addTimelineEvent('payment_completed', 'Payment completed successfully');
  
  return await this.save();
};

OrderSchema.methods.cancelOrder = async function(reason, cancelledBy = 'customer') {
  this.status = 'cancelled';
  this.cancellation = {
    reason,
    cancelledBy,
    cancelledAt: new Date()
  };
  
  // Update all item statuses
  this.items.forEach(item => {
    item.itemStatus = 'cancelled';
  });
  
  await this.addTimelineEvent('cancelled', `Order cancelled: ${reason}`, cancelledBy);
  
  return await this.save();
};

OrderSchema.methods.refundOrder = async function(refundAmount, reason) {
  this.paymentInfo.status = refundAmount >= this.totalAmount ? 'refunded' : 'partially_refunded';
  this.paymentInfo.refundAmount = refundAmount;
  this.paymentInfo.refundedAt = new Date();
  
  if (this.status !== 'cancelled') {
    this.status = 'refunded';
  }
  
  await this.addTimelineEvent('refunded', `Refund processed: ${reason}`, 'admin');
  
  return await this.save();
};

OrderSchema.methods.getItemsByStore = function() {
  const storeGroups = {};
  
  this.items.forEach(item => {
    const storeId = item.store.toString();
    if (!storeGroups[storeId]) {
      storeGroups[storeId] = {
        store: item.store,
        storeSnapshot: item.storeSnapshot,
        items: [],
        subtotal: 0,
        itemCount: 0
      };
    }
    
    storeGroups[storeId].items.push(item);
    storeGroups[storeId].subtotal += item.subtotal;
    storeGroups[storeId].itemCount += item.quantity;
  });
  
  return Object.values(storeGroups);
};

// Static methods
OrderSchema.statics.getOrdersByCustomer = function(customerId, options = {}) {
  const { status, page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;
  
  const query = { customer: customerId };
  if (status) query.status = status;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('items.store', 'storeName storePhone storeEmail')
    .populate('items.product', 'productName sku image');
};

OrderSchema.statics.getOrdersByStore = function(storeId, options = {}) {
  const { status, page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;
  
  const query = { 'items.store': storeId };
  if (status) query['items.itemStatus'] = status;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('customer', 'firstName lastName email phone');
};

OrderSchema.statics.getOrderStats = async function(customerId) {
  const pipeline = [
    { $match: { customer: new mongoose.Types.ObjectId(customerId) } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$totalAmount' },
        completedOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        pendingOrders: {
          $sum: { $cond: [{ $in: ['$status', ['pending', 'confirmed', 'processing']] }, 1, 0] }
        }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalOrders: 0,
    totalSpent: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    pendingOrders: 0
  };
};

// Indexes
OrderSchema.index({ customer: 1, createdAt: -1 });
OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ status: 1 });
OrderSchema.index({ 'paymentInfo.status': 1 });
OrderSchema.index({ 'items.store': 1 });
OrderSchema.index({ 'items.seller': 1 });
OrderSchema.index({ createdAt: -1 });

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
