import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema({
  // Owner reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true, // Each user can only have one store
    index: true
  },

  // Store basic information
  storeName: {
    type: String,
    required: [true, 'Store name is required'],
    trim: true,
    maxlength: [100, 'Store name cannot exceed 100 characters']
  },
  
  storeDescription: {
    type: String,
    trim: true,
    maxlength: [500, 'Store description cannot exceed 500 characters'],
    default: ''
  },

  // Store type - NEW
  storeType: {
    type: String,
    enum: ['physical', 'online'],
    required: [true, 'Store type is required'],
    default: 'physical'
  },

  // Store contact information
  storePhone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters'],
    default: ''
  },
  
  storeEmail: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [100, 'Email cannot exceed 100 characters'],
    default: ''
  },

  // Store address - UPDATED (only required for physical stores)
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: [200, 'Street address cannot exceed 200 characters'],
      default: ''
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters'],
      default: ''
    },
    state: {
      type: String,
      trim: true,
      maxlength: [100, 'State cannot exceed 100 characters'],
      default: ''
    },
    country: {
      type: String,
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters'],
      default: 'Nigeria'
    },
    postalCode: {
      type: String,
      trim: true,
      maxlength: [20, 'Postal code cannot exceed 20 characters'],
      default: ''
    }
  },

  // Online store information - UPDATED
  onlineStoreInfo: {
    website: {
      type: String,
      trim: true,
      default: ''
    },
    socialMedia: {
      instagram: {
        type: String,
        trim: true,
        default: ''
      },
      facebook: {
        type: String,
        trim: true,
        default: ''
      },
      twitter: {
        type: String,
        trim: true,
        default: ''
      },
      whatsapp: {
        type: String,
        trim: true,
        default: ''
      }
    },
    deliveryAreas: [{
      type: String,
      trim: true
    }]
  },

  // IVMA Website Configuration - NEW
  ivmaWebsite: {
    // Website path (subdomain or path)
    websitePath: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true, // Allow null/undefined values to not conflict
      validate: {
        validator: function(v) {
          // Only validate if path is provided
          if (!v) return true;
          // Must be alphanumeric with hyphens, 3-30 characters
          return /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(v);
        },
        message: 'Website path must be 3-30 characters, alphanumeric with hyphens only'
      }
    },
    
    // Website status
    status: {
      type: String,
      enum: [
        'inactive',     // Website not set up or disabled
        'pending',      // Website setup in progress
        'active',       // Website live and accessible
        'suspended',    // Website temporarily suspended (policy violation, payment issues)
        'maintenance',  // Website under maintenance
        'archived'      // Website permanently archived
      ],
      default: 'inactive'
    },
    
    // Website configuration
    isEnabled: {
      type: Boolean,
      default: false
    },
    
    // SEO and meta information
    seoSettings: {
      metaTitle: {
        type: String,
        trim: true,
        maxlength: [60, 'Meta title cannot exceed 60 characters'],
        default: ''
      },
      metaDescription: {
        type: String,
        trim: true,
        maxlength: [160, 'Meta description cannot exceed 160 characters'],
        default: ''
      },
      keywords: [{
        type: String,
        trim: true
      }]
    },
    
    // Website customization
    customization: {
      theme: {
        type: String,
        enum: ['default', 'modern', 'classic', 'minimal', 'bold'],
        default: 'default'
      },
      layout: {
        type: String,
        enum: ['grid', 'list', 'masonry', 'slider'],
        default: 'grid'
      },
      showInventory: {
        type: Boolean,
        default: true
      },
      showPrices: {
        type: Boolean,
        default: true
      },
      enableWhatsAppOrder: {
        type: Boolean,
        default: true
      },
      enableDirectPurchase: {
        type: Boolean,
        default: false
      }
    },
    
    // Analytics and tracking
    analytics: {
      isGoogleAnalyticsEnabled: {
        type: Boolean,
        default: false
      },
      googleAnalyticsId: {
        type: String,
        trim: true,
        default: ''
      },
      trackingCode: {
        type: String,
        trim: true,
        default: ''
      }
    },
    
    // Website metrics
    metrics: {
      totalViews: {
        type: Number,
        default: 0,
        min: 0
      },
      monthlyViews: {
        type: Number,
        default: 0,
        min: 0
      },
      lastVisit: {
        type: Date,
        default: null
      },
      totalOrders: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    
    // Domain and SSL information
    domain: {
      customDomain: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
      },
      sslEnabled: {
        type: Boolean,
        default: true
      },
      sslExpiry: {
        type: Date,
        default: null
      }
    },
    
    // Website dates
    activatedAt: {
      type: Date,
      default: null
    },
    suspendedAt: {
      type: Date,
      default: null
    },
    lastPublishedAt: {
      type: Date,
      default: null
    },
    
    // Suspension/deactivation reason
    statusReason: {
      type: String,
      trim: true,
      default: ''
    },
    
    // Website settings
    settings: {
      contactForm: {
        type: Boolean,
        default: true
      },
      socialMediaLinks: {
        type: Boolean,
        default: true
      },
      storeHours: {
        type: Boolean,
        default: true
      },
      locationMap: {
        type: Boolean,
        default: true
      },
      testimonials: {
        type: Boolean,
        default: false
      },
      blog: {
        type: Boolean,
        default: false
      }
    }
  },

  // Store settings
  settings: {
    currency: {
      type: String,
      default: 'NGN',
      enum: ['NGN', 'USD', 'EUR', 'GBP']
    },
    timezone: {
      type: String,
      default: 'Africa/Lagos'
    },
    taxRate: {
      type: Number,
      min: [0, 'Tax rate cannot be negative'],
      max: [100, 'Tax rate cannot exceed 100%'],
      default: 0
    },
    defaultDiscount: {
      type: Number,
      min: [0, 'Default discount cannot be negative'],
      max: [100, 'Default discount cannot exceed 100%'],
      default: 0
    },
    receiptFooter: {
      type: String,
      trim: true,
      maxlength: [200, 'Receipt footer cannot exceed 200 characters'],
      default: 'Thank you for your business!'
    },
    allowNegativeStock: {
      type: Boolean,
      default: false
    },
    autoGenerateReceipts: {
      type: Boolean,
      default: true
    }
  },

  // Store branding
  branding: {
    logo: {
      type: String,
      default: null
    },
    banner: {
      type: String,
      default: null
    },
    primaryColor: {
      type: String,
      default: '#0D9488' // Teal color
    },
    secondaryColor: {
      type: String,
      default: '#F3F4F6' // Gray color
    }
  },

  // Store status
  isActive: {
    type: Boolean,
    default: true
  },
  
  setupCompleted: {
    type: Boolean,
    default: false
  },

  // Metrics
  totalSales: {
    type: Number,
    default: 0,
    min: [0, 'Total sales cannot be negative']
  },
  
  totalRevenue: {
    type: Number,
    default: 0,
    min: [0, 'Total revenue cannot be negative']
  },

  lastSaleDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields - UPDATED
storeSchema.virtual('fullAddress').get(function() {
  // Only return address for physical stores
  if (this.storeType !== 'physical') return '';
  
  const parts = [
    this.address.street,
    this.address.city,
    this.address.state,
    this.address.country
  ].filter(part => part && part.trim() !== '');
  
  return parts.length > 0 ? parts.join(', ') : '';
});

// Add website URL virtual
storeSchema.virtual('websiteUrl').get(function() {
  if (!this.ivmaWebsite.websitePath || this.ivmaWebsite.status !== 'active') return null;
  
  // Check if custom domain is set and active
  if (this.ivmaWebsite.domain.customDomain) {
    const protocol = this.ivmaWebsite.domain.sslEnabled ? 'https' : 'http';
    return `${protocol}://${this.ivmaWebsite.domain.customDomain}`;
  }
  
  // Use IVMA subdomain/path
  return `https://${this.ivmaWebsite.websitePath}.ivma.ng`;
});

storeSchema.virtual('websiteFullPath').get(function() {
  if (!this.ivmaWebsite.websitePath) return null;
  return `${this.ivmaWebsite.websitePath}.ivma.ng`;
});

// Static methods
storeSchema.statics.createStore = async function(storeData) {
  const store = new this(storeData);
  return await store.save();
};

storeSchema.statics.getStoreByUser = function(userId) {
  return this.findOne({ userId, isActive: true })
    .populate('userId', 'firstName lastName email');
};

storeSchema.statics.updateStoreSettings = async function(userId, settings) {
  return await this.findOneAndUpdate(
    { userId, isActive: true },
    { 
      $set: { 
        'settings': { ...settings },
        setupCompleted: true
      }
    },
    { new: true, runValidators: true }
  );
};

// Instance methods
storeSchema.methods.updateSalesMetrics = async function(saleAmount) {
  this.totalSales += 1;
  this.totalRevenue += saleAmount;
  this.lastSaleDate = new Date();
  return await this.save();
};

storeSchema.methods.completeSetup = async function() {
  this.setupCompleted = true;
  return await this.save();
};

// Instance methods - ADD NEW
storeSchema.methods.activateWebsite = async function(websitePath) {
  // Validate website path
  if (!websitePath || !/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(websitePath)) {
    throw new Error('Invalid website path format');
  }
  
  // Check if path is already taken
  const existingStore = await this.constructor.findOne({
    'ivmaWebsite.websitePath': websitePath,
    _id: { $ne: this._id }
  });
  
  if (existingStore) {
    throw new Error('Website path is already taken');
  }
  
  this.ivmaWebsite.websitePath = websitePath;
  this.ivmaWebsite.status = 'active';
  this.ivmaWebsite.isEnabled = true;
  this.ivmaWebsite.activatedAt = new Date();
  this.ivmaWebsite.lastPublishedAt = new Date();
  
  return await this.save();
};

storeSchema.methods.suspendWebsite = async function(reason = '') {
  this.ivmaWebsite.status = 'suspended';
  this.ivmaWebsite.isEnabled = false;
  this.ivmaWebsite.suspendedAt = new Date();
  this.ivmaWebsite.statusReason = reason;
  
  return await this.save();
};

storeSchema.methods.deactivateWebsite = async function(reason = '') {
  this.ivmaWebsite.status = 'inactive';
  this.ivmaWebsite.isEnabled = false;
  this.ivmaWebsite.statusReason = reason;
  
  return await this.save();
};

storeSchema.methods.updateWebsiteMetrics = async function(views = 1, isOrder = false) {
  this.ivmaWebsite.metrics.totalViews += views;
  this.ivmaWebsite.metrics.monthlyViews += views;
  this.ivmaWebsite.metrics.lastVisit = new Date();
  
  if (isOrder) {
    this.ivmaWebsite.metrics.totalOrders += 1;
  }
  
  return await this.save();
};

// Static methods - ADD NEW
storeSchema.statics.findByWebsitePath = function(websitePath) {
  return this.findOne({ 
    'ivmaWebsite.websitePath': websitePath,
    'ivmaWebsite.status': 'active',
    isActive: true 
  });
};

storeSchema.statics.getActiveWebsites = function() {
  return this.find({ 
    'ivmaWebsite.status': 'active',
    'ivmaWebsite.isEnabled': true,
    isActive: true 
  }).populate('userId', 'firstName lastName email');
};

storeSchema.statics.checkWebsitePathAvailability = async function(websitePath, excludeStoreId = null) {
  const query = { 'ivmaWebsite.websitePath': websitePath };
  if (excludeStoreId) {
    query._id = { $ne: excludeStoreId };
  }
  
  const existingStore = await this.findOne(query);
  return !existingStore;
};

// Pre-save middleware - UPDATE
storeSchema.pre('save', function(next) {
  // For physical stores, require city and state
  if (this.storeType === 'physical') {
    if (!this.address.city || this.address.city.trim() === '') {
      return next(new Error('City is required for physical stores'));
    }
    if (!this.address.state || this.address.state.trim() === '') {
      return next(new Error('State is required for physical stores'));
    }
  }
  
  // Validate website path if provided
  if (this.ivmaWebsite.websitePath) {
    const path = this.ivmaWebsite.websitePath.toLowerCase().trim();
    if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(path)) {
      return next(new Error('Website path must be 3-30 characters, alphanumeric with hyphens only'));
    }
    this.ivmaWebsite.websitePath = path;
  }
  
  // Auto-generate SEO settings if not provided
  if (this.ivmaWebsite.isEnabled && !this.ivmaWebsite.seoSettings.metaTitle) {
    this.ivmaWebsite.seoSettings.metaTitle = `${this.storeName} - Quality Products Online`;
  }
  
  if (this.ivmaWebsite.isEnabled && !this.ivmaWebsite.seoSettings.metaDescription) {
    this.ivmaWebsite.seoSettings.metaDescription = `Shop quality products at ${this.storeName}. ${this.storeDescription || 'Discover our wide range of products with great prices and excellent service.'}`;
  }
  
  // Auto-complete setup if basic info is provided
  if (this.storeName && this.storeName.trim() !== '') {
    this.setupCompleted = true;
  }
  
  next();
});

// Indexes - ADD NEW
storeSchema.index({ userId: 1 }, { unique: true });
storeSchema.index({ storeName: 1 });
storeSchema.index({ isActive: 1 });
storeSchema.index({ setupCompleted: 1 });
storeSchema.index({ 'ivmaWebsite.websitePath': 1 }, { unique: true, sparse: true });
storeSchema.index({ 'ivmaWebsite.status': 1 });
storeSchema.index({ 'ivmaWebsite.isEnabled': 1 });

const Store = mongoose.models.Store || mongoose.model('Store', storeSchema);

export default Store;
