import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';
import { verifySession } from '@/lib/auth';


export async function GET(request) {
  try {
    // Verify authentication
    const user = await verifySession(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Use aggregation to calculate stats - same logic as orders route
    const stats = await Order.aggregate([
      { $match: { 'items.seller': user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          pendingOrders: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'pending'] },
                1,
                0
              ]
            }
          },
          confirmedOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0]
            }
          },
          processingOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', 'processing'] }, 1, 0]
            }
          },
          shippedOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0]
            }
          },
          deliveredOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0]
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
          },
          refundedOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0]
            }
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { 
                  $or: [
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
    ]);

    const statsData = stats[0] || {
      totalOrders: 0,
      pendingOrders: 0,
      confirmedOrders: 0,
      processingOrders: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      refundedOrders: 0,
      totalRevenue: 0
    };

    return NextResponse.json({
      success: true,
      stats: statsData
    });

  } catch (error) {
    console.error('Error fetching order stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order statistics' },
      { status: 500 }
    );
  }
}
