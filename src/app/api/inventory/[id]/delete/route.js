import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Inventory from '@/models/Inventory';
import InventoryBatch from '@/models/InventoryBatch';
import ItemSale from '@/models/ItemSale';
import Order from '@/models/Order';
import { verifySession } from '@/lib/auth';
import { ActivityTracker } from '@/lib/activityTracker';

// DELETE - Delete/Archive inventory item (Hybrid approach with 30-day retention)
export async function DELETE(req, { params }) {
  try {
    await connectToDatabase();
    
    const user = await verifySession(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true'; // Force permanent deletion
    const reason = searchParams.get('reason') || 'No reason provided';

    // Find the item
    const item = await Inventory.findOne({ _id: id, userId: user._id });
    if (!item) {
      return NextResponse.json(
        { success: false, message: 'Item not found' },
        { status: 404 }
      );
    }

    // If item is already soft-deleted, check if 30 days have passed
    if (item.isDeleted) {
      const daysSinceDeletion = Math.floor((Date.now() - new Date(item.deletedAt)) / (1000 * 60 * 60 * 24));
      
      if (force || daysSinceDeletion >= 30) {
        // Permanently delete after 30 days or if forced
        return await permanentlyDeleteItem(item, user._id);
      } else {
        return NextResponse.json({
          success: false,
          message: `Item is already deleted. It will be permanently removed after 30 days (${30 - daysSinceDeletion} days remaining). Use force=true to delete immediately.`,
          daysRemaining: 30 - daysSinceDeletion
        }, { status: 400 });
      }
    }

    // Check for dependencies (sales, batches, orders)
    const [salesCount, activeBatchesCount, ordersCount] = await Promise.all([
      ItemSale.countDocuments({ inventoryId: id }),
      InventoryBatch.countDocuments({ 
        productId: id,
        $or: [
          { quantitySold: { $gt: 0 } },
          { quantityRemaining: { $gt: 0 } }
        ]
      }),
      Order.countDocuments({ 'items.product': id })
    ]);

    const hasDependencies = salesCount > 0 || activeBatchesCount > 0 || ordersCount > 0;

    if (hasDependencies || !force) {
      // SOFT DELETE - Archive the item
      item.isDeleted = true;
      item.deletedAt = new Date();
      item.deletedBy = user._id;
      item.deletionReason = reason;
      item.status = 'Discontinued';
      await item.save({ validateBeforeSave: false });

      // Archive all batches
      await InventoryBatch.updateMany(
        { productId: id },
        { 
          $set: { 
            status: 'archived',
            archivedAt: new Date()
          } 
        }
      );

      // Log activity
      await ActivityTracker.trackInventoryActivity({
        userId: user._id,
        inventoryId: id,
        activityType: 'deleted',
        description: `Archived item: ${item.productName}`,
        metadata: {
          reason: reason,
          dependencies: {
            sales: salesCount,
            batches: activeBatchesCount,
            orders: ordersCount
          }
        }
      });

      return NextResponse.json({
        success: true,
        type: 'soft_delete',
        message: `Item archived successfully. ${hasDependencies ? `Item has transaction history (${salesCount} sales, ${activeBatchesCount} batches, ${ordersCount} orders).` : ''} It will be permanently deleted after 30 days.`,
        data: {
          itemId: id,
          deletedAt: item.deletedAt,
          permanentDeletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          dependencies: {
            sales: salesCount,
            batches: activeBatchesCount,
            orders: ordersCount
          }
        }
      });

    } else {
      // No dependencies and force flag - allow immediate permanent deletion
      return await permanentlyDeleteItem(item, user._id, reason);
    }

  } catch (error) {
    console.error('Delete inventory error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete item', error: error.message },
      { status: 500 }
    );
  }
}

// Helper function for permanent deletion
async function permanentlyDeleteItem(item, userId, reason = '') {
  try {
    const itemId = item._id;
    const itemData = {
      productName: item.productName,
      sku: item.sku,
      category: item.category
    };

    // Check one more time for any dependencies
    const [salesCount, ordersCount] = await Promise.all([
      ItemSale.countDocuments({ inventoryId: itemId }),
      Order.countDocuments({ 'items.product': itemId })
    ]);

    if (salesCount > 0 || ordersCount > 0) {
      return NextResponse.json({
        success: false,
        message: `Cannot permanently delete: Item still has transaction history (${salesCount} sales, ${ordersCount} orders). These records must be preserved.`,
        dependencies: {
          sales: salesCount,
          orders: ordersCount
        }
      }, { status: 400 });
    }

    // Delete all batches (only if no sales history)
    await InventoryBatch.deleteMany({ productId: itemId });

    // Delete images from cloud storage (implement your cloud storage deletion)
    // if (item.images && item.images.length > 0) {
    //   for (const image of item.images) {
    //     await deleteFromWasabi(image.url);
    //   }
    // }

    // Delete the inventory item
    await Inventory.findByIdAndDelete(itemId);

    // Log activity
    await ActivityTracker.logActivity({
      userId: userId,
      itemId: itemId,
      action: 'item_permanently_deleted',
      actionType: 'delete',
      details: {
        ...itemData,
        reason: reason || 'Permanent deletion after 30-day retention period'
      }
    });

    return NextResponse.json({
      success: true,
      type: 'hard_delete',
      message: 'Item permanently deleted successfully',
      data: {
        itemId: itemId,
        productName: itemData.productName,
        deletedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Permanent deletion error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to permanently delete item', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Restore a soft-deleted item
export async function POST(req, { params }) {
  try {
    await connectToDatabase();
    
    const user = await verifySession(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Find the deleted item
    const item = await Inventory.findOne({ _id: id, userId: user._id, isDeleted: true });
    if (!item) {
      return NextResponse.json(
        { success: false, message: 'Deleted item not found' },
        { status: 404 }
      );
    }

    // Check if 30 days have passed
    const daysSinceDeletion = Math.floor((Date.now() - new Date(item.deletedAt)) / (1000 * 60 * 60 * 24));
    if (daysSinceDeletion >= 30) {
      return NextResponse.json({
        success: false,
        message: 'Cannot restore: Item has been deleted for more than 30 days and is scheduled for permanent deletion'
      }, { status: 400 });
    }

    // Restore the item
    item.isDeleted = false;
    item.deletedAt = null;
    item.deletedBy = null;
    item.deletionReason = '';
    item.status = 'Active';
    await item.save();

    // Restore archived batches
    await InventoryBatch.updateMany(
      { productId: id, status: 'archived' },
      { 
        $set: { 
          status: 'active'
        },
        $unset: {
          archivedAt: 1
        }
      }
    );

    // Log activity
    await ActivityTracker.logActivity({
      userId: user._id,
      itemId: id,
      action: 'item_restored',
      actionType: 'update',
      details: {
        productName: item.productName,
        sku: item.sku,
        restoredAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Item restored successfully',
      data: item
    });

  } catch (error) {
    console.error('Restore item error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to restore item', error: error.message },
      { status: 500 }
    );
  }
}
