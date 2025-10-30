import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  // Personal Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Please enter a valid email address'
    }
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long']
  },
  
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(phone) {
        if (!phone) return true; // Phone is optional
        return /^(\+234|0)[789]\d{9}$/.test(phone.replace(/\s/g, ''));
      },
      message: 'Please enter a valid Nigerian phone number'
    }
  },
  
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(date) {
        if (!date) return true; // Optional field
        return date < new Date();
      },
      message: 'Date of birth cannot be in the future'
    }
  },
  
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say'],
    default: 'prefer-not-to-say'
  },

  // Account Information
  avatar: {
    type: String,
    default: null
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  verificationToken: {
    type: String,
    default: null
  },
  
  verificationTokenExpiry: {
    type: Date,
    default: null
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  lastLogin: {
    type: Date,
    default: null
  },

  // Address Information
  addresses: [{
    type: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'home'
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    street: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Street address cannot exceed 200 characters']
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters']
    },
    state: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'State cannot exceed 100 characters']
    },
    country: {
      type: String,
      required: true,
      trim: true,
      default: 'Nigeria'
    },
    postalCode: {
      type: String,
      trim: true,
      maxlength: [20, 'Postal code cannot exceed 20 characters']
    },
    phone: {
      type: String,
      trim: true
    }
  }],

  // Shopping Preferences
  preferences: {
    currency: {
      type: String,
      enum: ['NGN', 'USD', 'EUR', 'GBP'],
      default: 'NGN'
    },
    language: {
      type: String,
      enum: ['en', 'yo', 'ig', 'ha'],
      default: 'en'
    },
    newsletter: {
      type: Boolean,
      default: false
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    favoriteCategories: [{
      type: String,
      enum: [
        'handmade',
        'clothing',
        'jewelry',
        'home-decor',
        'art',
        'food',
        'beauty',
        'electronics',
        'books',
        'toys',
        'other'
      ]
    }]
  },

  // Shopping History & Stats
  shoppingStats: {
    totalOrders: {
      type: Number,
      default: 0,
      min: 0
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0
    },
    averageOrderValue: {
      type: Number,
      default: 0,
      min: 0
    },
    firstOrderDate: {
      type: Date,
      default: null
    },
    lastOrderDate: {
      type: Date,
      default: null
    },
    favoriteStores: [{
      store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store'
      },
      orderCount: {
        type: Number,
        default: 1
      }
    }]
  },

  // Wishlist
  wishlist: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Security
  passwordResetToken: {
    type: String,
    default: null
  },
  
  passwordResetExpiry: {
    type: Date,
    default: null
  },
  
  loginAttempts: {
    type: Number,
    default: 0
  },
  
  lockUntil: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Remove sensitive information
      delete ret.password;
      delete ret.verificationToken;
      delete ret.passwordResetToken;
      delete ret.loginAttempts;
      delete ret.lockUntil;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Virtual fields
customerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

customerSchema.virtual('defaultAddress').get(function() {
  if (!this.addresses || !Array.isArray(this.addresses) || this.addresses.length === 0) {
    return null;
  }
  return this.addresses.find(addr => addr.isDefault) || this.addresses[0] || null;
});

customerSchema.virtual('isLocked').get(function() {
  if (!this.lockout) return false;
  return this.lockout.isLocked && this.lockout.lockedUntil > new Date();
});

// Indexes
customerSchema.index({ email: 1 }, { unique: true });
customerSchema.index({ phone: 1 });
customerSchema.index({ isVerified: 1 });
customerSchema.index({ isActive: 1 });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ lastLogin: -1 });
customerSchema.index({ 'shoppingStats.totalOrders': -1 });
customerSchema.index({ 'shoppingStats.totalSpent': -1 });

// Static methods
customerSchema.statics.createCustomer = async function(customerData) {
  const customer = new this(customerData);
  return await customer.save();
};

customerSchema.statics.findByEmail = function(email) {
  return this.findOne({ 
    email: email.toLowerCase().trim(),
    isActive: true 
  });
};

customerSchema.statics.findVerifiedCustomers = function() {
  return this.find({ 
    isVerified: true,
    isActive: true 
  }).select('-password');
};

customerSchema.statics.getTopCustomers = function(limit = 10) {
  return this.find({ 
    isActive: true,
    'shoppingStats.totalOrders': { $gt: 0 }
  })
  .sort({ 'shoppingStats.totalSpent': -1 })
  .limit(limit)
  .select('-password');
};

// Instance methods
customerSchema.methods.verifyCustomer = async function() {
  this.isVerified = true;
  this.verificationToken = null;
  this.verificationTokenExpiry = null;
  return await this.save();
};

customerSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  this.loginAttempts = 0;
  this.lockUntil = null;
  return await this.save();
};

customerSchema.methods.incrementLoginAttempts = async function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // If we have hit max attempts and it's not locked yet, lock the account
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // Lock for 2 hours
  }
  
  return await this.updateOne(updates);
};

customerSchema.methods.addToWishlist = async function(productId) {
  const existingItem = this.wishlist.find(item => 
    item.product.toString() === productId.toString()
  );
  
  if (!existingItem) {
    this.wishlist.push({ product: productId });
    return await this.save();
  }
  
  return this;
};

customerSchema.methods.removeFromWishlist = async function(productId) {
  this.wishlist = this.wishlist.filter(item => 
    item.product.toString() !== productId.toString()
  );
  return await this.save();
};

customerSchema.methods.addAddress = async function(addressData) {
  // If this is the first address or marked as default, make it default
  if (this.addresses.length === 0 || addressData.isDefault) {
    // Remove default from other addresses
    this.addresses.forEach(addr => addr.isDefault = false);
    addressData.isDefault = true;
  }
  
  this.addresses.push(addressData);
  return await this.save();
};

customerSchema.methods.updateShoppingStats = async function(orderAmount) {
  this.shoppingStats.totalOrders += 1;
  this.shoppingStats.totalSpent += orderAmount;
  this.shoppingStats.averageOrderValue = this.shoppingStats.totalSpent / this.shoppingStats.totalOrders;
  
  if (!this.shoppingStats.firstOrderDate) {
    this.shoppingStats.firstOrderDate = new Date();
  }
  
  this.shoppingStats.lastOrderDate = new Date();
  return await this.save();
};

customerSchema.methods.addFavoriteStore = async function(storeId) {
  const existingFavorite = this.shoppingStats.favoriteStores.find(
    fav => fav.store.toString() === storeId.toString()
  );
  
  if (existingFavorite) {
    existingFavorite.orderCount += 1;
  } else {
    this.shoppingStats.favoriteStores.push({
      store: storeId,
      orderCount: 1
    });
  }
  
  return await this.save();
};

// Pre-save middleware
customerSchema.pre('save', function(next) {
  // Ensure only one default address
  const defaultAddresses = this.addresses.filter(addr => addr.isDefault);
  if (defaultAddresses.length > 1) {
    this.addresses.forEach((addr, index) => {
      if (index > 0) addr.isDefault = false;
    });
  }
  
  next();
});

const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

export default Customer;
