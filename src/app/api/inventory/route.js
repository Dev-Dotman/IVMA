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

    return NextResponse.json({
      success: true,
      data: inventory,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
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
