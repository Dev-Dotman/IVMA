import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import InventoryBatch from '@/models/InventoryBatch';
import Inventory from '@/models/Inventory';
import { verifySession } from '@/lib/auth';
import { ActivityTracker } from '@/lib/activityTracker';

// GET - Get all batches for a specific inventory item
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

    const { id: productId } = await params;
    const { searchParams } = new URL(req.url);
    
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'dateReceived';
    const sortOrder = parseInt(searchParams.get('sortOrder')) || -1;
    const latest = searchParams.get('latest') === 'true';
    const active = searchParams.get('active') === 'true';

    // Verify the inventory item belongs to the user
    const inventory = await Inventory.findOne({ _id: productId, userId: user._id });
    if (!inventory) {
      return NextResponse.json(
        { success: false, message: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // If active=true, return the current active batch (FIFO - oldest active batch with stock)
    if (active) {
      const activeBatch = await InventoryBatch.findOne({ 
        productId,
        status: 'active',
        quantityRemaining: { $gt: 0 }
      })
        .sort({ dateReceived: 1 }) // FIFO - First In, First Out
        .lean();

      return NextResponse.json({
        success: true,
        batches: activeBatch ? [activeBatch] : []
      });
    }

    // If latest=true, return only the most recent batch
    if (latest) {
      const latestBatch = await InventoryBatch.findOne({ productId })
        .sort({ dateReceived: -1 })
        .lean();

      return NextResponse.json({
        success: true,
        batches: latestBatch ? [latestBatch] : []
      });
    }

    const batches = await InventoryBatch.getBatchesByProduct(productId, {
      status,
      sortBy,
      sortOrder
    });

    // Get batch statistics
    const batchStats = await InventoryBatch.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId) } },
      {
        $group: {
          _id: null,
          totalBatches: { $sum: 1 },
          activeBatches: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          totalQuantityRemaining: { $sum: '$quantityRemaining' },
          totalBatchValue: { 
            $sum: { $multiply: ['$quantityRemaining', '$costPrice'] }
          },
          averageCostPrice: { $avg: '$costPrice' },
          oldestBatch: { $min: '$dateReceived' },
          newestBatch: { $max: '$dateReceived' }
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        batches,
        stats: batchStats[0] || {},
        inventory: {
          _id: inventory._id,
          productName: inventory.productName,
          sku: inventory.sku,
          category: inventory.category
        }
      }
    });

  } catch (error) {
    console.error('Batch fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add a new batch for an inventory item
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

    const { id: productId } = await params;
    const batchData = await req.json();

    // Verify the inventory item belongs to the user
    const inventory = await Inventory.findOne({ _id: productId, userId: user._id });
    if (!inventory) {
      return NextResponse.json(
        { success: false, message: 'Inventory item not found' },
        { status: 404 }
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
      // Generate batch code if not provided
      let batchCode = batchData.batchCode;
      
      if (!batchCode || batchCode === '' || batchCode === null) {
        try {
          // Use inventory SKU for batch code
          const productCode = inventory.sku ? inventory.sku.split('-')[0] : 'PRD';
          
          // Generate date code
          const dateReceived = batchData.dateReceived ? new Date(batchData.dateReceived) : new Date();
          const dateCode = dateReceived.toISOString().slice(2, 10).replace(/-/g, '');
          
          // Count existing batches for this product to get next sequence
          let batchCount = 0;
          try {
            batchCount = await InventoryBatch.countDocuments({ 
              productId: productId 
            }).session(useTransaction ? session : null);
          } catch (countError) {
            console.log('Could not count existing batches, using default sequence');
          }
          
          // Generate batch code: PRODUCTCODE-YYMMDD-B001
          const batchSequence = String(batchCount + 1).padStart(3, '0');
          batchCode = `${productCode}-${dateCode}-B${batchSequence}`;
          
          // Ensure uniqueness - if code exists, increment sequence
          let attempts = 0;
          while (attempts < 10) {
            try {
              const existingBatch = await InventoryBatch.findOne({ 
                batchCode: batchCode
              }).session(useTransaction ? session : null);
              
              if (!existingBatch) break;
              
              attempts++;
              const newSequence = String(batchCount + 1 + attempts).padStart(3, '0');
              batchCode = `${productCode}-${dateCode}-B${newSequence}`;
            } catch (uniqueError) {
              console.log('Error checking batch code uniqueness, proceeding with current code');
              break;
            }
          }
          
        } catch (error) {
          console.error('Batch code generation error:', error);
          // Ultimate fallback batch code
          const timestamp = Date.now().toString().slice(-8);
          batchCode = `BTH-${timestamp}`;
        }
      }

      // Create new batch with generated batch code
      const newBatch = new InventoryBatch({
        ...batchData,
        userId: user._id,
        productId: productId,
        batchCode: batchCode, // Ensure batch code is set
        quantityRemaining: batchData.quantityIn
      });

      await newBatch.save(useTransaction ? { session } : {});

      // Update inventory totals
      inventory.quantityInStock += batchData.quantityIn;
      inventory.totalStockedQuantity += batchData.quantityIn;
      
      // Update cost price if different (optional - could be weighted average)
      if (batchData.costPrice !== inventory.costPrice) {
        inventory.costPrice = batchData.costPrice;
      }
      
      await inventory.save(useTransaction ? { session } : {});

      // Track activity
      try {
        await ActivityTracker.trackInventoryActivity(user._id, inventory, {
          activityType: 'stock_added',
          description: `Added new batch: ${newBatch.batchCode} (+${batchData.quantityIn} ${inventory.unitOfMeasure})`,
          stockMovement: {
            type: 'add',
            quantity: batchData.quantityIn,
            reason: 'New batch added',
            previousStock: inventory.quantityInStock - batchData.quantityIn,
            newStock: inventory.quantityInStock
          },
          metadata: {
            batchId: newBatch._id,
            batchCode: newBatch.batchCode,
            costPrice: batchData.costPrice
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
        message: 'Batch added successfully',
        data: {
          batch: newBatch,
          updatedInventory: inventory
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
    console.error('Batch creation error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { success: false, message: messages.join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update batch fields (prices, supplier, location, etc.)
export async function PATCH(req, { params }) {
  try {
    await connectToDatabase();
    
    const user = await verifySession(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id: productId } = await params;
    const body = await req.json();
    const { batchId, costPrice, sellingPrice, supplier, batchLocation, expiryDate, notes } = body;

    // Verify the inventory item belongs to the user
    const inventory = await Inventory.findOne({ _id: productId, userId: user._id });
    if (!inventory) {
      return NextResponse.json(
        { success: false, message: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // Find the batch
    const batch = await InventoryBatch.findOne({ _id: batchId, productId, userId: user._id });
    if (!batch) {
      return NextResponse.json(
        { success: false, message: 'Batch not found' },
        { status: 404 }
      );
    }

    // Track what fields are being updated
    const updatedFields = [];

    // Update batch fields if provided
    if (costPrice !== undefined && costPrice >= 0) {
      batch.costPrice = costPrice;
      updatedFields.push('costPrice');
    }
    if (sellingPrice !== undefined && sellingPrice >= 0) {
      batch.sellingPrice = sellingPrice;
      updatedFields.push('sellingPrice');
    }
    if (supplier !== undefined) {
      batch.supplier = supplier;
      updatedFields.push('supplier');
    }
    if (batchLocation !== undefined) {
      batch.batchLocation = batchLocation;
      updatedFields.push('batchLocation');
    }
    if (expiryDate !== undefined) {
      batch.expiryDate = expiryDate;
      updatedFields.push('expiryDate');
    }
    if (notes !== undefined) {
      batch.notes = notes;
      updatedFields.push('notes');
    }

    await batch.save();

    // Track activity
    try {
      await ActivityTracker.trackInventoryActivity(user._id, inventory, {
        activityType: 'batch_update',
        description: `Updated batch: ${batch.batchCode} (${updatedFields.join(', ')})`,
        metadata: {
          batchId: batch._id,
          batchCode: batch.batchCode,
          updatedFields,
          newCostPrice: costPrice,
          newSellingPrice: sellingPrice,
          newSupplier: supplier,
          newBatchLocation: batchLocation
        }
      });
    } catch (activityError) {
      console.error('Activity tracking failed:', activityError);
      // Don't fail the operation if activity tracking fails
    }

    return NextResponse.json({
      success: true,
      message: 'Batch updated successfully',
      data: {
        batch,
        updatedFields
      }
    });

  } catch (error) {
    console.error('Batch update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
