import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';
import { verifySession } from '@/lib/auth';

// GET - Fetch specific order by ID
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

    // Find the order and verify user has permission to view it
    const order = await Order.findOne({
      _id: id,
      'items.seller': user._id
    })
    .populate({
      path: 'items.store',
      select: 'storeName storePhone storeEmail'
    })
    .populate({
      path: 'items.product',
      select: 'productName sku image category'
    })
    .lean();

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Order fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
