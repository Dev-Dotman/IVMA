import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Sale from '@/models/Sale';
import { verifySession } from '@/lib/auth';

// GET - Fetch sales statistics
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

    // Debug: Check if we have any sales at all
    const totalSalesCount = await Sale.countDocuments({ 
      userId: user._id, 
      status: 'completed' 
    });
    
    console.log(`Total sales for user ${user._id}:`, totalSalesCount);

    // Get all stats in parallel
    const [overallStats, todayStats, weekStats, monthStats] = await Promise.all([
      Sale.getSalesStats(user._id, 'all'),
      Sale.getSalesStats(user._id, 'today'),
      Sale.getSalesStats(user._id, 'week'),
      Sale.getSalesStats(user._id, 'month')
    ]);

    console.log('Overall stats:', overallStats);
    console.log('Today stats:', todayStats);

    return NextResponse.json({
      success: true,
      data: {
        totalSales: overallStats.totalSales,
        totalRevenue: overallStats.totalRevenue,
        avgSaleAmount: overallStats.avgSaleAmount,
        totalItemsSold: overallStats.totalItemsSold,
        todaySales: todayStats.totalSales,
        todayRevenue: todayStats.totalRevenue,
        weekSales: weekStats.totalSales,
        weekRevenue: weekStats.totalRevenue,
        monthSales: monthStats.totalSales,
        monthRevenue: monthStats.totalRevenue
      }
    });

  } catch (error) {
    console.error('Sales stats fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
