import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },

  // Notification details
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error', 'inventory', 'system'],
    default: 'info'
  },
  
  // Related entity information
  relatedEntityType: {
    type: String,
    enum: ['inventory', 'order', 'user', 'subscription', 'system'],
    default: null
  },
  relatedEntityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },

  // Notification status
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },

  // Additional data
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Auto-dismiss settings
  autoDismiss: {
    type: Boolean,
    default: false
  },
  dismissAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Instance methods
notificationSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.readAt = new Date();
  return await this.save();
};

notificationSchema.methods.dismiss = async function() {
  this.dismissAt = new Date();
  return await this.save();
};

// Static methods
notificationSchema.statics.createNotification = async function(notificationData) {
  const notification = new this(notificationData);
  return await notification.save();
};

notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const { 
    page = 1, 
    limit = 20, 
    unreadOnly = false,
    type = null 
  } = options;

  const query = { 
    userId,
    dismissAt: null // Don't show dismissed notifications
  };
  
  if (unreadOnly) query.isRead = false;
  if (type) query.type = type;

  const skip = (page - 1) * limit;

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('relatedEntityId');
};

notificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    { userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({ 
    userId, 
    isRead: false, 
    dismissAt: null 
  });
};

// Indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ relatedEntityType: 1, relatedEntityId: 1 });

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

export default Notification;
