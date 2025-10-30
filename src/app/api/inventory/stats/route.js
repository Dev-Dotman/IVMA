import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Inventory from '@/models/Inventory';
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

    const stats = await Inventory.getInventoryStats(user._id);
    const categoryStats = await Inventory.getCategorySummary(user._id);
    const lowStockItems = await Inventory.getLowStockItems(user._id);
    const outOfStockItems = await Inventory.getOutOfStockItems(user._id);

    return NextResponse.json({
      success: true,
      data: {
        overview: stats,
        categories: categoryStats,
        lowStock: lowStockItems,
        outOfStock: outOfStockItems
      }
    });

  } catch (error) {
    console.error('Inventory stats error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
