import mongoose from 'mongoose';
import { hashPassword, isValidEmail, validatePassword } from '@/lib/auth';

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters long'],
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [2, 'Last name must be at least 2 characters long'],
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: isValidEmail,
      message: 'Please enter a valid email address'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'manager'],
    default: 'user'
  },
  // Subscription tracking fields
  isSubscribed: {
    type: Boolean,
    default: false
  },
  dateSubscribed: {
    type: Date,
    default: null
  },
  currentSubscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    default: null
  },
  subscriptionHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  }],
  preferences: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  avatar: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  // Skip hashing if password is already hashed (starts with $2a$, $2b$, etc. - bcrypt format)
  if (this.password && this.password.match(/^\$2[abyxy]?\$\d+\$/)) {
    return next();
  }
  
  // Validate password strength for new passwords only
  const passwordValidation = validatePassword(this.password);
  if (!passwordValidation.isValid) {
    const error = new Error('Password does not meet security requirements');
    error.details = passwordValidation.checks;
    return next(error);
  }
  
  this.password = await hashPassword(this.password);
  next();
});

// Instance methods
userSchema.methods.getFullName = function() {
  return `${this.firstName} ${this.lastName}`.trim();
};

userSchema.methods.getInitials = function() {
  return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
};

userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  return await this.save();
};

userSchema.methods.deactivate = async function() {
  this.isActive = false;
  return await this.save();
};

userSchema.methods.activate = async function() {
  this.isActive = true;
  return await this.save();
};

// Additional instance methods for subscription management
userSchema.methods.subscribe = async function(subscriptionId) {
  this.isSubscribed = true;
  this.dateSubscribed = new Date();
  this.currentSubscription = subscriptionId;
  this.subscriptionHistory.push(subscriptionId);
  return await this.save();
};

userSchema.methods.unsubscribe = async function() {
  this.isSubscribed = false;
  this.currentSubscription = null;
  return await this.save();
};

userSchema.methods.getSubscriptionStatus = function() {
  return {
    isSubscribed: this.isSubscribed,
    dateSubscribed: this.dateSubscribed,
    currentSubscription: this.currentSubscription,
    subscriptionHistory: this.subscriptionHistory
  };
};

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase().trim() });
};

userSchema.statics.searchUsers = function(searchTerm, options = {}) {
  const { limit = 10, includeInactive = false } = options;
  
  const query = {
    $and: [
      includeInactive ? {} : { isActive: true },
      {
        $or: [
          { firstName: { $regex: searchTerm, $options: 'i' } },
          { lastName: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } }
        ]
      }
    ]
  };

  return this.find(query).limit(limit);
};

userSchema.statics.getAllUsers = function(options = {}) {
  const { 
    page = 1, 
    limit = 10, 
    sortBy = 'createdAt', 
    sortOrder = -1,
    includeInactive = false 
  } = options;

  const query = includeInactive ? {} : { isActive: true };
  const skip = (page - 1) * limit;

  return this.find(query)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);
};

userSchema.statics.updatePassword = async function(userId, newPassword) {
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    throw new Error('Password does not meet security requirements');
  }

  const hashedPassword = await hashPassword(newPassword);
  
  return await this.findByIdAndUpdate(
    userId,
    { password: hashedPassword },
    { new: true }
  );
};

// Static methods for subscription queries
userSchema.statics.getSubscribedUsers = function(options = {}) {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  return this.find({ isSubscribed: true })
    .populate('currentSubscription')
    .skip(skip)
    .limit(limit);
};

userSchema.statics.getUnsubscribedUsers = function(options = {}) {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  return this.find({ isSubscribed: false })
    .skip(skip)
    .limit(limit);
};

// Create indexes
userSchema.index({ email: 1 });
userSchema.index({ firstName: 1, lastName: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ isSubscribed: 1 });
userSchema.index({ currentSubscription: 1 });

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
