import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TempUser from '@/models/TempUser';
import User from '@/models/User';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(req) {
  try {
    await connectToDatabase();
    
    const userData = await req.json();
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Check if user already exists in main User collection
    const existingUser = await User.findByEmail(userData.email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User already exists with this email' },
        { status: 409 }
      );
    }

    // Create temporary user
    const tempUser = await TempUser.createTempUser(userData, ipAddress, userAgent);

    // Send verification email
    await sendVerificationEmail(
      tempUser.email, 
      tempUser.verificationCode, 
      tempUser.firstName
    );

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
      data: {
        email: tempUser.email,
        expiresAt: tempUser.verificationCodeExpires,
        canResend: tempUser.canResendCode()
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { success: false, message: messages.join(', ') },
        { status: 400 }
      );
    }
    
    // Handle duplicate email error
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: 'A verification request already exists for this email' },
        { status: 409 }
      );
    }
    
    // Handle password validation error
    if (error.message.includes('security requirements')) {
      return NextResponse.json(
        { 
          success: false, 
          message: error.message,
          passwordChecks: error.details
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
