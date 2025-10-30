import mongoose from 'mongoose';
import { hashPassword, isValidEmail, validatePassword } from '@/lib/auth';

const tempUserSchema = new mongoose.Schema({
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
  verificationCode: {
    type: String,
    required: true,
    length: 6
  },
  verificationCodeExpires: {
    type: Date,
    required: true,
    default: function() {
      return new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  resendCount: {
    type: Number,
    default: 0,
    max: 5
  },
  lastResendAt: {
    type: Date,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  // Auto-delete documents after 24 hours if not verified
  expires: 86400 // 24 hours in seconds
});

// Pre-save middleware to hash password
tempUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  // Validate password strength
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
tempUserSchema.methods.generateVerificationCode = function() {
  this.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  this.verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  return this.verificationCode;
};

tempUserSchema.methods.isVerificationCodeValid = function(code) {
  return this.verificationCode === code && this.verificationCodeExpires > new Date();
};

tempUserSchema.methods.canResendCode = function() {
  if (!this.lastResendAt) return true;
  
  const timeSinceLastResend = Date.now() - this.lastResendAt.getTime();
  const cooldownPeriod = 60 * 1000; // 1 minute
  
  return timeSinceLastResend > cooldownPeriod && this.resendCount < 5;
};

tempUserSchema.methods.markCodeAsResent = function() {
  this.resendCount += 1;
  this.lastResendAt = new Date();
  this.generateVerificationCode();
  return this.save();
};

// Static methods
tempUserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase().trim() });
};

tempUserSchema.statics.createTempUser = async function(userData, ipAddress = null, userAgent = null) {
  // Check if temp user already exists
  let tempUser = await this.findByEmail(userData.email);
  
  if (tempUser) {
    // Update existing temp user
    tempUser.firstName = userData.firstName;
    tempUser.lastName = userData.lastName;
    tempUser.password = userData.password;
    tempUser.ipAddress = ipAddress;
    tempUser.userAgent = userAgent;
    tempUser.isVerified = false;
    tempUser.resendCount = 0;
    tempUser.lastResendAt = null;
    tempUser.generateVerificationCode();
  } else {
    // Create new temp user
    tempUser = new this({
      ...userData,
      ipAddress,
      userAgent
    });
    tempUser.generateVerificationCode();
  }
  
  return await tempUser.save();
};

tempUserSchema.statics.verifyEmail = async function(email, code) {
  const tempUser = await this.findByEmail(email);
  
  if (!tempUser) {
    throw new Error('Verification request not found');
  }
  
  if (!tempUser.isVerificationCodeValid(code)) {
    throw new Error('Invalid or expired verification code');
  }
  
  tempUser.isVerified = true;
  await tempUser.save();
  
  return tempUser;
};

tempUserSchema.statics.cleanupExpired = async function() {
  const expiredTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
  return await this.deleteMany({
    $or: [
      { createdAt: { $lt: expiredTime } },
      { verificationCodeExpires: { $lt: new Date() }, isVerified: false }
    ]
  });
};

// Indexes
tempUserSchema.index({ email: 1 });
tempUserSchema.index({ verificationCodeExpires: 1 });
tempUserSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // TTL index

const TempUser = mongoose.models.TempUser || mongoose.model('TempUser', tempUserSchema);

export default TempUser;
