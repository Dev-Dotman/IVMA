import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Inventory from '@/models/Inventory';
import { verifySession } from '@/lib/auth';
import { ActivityTracker } from '@/lib/activityTracker';

// GET - Fetch specific inventory item
export async function GET(req, { params }) {
  try {
    await connectToDatabase();
    
    const user = await verifySession(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Find the inventory item by ID and ensure it belongs to the authenticated user
    const item = await Inventory.findOne({ _id: id, userId: user._id });

    if (!item) {
      return NextResponse.json(
        { success: false, message: 'Inventory item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: item
    });

  } catch (error) {
    console.error('Inventory item fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update specific inventory item
export async function PUT(req, { params }) {
  try {
    await connectToDatabase();
    
    const user = await verifySession(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const updateData = await req.json();

    // Remove fields that shouldn't be updated via this endpoint
    delete updateData.userId;
    delete updateData._id;
    delete updateData.createdAt;

    // Find the current item to track changes
    const currentItem = await Inventory.findOne({ _id: id, userId: user._id });
    if (!currentItem) {
      return NextResponse.json(
        { success: false, message: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // Track what changed
    const changes = {};
    const significantFields = ['productName', 'category', 'costPrice', 'sellingPrice', 'quantityInStock'];
    
    for (const field of significantFields) {
      if (updateData[field] !== undefined && updateData[field] !== currentItem[field]) {
        changes[field] = {
          from: currentItem[field],
          to: updateData[field]
        };
      }
    }

    // Update the item
    const item = await Inventory.findOneAndUpdate(
      { _id: id, userId: user._id },
      { ...updateData, lastUpdated: new Date() },
      { new: true, runValidators: true }
    );

    // Track the activity if there were changes
    if (Object.keys(changes).length > 0) {
      await ActivityTracker.trackInventoryUpdated(user._id, item, currentItem.toObject(), changes);
    }

    return NextResponse.json({
      success: true,
      message: 'Inventory item updated successfully',
      data: item
    });

  } catch (error) {
    console.error('Inventory item update error:', error);
    
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

// DELETE - Delete specific inventory item
export async function DELETE(req, { params }) {
  try {
    await connectToDatabase();
    
    const user = await verifySession(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Find and delete the inventory item
    const item = await Inventory.findOneAndDelete({ _id: id, userId: user._id });

    if (!item) {
      return NextResponse.json(
        { success: false, message: 'Inventory item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Inventory item deleted successfully'
    });

  } catch (error) {
    console.error('Inventory item delete error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
