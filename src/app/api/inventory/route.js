import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Inventory from '@/models/Inventory';
import InventoryBatch from '@/models/InventoryBatch';
import { verifySession } from '@/lib/auth';
import { ActivityTracker } from '@/lib/activityTracker';

// GET - Fetch user's inventory
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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const sortBy = searchParams.get('sortBy') || 'productName';
    const sortOrder = parseInt(searchParams.get('sortOrder')) || 1;
    const category = searchParams.get('category') || null;
    const search = searchParams.get('search') || null;
    const status = searchParams.get('status') || 'Active';

    const options = { page, limit, sortBy, sortOrder, category, search, status };
    const inventory = await Inventory.getInventoryByUser(user._id, options);
    
    // Get total count for pagination
    const totalQuery = { userId: user._id };
    if (category) totalQuery.category = category;
    if (status) totalQuery.status = status;
    if (search) {
      totalQuery.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const total = await Inventory.countDocuments(totalQuery);

    // Enhance inventory items with current batch pricing
    const enhancedInventory = await Promise.all(
      inventory.map(async (item) => {
        try {
          // Get all batches for this item, sorted by FIFO (dateReceived ascending)
          const batches = await InventoryBatch.find({
            productId: item._id,
            userId: user._id
          }).sort({ dateReceived: 1 }); // FIFO order

          console.log(`Processing item ${item.productName}:`, {
            totalBatches: batches.length,
            batches: batches.map(b => ({
              batchCode: b.batchCode,
              quantityIn: b.quantityIn,
              quantitySold: b.quantitySold,
              remaining: b.quantityIn - b.quantitySold,
              status: b.status,
              dateReceived: b.dateReceived
            }))
          });

          // Find the current active batch using proper FIFO logic
          // This should be the first batch with remaining quantity > 0 when sorted by dateReceived
          const currentActiveBatch = batches.find(batch => {
            const remainingQuantity = (batch.quantityIn || 0) - (batch.quantitySold || 0);
            console.log(`Checking batch ${batch.batchCode}:`, {
              quantityIn: batch.quantityIn,
              quantitySold: batch.quantitySold,
              remaining: remainingQuantity,
              hasRemaining: remainingQuantity > 0
            });
            return remainingQuantity > 0;
          });

          console.log(`Current active batch for ${item.productName}:`, 
            currentActiveBatch ? {
              batchCode: currentActiveBatch.batchCode,
              remaining: currentActiveBatch.quantityIn - currentActiveBatch.quantitySold,
              costPrice: currentActiveBatch.costPrice,
              sellingPrice: currentActiveBatch.sellingPrice
            } : 'No active batch found'
          );

          // Calculate batch-based pricing
          let batchPricing = {
            currentCostPrice: item.costPrice,
            currentSellingPrice: item.sellingPrice,
            hasActiveBatch: false,
            activeBatchCode: null,
            activeBatchRemaining: 0
          };

          if (currentActiveBatch) {
            batchPricing = {
              currentCostPrice: currentActiveBatch.costPrice,
              currentSellingPrice: currentActiveBatch.sellingPrice,
              hasActiveBatch: true,
              activeBatchCode: currentActiveBatch.batchCode,
              activeBatchRemaining: (currentActiveBatch.quantityIn || 0) - (currentActiveBatch.quantitySold || 0),
              activeBatchId: currentActiveBatch._id,
              activeBatchDateReceived: currentActiveBatch.dateReceived
            };
          }

          // Calculate weighted averages across all batches
          const totalQuantityIn = batches.reduce((sum, batch) => sum + (batch.quantityIn || 0), 0);
          const weightedCostSum = batches.reduce((sum, batch) => sum + ((batch.costPrice || 0) * (batch.quantityIn || 0)), 0);
          const weightedSellingSum = batches.reduce((sum, batch) => sum + ((batch.sellingPrice || 0) * (batch.quantityIn || 0)), 0);

          const averageCostPrice = totalQuantityIn > 0 ? weightedCostSum / totalQuantityIn : item.costPrice;
          const averageSellingPrice = totalQuantityIn > 0 ? weightedSellingSum / totalQuantityIn : item.sellingPrice;

          // Enhanced item object with batch information
          const enhancedItem = {
            ...item.toObject(),
            batchPricing: {
              ...batchPricing,
              averageCostPrice,
              averageSellingPrice,
              totalBatches: batches.length,
              activeBatches: batches.filter(b => ((b.quantityIn || 0) - (b.quantitySold || 0)) > 0).length
            },
            // Override pricing with current batch pricing
            currentCostPrice: batchPricing.currentCostPrice,
            currentSellingPrice: batchPricing.currentSellingPrice,
            // Stock value using current batch pricing
            currentStockValue: (item.quantityInStock || 0) * batchPricing.currentCostPrice,
            expectedRevenue: (item.quantityInStock || 0) * batchPricing.currentSellingPrice,
            // Profit margin using current batch pricing
            currentProfitMargin: batchPricing.currentCostPrice > 0 
              ? (((batchPricing.currentSellingPrice - batchPricing.currentCostPrice) / batchPricing.currentCostPrice) * 100).toFixed(1)
              : 0
          };

          console.log(`Final pricing for ${item.productName}:`, {
            currentCostPrice: enhancedItem.currentCostPrice,
            currentSellingPrice: enhancedItem.currentSellingPrice,
            hasActiveBatch: batchPricing.hasActiveBatch,
            activeBatchCode: batchPricing.activeBatchCode
          });

          return enhancedItem;
        } catch (batchError) {
          console.error(`Error processing batches for item ${item._id}:`, batchError);
          // Return item with original pricing if batch processing fails
          return {
            ...item.toObject(),
            batchPricing: {
              currentCostPrice: item.costPrice,
              currentSellingPrice: item.sellingPrice,
              hasActiveBatch: false,
              activeBatchCode: null,
              activeBatchRemaining: 0,
              averageCostPrice: item.costPrice,
              averageSellingPrice: item.sellingPrice,
              totalBatches: 0,
              activeBatches: 0
            },
            currentCostPrice: item.costPrice,
            currentSellingPrice: item.sellingPrice,
            currentStockValue: (item.quantityInStock || 0) * item.costPrice,
            expectedRevenue: (item.quantityInStock || 0) * item.sellingPrice,
            currentProfitMargin: item.costPrice > 0 
              ? (((item.sellingPrice - item.costPrice) / item.costPrice) * 100).toFixed(1)
              : 0
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: enhancedInventory,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      },
      batchInfo: {
        note: 'Pricing reflects current active batch using FIFO methodology',
        methodology: 'First In, First Out (FIFO) - oldest batches are sold first'
      }
    });

  } catch (error) {
    console.error('Inventory fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new inventory item
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

    const inventoryData = await req.json();

    // Convert numeric string fields to numbers for Food/Beverages categories
    if (inventoryData.category === 'Food' && inventoryData.foodDetails) {
      if (inventoryData.foodDetails.maxOrdersPerDay) {
        inventoryData.foodDetails.maxOrdersPerDay = parseInt(inventoryData.foodDetails.maxOrdersPerDay) || 50;
      }
      if (inventoryData.foodDetails.deliveryTime?.value) {
        inventoryData.foodDetails.deliveryTime.value = parseInt(inventoryData.foodDetails.deliveryTime.value) || 30;
      }
    }
    
    if (inventoryData.category === 'Beverages' && inventoryData.beveragesDetails) {
      if (inventoryData.beveragesDetails.maxOrdersPerDay) {
        inventoryData.beveragesDetails.maxOrdersPerDay = parseInt(inventoryData.beveragesDetails.maxOrdersPerDay) || 50;
      }
      if (inventoryData.beveragesDetails.deliveryTime?.value) {
        inventoryData.beveragesDetails.deliveryTime.value = parseInt(inventoryData.beveragesDetails.deliveryTime.value) || 30;
      }
    }

    // Convert numeric fields for Books
    if (inventoryData.category === 'Books' && inventoryData.booksDetails) {
      if (inventoryData.booksDetails.publicationYear) {
        inventoryData.booksDetails.publicationYear = parseInt(inventoryData.booksDetails.publicationYear) || null;
      }
      if (inventoryData.booksDetails.pages) {
        inventoryData.booksDetails.pages = parseInt(inventoryData.booksDetails.pages) || null;
      }
    }

    // Check if we can start a transaction (requires replica set)
    let useTransaction = false;
    let session = null;

    try {
      // Test if transactions are available
      session = await mongoose.connection.db.admin().command({ hello: 1 });
      if (session.setName || session.ismaster) {
        // We're in a replica set, transactions are available
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
      // Create inventory item
      const newItem = new Inventory({
        ...inventoryData,
        userId: user._id
      });

      await newItem.save(useTransaction ? { session } : {});

      // Create the first batch for this inventory item
      const batchData = {
        userId: user._id,
        productId: newItem._id,
        quantityIn: inventoryData.quantityInStock,
        quantityRemaining: inventoryData.quantityInStock,
        costPrice: inventoryData.costPrice,
        sellingPrice: inventoryData.sellingPrice,
        dateReceived: new Date(),
        supplier: inventoryData.supplier || '',
        notes: 'Initial stock batch - created with product',
        batchLocation: inventoryData.location || 'Main Store'
      };

      // Generate batch code as fallback if model doesn't do it
      if (!batchData.batchCode) {
        const dateCode = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        const productCode = newItem.sku ? newItem.sku.split('-')[0] : 'PRD';
        batchData.batchCode = `${productCode}-${dateCode}-B001`;
      }

      const firstBatch = new InventoryBatch(batchData);

      await firstBatch.save(useTransaction ? { session } : {});

      // Track activity (without session to avoid issues)
      try {
        await ActivityTracker.trackInventoryActivity(user._id, newItem, {
          activityType: 'created',
          description: `Created new inventory item: ${newItem.productName}`,
          changes: inventoryData,
          metadata: {
            initialBatchId: firstBatch._id,
            initialBatchCode: firstBatch.batchCode
          }
        });
      } catch (activityError) {
        console.error('Activity tracking error:', activityError);
        // Don't fail the entire operation if activity tracking fails
      }

      // Commit transaction if using one
      if (useTransaction && session) {
        await session.commitTransaction();
      }

      return NextResponse.json({
        success: true,
        message: 'Inventory item and initial batch created successfully',
        data: {
          inventory: newItem,
          initialBatch: firstBatch
        }
      });

    } catch (error) {
      // Abort transaction if using one
      if (useTransaction && session) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      // End session if using one
      if (session) {
        session.endSession();
      }
    }

  } catch (error) {
    console.error('Inventory creation error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { success: false, message: messages.join(', ') },
        { status: 400 }
      );
    }
    
    // Handle duplicate SKU error
    if (error.code === 11000 && error.keyPattern?.sku) {
      return NextResponse.json(
        { success: false, message: 'A product with this SKU already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
