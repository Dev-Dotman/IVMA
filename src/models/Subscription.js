import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  planType: {
    type: String,
    enum: ['free', 'basic', 'premium', 'enterprise'],
    required: [true, 'Plan type is required'],
    default: 'free'
  },
  planName: {
    type: String,
    required: [true, 'Plan name is required']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'canceled', 'expired', 'trial', 'pending'],
    required: [true, 'Subscription status is required'],
    default: 'active'
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly', 'one-time', 'trial'],
    required: [true, 'Billing cycle is required'],
    default: 'monthly'
  },
  price: {
    amount: {
      type: Number,
      required: [true, 'Price amount is required'],
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      default: 'NGN',
      uppercase: true
    }
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    default: Date.now
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  trialPeriod: {
    isTrialPeriod: {
      type: Boolean,
      default: false
    },
    trialStartDate: {
      type: Date,
      default: null
    },
    trialEndDate: {
      type: Date,
      default: null
    }
  },
  paymentMethod: {
    type: {
      type: String,
      enum: ['credit_card', 'paypal', 'bank_transfer', 'crypto', 'free'],
      default: 'free'
    },
    last4: String,
    brand: String,
    expiryMonth: Number,
    expiryYear: Number
  },
  features: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    limit: {
      type: Number,
      default: null // null means unlimited
    },
    enabled: {
      type: Boolean,
      default: true
    }
  }],
  usage: {
    inventoryItems: {
      used: { type: Number, default: 0 },
      limit: { type: Number, default: null }
    },
    users: {
      used: { type: Number, default: 1 },
      limit: { type: Number, default: 1 }
    },
    storage: {
      used: { type: Number, default: 0 }, // in MB
      limit: { type: Number, default: null }
    },
    apiCalls: {
      used: { type: Number, default: 0 },
      limit: { type: Number, default: null },
      resetDate: { type: Date, default: null }
    }
  },
  autoRenew: {
    type: Boolean,
    default: true
  },
  canceledAt: {
    type: Date,
    default: null
  },
  cancelReason: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Virtual for checking if subscription is active
subscriptionSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && this.endDate > now;
});

// Virtual for checking if subscription is in trial
subscriptionSchema.virtual('isInTrial').get(function() {
  if (!this.trialPeriod.isTrialPeriod) return false;
  const now = new Date();
  return this.trialPeriod.trialEndDate > now;
});

// Virtual for days remaining
subscriptionSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const diffTime = this.endDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Instance methods
subscriptionSchema.methods.cancel = async function(reason = null) {
  this.status = 'canceled';
  this.canceledAt = new Date();
  this.cancelReason = reason;
  this.autoRenew = false;
  return await this.save();
};

subscriptionSchema.methods.renew = async function(endDate) {
  this.status = 'active';
  this.endDate = endDate;
  this.canceledAt = null;
  this.cancelReason = null;
  return await this.save();
};

subscriptionSchema.methods.updateUsage = async function(usageType, amount) {
  if (this.usage[usageType]) {
    this.usage[usageType].used = amount;
    return await this.save();
  }
  throw new Error(`Usage type ${usageType} not found`);
};

subscriptionSchema.methods.incrementUsage = async function(usageType, amount = 1) {
  if (this.usage[usageType]) {
    this.usage[usageType].used += amount;
    return await this.save();
  }
  throw new Error(`Usage type ${usageType} not found`);
};

subscriptionSchema.methods.hasFeature = function(featureName) {
  return this.features.some(feature => 
    feature.name === featureName && feature.enabled
  );
};

subscriptionSchema.methods.getFeatureLimit = function(featureName) {
  const feature = this.features.find(f => f.name === featureName);
  return feature ? feature.limit : null;
};

subscriptionSchema.methods.checkUsageLimit = function(usageType) {
  const usage = this.usage[usageType];
  if (!usage || usage.limit === null) return { withinLimit: true, usage };
  
  return {
    withinLimit: usage.used < usage.limit,
    usage,
    percentUsed: (usage.used / usage.limit) * 100
  };
};

// Static methods
subscriptionSchema.statics.getActiveSubscriptions = function(options = {}) {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  return this.find({ 
    status: 'active',
    endDate: { $gt: new Date() }
  })
  .populate('userId', 'firstName lastName email')
  .skip(skip)
  .limit(limit);
};

subscriptionSchema.statics.getExpiringSubscriptions = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return this.find({
    status: 'active',
    endDate: { $lte: futureDate, $gt: new Date() },
    autoRenew: false
  }).populate('userId', 'firstName lastName email');
};

subscriptionSchema.statics.createSubscription = async function(subscriptionData) {
  const subscription = new this(subscriptionData);
  
  // Set end date based on billing cycle if not provided
  if (!subscription.endDate) {
    const startDate = subscription.startDate;
    let endDate = new Date(startDate);
    
    switch (subscription.billingCycle) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      case 'trial':
        endDate.setDate(endDate.getDate() + 14); // 14-day trial
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }
    
    subscription.endDate = endDate;
  }
  
  return await subscription.save();
};

// Indexes
subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ planType: 1 });
subscriptionSchema.index({ endDate: 1 });
subscriptionSchema.index({ 'trialPeriod.trialEndDate': 1 });

const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
