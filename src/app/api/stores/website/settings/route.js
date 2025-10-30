import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Store from '@/models/Store';
import { verifySession } from '@/lib/auth';

// PUT - Update website settings
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
    
    // Find the store
    const store = await Store.findOne({ userId: user._id, isActive: true });
    if (!store) {
      return NextResponse.json(
        { success: false, message: 'Store not found' },
        { status: 404 }
      );
    }

    // Update the store with new website settings
    const updatedStore = await Store.findOneAndUpdate(
      { userId: user._id, isActive: true },
      { 
        $set: updateData,
        $inc: { __v: 1 } // Increment version for optimistic locking
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Website settings updated successfully',
      data: updatedStore
    });

  } catch (error) {
    console.error('Website settings update error:', error);
    
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
