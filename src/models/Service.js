import mongoose from 'mongoose';

const ServiceItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Beauty & Personal Care',
      'Fashion & Style',
      'Events & Creative Lifestyle',
      'Home & Domestic',
      'Mobile & Personal Convenience',
      'Food & Everyday Living'
    ]
  },
  subCategory: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  duration: {
    type: Number, // in minutes
    required: true,
    min: 15
  },
  durationUnit: {
    type: String,
    enum: ['minutes', 'hours', 'days', 'weeks'],
    default: 'minutes'
  },
  yearsOfExperience: {
    type: Number,
    min: 0,
    default: 0
  },
  homeServiceAvailable: {
    type: Boolean,
    default: false
  },
  discount: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  // Service-specific availability
  availability: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    openingTime: {
      type: String,
      required: true
    },
    closingTime: {
      type: String,
      required: true
    }
  }],
  timeSlotDuration: {
    type: Number,
    default: 30,
    enum: [15, 30, 45, 60, 90, 120]
  },
  maxBookingsPerDay: {
    type: Number,
    default: 10,
    min: 1
  },
  // Service-specific locations
  serviceLocations: {
    coverAllNigeria: {
      type: Boolean,
      default: false
    },
    states: [{
      stateName: {
        type: String,
        required: true
      },
      cities: [{
        type: String
      }],
      coverAllCities: {
        type: Boolean,
        default: false
      }
    }]
  },
  portfolioImages: [{
    type: String
  }],
  addOns: [{
    name: String,
    price: Number
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const ServiceSchema = new mongoose.Schema({
  // User & Store References
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },

  // Individual Service Items
  services: [ServiceItemSchema],

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  },
  verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
ServiceSchema.index({ userId: 1 });
ServiceSchema.index({ storeId: 1 });
ServiceSchema.index({ 'services.category': 1, 'services.subCategory': 1 });

export default mongoose.models.Service || mongoose.model('Service', ServiceSchema);
