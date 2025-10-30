import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import ItemSale from '@/models/ItemSale';
import { verifySession } from '@/lib/auth';

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

    const { id: inventoryId } = await params;

    if (!inventoryId) {
      return NextResponse.json(
        { success: false, message: 'Inventory ID is required' },
        { status: 400 }
      );
    }

    // Validate if inventoryId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(inventoryId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid inventory ID format' },
        { status: 400 }
      );
    }

    // Get comprehensive sales analytics for this inventory item
    const salesAnalytics = await ItemSale.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(user._id),
          inventoryId: new mongoose.Types.ObjectId(inventoryId),
          status: { $in: ['completed', 'partially_refunded'] }
        }
      },
      {
        $group: {
          _id: null,
          totalQuantitySold: { $sum: '$quantitySold' },
          totalRevenue: { $sum: '$totalSaleAmount' },
          totalProfit: { $sum: { $subtract: ['$totalSaleAmount', '$totalCostAmount'] } },
          salesCount: { $sum: 1 },
          averageUnitPrice: { $avg: '$unitSalePrice' },
          minUnitPrice: { $min: '$unitSalePrice' },
          maxUnitPrice: { $max: '$unitSalePrice' },
          lastSaleDate: { $max: '$saleDate' },
          firstSaleDate: { $min: '$saleDate' },
          totalRefunded: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'partially_refunded'] },
                '$refundInfo.refundAmount',
                0
              ]
            }
          }
        }
      }
    ]);

    // Get monthly sales trend
    const monthlySales = await ItemSale.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(user._id),
          inventoryId: new mongoose.Types.ObjectId(inventoryId),
          status: { $in: ['completed', 'partially_refunded'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$saleDate' },
            month: { $month: '$saleDate' }
          },
          quantitySold: { $sum: '$quantitySold' },
          revenue: { $sum: '$totalSaleAmount' },
          salesCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $limit: 12 // Last 12 months
      }
    ]);

    // Get payment method breakdown
    const paymentMethodBreakdown = await ItemSale.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(user._id),
          inventoryId: new mongoose.Types.ObjectId(inventoryId),
          status: { $in: ['completed', 'partially_refunded'] }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          quantitySold: { $sum: '$quantitySold' },
          revenue: { $sum: '$totalSaleAmount' },
          salesCount: { $sum: 1 }
        }
      }
    ]);

    // Get recent sales transactions
    const recentSales = await ItemSale.find({
      userId: user._id,
      inventoryId: inventoryId,
      status: { $in: ['completed', 'partially_refunded'] }
    })
    .sort({ saleDate: -1 })
    .limit(10)
    .select('quantitySold unitSalePrice totalSaleAmount paymentMethod saleDate customer.name')
    .lean();

    const analytics = salesAnalytics[0] || {
      totalQuantitySold: 0,
      totalRevenue: 0,
      totalProfit: 0,
      salesCount: 0,
      averageUnitPrice: 0,
      minUnitPrice: 0,
      maxUnitPrice: 0,
      lastSaleDate: null,
      firstSaleDate: null,
      totalRefunded: 0
    };

    // Calculate additional metrics
    const netRevenue = analytics.totalRevenue - analytics.totalRefunded;
    const averageTransactionValue = analytics.salesCount > 0 ? analytics.totalRevenue / analytics.salesCount : 0;
    const averageQuantityPerSale = analytics.salesCount > 0 ? analytics.totalQuantitySold / analytics.salesCount : 0;

    return NextResponse.json({
      success: true,
      data: {
        ...analytics,
        netRevenue,
        averageTransactionValue,
        averageQuantityPerSale,
        monthlySales,
        paymentMethodBreakdown,
        recentSales,
        hasSalesData: analytics.salesCount > 0
      }
    });

  } catch (error) {
    console.error('Sales analytics fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
