import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';
import { verifySession } from '@/lib/auth';

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
    const limit = parseInt(searchParams.get('limit')) || 20;
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const search = searchParams.get('search');

    // Build optimized query
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
        { 'customerSnapshot.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    // Use Promise.all to fetch orders and stats in parallel
    const [orders, total, stats] = await Promise.all([
      // Fetch paginated orders with lean() for better performance
      Order.find(query)
        .select('-timeline -__v') // Exclude heavy fields
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),

      // Get total count
      Order.countDocuments(query).exec(),

      // Calculate stats using aggregation (more efficient)
      Order.aggregate([
        { $match: { 'items.seller': user._id } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            pendingOrders: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['pending', 'confirmed']] },
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
            // Revenue from orders that are NOT pending/confirmed/cancelled AND have completed payment
            totalRevenue: {
              $sum: {
                $cond: [
                  { 
                    $or: [
                      // Option 1: Payment completed AND not pending/confirmed/cancelled
                      {
                        $and: [
                          { $eq: ['$paymentInfo.status', 'completed'] },
                          { 
                            $not: { 
                              $in: ['$status', ['pending', 'confirmed', 'cancelled']] 
                            }
                          }
                        ]
                      },
                      // Option 2: Status is processed (already delivered/completed)
                      { $in: ['$status', ['processed', 'shipped', 'delivered']] }
                    ]
                  },
                  '$totalAmount',
                  0
                ]
              }
            }
          }
        }
      ]).exec()
    ]);

    // Debug log to check what's being calculated
    console.log('Revenue Calculation Debug:', {
      statsResult: stats[0],
      sampleOrder: orders[0] ? {
        status: orders[0].status,
        paymentStatus: orders[0].paymentInfo?.status,
        totalAmount: orders[0].totalAmount
      } : null
    });

    return NextResponse.json({
      success: true,
      data: {
        orders,
        stats: stats[0] || {
          totalOrders: 0,
          pendingOrders: 0,
          completedOrders: 0,
          totalRevenue: 0
        },
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit,
          hasMore: page < Math.ceil(total / limit)
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
