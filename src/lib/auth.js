import bcrypt from 'bcryptjs';
import connectToDatabase from './mongodb';
import Session from '@/models/Session';
import User from '@/models/User';

// Hash password
export async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Verify password
export async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

// Create user session
export async function createSession(userId, req, res) {
  await connectToDatabase();
  
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Store session in database
  await Session.createSession(userId, sessionId, expiresAt);

  // Set HTTP-only cookie
  res.headers.set('Set-Cookie', 
    `session=${sessionId}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`
  );

  return sessionId;
}

// Verify session
export async function verifySession(req) {
  await connectToDatabase();
  
  const cookies = parseCookies(req.headers.get('cookie') || '');
  const sessionId = cookies.session;

  if (!sessionId) {
    return null;
  }

  const session = await Session.findValidSession(sessionId);
  
  if (!session || !session.userId) {
    return null;
  }

  return session.userId;
}

// Delete session
export async function deleteSession(sessionId) {
  await connectToDatabase();
  await Session.deleteSession(sessionId);
}

// Helper functions
function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
  }
  return cookies;
}

// Validate email format
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate password strength
export function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasNonalphas = /\W/.test(password);

  return {
    isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasNonalphas,
    checks: {
      length: password.length >= minLength,
      upperCase: hasUpperCase,
      lowerCase: hasLowerCase,
      numbers: hasNumbers,
      specialChars: hasNonalphas,
    }
  };
}
