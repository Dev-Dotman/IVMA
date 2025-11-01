import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import DeliverySchedule from '@/models/DeliverySchedule';
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

    // Get today's deliveries
    const todayDeliveries = await DeliverySchedule.getTodayDeliveries(user._id);
    
    // Get overdue deliveries
    const overdueDeliveries = await DeliverySchedule.getOverdueDeliveries(user._id);
    
    // Get scheduled deliveries
    const scheduledDeliveries = await DeliverySchedule.find({
      userId: user._id,
      status: 'scheduled'
    });
    
    // Get completed deliveries this month
    const thisMonth = new Date();
    const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
    const endOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0);
    
    const completedDeliveries = await DeliverySchedule.find({
      userId: user._id,
      status: 'delivered',
      deliveredAt: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    });

    const stats = {
      todayDeliveries: todayDeliveries.length,
      overdueDeliveries: overdueDeliveries.length,
      scheduledDeliveries: scheduledDeliveries.length,
      completedDeliveries: completedDeliveries.length,
      totalRevenue: completedDeliveries.reduce((sum, delivery) => sum + delivery.totalAmount, 0)
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Delivery stats error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
