import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { verifyPassword, createSession, isValidEmail } from '@/lib/auth';
import User from '@/models/User';

export async function POST(req) {
  try {
    await connectToDatabase();
    
    const { email, password, rememberMe } = await req.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'No account found with this email address',
          errorType: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: 'Account is deactivated' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Invalid password' },
        { status: 401 }
      );
    }

    // Update last login
    await user.updateLastLogin();

    // Create session
    const response = NextResponse.json({
      success: true,
      message: 'Signed in successfully',
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin
      }
    });

    await createSession(user._id, req, response);

    return response;

  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
