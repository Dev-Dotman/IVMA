import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';
import { verifySession } from '@/lib/auth';
import Store from '@/models/Store';
import User from '@/models/User';
import InventoryBatch from '@/models/InventoryBatch';
import Inventory from '@/models/Inventory';
import Customer from '@/models/Customer';

// GET - Fetch orders for the authenticated user's stores
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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const status = searchParams.get('status'); // Can be comma-separated: "pending,confirmed"
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const createdFrom = searchParams.get('createdFrom'); // Add date range support
    const createdTo = searchParams.get('createdTo');

    // Build query
    const query = {
      'items.seller': user._id
    };

    // Filter by status (support multiple statuses)
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      query.status = { $in: statuses };
    }

    // Filter by date range
    if (createdFrom || createdTo) {
      query.createdAt = {};
      if (createdFrom) {
        query.createdAt.$gte = new Date(createdFrom);
      }
      if (createdTo) {
        query.createdAt.$lte = new Date(createdTo);
      }
    }

    // Search by order number or customer name
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customerSnapshot.firstName': { $regex: search, $options: 'i' } },
        { 'customerSnapshot.lastName': { $regex: search, $options: 'i' } },
        { 'customerSnapshot.email': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await Order.countDocuments(query);

    // Fetch orders
    const orders = await Order.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate('customer', 'firstName lastName email phone')
      .populate('items.product', 'productName sku image')
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      },
      total // Add total at root level for easy access
    });

  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}
