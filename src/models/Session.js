import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  }
}, {
  timestamps: true
});

// Static methods
sessionSchema.statics.createSession = async function(userId, sessionId, expiresAt) {
  return await this.create({
    sessionId,
    userId,
    expiresAt
  });
};

sessionSchema.statics.findValidSession = function(sessionId) {
  return this.findOne({
    sessionId,
    expiresAt: { $gt: new Date() }
  }).populate('userId', '-password');
};

sessionSchema.statics.deleteSession = function(sessionId) {
  return this.deleteOne({ sessionId });
};

sessionSchema.statics.deleteUserSessions = function(userId) {
  return this.deleteMany({ userId });
};

const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);

export default Session;
