import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';
import { verifySession } from '@/lib/auth';
import Store from '@/models/Store';
import User from '@/models/User';
import InventoryBatch from '@/models/InventoryBatch';
import Inventory from '@/models/Inventory';

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
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;

    // Build query - find orders for items from user's stores
    const query = {
      'items.seller': user._id
    };

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query['paymentInfo.status'] = paymentStatus;
    }

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customerSnapshot.email': { $regex: search, $options: 'i' } },
        { 'customerSnapshot.firstName': { $regex: search, $options: 'i' } },
        { 'customerSnapshot.lastName': { $regex: search, $options: 'i' } },
        { 'items.productSnapshot.productName': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    // Fetch orders with basic population
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'items.store',
        select: 'storeName storePhone storeEmail'
      })
      .populate({
        path: 'items.product',
        select: 'productName sku image category'
      })
      .lean(); // Use lean() for better performance

    // Get order statistics with proper error handling
    let stats = {
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0
    };

    try {
      const statsAggregation = await Order.aggregate([
        { $match: { 'items.seller': user._id } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            pendingOrders: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['pending', 'confirmed', 'processing']] },
                  1,
                  0
                ]
              }
            },
            completedOrders: {
              $sum: {
                $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0]
              }
            },
            cancelledOrders: {
              $sum: {
                $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0]
              }
            }
          }
        }
      ]);

      if (statsAggregation.length > 0) {
        stats = statsAggregation[0];
      }
    } catch (statsError) {
      console.error('Error fetching order stats:', statsError);
      // Continue with default stats if aggregation fails
    }

    return NextResponse.json({
      success: true,
      data: {
        orders,
        stats,
        pagination: {
          page,
          limit,
          total: orders.length
        }
      }
    });

  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
