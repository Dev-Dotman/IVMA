import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Inventory from '@/models/Inventory';
import InventoryBatch from '@/models/InventoryBatch';
import { verifySession } from '@/lib/auth';
import { ActivityTracker } from '@/lib/activityTracker';

export async function PUT(req, { params }) {
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
    const { type, quantity, reason, batchId, createNewBatch } = await req.json();

    // Validate input
    if (!type || !quantity || !reason) {
      return NextResponse.json(
        { success: false, message: 'Type, quantity, and reason are required' },
        { status: 400 }
      );
    }

    if (!['add', 'subtract'].includes(type)) {
      return NextResponse.json(
        { success: false, message: 'Type must be add or subtract' },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { success: false, message: 'Quantity must be greater than 0' },
        { status: 400 }
      );
    }

    // Check if we can start a transaction
    let useTransaction = false;
    let session = null;

    try {
      session = await mongoose.connection.db.admin().command({ hello: 1 });
      if (session.setName || session.ismaster) {
        session = await mongoose.startSession();
        useTransaction = true;
      }
    } catch (transactionError) {
      console.log('Transactions not available, proceeding without transaction');
      session = null;
      useTransaction = false;
    }

    if (useTransaction && session) {
      session.startTransaction();
    }

    try {
      // Find the inventory item
      const inventory = await Inventory.findOne({ 
        _id: inventoryId, 
        userId: user._id 
      }).session(useTransaction ? session : null);

      if (!inventory) {
        if (useTransaction && session) {
          await session.abortTransaction();
        }
        return NextResponse.json(
          { success: false, message: 'Inventory item not found' },
          { status: 404 }
        );
      }

      const previousStock = inventory.quantityInStock;
      let updatedBatch = null;
      let newBatch = null;
      let affectedBatches = [];

      if (type === 'add') {
        // Adding stock
        if (createNewBatch || !batchId) {
          // Create new batch
          newBatch = new InventoryBatch({
            userId: user._id,
            productId: inventoryId,
            quantityIn: quantity,
            quantityRemaining: quantity,
            costPrice: inventory.costPrice,
            sellingPrice: inventory.sellingPrice,
            dateReceived: new Date(),
            supplier: inventory.supplier || '',
            notes: `Stock added: ${reason}`,
            batchLocation: inventory.location || 'Main Store'
          });

          await newBatch.save(useTransaction ? { session } : {});
          updatedBatch = newBatch;
        } else {
          // Add to existing batch
          const batch = await InventoryBatch.findOne({
            _id: batchId,
            userId: user._id,
            productId: inventoryId
          }).session(useTransaction ? session : null);

          if (!batch) {
            if (useTransaction && session) {
              await session.abortTransaction();
            }
            return NextResponse.json(
              { success: false, message: 'Batch not found' },
              { status: 404 }
            );
          }

          // Update batch quantities
          batch.quantityIn += quantity;
          batch.quantityRemaining += quantity;
          batch.notes = batch.notes ? `${batch.notes}\nAdded: ${reason} (+${quantity})` : `Added: ${reason} (+${quantity})`;
          
          await batch.save(useTransaction ? { session } : {});
          updatedBatch = batch;
        }

        // Update inventory totals
        inventory.quantityInStock += quantity;
        inventory.totalStockedQuantity += quantity;

      } else if (type === 'subtract') {
        // Subtracting stock
        if (quantity > inventory.quantityInStock) {
          if (useTransaction && session) {
            await session.abortTransaction();
          }
          return NextResponse.json(
            { success: false, message: 'Cannot remove more stock than available' },
            { status: 400 }
          );
        }

        if (batchId) {
          // Remove from specific batch
          const batch = await InventoryBatch.findOne({
            _id: batchId,
            userId: user._id,
            productId: inventoryId
          }).session(useTransaction ? session : null);

          if (!batch) {
            if (useTransaction && session) {
              await session.abortTransaction();
            }
            return NextResponse.json(
              { success: false, message: 'Batch not found' },
              { status: 404 }
            );
          }

          if (quantity > batch.quantityRemaining) {
            if (useTransaction && session) {
              await session.abortTransaction();
            }
            return NextResponse.json(
              { success: false, message: 'Cannot remove more than available in batch' },
              { status: 400 }
            );
          }

          // Update batch quantities - this was missing!
          batch.quantityRemaining -= quantity;
          batch.quantitySold += quantity; // Track how much was sold/removed from this batch
          batch.notes = batch.notes ? `${batch.notes}\nRemoved: ${reason} (-${quantity})` : `Removed: ${reason} (-${quantity})`;
          
          await batch.save(useTransaction ? { session } : {});
          updatedBatch = batch;

          affectedBatches.push({
            batchId: batch._id,
            batchCode: batch.batchCode,
            quantityRemoved: quantity,
            remainingAfter: batch.quantityRemaining
          });

        } else {
          // Use FIFO to remove from oldest batches first
          const activeBatches = await InventoryBatch.find({
            userId: user._id,
            productId: inventoryId,
            status: 'active',
            quantityRemaining: { $gt: 0 }
          }).sort({ dateReceived: 1 }).session(useTransaction ? session : null);

          let remainingToRemove = quantity;

          for (const batch of activeBatches) {
            if (remainingToRemove <= 0) break;

            const removeFromBatch = Math.min(remainingToRemove, batch.quantityRemaining);
            
            // Update batch quantities - this was the main issue!
            batch.quantityRemaining -= removeFromBatch;
            batch.quantitySold += removeFromBatch; // Track sold/removed quantity
            batch.notes = batch.notes ? `${batch.notes}\nRemoved: ${reason} (-${removeFromBatch})` : `Removed: ${reason} (-${removeFromBatch})`;
            
            await batch.save(useTransaction ? { session } : {});

            affectedBatches.push({
              batchId: batch._id,
              batchCode: batch.batchCode,
              quantityRemoved: removeFromBatch,
              remainingAfter: batch.quantityRemaining
            });

            remainingToRemove -= removeFromBatch;
          }

          if (remainingToRemove > 0) {
            if (useTransaction && session) {
              await session.abortTransaction();
            }
            return NextResponse.json(
              { success: false, message: 'Insufficient stock in batches' },
              { status: 400 }
            );
          }

          updatedBatch = affectedBatches;
        }

        // Update inventory totals
        inventory.quantityInStock -= quantity;
        // Note: We don't change totalStockedQuantity when removing stock
        // as it represents historical total received
      }

      // Save inventory changes
      inventory.lastUpdated = new Date();
      await inventory.save(useTransaction ? { session } : {});

      // Track activity
      try {
        await ActivityTracker.trackInventoryActivity(user._id, inventory, {
          activityType: type === 'add' ? 'stock_added' : 'stock_removed',
          description: `${type === 'add' ? 'Added' : 'Removed'} ${quantity} ${inventory.unitOfMeasure} - ${reason}`,
          stockMovement: {
            type: type === 'add' ? 'add' : 'subtract',
            quantity: quantity,
            reason: reason,
            previousStock: previousStock,
            newStock: inventory.quantityInStock
          },
          metadata: {
            batchInfo: updatedBatch,
            batchType: createNewBatch ? 'new' : (batchId ? 'existing' : 'fifo'),
            affectedBatches: affectedBatches.length > 0 ? affectedBatches : undefined
          }
        });
      } catch (activityError) {
        console.error('Activity tracking failed:', activityError);
        // Don't fail the operation if activity tracking fails
      }

      if (useTransaction && session) {
        await session.commitTransaction();
      }

      return NextResponse.json({
        success: true,
        message: `Stock ${type === 'add' ? 'added' : 'removed'} successfully`,
        data: {
          inventory: {
            _id: inventory._id,
            quantityInStock: inventory.quantityInStock,
            totalStockedQuantity: inventory.totalStockedQuantity
          },
          batch: updatedBatch,
          affectedBatches: affectedBatches,
          stockChange: {
            type,
            quantity,
            previousStock,
            newStock: inventory.quantityInStock
          }
        }
      });

    } catch (error) {
      if (useTransaction && session) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }

  } catch (error) {
    console.error('Stock update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
