import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  productSnapshot: {
    // Store product details at time of adding to cart
    productName: { type: String, required: true },
    sku: String,
    category: String,
    image: String,
    unitOfMeasure: String
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    default: 1
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  storeSnapshot: {
    storeName: String,
    storeSlug: String
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [200, 'Notes cannot exceed 200 characters']
  }
}, { _id: true });

const cartSchema = new mongoose.Schema({
  // Customer reference
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    unique: true, // Enforce one cart per customer
    index: true
  },

  // Cart items
  items: [cartItemSchema],

  // Cart totals
  subtotal: {
    type: Number,
    default: 0,
    min: [0, 'Subtotal cannot be negative']
  },
  
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  
  shipping: {
    type: Number,
    default: 0,
    min: [0, 'Shipping cannot be negative']
  },
  
  total: {
    type: Number,
    default: 0,
    min: [0, 'Total cannot be negative']
  },

  // Applied coupon/voucher
  couponCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  
  couponDiscount: {
    type: Number,
    default: 0,
    min: [0, 'Coupon discount cannot be negative']
  },

  // Cart metadata
  itemCount: {
    type: Number,
    default: 0,
    min: [0, 'Item count cannot be negative']
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  expiresAt: {
    type: Date,
    default: function() {
      // Cart expires after 30 days of inactivity
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    },
    index: true
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'abandoned', 'converted', 'expired'],
    default: 'active',
    index: true
  },

  // Session tracking (for guest carts - future feature)
  sessionId: {
    type: String,
    sparse: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields
cartSchema.virtual('isEmpty').get(function() {
  return this.items.length === 0;
});

cartSchema.virtual('uniqueStores').get(function() {
  const storeIds = new Set(this.items.map(item => item.store.toString()));
  return storeIds.size;
});

cartSchema.virtual('hasMultipleStores').get(function() {
  return this.uniqueStores > 1;
});

cartSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

cartSchema.virtual('daysUntilExpiry').get(function() {
  const diffTime = this.expiresAt - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Indexes - Updated to enforce one cart per customer
cartSchema.index({ customer: 1 }, { unique: true });
cartSchema.index({ status: 1 });
cartSchema.index({ lastUpdated: -1 });
cartSchema.index({ expiresAt: 1 });
cartSchema.index({ 'items.product': 1 });
cartSchema.index({ 'items.store': 1 });

// Pre-save middleware
cartSchema.pre('save', function(next) {
  // Calculate cart totals
  this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  this.itemCount = this.items.reduce((sum, item) => sum + item.quantity, 0);
  
  // Calculate total
  this.total = this.subtotal + this.tax + this.shipping - this.discount - this.couponDiscount;
  
  // Update last updated timestamp
  this.lastUpdated = new Date();
  
  // Extend expiry date
  this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  
  // Update status
  if (this.items.length === 0) {
    this.status = 'abandoned';
  } else if (this.status === 'abandoned' || this.status === 'expired') {
    this.status = 'active';
  }
  
  next();
});

// Static methods - Updated
cartSchema.statics.getActiveCart = function(customerId) {
  return this.findOne({ 
    customer: customerId
  })
  .populate('items.product', 'productName sku image sellingPrice quantityInStock status webVisibility')
  .populate('items.store', 'storeName storePhone storeEmail branding settings ivmaWebsite');
};

cartSchema.statics.createCart = async function(customerId) {
  try {
    const cart = new this({
      customer: customerId,
      items: [],
      status: 'active'
    });
    return await cart.save();
  } catch (error) {
    // If duplicate key error (cart already exists), find and return existing cart
    if (error.code === 11000) {
      const existingCart = await this.findOne({ 
        customer: customerId
      })
      .populate('items.product', 'productName sku image sellingPrice quantityInStock status webVisibility')
      .populate('items.store', 'storeName storePhone storeEmail branding settings ivmaWebsite');
      
      if (existingCart) {
        // Reactivate the cart if it was abandoned/expired
        if (existingCart.status !== 'active') {
          existingCart.status = 'active';
          existingCart.lastUpdated = new Date();
          existingCart.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await existingCart.save();
        }
        return existingCart;
      }
    }
    throw error;
  }
};

cartSchema.statics.getOrCreateCart = async function(customerId) {
  try {
    // First try to get existing cart (active or inactive)
    let cart = await this.findOne({ customer: customerId })
      .populate('items.product', 'productName sku image sellingPrice quantityInStock status webVisibility')
      .populate('items.store', 'storeName storePhone storeEmail branding settings ivmaWebsite');
    
    if (cart) {
      // Reactivate cart if it's not active
      if (cart.status !== 'active') {
        cart.status = 'active';
        cart.lastUpdated = new Date();
        cart.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await cart.save();
      }
      return cart;
    }
    
    // If no cart exists, create one
    cart = await this.createCart(customerId);
    return cart;
    
  } catch (error) {
    // Handle race conditions
    if (error.code === 11000) {
      // Try one more time to get existing cart
      const existingCart = await this.findOne({ customer: customerId })
        .populate('items.product', 'productName sku image sellingPrice quantityInStock status webVisibility')
        .populate('items.store', 'storeName storePhone storeEmail branding settings ivmaWebsite');
      if (existingCart) {
        return existingCart;
      }
    }
    throw error;
  }
};

cartSchema.statics.getCartByCustomer = function(customerId) {
  return this.findOne({ customer: customerId })
    .populate([
      { path: 'items.product', select: 'productName sku quantityInStock sellingPrice image webVisibility status' },
      { path: 'items.store', select: 'storeName storeSlug branding settings' },
      { path: 'customer', select: 'firstName lastName email' }
    ]);
};

cartSchema.statics.getAbandonedCarts = function(daysAgo = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
  
  return this.find({
    status: 'active',
    lastUpdated: { $lt: cutoffDate },
    items: { $exists: true, $not: { $size: 0 } }
  })
  .populate('customer', 'firstName lastName email')
  .sort({ lastUpdated: -1 });
};

cartSchema.statics.cleanupExpiredCarts = async function() {
  const result = await this.updateMany(
    {
      expiresAt: { $lt: new Date() },
      status: 'active'
    },
    {
      $set: { status: 'expired' }
    }
  );
  
  return result;
};

cartSchema.statics.getCartStatsByStore = async function(storeId) {
  const pipeline = [
    { $unwind: '$items' },
    { $match: { 'items.store': new mongoose.Types.ObjectId(storeId), status: 'active' } },
    {
      $group: {
        _id: null,
        totalCarts: { $addToSet: '$customer' },
        totalItems: { $sum: '$items.quantity' },
        totalValue: { $sum: '$items.subtotal' }
      }
    },
    {
      $project: {
        _id: 0,
        totalCarts: { $size: '$totalCarts' },
        totalItems: 1,
        totalValue: 1,
        averageCartValue: { $divide: ['$totalValue', { $size: '$totalCarts' }] }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || { totalCarts: 0, totalItems: 0, totalValue: 0, averageCartValue: 0 };
};

// Instance methods - Updated
cartSchema.methods.addItem = async function(productData) {
  const { product, quantity, price, store, productSnapshot, storeSnapshot, notes } = productData;
  
  // Check if item already exists in cart
  const existingItemIndex = this.items.findIndex(
    item => item.product.toString() === product.toString()
  );
  
  if (existingItemIndex > -1) {
    // Update existing item quantity
    this.items[existingItemIndex].quantity += quantity;
    this.items[existingItemIndex].subtotal = this.items[existingItemIndex].quantity * this.items[existingItemIndex].price;
    this.items[existingItemIndex].addedAt = new Date();
    
    if (notes) {
      this.items[existingItemIndex].notes = notes;
    }
  } else {
    // Add new item
    this.items.push({
      product,
      productSnapshot: productSnapshot || {},
      quantity,
      price,
      subtotal: quantity * price,
      store,
      storeSnapshot: storeSnapshot || {},
      notes: notes || '',
      addedAt: new Date()
    });
  }
  
  return await this.save();
};

cartSchema.methods.removeItem = async function(productId) {
  this.items = this.items.filter(
    item => item.product.toString() !== productId.toString()
  );
  
  return await this.save();
};

cartSchema.methods.updateItemQuantity = async function(productId, newQuantity) {
  if (newQuantity < 1) {
    return await this.removeItem(productId);
  }
  
  const item = this.items.find(
    item => item.product.toString() === productId.toString()
  );
  
  if (item) {
    item.quantity = newQuantity;
    item.subtotal = newQuantity * item.price;
    item.addedAt = new Date();
  }
  
  return await this.save();
};

cartSchema.methods.clearCart = async function() {
  this.items = [];
  this.couponCode = null;
  this.couponDiscount = 0;
  this.discount = 0;
  this.status = 'abandoned';
  
  return await this.save();
};

cartSchema.methods.applyCoupon = async function(couponCode, discountAmount) {
  this.couponCode = couponCode;
  this.couponDiscount = discountAmount;
  
  return await this.save();
};

cartSchema.methods.removeCoupon = async function() {
  this.couponCode = null;
  this.couponDiscount = 0;
  
  return await this.save();
};

cartSchema.methods.updateShipping = async function(shippingCost) {
  this.shipping = shippingCost;
  return await this.save();
};

cartSchema.methods.markAsConverted = async function() {
  this.status = 'converted';
  return await this.save();
};

cartSchema.methods.getItemsByStore = function() {
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

cartSchema.methods.validateStockAvailability = async function() {
  const Inventory = mongoose.model('Inventory');
  const unavailableItems = [];
  
  for (const item of this.items) {
    const product = await Inventory.findById(item.product);
    
    if (!product || !product.webVisibility || product.status !== 'Active') {
      unavailableItems.push({
        ...item.toObject(),
        reason: 'Product no longer available'
      });
    } else if (product.quantityInStock < item.quantity) {
      unavailableItems.push({
        ...item.toObject(),
        availableQuantity: product.quantityInStock,
        reason: 'Insufficient stock'
      });
    }
  }
  
  return {
    isValid: unavailableItems.length === 0,
    unavailableItems
  };
};

const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);

export default Cart;
