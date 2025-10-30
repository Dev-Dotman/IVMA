import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Store from '@/models/Store';
import { verifySession } from '@/lib/auth';

// GET - Get user's store
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

    const store = await Store.findByUser(user._id);

    return NextResponse.json({
      success: true,
      data: store,
      hasStore: !!store
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
    const existingStore = await Store.findByUser(user._id);
    if (existingStore) {
      return NextResponse.json(
        { success: false, message: 'You already have a store' },
        { status: 409 }
      );
    }

    const storeData = await req.json();

    // Add userId to store data
    const store = await Store.createStore({
      ...storeData,
      userId: user._id
    });

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
        { success: false, message: 'You already have a store' },
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
    
    // Remove fields that shouldn't be updated via this endpoint
    delete updateData.userId;
    delete updateData._id;
    delete updateData.createdAt;

    const store = await Store.findOneAndUpdate(
      { userId: user._id },
      { ...updateData, updatedAt: new Date() },
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
      message: 'Store updated successfully',
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
