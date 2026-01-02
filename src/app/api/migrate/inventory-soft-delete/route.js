import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Inventory from '@/models/Inventory';
import { verifySession } from '@/lib/auth';

/**
 * Migration endpoint to add isDeleted field to existing inventory items
 * GET - Check how many items need migration
 * POST - Execute the migration
 */

export async function GET(request) {
  try {
    await connectToDatabase();
    
    // const user = await verifySession(request);
    // if (!user) {
    //   return NextResponse.json(
    //     { success: false, message: 'Not authenticated' },
    //     { status: 401 }
    //   );
    // }

    // Count items without isDeleted field
    const itemsWithoutField = await Inventory.countDocuments({
      isDeleted: { $exists: false }
    });

    // Count items with isDeleted field
    const itemsWithField = await Inventory.countDocuments({
      isDeleted: { $exists: true }
    });

    return NextResponse.json({
      success: true,
      data: {
        itemsNeedingMigration: itemsWithoutField,
        itemsAlreadyMigrated: itemsWithField,
        totalItems: itemsWithoutField + itemsWithField
      }
    });
  } catch (error) {
    console.error('Migration check error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();
    
    // const user = await verifySession(request);
    // if (!user) {
    //   return NextResponse.json(
    //     { success: false, message: 'Not authenticated' },
    //     { status: 401 }
    //   );
    // }

    // Update all items without isDeleted field
    const result = await Inventory.updateMany(
      { isDeleted: { $exists: false } },
      { 
        $set: { 
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          deletionReason: ''
        } 
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      data: {
        itemsUpdated: result.modifiedCount,
        itemsMatched: result.matchedCount
      }
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Migration failed',
        error: error.message
      },
      { status: 500 }
    );
  }
}
