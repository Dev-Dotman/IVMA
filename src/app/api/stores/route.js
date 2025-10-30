import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Store from '@/models/Store';
import { verifySession } from '@/lib/auth';

// GET - Fetch user's store
export async function GET(req) {
  try {
    await connectToDatabase();
    
    const user = await verifySession(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const store = await Store.getStoreByUser(user._id);

    if (!store) {
      return NextResponse.json({
        success: true,
        hasStore: false,
        message: 'No store found for user'
      });
    }

    return NextResponse.json({
      success: true,
      hasStore: true,
      data: store
    });

  } catch (error) {
    console.error('Store fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new store
export async function POST(req) {
  try {
    await connectToDatabase();
    
    const user = await verifySession(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user already has a store
    const existingStore = await Store.findOne({ userId: user._id });
    if (existingStore) {
      return NextResponse.json(
        { success: false, message: 'User already has a store' },
        { status: 409 }
      );
    }

    const storeData = await req.json();
    
    // Add userId to store data and ensure storeType is included
    const newStoreData = {
      ...storeData,
      userId: user._id,
      storeType: storeData.storeType || 'physical' // Default to physical if not specified
    };

    const store = await Store.createStore(newStoreData);

    return NextResponse.json({
      success: true,
      message: 'Store created successfully',
      data: store
    });

  } catch (error) {
    console.error('Store creation error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { success: false, message: messages.join(', ') },
        { status: 400 }
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: 'User already has a store' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update store
export async function PUT(req) {
  try {
    await connectToDatabase();
    
    const user = await verifySession(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const updateData = await req.json();
    
    // Remove fields that shouldn't be updated directly
    delete updateData.userId;
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.totalSales;
    delete updateData.totalRevenue;

    // Special handling for store type changes
    if (updateData.storeType === 'physical' && updateData.address) {
      // Ensure required fields for physical stores
      if (!updateData.address.city || !updateData.address.state) {
        return NextResponse.json(
          { success: false, message: 'City and state are required for physical stores' },
          { status: 400 }
        );
      }
    }

    const store = await Store.findOneAndUpdate(
      { userId: user._id, isActive: true },
      { ...updateData, setupCompleted: true },
      { new: true, runValidators: true }
    );

    if (!store) {
      return NextResponse.json(
        { success: false, message: 'Store not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: updateData.storeType === 'physical' 
        ? 'Store converted to physical store successfully'
        : 'Store updated successfully',
      data: store
    });

  } catch (error) {
    console.error('Store update error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { success: false, message: messages.join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
