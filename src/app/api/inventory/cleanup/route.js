import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Inventory from '@/models/Inventory';
import InventoryBatch from '@/models/InventoryBatch';
import ItemSale from '@/models/ItemSale';
import Order from '@/models/Order';
import { verifySession } from '@/lib/auth';
import { ActivityTracker } from '@/lib/activityTracker';

// POST - Cleanup job to permanently delete items soft-deleted for more than 30 days
export async function POST(req) {
  try {
    await connectToDatabase();
    
    const user = await verifySession(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find items that have been soft-deleted for more than 30 days
    const itemsToDelete = await Inventory.find({
      userId: user._id,
      isDeleted: true,
      deletedAt: { $lte: thirtyDaysAgo }
    });

    if (itemsToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No items eligible for permanent deletion',
        count: 0
      });
    }

    const deletionResults = {
      success: [],
      failed: [],
      skipped: []
    };

    // Process each item
    for (const item of itemsToDelete) {
      try {
        const itemId = item._id.toString();

        // Final check: ensure no sales or orders exist
        const [salesCount, ordersCount] = await Promise.all([
          ItemSale.countDocuments({ inventoryId: itemId }),
          Order.countDocuments({ 'items.product': itemId })
        ]);

        if (salesCount > 0 || ordersCount > 0) {
          // Skip items with transaction history
          deletionResults.skipped.push({
            itemId: itemId,
            productName: item.productName,
            sku: item.sku,
            reason: `Has transaction history (${salesCount} sales, ${ordersCount} orders)`,
            dependencies: {
              sales: salesCount,
              orders: ordersCount
            }
          });
          continue;
        }

        // Delete all associated batches
        await InventoryBatch.deleteMany({ productId: itemId });

        // Delete the item
        await Inventory.findByIdAndDelete(itemId);

        // Log activity
        await ActivityTracker.logActivity({
          userId: user._id,
          itemId: itemId,
          action: 'item_auto_deleted',
          actionType: 'delete',
          details: {
            productName: item.productName,
            sku: item.sku,
            deletedAt: item.deletedAt,
            autoDeletedAt: new Date(),
            retentionPeriod: '30 days'
          }
        });

        deletionResults.success.push({
          itemId: itemId,
          productName: item.productName,
          sku: item.sku,
          originalDeletionDate: item.deletedAt,
          permanentDeletionDate: new Date()
        });

      } catch (error) {
        console.error(`Failed to delete item ${item._id}:`, error);
        deletionResults.failed.push({
          itemId: item._id.toString(),
          productName: item.productName,
          sku: item.sku,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed: ${deletionResults.success.length} deleted, ${deletionResults.skipped.length} skipped, ${deletionResults.failed.length} failed`,
      results: deletionResults,
      summary: {
        totalProcessed: itemsToDelete.length,
        successfullyDeleted: deletionResults.success.length,
        skipped: deletionResults.skipped.length,
        failed: deletionResults.failed.length
      }
    });

  } catch (error) {
    console.error('Cleanup job error:', error);
    return NextResponse.json(
      { success: false, message: 'Cleanup job failed', error: error.message },
      { status: 500 }
    );
  }
}

// GET - Preview items that will be deleted in cleanup
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

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find items that have been soft-deleted for more than 30 days
    const eligibleItems = await Inventory.find({
      userId: user._id,
      isDeleted: true,
      deletedAt: { $lte: thirtyDaysAgo }
    }).select('productName sku category deletedAt deletionReason');

    // Get dependency counts for each item
    const itemsWithDependencies = await Promise.all(
      eligibleItems.map(async (item) => {
        const [salesCount, batchesCount, ordersCount] = await Promise.all([
          ItemSale.countDocuments({ inventoryId: item._id }),
          InventoryBatch.countDocuments({ productId: item._id }),
          Order.countDocuments({ 'items.product': item._id })
        ]);

        return {
          itemId: item._id,
          productName: item.productName,
          sku: item.sku,
          category: item.category,
          deletedAt: item.deletedAt,
          deletionReason: item.deletionReason,
          daysSinceDeletion: Math.floor((Date.now() - new Date(item.deletedAt)) / (1000 * 60 * 60 * 24)),
          canBeDeleted: salesCount === 0 && ordersCount === 0,
          dependencies: {
            sales: salesCount,
            batches: batchesCount,
            orders: ordersCount
          }
        };
      })
    );

    const canDelete = itemsWithDependencies.filter(item => item.canBeDeleted);
    const cannotDelete = itemsWithDependencies.filter(item => !item.canBeDeleted);

    return NextResponse.json({
      success: true,
      summary: {
        totalEligible: eligibleItems.length,
        canBeDeleted: canDelete.length,
        cannotBeDeleted: cannotDelete.length
      },
      items: {
        canDelete: canDelete,
        cannotDelete: cannotDelete
      }
    });

  } catch (error) {
    console.error('Preview cleanup error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to preview cleanup', error: error.message },
      { status: 500 }
    );
  }
}
