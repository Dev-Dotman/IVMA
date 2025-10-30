import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TempUser from '@/models/TempUser';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(req) {
  try {
    await connectToDatabase();
    
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    const tempUser = await TempUser.findByEmail(email);
    
    if (!tempUser) {
      return NextResponse.json(
        { success: false, message: 'No verification request found for this email' },
        { status: 404 }
      );
    }

    if (!tempUser.canResendCode()) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Please wait before requesting another code. Maximum 5 attempts allowed.' 
        },
        { status: 429 }
      );
    }

    // Generate new code and update resend tracking
    await tempUser.markCodeAsResent();

    // Send new verification email
    const emailResult = await sendVerificationEmail(
      tempUser.email,
      tempUser.verificationCode,
      tempUser.firstName
    );

    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, message: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'New verification code sent to your email',
      data: {
        email: tempUser.email,
        expiresAt: tempUser.verificationCodeExpires,
        attemptsRemaining: 5 - tempUser.resendCount
      }
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
