import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TempUser from '@/models/TempUser';
import User from '@/models/User';
import Subscription from '@/models/Subscription';
import { createSession } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(req) {
  try {
    await connectToDatabase();
    
    const { email, verificationCode } = await req.json();

    if (!email || !verificationCode) {
      return NextResponse.json(
        { success: false, message: 'Email and verification code are required' },
        { status: 400 }
      );
    }

    // Verify the code and get temp user
    const tempUser = await TempUser.verifyEmail(email, verificationCode);

    // Create permanent user using direct insert to avoid middleware
    const userDoc = {
      firstName: tempUser.firstName,
      lastName: tempUser.lastName,
      email: tempUser.email,
      password: tempUser.password, // Already hashed
      isActive: true,
      isSubscribed: false,
      dateSubscribed: null,
      currentSubscription: null,
      subscriptionHistory: [],
      role: 'user',
      preferences: {},
      avatar: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await User.collection.insertOne(userDoc);
    const newUser = await User.findById(result.insertedId);

    // Create trial subscription
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    const trialSubscription = await Subscription.createSubscription({
      userId: newUser._id,
      planType: 'free',
      planName: 'Trial Plan - Full Access',
      status: 'trial',
      billingCycle: 'trial',
      price: { amount: 0, currency: 'USD' },
      startDate: new Date(),
      endDate: trialEndDate,
      trialPeriod: {
        isTrialPeriod: true,
        trialStartDate: new Date(),
        trialEndDate: trialEndDate
      },
      paymentMethod: { type: 'free' },
      features: [
        { name: 'real_time_stock_tracking', description: 'Real-time stock tracking', limit: null, enabled: true },
        { name: 'advanced_reporting', description: 'Advanced reporting and analytics', limit: null, enabled: true },
        { name: 'free_website', description: 'Free website with inventory sync', limit: null, enabled: true },
        { name: 'whatsapp_checkout', description: 'WhatsApp checkout integration', limit: null, enabled: true },
        { name: 'ai_reports', description: 'Weekly AI reports & insights', limit: null, enabled: true },
        { name: 'unlimited_users', description: 'Unlimited individual users', limit: null, enabled: true },
        { name: 'stock_alerts', description: 'Low-stock alerts & notifications', limit: null, enabled: true },
        { name: 'purchase_orders', description: 'Purchase order management', limit: null, enabled: true },
        { name: 'multi_location', description: 'Multi-location support', limit: null, enabled: true },
        { name: 'cloud_backup', description: 'Cloud backup & security', limit: null, enabled: true },
        { name: 'priority_support', description: '24/7 priority support', limit: null, enabled: true }
      ],
      usage: {
        inventoryItems: { used: 0, limit: null },
        users: { used: 1, limit: null },
        storage: { used: 0, limit: null },
        apiCalls: { used: 0, limit: null, resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        locations: { used: 0, limit: null },
        websites: { used: 0, limit: 1 }
      },
      autoRenew: false,
      notes: 'Full-featured trial subscription - all premium features included'
    });

    // Update user with subscription info using Mongoose methods
    newUser.isSubscribed = true;
    newUser.dateSubscribed = new Date();
    newUser.currentSubscription = trialSubscription._id;
    newUser.subscriptionHistory.push(trialSubscription._id);
    await newUser.save();

    // Clean up temp user
    await TempUser.findByIdAndDelete(tempUser._id);

    // Send welcome email
    await sendWelcomeEmail(newUser.email, newUser.firstName);

    // Create session
    const response = NextResponse.json({
      success: true,
      message: 'Email verified successfully! Welcome to IVMA!',
      user: {
        _id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
        isSubscribed: newUser.isSubscribed,
        dateSubscribed: newUser.dateSubscribed,
        currentSubscription: newUser.currentSubscription,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt
      }
    });

    await createSession(newUser._id, req, response);

    return response;

  } catch (error) {
    console.error('Email verification error:', error);
    
    if (error.message.includes('not found') || error.message.includes('Invalid or expired')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
