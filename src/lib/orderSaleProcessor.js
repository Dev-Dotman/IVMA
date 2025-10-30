import Sale from '@/models/Sale';
import ItemSale from '@/models/ItemSale';
import Inventory from '@/models/Inventory';
import InventoryBatch from '@/models/InventoryBatch';
import InventoryActivity from '@/models/InventoryActivity';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

export class OrderSaleProcessor {
  static async processOrderDelivery(order, session = null) {
    const useSession = session || await mongoose.startSession();
    let shouldCommit = !session;

    try {
      if (shouldCommit) {
        await useSession.startTransaction();
      }

      console.log(`Processing order ${order.orderNumber} for sale creation...`);

      // Group items by seller (store)
      const sellerGroups = {};
      order.items.forEach(item => {
        const sellerId = item.seller.toString();
        if (!sellerGroups[sellerId]) {
          sellerGroups[sellerId] = {
            sellerId,
            items: [],
            storeInfo: item.storeSnapshot
          };
        }
        sellerGroups[sellerId].items.push(item);
      });

      const createdSales = [];
      const inventoryUpdates = [];

      // Process each seller's items as separate sales
      for (const [sellerId, sellerGroup] of Object.entries(sellerGroups)) {
        try {
          const saleResult = await this.createSaleForSeller(
            order, 
            sellerId, 
            sellerGroup.items,
            sellerGroup.storeInfo,
            useSession
          );
          
          createdSales.push(saleResult.sale);
          inventoryUpdates.push(...saleResult.inventoryUpdates);
          
          console.log(`Created sale ${saleResult.sale.transactionId} for seller ${sellerId}`);
        } catch (error) {
          console.error(`Failed to create sale for seller ${sellerId}:`, error);
          throw new Error(`Sale creation failed for seller ${sellerId}: ${error.message}`);
        }
      }

      // Create low stock notifications after all sales are processed
      await this.createInventoryLowStockNotifications(inventoryUpdates, useSession);

      if (shouldCommit) {
        await useSession.commitTransaction();
      }

      console.log(`Successfully processed ${createdSales.length} sale(s) for order ${order.orderNumber}`);

      return { 
        success: true, 
        sales: createdSales,
        message: `Created ${createdSales.length} sale(s) from order delivery`
      };

    } catch (error) {
      console.error('Order sale processing error:', error);
      if (shouldCommit) {
        await useSession.abortTransaction();
      }
      throw error;
    } finally {
      if (shouldCommit) {
        await useSession.endSession();
      }
    }
  }

  static async createSaleForSeller(order, sellerId, items, session, storeInfo) {
    // Calculate totals for this seller's items
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Calculate proportional tax and discount based on item value
    const orderSubtotal = order.subtotal;
    const taxProportion = orderSubtotal > 0 ? subtotal / orderSubtotal : 0;
    const tax = Math.round(order.tax * taxProportion * 100) / 100;
    const discount = Math.round(order.discount * taxProportion * 100) / 100;
    const shippingFee = Math.round(order.shippingFee * taxProportion * 100) / 100;
    
    const total = subtotal + tax + shippingFee - discount;

    // Process each item with batch tracking
    const processedItems = [];
    const itemSales = [];

    for (const orderItem of items) {
      const processedItem = await this.processOrderItem(
        orderItem, 
        order, 
        sellerId, 
        session
      );
      processedItems.push(processedItem.saleItem);
      itemSales.push(processedItem.itemSale);
    }

    // Create the main sale record with ALL required fields
    const sale = new Sale({
      userId: new mongoose.Types.ObjectId(sellerId),
      customer: {
        name: `${order.customerSnapshot.firstName} ${order.customerSnapshot.lastName}`,
        phone: order.customerSnapshot.phone || order.shippingAddress.phone || '',
        email: order.customerSnapshot.email || ''
      },
      items: processedItems,
      subtotal: subtotal,
      discount: discount,
      tax: tax,
      total: total,
      amountReceived: total, // Set to total since order is considered fully paid
      balance: 0, // No balance since order is fully paid
      paymentMethod: this.mapPaymentMethod(order.paymentInfo.method),
      saleDate: new Date(),
      status: 'completed',
      soldBy: new mongoose.Types.ObjectId(sellerId), // Explicitly set soldBy
      saleLocation: 'Online Store',
      notes: `Auto-generated from order #${order.orderNumber}`,
      // Additional fields for order processing
      isFromOrder: true,
      linkedOrderId: order._id,
      orderNumber: order.orderNumber,
      isOrderProcessing: true
    });

    await sale.save({ session });

    // Update item sales with transaction reference
    for (const itemSale of itemSales) {
      itemSale.saleTransactionId = sale._id;
      await itemSale.save({ session });
    }

    // Create notification for the seller
    await this.createSaleNotification(sellerId, sale, order, session);

    return { sale, inventoryUpdates };
  }

  static async processOrderItem(orderItem, order, sellerId, session) {
    console.log(`Processing order item: ${orderItem.productSnapshot.productName}`);

    // Get the inventory item
    const inventoryItem = await Inventory.findById(orderItem.product).session(session);
    if (!inventoryItem) {
      throw new Error(`Inventory item not found: ${orderItem.product}`);
    }

    // Check if we have batches for this item
    const availableBatches = await InventoryBatch.find({
      productId: orderItem.product,
      userId: new mongoose.Types.ObjectId(sellerId),
      status: 'active',
      quantityRemaining: { $gt: 0 }
    })
    .sort({ dateReceived: 1 }) // FIFO - First In, First Out
    .session(session);

    let totalCost = 0;
    const batchesSoldFrom = [];

    if (availableBatches.length > 0) {
      // Process quantity from batches
      let remainingQuantity = orderItem.quantity;

      for (const batch of availableBatches) {
        if (remainingQuantity <= 0) break;

        const quantityFromThisBatch = Math.min(remainingQuantity, batch.quantityRemaining);
        
        // Update batch
        await batch.sellFromBatch(quantityFromThisBatch);
        
        // Track batch usage
        batchesSoldFrom.push({
          batchId: batch._id,
          batchCode: batch.batchCode,
          quantityFromBatch: quantityFromThisBatch,
          costPriceFromBatch: batch.costPrice
        });

        totalCost += quantityFromThisBatch * batch.costPrice;
        remainingQuantity -= quantityFromThisBatch;
      }

      if (remainingQuantity > 0) {
        console.warn(`Insufficient stock in batches for ${inventoryItem.productName}, using fallback cost`);
        totalCost += remainingQuantity * inventoryItem.costPrice;
      }
    } else {
      // No batches found, use inventory cost price
      totalCost = orderItem.quantity * inventoryItem.costPrice;
    }

    // Calculate weighted average cost
    const weightedAverageCost = totalCost / orderItem.quantity;

    // Update inventory quantities
    await inventoryItem.recordSale(orderItem.quantity);

    // Create inventory activity
    await InventoryActivity.createActivity({
      userId: new mongoose.Types.ObjectId(sellerId),
      inventoryId: orderItem.product,
      activityType: 'stock_removed',
      description: `Sold ${orderItem.quantity} ${inventoryItem.unitOfMeasure} via order #${order.orderNumber}`,
      stockMovement: {
        type: 'subtract',
        quantity: orderItem.quantity,
        reason: `Order delivery - #${order.orderNumber}`,
        previousStock: inventoryItem.quantityInStock + orderItem.quantity,
        newStock: inventoryItem.quantityInStock
      },
      metadata: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        batchesUsed: batchesSoldFrom.map(b => ({
          batchCode: b.batchCode,
          quantity: b.quantityFromBatch
        }))
      }
    });

    // Create ItemSale record
    const itemSale = new ItemSale({
      userId: new mongoose.Types.ObjectId(sellerId),
      inventoryId: orderItem.product,
      batchesSoldFrom: batchesSoldFrom.map(batch => ({
        batchId: batch.batchId,
        batchCode: batch.batchCode,
        quantitySoldFromBatch: batch.quantityFromBatch,
        unitCostPriceFromBatch: batch.costPriceFromBatch,
        batchDateReceived: availableBatches.find(b => b._id.equals(batch.batchId))?.dateReceived,
        batchSupplier: availableBatches.find(b => b._id.equals(batch.batchId))?.supplier || ''
      })),
      itemSnapshot: {
        productName: orderItem.productSnapshot.productName,
        sku: orderItem.productSnapshot.sku,
        category: orderItem.productSnapshot.category || 'General',
        brand: inventoryItem.brand || '',
        unitOfMeasure: orderItem.productSnapshot.unitOfMeasure || inventoryItem.unitOfMeasure
      },
      quantitySold: orderItem.quantity,
      unitSalePrice: orderItem.price,
      totalSaleAmount: orderItem.subtotal,
      unitCostPrice: weightedAverageCost,
      totalCostAmount: totalCost,
      paymentMethod: this.mapPaymentMethod(order.paymentInfo.method),
      customer: {
        name: `${order.customerSnapshot.firstName} ${order.customerSnapshot.lastName}`,
        phone: order.customerSnapshot.phone || order.shippingAddress.phone || '',
        email: order.customerSnapshot.email || ''
      },
      saleDate: new Date(),
      status: 'completed',
      soldBy: new mongoose.Types.ObjectId(sellerId),
      saleLocation: 'Online Store',
      notes: `Order delivery - #${order.orderNumber}`
    });

    await itemSale.save({ session });

    // Create sale item for the main Sale record
    const saleItem = {
      inventoryId: orderItem.product,
      productName: orderItem.productSnapshot.productName,
      sku: orderItem.productSnapshot.sku,
      quantity: orderItem.quantity,
      unitPrice: orderItem.price,
      total: orderItem.subtotal,
      batchesSoldFrom: batchesSoldFrom,
      costBreakdown: {
        totalCost: totalCost,
        weightedAverageCost: weightedAverageCost,
        profit: orderItem.subtotal - totalCost
      }
    };

    return { saleItem, itemSale };
  }

  static mapPaymentMethod(orderPaymentMethod) {
    const mapping = {
      'card': 'pos',
      'bank_transfer': 'transfer',
      'cash_to_vendor': 'cash',
      'wallet': 'transfer',
      'paystack': 'pos',
      'flutterwave': 'pos'
    };
    
    return mapping[orderPaymentMethod] || 'transfer';
  }

  static async createSaleNotification(sellerId, sale, order, session) {
    const notification = await Notification.createNotification({
      userId: new mongoose.Types.ObjectId(sellerId),
      title: 'New Sale from Order Delivery',
      message: `Order #${order.orderNumber} has been delivered and a sale of ₦${sale.total.toLocaleString()} has been recorded automatically.`,
      type: 'success',
      relatedEntityType: 'order',
      relatedEntityId: order._id,
      data: {
        saleId: sale._id,
        saleTransactionId: sale.transactionId,
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: sale.total,
        itemCount: sale.items.length,
        customer: sale.customer.name
      }
    });

    if (session) {
      await notification.save({ session });
    }

    return notification;
  }

  static async createInventoryLowStockNotifications(sellerId, inventoryItems, session) {
    for (const item of inventoryItems) {
      if (item.quantityInStock <= item.reorderLevel && item.quantityInStock > 0) {
        await Notification.createNotification({
          userId: new mongoose.Types.ObjectId(sellerId),
          title: 'Low Stock Alert',
          message: `${item.productName} is running low. Current stock: ${item.quantityInStock} ${item.unitOfMeasure}`,
          type: 'warning',
          relatedEntityType: 'inventory',
          relatedEntityId: item._id,
          data: {
            productName: item.productName,
            sku: item.sku,
            currentStock: item.quantityInStock,
            reorderLevel: item.reorderLevel,
            unitOfMeasure: item.unitOfMeasure
          }
        });
      } else if (item.quantityInStock === 0) {
        await Notification.createNotification({
          userId: new mongoose.Types.ObjectId(sellerId),
          title: 'Out of Stock Alert',
          message: `${item.productName} is now out of stock!`,
          type: 'error',
          relatedEntityType: 'inventory',
          relatedEntityId: item._id,
          data: {
            productName: item.productName,
            sku: item.sku,
            reorderLevel: item.reorderLevel,
            unitOfMeasure: item.unitOfMeasure
          }
        });
      }
    }
  }
}
