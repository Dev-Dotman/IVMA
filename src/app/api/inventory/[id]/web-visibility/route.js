import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Inventory from '@/models/Inventory';
import { verifySession } from '@/lib/auth';

// PUT - Update web visibility for specific inventory item
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
    const { webVisibility } = await req.json();

    // Validate and normalize the webVisibility value
    if (typeof webVisibility !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'webVisibility must be a boolean value' },
        { status: 400 }
      );
    }

    // Find and update the inventory item
    const item = await Inventory.findOneAndUpdate(
      { _id: id, userId: user._id },
      { 
        webVisibility: Boolean(webVisibility), // Ensure it's explicitly a boolean
        lastUpdated: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!item) {
      return NextResponse.json(
        { success: false, message: 'Inventory item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Product ${webVisibility ? 'shown on' : 'hidden from'} website`,
      data: {
        ...item.toObject(),
        webVisibility: Boolean(item.webVisibility) // Ensure response has explicit boolean
      }
    });

  } catch (error) {
    console.error('Web visibility update error:', error);
    
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
