import InventoryActivity from '@/models/InventoryActivity';
import Notification from '@/models/Notification';

export class ActivityTracker {
  static async trackInventoryCreated(userId, inventory, metadata = {}) {
    const activityData = {
      userId,
      inventoryId: inventory._id,
      activityType: 'created',
      description: `Created new inventory item: ${inventory.productName}`,
      newValues: {
        productName: inventory.productName,
        category: inventory.category,
        quantityInStock: inventory.quantityInStock,
        costPrice: inventory.costPrice,
        sellingPrice: inventory.sellingPrice
      },
      metadata
    };

    const activity = await InventoryActivity.createActivity(activityData);

    // Create notification
    await Notification.createNotification({
      userId,
      title: 'New Item Added',
      message: `Successfully added ${inventory.productName} to inventory`,
      type: 'success',
      relatedEntityType: 'inventory',
      relatedEntityId: inventory._id,
      data: { inventoryId: inventory._id, productName: inventory.productName }
    });

    return activity;
  }

  static async trackInventoryUpdated(userId, inventory, previousData, changes, metadata = {}) {
    const activityData = {
      userId,
      inventoryId: inventory._id,
      activityType: 'updated',
      description: `Updated inventory item: ${inventory.productName}`,
      changes,
      previousValues: previousData,
      newValues: {
        productName: inventory.productName,
        category: inventory.category,
        quantityInStock: inventory.quantityInStock,
        costPrice: inventory.costPrice,
        sellingPrice: inventory.sellingPrice
      },
      metadata
    };

    const activity = await InventoryActivity.createActivity(activityData);

    // Create notification for significant changes
    const significantChanges = ['productName', 'category', 'costPrice', 'sellingPrice'];
    const hasSignificantChanges = Object.keys(changes).some(key => significantChanges.includes(key));

    if (hasSignificantChanges) {
      await Notification.createNotification({
        userId,
        title: 'Item Updated',
        message: `Updated ${inventory.productName} information`,
        type: 'info',
        relatedEntityType: 'inventory',
        relatedEntityId: inventory._id,
        data: { inventoryId: inventory._id, changes }
      });
    }

    return activity;
  }

  static async trackStockMovement(userId, inventory, movementData, metadata = {}) {
    const { type, quantity, reason, previousStock, newStock } = movementData;
    
    const activityData = {
      userId,
      inventoryId: inventory._id,
      activityType: type === 'add' ? 'stock_added' : 'stock_removed',
      description: `${type === 'add' ? 'Added' : 'Removed'} ${quantity} ${inventory.unitOfMeasure} ${type === 'add' ? 'to' : 'from'} ${inventory.productName}. Reason: ${reason}`,
      stockMovement: {
        type,
        quantity,
        reason,
        previousStock,
        newStock
      },
      changes: {
        quantityInStock: { from: previousStock, to: newStock }
      },
      metadata
    };

    const activity = await InventoryActivity.createActivity(activityData);

    // Create notification for stock alerts
    let notificationType = 'info';
    let title = 'Stock Updated';
    let message = `${type === 'add' ? 'Added' : 'Removed'} ${quantity} ${inventory.unitOfMeasure} ${type === 'add' ? 'to' : 'from'} ${inventory.productName}`;

    // Check for low stock or out of stock
    if (newStock === 0) {
      notificationType = 'error';
      title = 'Out of Stock Alert';
      message = `${inventory.productName} is now out of stock!`;
    } else if (newStock <= inventory.reorderLevel) {
      notificationType = 'warning';
      title = 'Low Stock Alert';
      message = `${inventory.productName} is running low (${newStock} ${inventory.unitOfMeasure} remaining)`;
    }

    await Notification.createNotification({
      userId,
      title,
      message,
      type: notificationType,
      relatedEntityType: 'inventory',
      relatedEntityId: inventory._id,
      data: { 
        inventoryId: inventory._id, 
        stockMovement: movementData,
        stockLevel: newStock,
        reorderLevel: inventory.reorderLevel
      }
    });

    return activity;
  }

  static async trackPriceUpdate(userId, inventory, priceChanges, metadata = {}) {
    const activityData = {
      userId,
      inventoryId: inventory._id,
      activityType: 'price_updated',
      description: `Updated pricing for ${inventory.productName}`,
      changes: priceChanges,
      previousValues: {
        costPrice: priceChanges.costPrice?.from,
        sellingPrice: priceChanges.sellingPrice?.from
      },
      newValues: {
        costPrice: priceChanges.costPrice?.to || inventory.costPrice,
        sellingPrice: priceChanges.sellingPrice?.to || inventory.sellingPrice
      },
      metadata
    };

    const activity = await InventoryActivity.createActivity(activityData);

    await Notification.createNotification({
      userId,
      title: 'Price Updated',
      message: `Updated pricing for ${inventory.productName}`,
      type: 'info',
      relatedEntityType: 'inventory',
      relatedEntityId: inventory._id,
      data: { inventoryId: inventory._id, priceChanges }
    });

    return activity;
  }

  static async trackImageUpdate(userId, inventory, imageData, metadata = {}) {
    const activityData = {
      userId,
      inventoryId: inventory._id,
      activityType: 'image_updated',
      description: `${imageData.action === 'added' ? 'Added' : imageData.action === 'updated' ? 'Updated' : 'Removed'} product image for ${inventory.productName}`,
      changes: {
        image: imageData
      },
      metadata
    };

    return await InventoryActivity.createActivity(activityData);
  }

  static async trackInventoryDeleted(userId, inventory, metadata = {}) {
    const activityData = {
      userId,
      inventoryId: inventory._id,
      activityType: 'deleted',
      description: `Deleted inventory item: ${inventory.productName}`,
      previousValues: {
        productName: inventory.productName,
        category: inventory.category,
        quantityInStock: inventory.quantityInStock,
        sku: inventory.sku
      },
      metadata
    };

    const activity = await InventoryActivity.createActivity(activityData);

    await Notification.createNotification({
      userId,
      title: 'Item Deleted',
      message: `Deleted ${inventory.productName} from inventory`,
      type: 'warning',
      relatedEntityType: 'inventory',
      relatedEntityId: inventory._id,
      data: { productName: inventory.productName, sku: inventory.sku }
    });

    return activity;
  }

  /**
   * Track inventory-related activities
   */
  static async trackInventoryActivity(userId, inventory, activityData, metadata = {}) {
    try {
      const activity = {
        userId,
        inventoryId: inventory._id,
        activityType: activityData.activityType,
        description: activityData.description,
        changes: activityData.changes || {},
        previousValues: activityData.previousValues || {},
        newValues: activityData.newValues || {},
        stockMovement: activityData.stockMovement || null,
        metadata: {
          ...metadata,
          ...activityData.metadata
        }
      };

      return await InventoryActivity.createActivity(activity);
    } catch (error) {
      console.error('Error tracking inventory activity:', error);
      // Don't throw error to prevent breaking the main operation
      return null;
    }
  }

  /**
   * Track stock movement specifically
   */
  static async trackStockMovement(userId, inventory, movementData) {
    try {
      const activityType = movementData.type === 'add' ? 'stock_added' : 'stock_removed';
      const description = `${movementData.type === 'add' ? 'Added' : 'Removed'} ${movementData.quantity} ${inventory.unitOfMeasure} - ${movementData.reason}`;

      const activity = {
        userId,
        inventoryId: inventory._id,
        activityType,
        description,
        stockMovement: {
          type: movementData.type,
          quantity: movementData.quantity,
          reason: movementData.reason,
          previousStock: movementData.previousStock,
          newStock: movementData.newStock
        },
        metadata: movementData.metadata || {}
      };

      return await InventoryActivity.createActivity(activity);
    } catch (error) {
      console.error('Error tracking stock movement:', error);
      return null;
    }
  }

  /**
   * Track general inventory changes
   */
  static async trackInventoryChange(userId, inventory, changeType, description, changes = {}) {
    try {
      const activity = {
        userId,
        inventoryId: inventory._id,
        activityType: changeType,
        description,
        changes,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

      return await InventoryActivity.createActivity(activity);
    } catch (error) {
      console.error('Error tracking inventory change:', error);
      return null;
    }
  }

  /**
   * Get activity history for an inventory item
   */
  static async getInventoryActivityHistory(inventoryId, options = {}) {
    try {
      return await InventoryActivity.getInventoryActivities(inventoryId, options);
    } catch (error) {
      console.error('Error fetching inventory activity history:', error);
      return [];
    }
  }

  /**
   * Get user activity history
   */
  static async getUserActivityHistory(userId, options = {}) {
    try {
      return await InventoryActivity.getUserActivities(userId, options);
    } catch (error) {
      console.error('Error fetching user activity history:', error);
      return [];
    }
  }

  /**
   * Get activity statistics
   */
  static async getActivityStats(inventoryId) {
    try {
      return await InventoryActivity.getActivityStats(inventoryId);
    } catch (error) {
      console.error('Error fetching activity stats:', error);
      return [];
    }
  }
}

// Also export individual functions for convenience
export const trackInventoryActivity = ActivityTracker.trackInventoryActivity;
export const trackStockMovement = ActivityTracker.trackStockMovement;
export const trackInventoryChange = ActivityTracker.trackInventoryChange;
