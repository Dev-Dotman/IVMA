import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { verifySession } from '@/lib/auth';
import { ActivityTracker } from '@/lib/activityTracker';

// GET - Fetch activities for specific inventory item
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
    const { searchParams } = new URL(req.url);
    
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const activityType = searchParams.get('activityType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get activities
    const activities = await ActivityTracker.getInventoryActivityHistory(inventoryId, {
      page,
      limit,
      activityType,
      startDate,
      endDate
    });

    // Get activity statistics
    const stats = await ActivityTracker.getActivityStats(inventoryId);

    return NextResponse.json({
      success: true,
      data: {
        activities,
        stats,
        pagination: {
          page,
          limit,
          total: activities.length
        }
      }
    });

  } catch (error) {
    console.error('Activity fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
